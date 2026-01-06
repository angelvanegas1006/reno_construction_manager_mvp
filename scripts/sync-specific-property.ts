/**
 * Script para sincronizar una propiedad específica desde Airtable
 * Ignora los filtros de las vistas y sincroniza directamente por Record ID
 * Ejecutar con: npm run sync:specific-property <recordId> [phase]
 */

import { loadEnvConfig } from '@next/env';
import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapSetUpStatusToKanbanPhase } from '@/lib/supabase/kanban-mapping';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || 'appT59F8wolMDKZeG';
const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';

// Función helper para obtener valor de campo
function getFieldValue(fields: any, fieldName: string, alternativeNames?: string[]): any {
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
}

// Función para obtener campos relacionados
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
    const recordsMap = new Map<string, any>();
    
    await base(relatedTableName)
      .select({
        filterByFormula: `OR(${recordIds.map(id => `RECORD_ID() = '${id}'`).join(',')})`,
      })
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach((record) => {
          const recordData: any = { id: record.id };
          fieldsToFetch.forEach((fieldName) => {
            recordData[fieldName] = record.fields[fieldName];
          });
          recordsMap.set(record.id, recordData);
        });
        fetchNextPage();
      });

    return recordsMap;
  } catch (error: any) {
    console.error(`Error fetching ${relatedTableName}:`, error.message);
    return new Map();
  }
}

// Mapear Airtable a Supabase (similar a sync-from-airtable.ts)
function mapAirtableToSupabase(airtableProperty: any, relatedData: {
  properties: Map<string, any>;
  engagements: Map<string, any>;
  teamProfiles: Map<string, any>;
}): any {
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

  const addressValue = getFieldValue(fields, 'Address');
  const address = addressValue || '';

  // Obtener datos relacionados
  const propertiesLinks = getFieldValue(fields, 'Properties');
  const propertiesId = Array.isArray(propertiesLinks) ? propertiesLinks[0] : propertiesLinks;
  const propertyData = propertiesId ? relatedData.properties.get(propertiesId) : null;

  const engagementsLinks = getFieldValue(fields, 'Engagements');
  const engagementsId = Array.isArray(engagementsLinks) ? engagementsLinks[0] : engagementsLinks;
  const engagementData = engagementsId ? relatedData.engagements.get(engagementsId) : null;

  const responsibleOwnerLinks = getFieldValue(fields, 'Responsible owner', ['Responsible Owner']);
  const responsibleOwnerId = Array.isArray(responsibleOwnerLinks) ? responsibleOwnerLinks[0] : responsibleOwnerLinks;
  const responsibleOwnerData = responsibleOwnerId ? relatedData.teamProfiles.get(responsibleOwnerId) : null;

  // Determinar fase basada en Set Up Status
  const setUpStatus = getFieldValue(fields, 'Set up status', ['Set up status', 'Set Up Status']) || null;
  const renoPhase = mapSetUpStatusToKanbanPhase(setUpStatus) || 'upcoming-settlements';

  return {
    id: uniqueId,
    address: address,
    type: getFieldValue(fields, 'Type') || null,
    renovation_type: getFieldValue(fields, 'Required reno', ['Required reno', 'Required Reno']) || null,
    notes: getFieldValue(fields, 'Set up team notes', ['Set up team notes', 'SetUp Team Notes', 'Setup Status Notes']) || null,
    'Set Up Status': setUpStatus,
    keys_location: getFieldValue(fields, 'Keys Location', ['Keys Location', 'Keys Location (If there are)']) || null,
    stage: getFieldValue(fields, 'Stage', ['Stage']) || null,
    'Client email': getFieldValue(fields, 'Client email', ['Client email']) || null,
    'Unique ID From Engagements': uniqueId,
    area_cluster: propertyData?.['Area cluster'] || getFieldValue(fields, 'Area Cluster', ['Area Cluster', 'Area cluster']) || null,
    property_unique_id: propertyData?.['Property UniqueID'] || getFieldValue(fields, 'Property Unique ID', ['Property Unique ID', 'Property UniqueID']) || null,
    'Technical construction': getFieldValue(fields, 'fldtTmer8awVKDx7Y', ['fldtTmer8awVKDx7Y', 'Technical construction', 'Technical Constructor']) || null,
    responsible_owner: responsibleOwnerData?.['Name'] || null,
    'Hubspot ID': engagementData?.['HubSpot - Engagement ID'] || getFieldValue(fields, 'Hubspot ID', ['Hubspot ID', 'HubSpot - Engagement ID']) || null,
    next_reno_steps: getFieldValue(fields, 'Next Reno Steps', ['Next Reno Steps', 'Next reno steps']) || null,
    'Renovator name': getFieldValue(fields, 'Renovator Name', ['Renovator Name', 'Renovator name']) || null,
    'Estimated Visit Date': (() => {
      const dateValue = getFieldValue(fields, 'Est. visit date', [
        'Est. visit date',
        'Estimated Visit Date', 
        'Estimated visit date', 
        'fldIhqPOAFL52MMBn'
      ]);
      if (dateValue) {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // YYYY-MM-DD
          }
        } catch (e) {
          // Si falla la conversión, retornar null
        }
      }
      return null;
    })(),
    start_date: getFieldValue(fields, 'Reno Start Date', ['Reno Start Date', 'Reno start date', 'start_date']) || null,
    estimated_end_date: getFieldValue(fields, 'Estimated Reno End Date', ['Estimated Reno End Date', 'Est. Reno End Date', 'estimated_end_date']) || null,
    reno_phase: renoPhase,
    pics_urls: propertyData?.['pics_url'] ? (Array.isArray(propertyData['pics_url']) ? propertyData['pics_url'] : [propertyData['pics_url']]) : [],
    airtable_property_id: propertiesId || airtableProperty.id, // Usar Properties ID si existe, sino Transactions ID
    updated_at: new Date().toISOString(),
  };
}

async function syncSpecificProperty(recordId: string, targetPhase?: string) {
  if (!AIRTABLE_API_KEY) {
    console.error('❌ NEXT_PUBLIC_AIRTABLE_API_KEY no está configurada');
    process.exit(1);
  }

  const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
  const table = base(AIRTABLE_TABLE_ID);
  const supabase = createAdminClient();

  console.log(`\n🔍 Sincronizando propiedad: ${recordId}\n`);

  try {
    // Obtener el record directamente
    const record = await table.find(recordId);
    console.log('✅ Record encontrado en Airtable');

    // Obtener IDs de tablas relacionadas
    const propertiesIds = new Set<string>();
    const engagementsIds = new Set<string>();
    const teamProfilesIds = new Set<string>();

    const propertiesLinks = record.fields['Properties'];
    if (Array.isArray(propertiesLinks)) {
      propertiesLinks.forEach((link: any) => {
        if (typeof link === 'string') propertiesIds.add(link);
      });
    }

    const engagementsLinks = record.fields['Engagements'];
    if (Array.isArray(engagementsLinks)) {
      engagementsLinks.forEach((link: any) => {
        if (typeof link === 'string') engagementsIds.add(link);
      });
    }

    const responsibleOwnerLinks = record.fields['Responsible owner'] || record.fields['Responsible Owner'];
    if (Array.isArray(responsibleOwnerLinks)) {
      responsibleOwnerLinks.forEach((link: any) => {
        if (typeof link === 'string') teamProfilesIds.add(link);
      });
    } else if (typeof responsibleOwnerLinks === 'string') {
      teamProfilesIds.add(responsibleOwnerLinks);
    }

    // Obtener datos relacionados
    console.log('📥 Obteniendo datos relacionados...');
    const propertiesData = await fetchRelatedFields(base, 'Properties', Array.from(propertiesIds), ['Area cluster', 'Property UniqueID', 'pics_url']);
    const engagementsData = await fetchRelatedFields(base, 'Engagements', Array.from(engagementsIds), ['HubSpot - Engagement ID']);
    const teamProfilesData = await fetchRelatedFields(base, 'Team Profiles', Array.from(teamProfilesIds), ['Name']);

    // Mapear a formato Supabase
    const airtableProperty = {
      id: record.id,
      fields: record.fields,
    };

    const supabaseData = mapAirtableToSupabase(airtableProperty, {
      properties: propertiesData,
      engagements: engagementsData,
      teamProfiles: teamProfilesData,
    });

    // Si se especificó una fase, usarla
    if (targetPhase) {
      supabaseData.reno_phase = targetPhase;
      console.log(`📌 Usando fase especificada: ${targetPhase}`);
    }

    console.log('\n📋 Datos a sincronizar:');
    console.log(`   ID: ${supabaseData.id}`);
    console.log(`   Address: ${supabaseData.address}`);
    console.log(`   Phase: ${supabaseData.reno_phase}`);
    console.log(`   Set Up Status: ${supabaseData['Set Up Status']}`);
    console.log(`   Airtable Property ID: ${supabaseData.airtable_property_id}`);

    // Upsert en Supabase
    console.log('\n💾 Guardando en Supabase...');
    const { data, error } = await supabase
      .from('properties')
      .upsert(supabaseData, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error al guardar en Supabase:', error);
      throw error;
    }

    console.log('\n✅ Propiedad sincronizada exitosamente!');
    console.log(`   ID: ${data.id}`);
    console.log(`   Address: ${data.address}`);
    console.log(`   Phase: ${data.reno_phase}`);
    console.log(`   Set Up Status: ${data['Set Up Status']}`);

  } catch (error: any) {
    if (error.error === 'NOT_FOUND') {
      console.error('❌ Record NO encontrado en Airtable');
    } else {
      console.error('❌ Error:', error.message || error);
    }
    throw error;
  }
}

// Obtener argumentos
const recordId = process.argv[2];
const targetPhase = process.argv[3];

if (!recordId) {
  console.error('❌ Por favor proporciona un Record ID');
  console.log('   Uso: npm run sync:specific-property <recordId> [phase]');
  console.log('   Ejemplo: npm run sync:specific-property recSILwFOJdg4lnpS upcoming-settlements');
  process.exit(1);
}

syncSpecificProperty(recordId, targetPhase)
  .then(() => {
    console.log('\n✅ Sincronización completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

