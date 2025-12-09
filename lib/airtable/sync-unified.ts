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

// Importar función de mapeo desde sync-from-airtable
// Necesitamos acceder a la función interna, así que la copiamos aquí temporalmente
// TODO: Refactorizar para exportar mapAirtableToSupabase desde sync-from-airtable

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';

// Configuración de vistas con prioridad (mayor número = mayor prioridad)
const PHASE_VIEWS: Array<{
  phase: RenoKanbanPhase;
  viewId: string;
  description: string;
  priority: number; // Mayor número = fase más avanzada = mayor prioridad
}> = [
  {
    phase: 'final-check',
    viewId: 'viwnDG5TY6wjZhBL2',
    description: 'Final Check',
    priority: 6,
  },
  {
    phase: 'furnishing-cleaning',
    viewId: 'viw9NDUaeGIQDvugU',
    description: 'Furnishing & Cleaning',
    priority: 5,
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
      console.log(`[Unified Sync] Fetching from ${phaseConfig.description} (${phaseConfig.phase})...`);
      const records = await fetchPropertiesFromAirtable(AIRTABLE_TABLE_ID, phaseConfig.viewId);
      
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
          return; // Skip si no hay ID único
        }

        // Si ya existe esta propiedad con una fase de mayor prioridad, mantenerla
        const existing = propertyIdToMapping.get(uniqueId);
        if (existing && existing.priority > phaseConfig.priority) {
          return; // Ya tiene una fase más avanzada, mantenerla
        }

        // Crear o actualizar el mapeo con la fase de mayor prioridad
        propertyIdToMapping.set(uniqueId, {
          propertyId: uniqueId,
          airtablePropertyId: record.id,
          phase: phaseConfig.phase,
          priority: phaseConfig.priority,
          propertyData: record,
        });
      });

      console.log(`[Unified Sync] ✅ ${phaseConfig.description}: ${records.length} properties`);
    } catch (error: any) {
      console.error(`[Unified Sync] ❌ Error fetching ${phaseConfig.description}:`, error.message);
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

/**
 * Mapea propiedades de Airtable a formato Supabase
 * Usa la misma lógica que sync-from-airtable.ts para mantener consistencia
 */
function mapAirtablePropertyToSupabase(airtableProperty: any): any {
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

  // Mapear todos los campos (similar a sync-from-airtable.ts)
  return {
    id: uniqueId,
    address: address,
    type: getFieldValue('Type') || null,
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
    start_date: getFieldValue('Reno Start Date', [
      'Reno Start Date', 
      'Reno start date',
      'Reno Start Date:',
      'Start Date'
    ]) || null,
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
    airtable_property_id: airtableProperty.id,
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
      'furnishing-cleaning': 0,
      'final-check': 0,
      'reno-fixes': 0,
      'done': 0,
      'orphaned': 0,
    },
    details: [],
  };

  try {
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

    // Paso 3: Obtener todas las propiedades existentes en Supabase
    const { data: existingProperties, error: fetchError } = await supabase
      .from('properties')
      .select('id, reno_phase, airtable_property_id');

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
        const supabaseData = mapAirtablePropertyToSupabase(mapping.propertyData);
        const exists = existingPropertyIds.has(mapping.propertyId);
        
        // Determinar fase final (manejar upcoming-settlements con fecha)
        let finalPhase: RenoKanbanPhase = mapping.phase;
        if (mapping.phase === 'upcoming-settlements' && supabaseData['Estimated Visit Date']) {
          // Si tiene fecha, debería estar en initial-check
          finalPhase = 'initial-check';
        }

        supabaseData.reno_phase = finalPhase;

        if (exists) {
          // Verificar si necesita actualización
          const currentProperty = existingPropertyMap.get(mapping.propertyId);
          const needsPhaseUpdate = currentProperty?.reno_phase !== finalPhase;
          
          if (needsPhaseUpdate) {
            const { error: updateError } = await supabase
              .from('properties')
              .update({
                ...supabaseData,
                reno_phase: finalPhase,
              })
              .eq('id', mapping.propertyId);

            if (updateError) {
              result.totalErrors++;
              result.details.push(`Error updating ${mapping.propertyId}: ${updateError.message}`);
            } else {
              result.totalUpdated++;
              result.details.push(`Updated: ${mapping.propertyId} → ${finalPhase}`);
            }
          } else {
            // Actualizar otros campos aunque la fase no cambie
            const { error: updateError } = await supabase
              .from('properties')
              .update(supabaseData)
              .eq('id', mapping.propertyId);

            if (updateError) {
              result.totalErrors++;
              result.details.push(`Error updating ${mapping.propertyId}: ${updateError.message}`);
            } else {
              result.totalUpdated++;
              result.details.push(`Updated: ${mapping.propertyId} (no phase change)`);
            }
          }
        } else {
          // Crear nueva propiedad
          const { error: insertError } = await supabase
            .from('properties')
            .insert({
              ...supabaseData,
              reno_phase: finalPhase,
              created_at: new Date().toISOString(),
            });

          if (insertError) {
            result.totalErrors++;
            result.details.push(`Error creating ${mapping.propertyId}: ${insertError.message}`);
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
        'furnishing-cleaning': 0,
        'final-check': 0,
        'reno-fixes': 0,
        'done': 0,
        'orphaned': 0,
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

