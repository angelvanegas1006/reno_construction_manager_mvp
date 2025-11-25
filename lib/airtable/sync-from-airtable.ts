/**
 * Sincronización desde Airtable hacia Supabase
 * Lee propiedades de Airtable que cumplen los filtros y las crea/actualiza en Supabase
 * 
 * IMPORTANTE: Esta función está diseñada para sincronizar propiedades que deben estar
 * en la fase "upcoming-settlements". La view de Airtable debe estar filtrada para mostrar
 * solo las propiedades que cumplen los criterios para esta fase.
 */

import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';

interface AirtableProperty {
  id: string; // Airtable record ID
  fields: {
    'Technical Constructor'?: string;
    'Address'?: string;
    'Type'?: string;
    'Required Reno'?: string;
    'Area Cluster'?: string;
    'SetUp Team Notes'?: string;
    'Set up status'?: string;
    'Hubspot ID'?: number;
    'Unique ID (From Engagements)'?: string;
    'Property Unique ID'?: string;
    'Keys Location (If there are)'?: string;
    'Stage'?: string;
    'Responsible Owner'?: string;
    'Client email'?: string;
    'Real settlement date'?: string; // ISO date string
    'Test Flag'?: string;
    'Country'?: string;
    'Already Tenanted'?: string;
    // Campos relacionados (links a otras tablas)
    'Properties'?: string[]; // Array de IDs de registros relacionados
    'Engagements'?: string[]; // Array de IDs de registros relacionados
    'Responsible owner'?: string | string[]; // Puede ser ID o array de IDs
    [key: string]: any; // Permitir cualquier otro campo
  };
}

/**
 * Obtiene la base de Airtable configurada
 */
function getAirtableBase() {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    throw new Error('Airtable credentials not configured');
  }

  return new Airtable({ apiKey }).base(baseId);
}

/**
 * Construye la fórmula de filtro para Airtable según los criterios especificados
 */
function buildAirtableFilterFormula(): string {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneWeekFromNowISO = oneWeekFromNow.toISOString().split('T')[0]; // YYYY-MM-DD

  // Construir la fórmula de filtro
  // Nota: Los nombres de campos deben coincidir exactamente con Airtable (case-sensitive)
  // Si hay errores, verificar los nombres exactos en Airtable API docs o UI
  const filters = [
    "{Stage} = 'Presettlement & Settled'",
    "{Set Up Status} = 'Pending to visit'",
    "{Type} = 'Unit & Building'",
    "{Test Flag} != 'Test'",
  ];

  // Intentar agregar filtros adicionales - pueden necesitar ajustarse según nombres reales
  // Comentados temporalmente hasta confirmar nombres exactos en Airtable
  // filters.push("{Country} = 'Spain'");
  // filters.push("NOT({Unique ID (From Engagements)} = '')");
  // filters.push("NOT({Hubspot ID} = '')");
  // filters.push("NOT({Property Unique ID} = '')");
  // filters.push(`IS_BEFORE({Real settlement date}, '${oneWeekFromNowISO}')`);
  // filters.push("{Already Tenanted} != 'Yes'");

  return `AND(${filters.join(', ')})`;
}

/**
 * Obtiene campos de una tabla relacionada usando los IDs de los links
 */
async function fetchRelatedFields(
  base: any,
  relatedTableName: string,
  recordIds: string[],
  fieldsToFetch: string[]
): Promise<Map<string, any>> {
  if (recordIds.length === 0) {
    return new Map();
  }

  try {
    // Construir fórmula OR para obtener múltiples registros
    // Airtable limita a 50 IDs por query, así que hacemos batches
    const batchSize = 50;
    const result = new Map();

    for (let i = 0; i < recordIds.length; i += batchSize) {
      const batch = recordIds.slice(i, i + batchSize);
      const formula = `OR(${batch.map(id => `RECORD_ID() = "${id}"`).join(', ')})`;
      
      // Si estamos buscando el campo de pics URLs, obtener todos los campos para encontrar el nombre real
      const shouldFetchAllFields = fieldsToFetch.includes('fldq1FLXBToYEY9W3');
      
      const relatedRecords = await base(relatedTableName)
        .select({
          filterByFormula: formula,
          fields: shouldFetchAllFields ? [] : fieldsToFetch, // Si es array vacío, Airtable devuelve todos los campos
        })
        .all();

      relatedRecords.forEach((record: any) => {
        // Si estamos buscando el campo de pics URLs, buscar el campo por field ID en todos los campos
        if (shouldFetchAllFields) {
          // Buscar el campo que tenga el field ID o nombres relacionados
          const allFields = record.fields;
          let picsField = null;
          
          // Buscar por field ID (necesitamos acceder a la metadata del campo)
          // Como no podemos acceder directamente al field ID, buscamos por nombres comunes
          // El campo se llama 'pics_url' en Properties (field ID: fldq1FLXBToYEY9W3)
          const possibleNames = [
            'pics_url',  // Nombre real encontrado en Properties
            'Pics URLs', 
            'Pics', 
            'Photos URLs', 
            'Photos', 
            'Images URLs', 
            'Images', 
            'Property pictures & videos',
            'pics_urls',
            'Property Pics',
            'Property Photos',
            'Property Images',
            'Pics URL',
            'Photo URLs',
            'Photo URL',
            'Picture URLs',
            'Picture URL',
            'Media URLs',
            'Media URL'
          ];
          
          // Buscar por nombres exactos
          for (const name of possibleNames) {
            if (allFields[name] !== undefined && allFields[name] !== null && allFields[name] !== '') {
              picsField = allFields[name];
              // Log para debugging (solo el primer registro)
              if (record.id === recordIds[0]) {
                console.log(`[Airtable Sync] ✅ Found pics field in Properties with name: "${name}"`);
                console.log(`[Airtable Sync] Field value type:`, typeof picsField, Array.isArray(picsField) ? 'array' : 'string');
                console.log(`[Airtable Sync] Field value (first 200 chars):`, typeof picsField === 'string' ? picsField.substring(0, 200) : picsField);
              }
              break;
            }
          }
          
          // Si no encontramos por nombre exacto, buscar por coincidencias parciales
          if (picsField === null) {
            const allFieldNames = Object.keys(allFields);
            // Buscar campos que contengan 'pic' (puede ser 'pics_url', 'pics', etc.)
            const partialMatches = allFieldNames.filter(k => {
              const lower = k.toLowerCase();
              // Buscar campos con 'pic' o 'photo' o 'image' (no necesariamente con 'url')
              return lower.includes('pic') || 
                     (lower.includes('photo') && (lower.includes('url') || lower.includes('link'))) ||
                     (lower.includes('image') && (lower.includes('url') || lower.includes('link')));
            });
            
            if (partialMatches.length > 0) {
              // Log solo para el primer registro
              if (record.id === recordIds[0]) {
                console.log('[Airtable Sync] 🔍 Found potential matches (partial):', partialMatches);
              }
              // Intentar usar el primero que tenga un valor
              for (const match of partialMatches) {
                if (allFields[match] !== undefined && allFields[match] !== null) {
                  picsField = allFields[match];
                  if (record.id === recordIds[0]) {
                    console.log(`[Airtable Sync] ✅ Using partial match: "${match}"`);
                    console.log(`[Airtable Sync] Field value:`, typeof picsField === 'string' ? picsField.substring(0, 100) : picsField);
                  }
                  break;
                }
              }
            } else if (record.id === recordIds[0]) {
              console.log('[Airtable Sync] ⚠️ Pics field not found in Properties by name or partial match');
              console.log('[Airtable Sync] All field names (first 50):', allFieldNames.slice(0, 50));
            }
          }
          
          // Si encontramos el campo, agregarlo con el field ID como clave para facilitar el mapeo
          if (picsField !== null) {
            allFields['fldq1FLXBToYEY9W3'] = picsField;
            allFields['pics_urls_from_properties'] = picsField; // También con nombre más descriptivo
          }
        }
        
        result.set(record.id, record.fields);
      });
    }

    console.log(`[Airtable Sync] Fetched ${result.size} records from ${relatedTableName}`);
    return result;
  } catch (error: any) {
    console.warn(`[Airtable Sync] Error fetching related fields from ${relatedTableName}:`, error.message);
    return new Map();
  }
}

/**
 * Lee propiedades de Airtable que cumplen los filtros
 */
export async function fetchPropertiesFromAirtable(
  tableId: string,
  viewId: string
): Promise<AirtableProperty[]> {
  try {
    const base = getAirtableBase();
    
    // Usar solo la view - los filtros ya están aplicados en la view de Airtable
    // Si necesitamos filtros adicionales, los aplicaremos después de obtener los datos
    console.log('[Airtable Sync] Fetching properties from view:', viewId);

    const records: AirtableProperty[] = [];
    
    await base(tableId)
      .select({
        view: viewId,
        // Expandir campos relacionados para obtener datos de Properties y Engagements
        // Nota: Airtable puede requerir que estos campos estén en la view
      })
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach((record) => {
          records.push({
            id: record.id,
            fields: record.fields as any,
          });
        });
        fetchNextPage();
      });

    console.log(`[Airtable Sync] Found ${records.length} properties matching filters`);

    // Obtener IDs de tablas relacionadas
    const propertiesIds = new Set<string>();
    const engagementsIds = new Set<string>();
    const teamProfilesIds = new Set<string>();

    records.forEach((record) => {
      // Properties es un campo link - puede ser array de IDs
      const propertiesLinks = record.fields['Properties'];
      if (Array.isArray(propertiesLinks)) {
        propertiesLinks.forEach((link: any) => {
          if (typeof link === 'string') {
            propertiesIds.add(link);
          }
        });
      }

      // Engagements es un campo link - puede ser array de IDs
      const engagementsLinks = record.fields['Engagements'];
      if (Array.isArray(engagementsLinks)) {
        engagementsLinks.forEach((link: any) => {
          if (typeof link === 'string') {
            engagementsIds.add(link);
          }
        });
      }

      // Responsible owner es un link a Team Profiles
      const responsibleOwnerLinks = record.fields['Responsible owner'] || record.fields['Responsible Owner'];
      if (Array.isArray(responsibleOwnerLinks)) {
        responsibleOwnerLinks.forEach((link: any) => {
          if (typeof link === 'string') {
            teamProfilesIds.add(link);
          }
        });
      } else if (typeof responsibleOwnerLinks === 'string') {
        teamProfilesIds.add(responsibleOwnerLinks);
      }
    });

    // Obtener campos de tablas relacionadas
    console.log(`[Airtable Sync] Fetching ${propertiesIds.size} Properties records, ${engagementsIds.size} Engagements records, and ${teamProfilesIds.size} Team Profiles records`);
    
    const propertiesData = await fetchRelatedFields(
      base,
      'Properties', // Nombre de la tabla relacionada
      Array.from(propertiesIds),
      ['Area cluster', 'Property UniqueID', 'Technical Constructor', 'fldq1FLXBToYEY9W3'] // Buscar pics URLs también (field ID)
    );

    const engagementsData = await fetchRelatedFields(
      base,
      'Engagements', // Nombre de la tabla relacionada
      Array.from(engagementsIds),
      ['HubSpot - Engagement ID'] // Usar nombre exacto encontrado
    );

    const teamProfilesData = await fetchRelatedFields(
      base,
      'Team Profiles', // Nombre de la tabla relacionada
      Array.from(teamProfilesIds),
      ['Name'] // Obtener el nombre del responsable
    );

    // Agregar campos relacionados a cada registro
    let fieldsAddedCount = 0;
    records.forEach((record, index) => {
      const propertiesLinks = record.fields['Properties'];
      const engagementsLinks = record.fields['Engagements'];

      // Agregar campos de Properties
      if (Array.isArray(propertiesLinks) && propertiesLinks.length > 0) {
        const firstPropertyId = propertiesLinks[0];
        const propertyData = propertiesData.get(firstPropertyId);
        if (propertyData) {
          // Usar nombres exactos encontrados en Airtable
          // Area cluster puede venir como array
          const areaClusterValue = propertyData['Area cluster'] || propertyData['Area Cluster'];
          const areaClusterFinal = Array.isArray(areaClusterValue) ? areaClusterValue[0] : areaClusterValue;
          record.fields['Area Cluster'] = areaClusterFinal;
          record.fields['Area cluster'] = areaClusterFinal; // También agregar con minúscula por si acaso
          record.fields['Property Unique ID'] = propertyData['Property UniqueID'] || propertyData['Property Unique ID'];
          record.fields['Property UniqueID'] = propertyData['Property UniqueID'] || propertyData['Property Unique ID']; // También con el nombre exacto
          // Technical Constructor puede estar en Properties
          record.fields['Technical Constructor'] = propertyData['Technical Constructor'] || propertyData['Technical construction'] || null;
          // Pics URLs - PRIORIDAD: usar el campo directo de Properties (no el relacionado de Transactions)
          // El campo se llama 'pics_url' en Properties (field ID: fldq1FLXBToYEY9W3)
          // El campo ya viene mapeado como 'fldq1FLXBToYEY9W3' o 'pics_urls_from_properties' desde fetchRelatedFields
          const picsUrlsFromProperties = propertyData['fldq1FLXBToYEY9W3'] || 
                                        propertyData['pics_urls_from_properties'] ||
                                        propertyData['pics_url'] ||  // Nombre real encontrado
                                        propertyData['Pics URLs'] || 
                                        propertyData['Pics'] || 
                                        propertyData['Photos URLs'] || 
                                        propertyData['Photos'] || 
                                        null;
          
          if (picsUrlsFromProperties) {
            record.fields['fldq1FLXBToYEY9W3'] = picsUrlsFromProperties;
            record.fields['pics_urls_from_properties'] = picsUrlsFromProperties; // También con nombre descriptivo
          }
          fieldsAddedCount++;
          
          // Log para el primer registro
          if (index === 0) {
            const allPropertyFields = Object.keys(propertyData);
            // Buscar campos que contengan 'pic' (sin importar si tienen 'url')
            const picsRelatedFields = allPropertyFields.filter(k => {
              const lower = k.toLowerCase();
              return lower.includes('pic') || 
                     lower.includes('photo') || 
                     lower.includes('image') || 
                     (lower.includes('url') && (lower.includes('pic') || lower.includes('photo') || lower.includes('image'))) ||
                     lower.includes('media');
            });
            
            // También buscar específicamente 'pics_url'
            const picsUrlField = allPropertyFields.find(k => k.toLowerCase() === 'pics_url' || k === 'pics_url');
            
            console.log('[Airtable Sync] Sample Properties data:', {
              'Area cluster': propertyData['Area cluster'],
              'Property UniqueID': propertyData['Property UniqueID'],
              'Technical Constructor': propertyData['Technical Constructor'],
              'fldq1FLXBToYEY9W3': propertyData['fldq1FLXBToYEY9W3'],
              'pics_urls_from_properties': propertyData['pics_urls_from_properties'],
              'pics_url (direct)': propertyData['pics_url'],
              'Fields related to pics/photos/images/urls': picsRelatedFields,
              'pics_url field found': picsUrlField ? `✅ Found: ${picsUrlField}` : '❌ Not found',
              'Total fields in Properties': allPropertyFields.length,
              'First 20 field names': allPropertyFields.slice(0, 20),
            });
            
            // Si encontramos campos relacionados, mostrar sus valores
            if (picsRelatedFields.length > 0) {
              console.log('[Airtable Sync] Values of pics-related fields:');
              picsRelatedFields.forEach(fieldName => {
                const value = propertyData[fieldName];
                console.log(`   ${fieldName}:`, typeof value === 'string' ? value.substring(0, 150) : value);
              });
            }
            
            // Mostrar específicamente el valor de pics_url si existe
            if (propertyData['pics_url']) {
              console.log('[Airtable Sync] ✅ pics_url field value:', typeof propertyData['pics_url'] === 'string' ? propertyData['pics_url'].substring(0, 200) : propertyData['pics_url']);
            }
          }
        } else if (index === 0) {
          console.log(`[Airtable Sync] No data found for Properties ID: ${firstPropertyId}`);
        }
      } else if (index === 0) {
        console.log('[Airtable Sync] No Properties links found in first record');
      }

      // Agregar campos de Team Profiles (Responsible Owner)
      const responsibleOwnerLink = record.fields['Responsible owner'] || record.fields['Responsible Owner'];
      if (responsibleOwnerLink) {
        const ownerId = Array.isArray(responsibleOwnerLink) ? responsibleOwnerLink[0] : responsibleOwnerLink;
        const teamProfileData = teamProfilesData.get(ownerId);
        if (teamProfileData) {
          record.fields['Responsible Owner'] = teamProfileData['Name'] || null;
          if (index === 0) {
            console.log('[Airtable Sync] Sample Team Profiles data:', {
              'Name': teamProfileData['Name'],
            });
          }
        }
      }

      // Agregar campos de Engagements
      if (Array.isArray(engagementsLinks) && engagementsLinks.length > 0) {
        const firstEngagementId = engagementsLinks[0];
        const engagementData = engagementsData.get(firstEngagementId);
          if (engagementData) {
          // Usar nombre exacto encontrado
          const hubspotId = engagementData['HubSpot - Engagement ID'] || engagementData['Hubspot ID'];
          record.fields['Hubspot ID'] = hubspotId;
          record.fields['HubSpot - Engagement ID'] = hubspotId; // También agregar con el nombre exacto
          if (index === 0) {
            console.log('[Airtable Sync] Sample Engagements data:', {
              'HubSpot - Engagement ID': engagementData['HubSpot - Engagement ID'],
            });
            console.log('[Airtable Sync] Record fields after adding Engagements:', {
              'Hubspot ID': record.fields['Hubspot ID'],
              'HubSpot - Engagement ID': record.fields['HubSpot - Engagement ID'],
            });
          }
        } else if (index === 0) {
          console.log(`[Airtable Sync] No data found for Engagements ID: ${firstEngagementId}`);
        }
      } else if (index === 0) {
        console.log('[Airtable Sync] No Engagements links found in first record');
      }
    });
    
    console.log(`[Airtable Sync] Added related fields to ${fieldsAddedCount} records`);

    return records;
  } catch (error: any) {
    console.error('[Airtable Sync] Error fetching properties:', error);
    throw new Error(`Error fetching properties from Airtable: ${error.message}`);
  }
}

/**
 * Mapea un registro de Airtable a formato Supabase
 * @param airtableProperty - Registro de Airtable a mapear
 * @param isFirstRecord - Si es el primer registro (para logging)
 */
function mapAirtableToSupabase(airtableProperty: AirtableProperty, isFirstRecord: boolean = false): any {
  const fields = airtableProperty.fields;
  // Buscar el campo con diferentes variaciones del nombre
  const uniqueIdValue = 
    fields['UNIQUEID (from Engagements)'] ||
    fields['Unique ID (From Engagements)'] ||
    fields['Unique ID From Engagements'] ||
    fields['Unique ID'];
  // El campo puede ser un array o un string - extraer el primer elemento si es array
  const uniqueId = Array.isArray(uniqueIdValue) 
    ? uniqueIdValue[0] 
    : uniqueIdValue;

  if (!uniqueId) {
    throw new Error('Unique ID (From Engagements) is required');
  }

  // Helper para extraer valor de campo (puede ser array o string)
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
    // Si es array, tomar el primer elemento (excepto si es un link field que devuelve IDs)
    if (Array.isArray(value)) {
      // Si el array contiene objetos (links), extraer IDs o nombres
      if (value.length > 0 && typeof value[0] === 'object') {
        return value; // Devolver el array completo para campos relacionados
      }
      return value[0]; // Para arrays simples, tomar el primer elemento
    }
    return value;
  };

  // Helper para extraer valores de campos relacionados (Properties, Engagements)
  const getRelatedFieldValue = (relatedTable: string, fieldName: string): any => {
    const relatedRecords = getFieldValue(relatedTable);
    if (Array.isArray(relatedRecords) && relatedRecords.length > 0) {
      // Los campos relacionados pueden venir como arrays de objetos o IDs
      // Por ahora, retornamos null ya que necesitaríamos hacer otra query para obtener los campos
      return null;
    }
    return null;
  };

  // Obtener Address - puede ser un array o string en Airtable
  const addressValue = getFieldValue('Address');
  const address = addressValue || '';

    // Mapear todos los campos - ahora incluyen campos de tablas relacionadas
  return {
    id: uniqueId,
    address: address,
    type: getFieldValue('Type') || null,
    // Campos directos
    renovation_type: getFieldValue('Required reno', ['Required reno', 'Required Reno']) || null,
    notes: getFieldValue('Set up team notes', ['Set up team notes', 'SetUp Team Notes', 'Setup Status Notes']) || null,
    'Set Up Status': getFieldValue('Set up status', ['Set up status', 'Set Up Status']) || null,
    keys_location: getFieldValue('Keys Location', ['Keys Location', 'Keys Location (If there are)']) || null,
    stage: getFieldValue('Stage', ['Stage']) || null,
    'Client email': getFieldValue('Client email', ['Client email']) || null,
    'Unique ID From Engagements': uniqueId,
    // Campos de tabla relacionada Properties (ya agregados en fetchPropertiesFromAirtable)
    area_cluster: getFieldValue('Area Cluster', ['Area Cluster', 'Area cluster']) || null,
    property_unique_id: getFieldValue('Property Unique ID', ['Property Unique ID', 'Property UniqueID']) || null,
    'Technical construction': getFieldValue('Technical Constructor', ['Technical Constructor', 'Technical construction']) || null,
    // Campos de tabla relacionada Team Profiles (Responsible Owner)
    responsible_owner: getFieldValue('Responsible Owner', ['Responsible Owner', 'Responsible owner']) || null,
    // Campos de tabla relacionada Engagements (ya agregados en fetchPropertiesFromAirtable)
    'Hubspot ID': getFieldValue('Hubspot ID', ['Hubspot ID', 'HubSpot - Engagement ID']) || null,
    // Campos adicionales para Initial Check
    next_reno_steps: getFieldValue('Next Reno Steps', ['Next Reno Steps', 'Next reno steps']) || null,
    'Renovator name': getFieldValue('Renovator Name', ['Renovator Name', 'Renovator name']) || null,
    // Campos para Upcoming Settlements (Pending to validate Budget)
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
    // Tech Budget Attachment - URL del presupuesto técnico (fldVOO4zqx5HUzIjz)
    // El campo en Airtable se llama "TECH - Budget Attachment (URLs)" y contiene la URL completa
    budget_pdf_url: (() => {
      // Buscar el campo por nombre (el nombre real en Airtable es "TECH - Budget Attachment (URLs)")
      let budgetAttachment = fields['TECH - Budget Attachment (URLs)'] || 
                            fields['Tech Budget Attachment (URLs)'] ||
                            fields['Tech Budget Attachment'] || 
                            fields['Tech Budget Attachment:'] ||
                            fields['TECH - Budget Attachment'] ||
                            fields['fldVOO4zqx5HUzIjz']; // Field ID como fallback
      
      if (!budgetAttachment) {
        return null;
      }
      
      // Si es un array de attachments (formato estándar de Airtable)
      if (Array.isArray(budgetAttachment) && budgetAttachment.length > 0) {
        const firstAttachment = budgetAttachment[0];
        // Airtable attachments tienen estructura: { id, url, filename, size, type }
        if (typeof firstAttachment === 'object' && firstAttachment.url) {
          return firstAttachment.url;
        }
        // Si el array contiene strings (URLs directas)
        if (typeof firstAttachment === 'string' && firstAttachment.startsWith('http')) {
          return firstAttachment;
        }
      }
      
      // Si es una URL directa (string) - este es el caso más común con "TECH - Budget Attachment (URLs)"
      if (typeof budgetAttachment === 'string' && budgetAttachment.startsWith('http')) {
        return budgetAttachment;
      }
      
      return null;
    })(),
    // Pics URLs - URLs de las fotos de la propiedad (fldq1FLXBToYEY9W3)
    // PRIORIDAD: Usar el campo directo de Properties (no el relacionado de Transactions)
    pics_urls: (() => {
      // PRIORIDAD 1: Campo directo de Properties (obtenido desde fetchRelatedFields)
      // El campo se llama 'pics_url' en Properties (field ID: fldq1FLXBToYEY9W3)
      let picsField = fields['pics_urls_from_properties'] ||
                     fields['fldq1FLXBToYEY9W3'] || 
                     fields['pics_url'] ||  // Nombre real encontrado en Properties
                     fields['Pics URLs'] ||
                     fields['Pics URLs:'] ||
                     fields['Pics'] ||
                     fields['Photos URLs'] ||
                     fields['Photos'] ||
                     // PRIORIDAD 2: Campo relacionado de Transactions (fallback si no hay en Properties)
                     fields['Property pictures & videos (from properties)'] ||
                     fields['Property pictures & videos'];
      
      // Debug: Log para ver qué campos están disponibles (solo para el primer registro)
      if (isFirstRecord) {
        console.log('[Airtable Sync] 🔍 Checking pics_urls field...');
        const fromProperties = fields['pics_urls_from_properties'] || fields['fldq1FLXBToYEY9W3'];
        const fromTransactions = fields['Property pictures & videos (from properties)'];
        
        if (fromProperties) {
          console.log('[Airtable Sync] ✅ Using pics_urls from Properties table (direct field)');
          console.log('[Airtable Sync] Field value:', fromProperties);
        } else if (fromTransactions) {
          console.log('[Airtable Sync] ⚠️ Using pics_urls from Transactions table (related field - fallback)');
          console.log('[Airtable Sync] Field value:', fromTransactions);
        } else {
          console.log('[Airtable Sync] ❌ No pics_urls field found in Properties or Transactions');
          console.log('[Airtable Sync] Available fields with pic/photo/image:', Object.keys(fields).filter(k => k.toLowerCase().includes('pic') || k.toLowerCase().includes('photo') || k.toLowerCase().includes('image')));
        }
        console.log('[Airtable Sync] Sample field value type:', typeof picsField, Array.isArray(picsField) ? 'array' : 'not array');
      }
      
      if (!picsField) {
        return [];
      }
      
      // Si es un array de URLs (strings)
      if (Array.isArray(picsField)) {
        const urls = picsField
          .map(item => {
            // Si es un objeto con url (attachment de Airtable)
            if (typeof item === 'object' && item.url) {
              return item.url;
            }
            // Si es un string que empieza con http o https
            if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
              return item;
            }
            return null;
          })
          .filter((url): url is string => url !== null && url.length > 0);
        
        // Debug log
        if (isFirstRecord) {
          console.log('[Airtable Sync] ✅ Found pics_urls (array):', urls.length, 'URLs');
          if (urls.length > 0) {
            console.log('[Airtable Sync] First few URLs:', urls.slice(0, 3));
          } else {
            console.log('[Airtable Sync] ⚠️ Array was empty or contained no valid URLs. Original value:', picsField);
          }
        }
        
        return urls;
      }
      
      // Si es un string, puede ser una URL única o múltiples URLs separadas por comas/saltos de línea
      if (typeof picsField === 'string') {
        // El campo pics_url en Properties viene como string con URLs separadas por comas
        // Ejemplo: "https://url1.jpg,https://url2.jpg"
        const urls = picsField
          .split(',')  // Separar por comas
          .map(url => url.trim())
          .filter(url => url.startsWith('http://') || url.startsWith('https://'));
        
        if (isFirstRecord) {
          if (urls.length > 0) {
            console.log('[Airtable Sync] ✅ Found pics_urls (string with multiple URLs):', urls.length, 'URLs');
            console.log('[Airtable Sync] First few URLs:', urls.slice(0, 3));
          } else if (picsField.startsWith('http')) {
            // Si es una URL única sin comas
            console.log('[Airtable Sync] ✅ Found pics_urls (single URL):', picsField);
            return [picsField];
          } else {
            console.log('[Airtable Sync] ⚠️ pics_urls string found but no valid URLs extracted:', picsField.substring(0, 100));
          }
        }
        
        return urls.length > 0 ? urls : (picsField.startsWith('http') ? [picsField] : []);
      }
      
      return [];
    })(),
    // Determinar fase basada en Set Up Status
    reno_phase: (() => {
      const setUpStatus = getFieldValue('Set Up Status', ['Set Up Status', 'Set up status']);
      if (setUpStatus === 'Initial Check' || setUpStatus === 'initial check') {
        return 'initial-check';
      }
      if (setUpStatus === 'Pending to validate Budget (Client & renovator) & Reno to start' ||
          setUpStatus === 'Pending to validate Budget') {
        return 'upcoming-settlements';
      }
      if (setUpStatus === 'Reno in progress' || setUpStatus === 'Reno In Progress') {
        return 'reno-in-progress';
      }
      if (setUpStatus === 'Cleaning' || setUpStatus === 'Furnishing' || 
          setUpStatus === 'cleaning' || setUpStatus === 'furnishing' ||
          setUpStatus === 'Cleaning & Furnishing' || setUpStatus === 'cleaning & furnishing') {
        return 'furnishing-cleaning';
      }
      if (setUpStatus === 'Final Check' || setUpStatus === 'final check' || 
          setUpStatus === 'Check Final' || setUpStatus === 'check final') {
        return 'final-check';
      }
      return 'upcoming-settlements'; // Default
    })(),
    airtable_property_id: airtableProperty.id,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Sincroniza propiedades desde Airtable a Supabase
 * Crea nuevas propiedades o actualiza existentes si han cambiado
 * @param tableId - ID de la tabla de Airtable
 * @param viewId - ID de la view de Airtable
 * @param isFirstPhase - Si es true, actualiza pics_urls. Si es false, solo inserta pics_urls si no existe
 */
export async function syncPropertiesFromAirtable(
  tableId: string,
  viewId: string,
  isFirstPhase: boolean = false
): Promise<{
  created: number;
  updated: number;
  errors: number;
  details: string[];
}> {
  const supabase = createAdminClient();

  const results = {
    created: 0,
    updated: 0,
    errors: 0,
    details: [] as string[],
  };

  try {
    // Obtener propiedades de Airtable
    const airtableProperties = await fetchPropertiesFromAirtable(tableId, viewId);

    // Obtener todas las propiedades existentes en Supabase que coinciden con los IDs de Airtable
    const airtablePropertyIds = airtableProperties
      .map((p) => {
        const uniqueIdValue = 
          p.fields['UNIQUEID (from Engagements)'] ||
          p.fields['Unique ID (From Engagements)'] ||
          p.fields['Unique ID From Engagements'] ||
          p.fields['Unique ID'];
        // El campo puede ser un array o un string - extraer el primer elemento si es array
        const uniqueId = Array.isArray(uniqueIdValue) 
          ? uniqueIdValue[0] 
          : uniqueIdValue;
        return uniqueId;
      })
      .filter(Boolean);

    // Buscar propiedades existentes por ID (no solo por fase)
    console.log(`[Airtable Sync] Looking for ${airtablePropertyIds.length} existing properties`);
    console.log(`[Airtable Sync] Sample IDs:`, airtablePropertyIds.slice(0, 3));
    
    // Si hay IDs, buscar propiedades existentes
    let existingProperties: any[] = [];
    if (airtablePropertyIds.length > 0) {
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('id, reno_phase, airtable_property_id')
        .in('id', airtablePropertyIds);

      if (fetchError) {
        console.error('[Airtable Sync] Error fetching existing properties:', fetchError);
        // No lanzar error, continuar con creación
      } else {
        existingProperties = data || [];
      }
    }

    console.log(`[Airtable Sync] Found ${existingProperties.length} existing properties`);

    const existingPropertyIds = new Set(
      existingProperties?.map((p) => p.id) || []
    );

    // Procesar cada propiedad de Airtable
    for (const airtableProperty of airtableProperties) {
      try {
        // Buscar el campo Unique ID (From Engagements) - nombre exacto según Airtable
        const uniqueIdValue = 
          airtableProperty.fields['UNIQUEID (from Engagements)'] ||
          airtableProperty.fields['Unique ID (From Engagements)'] ||
          airtableProperty.fields['Unique ID From Engagements'] ||
          airtableProperty.fields['Unique ID'] ||
          airtableProperty.fields['unique_id'] ||
          airtableProperty.fields['Unique ID from Engagements'];
        // El campo puede ser un array o un string - extraer el primer elemento si es array
        const uniqueId = Array.isArray(uniqueIdValue) 
          ? uniqueIdValue[0] 
          : uniqueIdValue;
        
        if (!uniqueId) {
          // Log los campos disponibles para debugging (solo el primero)
          if (airtableProperties.indexOf(airtableProperty) === 0) {
            console.log('[Airtable Sync] Available fields in first record:', Object.keys(airtableProperty.fields));
            console.log('[Airtable Sync] Sample field values:', {
              'Area Cluster': airtableProperty.fields['Area Cluster'],
              'Hubspot ID': airtableProperty.fields['Hubspot ID'],
              'Required Reno': airtableProperty.fields['Required Reno'],
              'SetUp Team Notes': airtableProperty.fields['SetUp Team Notes'],
              'Responsible Owner': airtableProperty.fields['Responsible Owner'],
              'Technical Constructor': airtableProperty.fields['Technical Constructor'],
            });
          }
          results.errors++;
          results.details.push(`Skipped: Missing Unique ID (From Engagements)`);
          continue;
        }

        const isFirstRecord = airtableProperties.indexOf(airtableProperty) === 0;
        const supabaseData = mapAirtableToSupabase(airtableProperty, isFirstRecord);
        const exists = existingPropertyIds.has(uniqueId);

        if (exists) {
          // Actualizar TODAS las propiedades existentes, sin importar su fase
          // Comparar campos para ver si hay cambios
          const { data: currentData, error: getError } = await supabase
            .from('properties')
            .select('*')
            .eq('id', uniqueId)
            .single();

          if (getError) {
            results.errors++;
            results.details.push(`Error fetching ${uniqueId}: ${getError.message}`);
            continue;
          }

          // Verificar si hay cambios significativos (incluyendo campos relacionados)
          // Siempre actualizar si hay campos relacionados nuevos (fueron null antes)
          const hasRelatedFields = 
            supabaseData.area_cluster ||
            supabaseData['Hubspot ID'] ||
            supabaseData.property_unique_id ||
            supabaseData.renovation_type ||
            supabaseData.responsible_owner ||
            supabaseData['Technical construction'];
          
          // Lógica para pics_urls:
          // - Si es la primera fase (upcoming-settlements): actualizar pics_urls si cambió
          // - Si NO es la primera fase: solo insertar pics_urls si no existe (no actualizar si ya existe)
          const currentPicsUrls = currentData?.pics_urls || [];
          const newPicsUrls = supabaseData.pics_urls || [];
          const hasPicsUrls = Array.isArray(currentPicsUrls) && currentPicsUrls.length > 0;
          const picsUrlsChanged = JSON.stringify(currentPicsUrls) !== JSON.stringify(newPicsUrls);
          
          // Si NO es la primera fase y ya tiene pics_urls, no actualizar pics_urls
          // Si NO es la primera fase y NO tiene pics_urls, insertar los nuevos
          // Si es la primera fase, actualizar normalmente
          let shouldUpdatePicsUrls = false;
          if (isFirstPhase) {
            // Primera fase: actualizar si cambió
            shouldUpdatePicsUrls = picsUrlsChanged;
            if (isFirstRecord && picsUrlsChanged) {
              console.log('[Airtable Sync] 📸 First phase: Will update pics_urls');
            }
          } else {
            // Otras fases: solo insertar si no existe
            shouldUpdatePicsUrls = !hasPicsUrls && newPicsUrls.length > 0;
            if (isFirstRecord) {
              if (hasPicsUrls) {
                console.log('[Airtable Sync] 📸 Other phase: Property already has pics_urls, will NOT update');
              } else if (newPicsUrls.length > 0) {
                console.log('[Airtable Sync] 📸 Other phase: Property has no pics_urls, will INSERT');
              }
            }
          }
          
          // Preparar datos para actualizar (excluir pics_urls si no se debe actualizar)
          const updateData = { ...supabaseData };
          if (!shouldUpdatePicsUrls) {
            // No actualizar pics_urls, mantener el valor actual
            delete updateData.pics_urls;
          }
          
          const hasChanges =
            currentData?.address !== supabaseData.address ||
            currentData?.['Set Up Status'] !== supabaseData['Set Up Status'] ||
            currentData?.notes !== supabaseData.notes ||
            currentData?.area_cluster !== supabaseData.area_cluster ||
            currentData?.['Hubspot ID'] !== supabaseData['Hubspot ID'] ||
            currentData?.property_unique_id !== supabaseData.property_unique_id ||
            currentData?.renovation_type !== supabaseData.renovation_type ||
            currentData?.responsible_owner !== supabaseData.responsible_owner ||
            currentData?.['Technical construction'] !== supabaseData['Technical construction'] ||
            currentData?.next_reno_steps !== supabaseData.next_reno_steps ||
            currentData?.['Renovator name'] !== supabaseData['Renovator name'] ||
            currentData?.budget_pdf_url !== supabaseData.budget_pdf_url ||
            shouldUpdatePicsUrls ||
            (hasRelatedFields && (!currentData?.area_cluster && !currentData?.['Hubspot ID'] && !currentData?.property_unique_id));

            if (hasChanges) {
              // Log para el primer registro para debugging
              if (airtableProperties.indexOf(airtableProperty) === 0) {
                console.log('[Airtable Sync] Sample data being sent to Supabase:', {
                  area_cluster: supabaseData.area_cluster,
                  'Hubspot ID': supabaseData['Hubspot ID'],
                  renovation_type: supabaseData.renovation_type,
                  property_unique_id: supabaseData.property_unique_id,
                  pics_urls: supabaseData.pics_urls,
                  pics_urls_count: Array.isArray(supabaseData.pics_urls) ? supabaseData.pics_urls.length : 0,
                });
              }

              const { error: updateError } = await supabase
                .from('properties')
                .update(updateData)
                .eq('id', uniqueId);

              if (updateError) {
                results.errors++;
                results.details.push(`Error updating ${uniqueId}: ${updateError.message}`);
                if (airtableProperties.indexOf(airtableProperty) === 0) {
                  console.error('[Airtable Sync] Update error details:', updateError);
                }
              } else {
                results.updated++;
                results.details.push(`Updated: ${uniqueId} (${supabaseData.address})`);
              }
            } else {
              results.details.push(`No changes: ${uniqueId}`);
            }
        } else {
          // Crear nueva propiedad
          const { error: insertError } = await supabase
            .from('properties')
            .insert({
              ...supabaseData,
              created_at: new Date().toISOString(),
            });

          if (insertError) {
            results.errors++;
            results.details.push(`Error creating ${uniqueId}: ${insertError.message}`);
          } else {
            results.created++;
            results.details.push(`Created: ${uniqueId} (${supabaseData.address})`);
          }
        }
      } catch (error: any) {
        results.errors++;
        results.details.push(`Error processing property: ${error.message}`);
        console.error('[Airtable Sync] Error processing property:', error);
      }
    }

    // Nota: No eliminamos propiedades que ya no cumplen filtros
    // Si fueron movidas manualmente, se quedan en su fase actual
    // Si están en "upcoming-settlements" pero ya no cumplen filtros, se quedan ahí

    console.log('[Airtable Sync] Sync completed:', results);
    return results;
  } catch (error: any) {
    console.error('[Airtable Sync] Fatal error:', error);
    throw error;
  }
}

