/**
 * Sincronización Unificada de Airtable → Supabase
 * 
 * Este módulo implementa una sincronización consistente que:
 * 1. Obtiene propiedades de todas las vistas de Airtable simultáneamente
 * 2. Determina la fase correcta usando prioridad (fase más avanzada gana)
 * 3. Actualiza todas las propiedades en Supabase en batch
 * 4. Mueve propiedades que no están en ninguna vista a fase "orphaned"
 */

import { fetchPropertiesFromAirtable } from './sync-from-airtable';
import { createAdminClient } from '@/lib/supabase/admin';
import type { RenoKanbanPhase } from '@/lib/reno-kanban-config';
import { syncProjectsFromAirtable, getAirtableProjectIdToSupabaseIdMap, linkPropertiesToProjectsFromAirtable } from './sync-projects';

// Importar función de mapeo desde sync-from-airtable
// Necesitamos acceder a la función interna, así que la copiamos aquí temporalmente
// TODO: Refactorizar para exportar mapAirtableToSupabase desde sync-from-airtable

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';

// Configuración de vistas con prioridad (mayor número = mayor prioridad)
// Orden de fases: reno-in-progress → furnishing → final-check → cleaning
const PHASE_VIEWS: Array<{
  phase: RenoKanbanPhase;
  viewId: string;
  description: string;
  priority: number; // Mayor número = fase más avanzada = mayor prioridad
}> = [
  {
    phase: 'cleaning',
    viewId: 'viwLajczYxzQd4UvU',
    description: 'Cleaning',
    priority: 6, // Más avanzada
  },
  {
    phase: 'pendiente-suministros',
    viewId: 'viwCFzKrVQSCc23zc',
    description: 'Pendiente de Suministros',
    priority: 5.5, // Entre final-check (5) y cleaning (6)
  },
  {
    phase: 'final-check',
    viewId: 'viwnDG5TY6wjZhBL2',
    description: 'Final Check',
    priority: 5,
  },
  {
    phase: 'furnishing',
    viewId: 'viw9NDUaeGIQDvugU',
    description: 'Furnishing',
    priority: 4,
  },
  {
    phase: 'reno-in-progress',
    viewId: 'viwQUOrLzUrScuU4k',
    description: 'Reno In Progress',
    priority: 3,
  },
  {
    phase: 'reno-budget',
    viewId: 'viwKS3iOiyX5iu5zP',
    description: 'Upcoming Reno Budget',
    priority: 2,
  },
  {
    phase: 'initial-check',
    viewId: 'viwFZZ5S3VFCfYP6g',
    description: 'Initial Check',
    priority: 1,
  },
  {
    phase: 'upcoming-settlements',
    viewId: 'viwpYQ0hsSSdFrSD1',
    description: 'Upcoming Settlements',
    priority: 0,
  },
];

interface PropertyPhaseMapping {
  propertyId: string;
  airtablePropertyId: string;
  phase: RenoKanbanPhase;
  priority: number;
  propertyData: any; // Datos completos de la propiedad desde Airtable
}

export interface UnifiedSyncResult {
  success: boolean;
  timestamp: string;
  totalProcessed: number;
  totalCreated: number;
  totalUpdated: number;
  totalMovedToOrphaned: number;
  totalErrors: number;
  phaseCounts: Record<RenoKanbanPhase, number>;
  details: string[];
}

/**
 * Obtiene todas las propiedades de todas las vistas de Airtable
 */
async function fetchAllPropertiesFromAllViews(): Promise<PropertyPhaseMapping[]> {
  console.log('[Unified Sync] Fetching properties from all Airtable views...');
  
  const allMappings: PropertyPhaseMapping[] = [];
  const propertyIdToMapping = new Map<string, PropertyPhaseMapping>();

  // Obtener propiedades de todas las vistas en paralelo
  const fetchPromises = PHASE_VIEWS.map(async (phaseConfig) => {
    try {
      console.log(`[Unified Sync] Fetching from ${phaseConfig.description} (${phaseConfig.phase}), viewId=${phaseConfig.viewId}, tableId=${AIRTABLE_TABLE_ID}...`);
      const records = await fetchPropertiesFromAirtable(AIRTABLE_TABLE_ID, phaseConfig.viewId);
      let skippedNoUniqueId = 0;
      
      records.forEach((record) => {
        const uniqueIdValue = 
          record.fields['UNIQUEID (from Engagements)'] ||
          record.fields['Unique ID (From Engagements)'] ||
          record.fields['Unique ID From Engagements'] ||
          record.fields['Unique ID'];
        
        const uniqueId = Array.isArray(uniqueIdValue) 
          ? uniqueIdValue[0] 
          : uniqueIdValue;
        
        if (!uniqueId) {
          skippedNoUniqueId++;
          return; // Skip si no hay ID único
        }

        // Si ya existe esta propiedad, verificar si debemos actualizarla
        // Para furnishing y cleaning, si una propiedad está en ambas vistas,
        // la vista que se procesa primero gana (o podemos usar prioridad)
        // Pero en este caso, queremos que cada vista tenga sus propiedades exactas
        const existing = propertyIdToMapping.get(uniqueId);
        
        // Si la propiedad ya está mapeada a una fase más avanzada (mayor prioridad), mantenerla
        // EXCEPTO para furnishing y cleaning: si está en cleaning (prioridad 6) y luego aparece en furnishing (prioridad 4),
        // mantener cleaning porque es más avanzada
        if (existing && existing.priority > phaseConfig.priority) {
          return; // Ya tiene una fase más avanzada, mantenerla
        }
        
        // Si está en una fase menos avanzada, actualizarla a la más avanzada
        // Crear o actualizar el mapeo con la fase de mayor prioridad
        propertyIdToMapping.set(uniqueId, {
          propertyId: uniqueId,
          airtablePropertyId: record.id,
          phase: phaseConfig.phase,
          priority: phaseConfig.priority,
          propertyData: record,
        });
      });

      if (phaseConfig.phase === 'pendiente-suministros' && (records.length > 0 || skippedNoUniqueId > 0)) {
        console.log(`[Unified Sync] 📋 Pendiente de Suministros: ${records.length} registros de la vista, ${skippedNoUniqueId} sin Unique ID (omitidos), viewId=${phaseConfig.viewId}`);
      }
      console.log(`[Unified Sync] ✅ ${phaseConfig.description}: ${records.length} properties`);
    } catch (error: any) {
      console.error(`[Unified Sync] ❌ Error fetching ${phaseConfig.description} (viewId=${phaseConfig.viewId}):`, error.message);
      if (phaseConfig.phase === 'pendiente-suministros') {
        console.error('[Unified Sync] 💡 Comprueba que la vista viwCFzKrVQSCc23zc existe en la MISMA tabla que el resto de fases (tableId=', AIRTABLE_TABLE_ID, '). Si la vista está en otra tabla, hay que usar su tableId.');
      }
    }
  });

  await Promise.all(fetchPromises);

  // Convertir map a array
  propertyIdToMapping.forEach((mapping) => {
    allMappings.push(mapping);
  });

  console.log(`[Unified Sync] Total unique properties found: ${allMappings.length}`);
  
  return allMappings;
}

const PROPERTY_TYPES_WITH_PROJECT = ['Project', 'WIP', 'New Build'];

/**
 * Mapea propiedades de Airtable a formato Supabase
 * Usa la misma lógica que sync-from-airtable.ts para mantener consistencia
 * projectMap: airtable_project_id -> supabase project id (solo para type Project/WIP/New Build)
 */
function mapAirtablePropertyToSupabase(airtableProperty: any, projectMap?: Map<string, string>): any {
  const fields = airtableProperty.fields;
  
  const uniqueIdValue = 
    fields['UNIQUEID (from Engagements)'] ||
    fields['Unique ID (From Engagements)'] ||
    fields['Unique ID From Engagements'] ||
    fields['Unique ID'];
  
  const uniqueId = Array.isArray(uniqueIdValue) 
    ? uniqueIdValue[0] 
    : uniqueIdValue;

  if (!uniqueId) {
    throw new Error('Unique ID (From Engagements) is required');
  }

  const getFieldValue = (fieldName: string, alternativeNames?: string[]): any => {
    let value = fields[fieldName];
    if (value === undefined && alternativeNames) {
      for (const altName of alternativeNames) {
        if (fields[altName] !== undefined) {
          value = fields[altName];
          break;
        }
      }
    }
    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object') {
        return value;
      }
      return value[0];
    }
    return value;
  };

  const addressValue = getFieldValue('Address');
  const address = addressValue || '';
  const type = getFieldValue('Type') || null;

  let project_id: string | null = null;
  const projectField = process.env.AIRTABLE_PROPERTY_PROJECT_FIELD || 'Project';
  if (type && PROPERTY_TYPES_WITH_PROJECT.includes(String(type).trim()) && projectMap) {
    const airtableProjectLink =
      getFieldValue(projectField) ??
      getFieldValue('Project Name') ??
      getFieldValue('Projects') ??
      getFieldValue('Parent Project');
    const airtableProjectId = Array.isArray(airtableProjectLink) ? airtableProjectLink[0] : airtableProjectLink;
    if (airtableProjectId && typeof airtableProjectId === 'string') {
      project_id = projectMap.get(airtableProjectId) ?? null;
    }
  }

  // Mapear todos los campos (similar a sync-from-airtable.ts)
  return {
    id: uniqueId,
    address: address,
    type,
    project_id,
    renovation_type: getFieldValue('Required reno', ['Required reno', 'Required Reno']) || null,
    notes: getFieldValue('Set up team notes', ['Set up team notes', 'SetUp Team Notes', 'Setup Status Notes']) || null,
    'Set Up Status': getFieldValue('Set up status', ['Set up status', 'Set Up Status']) || null,
    keys_location: getFieldValue('Keys Location', ['Keys Location', 'Keys Location (If there are)']) || null,
    stage: getFieldValue('Stage', ['Stage']) || null,
    'Client email': getFieldValue('Client email', ['Client email']) || null,
    'Unique ID From Engagements': uniqueId,
    area_cluster: getFieldValue('Area Cluster', ['Area Cluster', 'Area cluster']) || null,
    property_unique_id: getFieldValue('Property Unique ID', ['Property Unique ID', 'Property UniqueID']) || null,
    'Technical construction': getFieldValue('fldtTmer8awVKDx7Y', ['fldtTmer8awVKDx7Y', 'Technical construction', 'Technical Constructor']) || null,
    responsible_owner: getFieldValue('Responsible Owner', ['Responsible Owner', 'Responsible owner']) || null,
    'Hubspot ID': getFieldValue('Hubspot ID', ['Hubspot ID', 'HubSpot - Engagement ID']) || null,
    next_reno_steps: getFieldValue('Next Reno Steps', ['Next Reno Steps', 'Next reno steps']) || null,
    'Renovator name': getFieldValue('Renovator Name', ['Renovator Name', 'Renovator name']) || null,
    'Estimated Visit Date': (() => {
      const dateValue = getFieldValue('Est. visit date', [
        'Est. visit date',
        'Estimated Visit Date', 
        'Estimated visit date', 
        'fldIhqPOAFL52MMBn'
      ]);
      if (dateValue) {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch (e) {
          // Ignore
        }
      }
      return null;
    })(),
    estimated_end_date: getFieldValue('Est. Reno End Date', [
      'Est. Reno End Date', 
      'Estimated Reno End Date',
      'Est. Reno End Date:',
      'Estimated End Date'
    ]) || null,
    start_date: (() => {
      // Buscar primero por field ID directamente, luego por nombres alternativos
      const dateValue = fields['fldCnB9pCmpG5khiH'] !== undefined 
        ? fields['fldCnB9pCmpG5khiH']
        : getFieldValue('Reno Start Date', [
            'Reno Start Date', 
            'Reno start date',
            'Reno Start Date:',
            'Start Date'
          ]);
      if (dateValue) {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // YYYY-MM-DD
          }
        } catch (e) {
          // Ignore
        }
      }
      return null;
    })(),
    Est_reno_start_date: (() => {
      // Buscar primero por field ID directamente, luego por nombres alternativos
      const dateValue = fields['fldPX58nQYf9HsTRE'] !== undefined 
        ? fields['fldPX58nQYf9HsTRE']
        : getFieldValue('Est. reno start date', [
            'Est. reno start date',
            'Est. Reno Start Date',
            'Estimated Reno Start Date',
            'Estimated reno start date'
          ]);
      if (dateValue) {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // YYYY-MM-DD
          }
        } catch (e) {
          // Ignore
        }
      }
      return null;
    })(),
    pics_urls: (() => {
      let picsField = fields['pics_urls_from_properties'] ||
                     fields['fldq1FLXBToYEY9W3'] || 
                     fields['pics_url'] ||
                     fields['Pics URLs'] ||
                     fields['Pics URLs:'] ||
                     fields['Pics'] ||
                     fields['Photos URLs'] ||
                     fields['Photos'] ||
                     fields['Property pictures & videos (from properties)'] ||
                     fields['Property pictures & videos'];
      
      if (!picsField) {
        return [];
      }
      
      if (Array.isArray(picsField)) {
        const urls = picsField
          .filter(item => item != null)
          .map(item => {
            if (typeof item === 'object' && item !== null && item.url) {
              return item.url;
            }
            if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
              return item;
            }
            return null;
          })
          .filter((url): url is string => url !== null && url.length > 0);
        
        return urls;
      }
      
      if (typeof picsField === 'string') {
        const urls = picsField
          .split(',')
          .map(url => url.trim())
          .filter(url => url.startsWith('http://') || url.startsWith('https://'));
        
        return urls.length > 0 ? urls : (picsField.startsWith('http') ? [picsField] : []);
      }
      
      return [];
    })(),
    // Campos de duración y días (números enteros)
    'Days to Start Reno (Since RSD)': (() => {
      const value = getFieldValue('Days to start reno since real settlement date', [
        'Days to start reno since real settlement date', // Nombre exacto en Airtable
        'Days to start reno since settlement date',
        'Days to Start Reno (Since RSD)', // Nombre en Supabase
        'Days to Start Reno (Sice RSD)', // Variante con typo
        'Days to start reno since RSD',
        'Days to Start Reno Since RSD',
        'Days to Start Reno Since Settlement Date',
        'Days to Start Reno',
        'Days to start reno',
      ]);
      if (value === null || value === undefined) return null;
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return isNaN(num) ? null : num;
    })(),
    'Reno Duration': (() => {
      const value = getFieldValue('Reno Duration');
      if (value === null || value === undefined) return null;
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return isNaN(num) ? null : num;
    })(),
    'Days to Property Ready': (() => {
      const value = getFieldValue('Days to Property Ready');
      if (value === null || value === undefined) return null;
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return isNaN(num) ? null : num;
    })(),
    days_to_visit: (() => {
      const value = getFieldValue('Days to visit', ['Days to visit', 'Days to Visit']);
      if (value === null || value === undefined) return null;
      const num = typeof value === 'number' ? value : parseInt(String(value), 10);
      return isNaN(num) ? null : num;
    })(),
    'Real Settlement Date': (() => {
      const dateValue = getFieldValue('Real settlement date', [
        'Real settlement date',
        'Real Settlement Date',
        'fldpQgS6HzhX0nXal' // Field ID en Airtable
      ]);
      if (dateValue) {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // YYYY-MM-DD
          }
        } catch (e) {
          // Ignore
        }
      }
      return null;
    })(),
    airtable_property_id: airtableProperty.id,
    airtable_properties_record_id: (() => {
      const propsLink = getFieldValue('Properties', [
        'Properties',
        'Property',
        'Linked Property',
        'Property record',
        'Property Record',
        'Properties linked',
      ]);
      if (Array.isArray(propsLink) && propsLink.length > 0 && typeof propsLink[0] === 'string') {
        return propsLink[0];
      }
      if (typeof propsLink === 'string') return propsLink;
      return null;
    })(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Sincronización unificada de todas las fases
 */
export async function syncAllPhasesUnified(): Promise<UnifiedSyncResult> {
  console.log('🔄 Starting unified Airtable sync...\n');
  const startTime = new Date();
  
  const supabase = createAdminClient();
  const result: UnifiedSyncResult = {
    success: true,
    timestamp: new Date().toISOString(),
    totalProcessed: 0,
    totalCreated: 0,
    totalUpdated: 0,
    totalMovedToOrphaned: 0,
    totalErrors: 0,
    phaseCounts: {
      'upcoming-settlements': 0,
      'initial-check': 0,
      'reno-budget-renovator': 0,
      'reno-budget-client': 0,
      'reno-budget-start': 0,
      'reno-budget': 0,
      'upcoming': 0,
      'reno-in-progress': 0,
      'furnishing': 0,
      'final-check': 0,
      'pendiente-suministros': 0,
      'cleaning': 0,
      'furnishing-cleaning': 0, // Legacy
      'reno-fixes': 0,
      'done': 0,
      'orphaned': 0,
      'analisis-supply': 0,
      'analisis-reno': 0,
      'administracion-reno': 0,
      'pendiente-presupuestos-renovador': 0,
      'obra-a-empezar': 0,
      'obra-en-progreso': 0,
      'amueblamiento': 0,
      'check-final': 0,
    },
    details: [],
  };

  try {
    // Paso 0: Sincronizar proyectos desde Airtable (si está configurado) y mapa airtable_project_id -> id
    const projectSyncResult = await syncProjectsFromAirtable();
    if (!projectSyncResult.skipped && (projectSyncResult.created > 0 || projectSyncResult.updated > 0)) {
      console.log('[Unified Sync] Projects:', projectSyncResult);
    }
    const projectMap = await getAirtableProjectIdToSupabaseIdMap();

    // Paso 1: Obtener todas las propiedades de todas las vistas
    const propertyMappings = await fetchAllPropertiesFromAllViews();
    result.totalProcessed = propertyMappings.length;

    // Paso 2: Agrupar por fase
    const propertiesByPhase = new Map<RenoKanbanPhase, PropertyPhaseMapping[]>();
    PHASE_VIEWS.forEach(p => {
      propertiesByPhase.set(p.phase, []);
    });

    propertyMappings.forEach(mapping => {
      const phaseList = propertiesByPhase.get(mapping.phase) || [];
      phaseList.push(mapping);
      propertiesByPhase.set(mapping.phase, phaseList);
    });

    // Paso 3: Obtener todas las propiedades existentes en Supabase (PostgREST limita a 1000 por defecto)
    const MAX_PROPERTIES_FETCH = 15000;
    const { data: existingProperties, error: fetchError } = await supabase
      .from('properties')
      .select('id, reno_phase, airtable_property_id')
      .order('created_at', { ascending: false })
      .range(0, MAX_PROPERTIES_FETCH - 1);

    if (fetchError) {
      throw new Error(`Error fetching existing properties: ${fetchError.message}`);
    }

    const existingPropertyIds = new Set(existingProperties?.map(p => p.id) || []);
    const existingPropertyMap = new Map(
      existingProperties?.map(p => [p.id, p]) || []
    );

    // Crear set de IDs de Airtable que están en alguna vista
    const airtableIdsInViews = new Set(
      propertyMappings.map(m => m.airtablePropertyId)
    );

    // Paso 4: Procesar cada propiedad de Airtable
    console.log('\n📝 Processing properties from Airtable...');
    
    for (const mapping of propertyMappings) {
      try {
        const supabaseData = mapAirtablePropertyToSupabase(mapping.propertyData, projectMap);
        const exists = existingPropertyIds.has(mapping.propertyId);

        // La fase viene de la vista con mayor prioridad donde aparece la propiedad.
        // Pendiente de Suministros viene solo de la vista viwCFzKrVQSCc23zc (ya en PHASE_VIEWS).
        const fields = mapping.propertyData?.fields ?? {};
        const stageRaw = (fields['Stage'] ?? fields['stage'] ?? '').toString().trim().toLowerCase();
        const setUpStatusRaw = (fields['Set Up Status'] ?? fields['Set up status'] ?? supabaseData['Set Up Status'] ?? '').toString().trim().toLowerCase();
        const isPendingToVisit = setUpStatusRaw.includes('pending') && setUpStatusRaw.includes('visit');

        let finalPhase: RenoKanbanPhase = mapping.phase;

        // Próximas visitas y Revisión Inicial: solo si cumplen Stage + Set Up Status
        if (mapping.phase === 'upcoming-settlements' || mapping.phase === 'initial-check') {
          if (isPendingToVisit && stageRaw.includes('presettlement')) {
            finalPhase = 'upcoming-settlements';
          } else if (isPendingToVisit && stageRaw.includes('settled') && !stageRaw.includes('presettlement')) {
            finalPhase = 'initial-check';
          } else {
            finalPhase = 'reno-budget';
          }
        }

        // Forzar Set Up Status según la fase de la vista
        if (finalPhase === 'furnishing') {
          supabaseData['Set Up Status'] = 'Furnishing';
        } else if (finalPhase === 'pendiente-suministros') {
          supabaseData['Set Up Status'] = 'Utilities activation';
        } else if (finalPhase === 'cleaning') {
          supabaseData['Set Up Status'] = 'Cleaning';
        }

        supabaseData.reno_phase = finalPhase;

        // No sobrescribir airtable_properties_record_id con null si ya existe en DB
        const payloadForUpdate = () => {
          const p = { ...supabaseData };
          if (p.airtable_properties_record_id == null) delete p.airtable_properties_record_id;
          return p;
        };

        const now = new Date().toISOString();
        const payload = {
          ...payloadForUpdate(),
          reno_phase: finalPhase,
          updated_at: now,
        };
        // created_at no se envía: en insert usa DEFAULT, en update no se toca

        // Upsert: insert o update por id; evita duplicate key si la propiedad ya existe y no estaba en el fetch (límite 15k)
        const { error: upsertError } = await supabase
          .from('properties')
          .upsert(payload, {
            onConflict: 'id',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          result.totalErrors++;
          result.details.push(`Error upsert ${mapping.propertyId}: ${upsertError.message}`);
        } else {
          if (exists) {
            result.totalUpdated++;
            result.details.push(`Updated: ${mapping.propertyId} → ${finalPhase}`);
          } else {
            result.totalCreated++;
            result.details.push(`Created: ${mapping.propertyId} → ${finalPhase}`);
          }
        }

        result.phaseCounts[finalPhase]++;
      } catch (error: any) {
        result.totalErrors++;
        result.details.push(`Error processing ${mapping.propertyId}: ${error.message}`);
        console.error(`[Unified Sync] Error processing property ${mapping.propertyId}:`, error);
      }
    }

    // Paso 5: Mover propiedades que no están en ninguna vista a "orphaned"
    console.log('\n🧹 Cleaning up properties not in any Airtable view...');
    
    const propertiesToOrphan = existingProperties?.filter(p => {
      // Solo considerar propiedades que tienen airtable_property_id
      if (!p.airtable_property_id) {
        return false; // Propiedades creadas manualmente, no mover
      }
      
      // Si no está en ninguna vista, mover a orphaned
      return !airtableIdsInViews.has(p.airtable_property_id);
    }) || [];

    if (propertiesToOrphan.length > 0) {
      const orphanIds = propertiesToOrphan.map(p => p.id);
      
      const { error: orphanError } = await supabase
        .from('properties')
        .update({
          reno_phase: 'orphaned',
          updated_at: new Date().toISOString(),
        })
        .in('id', orphanIds);

      if (orphanError) {
        console.error('[Unified Sync] Error moving properties to orphaned:', orphanError);
        result.totalErrors += propertiesToOrphan.length;
      } else {
        result.totalMovedToOrphaned = propertiesToOrphan.length;
        result.phaseCounts.orphaned = propertiesToOrphan.length;
        console.log(`[Unified Sync] ✅ Moved ${propertiesToOrphan.length} properties to orphaned phase`);
        result.details.push(`Moved to orphaned: ${propertiesToOrphan.length} properties`);
      }
    } else {
      console.log('[Unified Sync] ✅ No properties to move to orphaned');
    }

    // Paso 6: Vincular propiedades a proyectos desde Airtable Projects."Properties linked"
    try {
      const linkResult = await linkPropertiesToProjectsFromAirtable();
      if (linkResult.linked > 0 || linkResult.errors > 0) {
        console.log('[Unified Sync] Project links:', linkResult);
        result.details.push(`Project links: ${linkResult.linked} properties linked, ${linkResult.errors} errors`);
      }
    } catch (linkErr: unknown) {
      console.error('[Unified Sync] Error linking properties to projects:', linkErr);
      result.details.push('Error linking properties to projects');
    }

    // Contar propiedades finales por fase
    const { data: finalCounts, error: countError } = await supabase
      .from('properties')
      .select('reno_phase')
      .in('reno_phase', Object.keys(result.phaseCounts) as RenoKanbanPhase[]);

    if (!countError && finalCounts) {
      result.phaseCounts = {
        'upcoming-settlements': 0,
        'initial-check': 0,
        'reno-budget-renovator': 0,
        'reno-budget-client': 0,
        'reno-budget-start': 0,
        'reno-budget': 0,
        'upcoming': 0,
        'reno-in-progress': 0,
        'furnishing': 0,
        'final-check': 0,
        'pendiente-suministros': 0,
        'cleaning': 0,
        'furnishing-cleaning': 0, // Legacy
        'reno-fixes': 0,
        'done': 0,
        'orphaned': 0,
        'analisis-supply': 0,
        'analisis-reno': 0,
        'administracion-reno': 0,
        'pendiente-presupuestos-renovador': 0,
        'obra-a-empezar': 0,
        'obra-en-progreso': 0,
        'amueblamiento': 0,
        'check-final': 0,
      };
      
      finalCounts.forEach(p => {
        const phase = p.reno_phase as RenoKanbanPhase;
        if (phase in result.phaseCounts) {
          result.phaseCounts[phase]++;
        }
      });
    }

    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    console.log('\n' + '='.repeat(80));
    console.log('📊 Unified Sync Summary');
    console.log('='.repeat(80));
    console.log(`Total Processed: ${result.totalProcessed}`);
    console.log(`Created: ${result.totalCreated}`);
    console.log(`Updated: ${result.totalUpdated}`);
    console.log(`Moved to Orphaned: ${result.totalMovedToOrphaned}`);
    console.log(`Errors: ${result.totalErrors}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log('\nPhase Counts:');
    Object.entries(result.phaseCounts).forEach(([phase, count]) => {
      if (phase !== 'orphaned' || count > 0) {
        console.log(`  ${phase}: ${count}`);
      }
    });
    
    // Mostrar primeros errores si los hay
    if (result.totalErrors > 0 && result.details.length > 0) {
      console.log('\n⚠️  First errors (showing up to 10):');
      result.details
        .filter(d => d.includes('Error'))
        .slice(0, 10)
        .forEach(error => console.log(`  - ${error}`));
      if (result.details.filter(d => d.includes('Error')).length > 10) {
        console.log(`  ... and ${result.details.filter(d => d.includes('Error')).length - 10} more errors`);
      }
    }
    
    console.log('='.repeat(80) + '\n');

    result.success = result.totalErrors === 0;
  } catch (error: any) {
    console.error('[Unified Sync] Fatal error:', error);
    result.success = false;
    result.totalErrors++;
    result.details.push(`Fatal error: ${error.message}`);
  }

  return result;
}

