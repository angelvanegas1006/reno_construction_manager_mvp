#!/usr/bin/env tsx
/**
 * Script para sincronizar una propiedad específica de Airtable a Supabase
 * por su Unique ID, incluso si no está en ninguna view
 * 
 * Uso: npm run sync:property-by-id -- SP-NIU-O3C-005809
 * O: tsx scripts/sync-specific-property-by-id.ts SP-NIU-O3C-005809
 */

import Airtable from 'airtable';
import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';
import { mapAirtableToSupabase } from '../lib/airtable/sync-from-airtable';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA'; // Transactions

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno de Airtable');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);
const supabase = createAdminClient();

async function syncPropertyByUniqueId(uniqueId: string) {
  console.log(`🔍 Buscando propiedad con Unique ID: ${uniqueId}\n`);

  try {
    // Buscar en Transactions por Unique ID
    const records: any[] = [];
    
    // Intentar buscar con diferentes nombres de campo
    const fieldNames = [
      'UNIQUEID (from Engagements)',
      'Unique ID (From Engagements)', 
      'Unique ID From Engagements',
      'Unique ID'
    ];
    
    let found = false;
    for (const fieldName of fieldNames) {
      try {
        await base('Transactions')
          .select({
            filterByFormula: `{${fieldName}} = "${uniqueId}"`,
            maxRecords: 1,
          })
          .eachPage((pageRecords, fetchNextPage) => {
            pageRecords.forEach((record) => {
              records.push(record);
            });
            fetchNextPage();
          });
        
        if (records.length > 0) {
          found = true;
          break;
        }
      } catch (error: any) {
        // Continuar con el siguiente nombre de campo
        continue;
      }
    }
    
    // Si no se encontró con filtros, buscar manualmente
    if (!found) {
      await base('Transactions')
        .select({
          maxRecords: 1000, // Limitar para no sobrecargar
        })
        .eachPage((pageRecords, fetchNextPage) => {
          pageRecords.forEach((record) => {
            const recordUniqueId = 
              record.fields['UNIQUEID (from Engagements)'] ||
              record.fields['Unique ID (From Engagements)'] ||
              record.fields['Unique ID From Engagements'] ||
              record.fields['Unique ID'];
            
            const recordUniqueIdValue = Array.isArray(recordUniqueId) 
              ? recordUniqueId[0] 
              : recordUniqueId;
            
            if (recordUniqueIdValue === uniqueId) {
              records.push(record);
            }
          });
          fetchNextPage();
        });
    }

    if (records.length === 0) {
      console.error(`❌ No se encontró ninguna propiedad con Unique ID: ${uniqueId}`);
      console.log('\n💡 Verifica que el Unique ID sea correcto en Airtable');
      process.exit(1);
    }

    const record = records[0];
    console.log(`✅ Propiedad encontrada en Airtable:`);
    console.log(`   Record ID: ${record.id}`);
    console.log(`   Address: ${record.fields['Address'] || 'N/A'}`);
    console.log(`   Stage: ${record.fields['Stage'] || 'N/A'}`);
    console.log(`   Set Up Status: ${record.fields['Set up status'] || record.fields['Set Up Status'] || 'N/A'}`);
    console.log(`   Type: ${record.fields['Type'] || 'N/A'}`);
    console.log(`   Test Flag: ${record.fields['Test Flag'] || 'N/A'}\n`);

    // Obtener campos relacionados (Properties, Engagements, Team Profiles)
    const propertiesIds = new Set<string>();
    const engagementsIds = new Set<string>();
    const teamProfilesIds = new Set<string>();

    if (Array.isArray(record.fields['Properties'])) {
      record.fields['Properties'].forEach((link: any) => {
        if (typeof link === 'string') propertiesIds.add(link);
      });
    }

    if (Array.isArray(record.fields['Engagements'])) {
      record.fields['Engagements'].forEach((link: any) => {
        if (typeof link === 'string') engagementsIds.add(link);
      });
    }

    if (Array.isArray(record.fields['Responsible Owner'])) {
      record.fields['Responsible Owner'].forEach((link: any) => {
        if (typeof link === 'string') teamProfilesIds.add(link);
      });
    }

    // Obtener datos relacionados
    const relatedData: any = {
      properties: new Map(),
      engagements: new Map(),
      teamProfiles: new Map(),
    };

    if (propertiesIds.size > 0) {
      const propertiesRecords = await Promise.all(
        Array.from(propertiesIds).map(id => base('Properties').find(id))
      );
      propertiesRecords.forEach(prop => {
        relatedData.properties.set(prop.id, prop.fields);
      });
    }

    if (engagementsIds.size > 0) {
      const engagementsRecords = await Promise.all(
        Array.from(engagementsIds).map(id => base('Engagements').find(id))
      );
      engagementsRecords.forEach(eng => {
        relatedData.engagements.set(eng.id, eng.fields);
      });
    }

    if (teamProfilesIds.size > 0) {
      const teamProfilesRecords = await Promise.all(
        Array.from(teamProfilesIds).map(id => base('Team Profiles').find(id))
      );
      teamProfilesRecords.forEach(team => {
        relatedData.teamProfiles.set(team.id, team.fields);
      });
    }

    // Agregar campos relacionados al record
    if (propertiesIds.size > 0) {
      const firstPropertyId = Array.from(propertiesIds)[0];
      const propertyData = relatedData.properties.get(firstPropertyId);
      if (propertyData) {
        Object.assign(record.fields, {
          'Area Cluster': propertyData['Area Cluster'] || propertyData['Area cluster'],
          'Property Unique ID': propertyData['Property Unique ID'] || propertyData['Property UniqueID'],
        });
      }
    }

    if (engagementsIds.size > 0) {
      const firstEngagementId = Array.from(engagementsIds)[0];
      const engagementData = relatedData.engagements.get(firstEngagementId);
      if (engagementData) {
        Object.assign(record.fields, {
          'Hubspot ID': engagementData['HubSpot - Engagement ID'] || engagementData['Hubspot ID'],
        });
      }
    }

    if (teamProfilesIds.size > 0) {
      const firstTeamId = Array.from(teamProfilesIds)[0];
      const teamData = relatedData.teamProfiles.get(firstTeamId);
      if (teamData) {
        Object.assign(record.fields, {
          'Responsible Owner': teamData['Name'],
        });
      }
    }

    // Mapear a formato Supabase
    const airtableProperty = {
      id: record.id,
      fields: record.fields,
    };

    const supabaseData = mapAirtableToSupabase(airtableProperty);

    // Determinar la fase basada en Set Up Status
    let renoPhase = 'upcoming-settlements'; // Default
    const setUpStatus = record.fields['Set up status'] || record.fields['Set Up Status'];
    
    if (setUpStatus === 'initial check') {
      renoPhase = 'initial-check';
    } else if (setUpStatus === 'pending to validate budget' || setUpStatus === 'reno to start') {
      renoPhase = 'reno-budget';
    } else if (setUpStatus === 'reno in progress') {
      renoPhase = 'reno-in-progress';
    } else if (setUpStatus === 'furnishing') {
      renoPhase = 'furnishing';
    } else if (setUpStatus === 'cleaning') {
      renoPhase = 'cleaning';
    } else if (setUpStatus === 'final check') {
      renoPhase = 'final-check';
    }

    supabaseData.reno_phase = renoPhase;
    supabaseData.airtable_property_id = record.id;

    console.log(`📊 Datos a sincronizar:`);
    console.log(`   Unique ID: ${supabaseData.id}`);
    console.log(`   Address: ${supabaseData.address}`);
    console.log(`   Phase: ${renoPhase}`);
    console.log(`   Set Up Status: ${setUpStatus}\n`);

    // Verificar si ya existe en Supabase
    const { data: existing, error: fetchError } = await supabase
      .from('properties')
      .select('id, reno_phase')
      .eq('id', uniqueId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error(`❌ Error verificando propiedad existente:`, fetchError);
      process.exit(1);
    }

    if (existing) {
      // Actualizar
      console.log(`🔄 Actualizando propiedad existente...`);
      const { error: updateError } = await supabase
        .from('properties')
        .update(supabaseData)
        .eq('id', uniqueId);

      if (updateError) {
        console.error(`❌ Error actualizando propiedad:`, updateError);
        process.exit(1);
      }

      console.log(`✅ Propiedad actualizada exitosamente`);
      console.log(`   De fase: ${existing.reno_phase} → ${renoPhase}`);
    } else {
      // Crear
      console.log(`➕ Creando nueva propiedad...`);
      const { error: insertError } = await supabase
        .from('properties')
        .insert({
          ...supabaseData,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error(`❌ Error creando propiedad:`, insertError);
        process.exit(1);
      }

      console.log(`✅ Propiedad creada exitosamente en fase: ${renoPhase}`);
    }

  } catch (error: any) {
    console.error(`❌ Error:`, error.message);
    console.error(error);
    process.exit(1);
  }
}

// Obtener Unique ID del argumento
const uniqueId = process.argv[2];

if (!uniqueId) {
  console.error('❌ Debes proporcionar un Unique ID');
  console.log('\nUso:');
  console.log('  tsx scripts/sync-specific-property-by-id.ts SP-NIU-O3C-005809');
  console.log('  O: npm run sync:property-by-id -- SP-NIU-O3C-005809');
  process.exit(1);
}

syncPropertyByUniqueId(uniqueId);

