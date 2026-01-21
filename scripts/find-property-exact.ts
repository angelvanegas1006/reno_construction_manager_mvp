/**
 * Script para buscar una propiedad exacta en Airtable y Supabase
 */

import { loadEnvConfig } from '@next/env';
import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || 'appT59F8wolMDKZeG';
const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';

function getAirtableBase() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error('Missing Airtable credentials');
  }
  return new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
}

async function findProperty(propertyId: string) {
  const base = getAirtableBase();
  const supabase = createAdminClient();
  
  console.log(`\n🔍 Buscando "${propertyId}" en Airtable y Supabase...\n`);
  
  // Buscar en Airtable
  const fieldNames = [
    'UNIQUEID (from Engagements)',
    'Unique ID (From Engagements)', 
    'Unique ID From Engagements',
    'Unique ID',
    'EQ UNIQUEID (fro...)',
  ];
  
  let airtableRecord: any = null;
  
  for (const fieldName of fieldNames) {
    try {
      const records: any[] = [];
      await base(AIRTABLE_TABLE_ID)
        .select({
          filterByFormula: `{${fieldName}} = "${propertyId}"`,
          maxRecords: 1,
        })
        .eachPage((pageRecords) => {
          pageRecords.forEach((r) => records.push(r));
        });
      
      if (records.length > 0) {
        airtableRecord = records[0];
        console.log(`✅ ENCONTRADA en Airtable (campo: ${fieldName})`);
        console.log(`   Record ID: ${airtableRecord.id}`);
        console.log(`   Address: ${airtableRecord.fields['Address'] || 'N/A'}`);
        console.log(`   Transaction Name: ${airtableRecord.fields['Transaction Name'] || 'N/A'}`);
        console.log(`   Set Up Status: ${airtableRecord.fields['Set Up Status'] || airtableRecord.fields['Set up status'] || 'N/A'}`);
        console.log(`   Stage: ${airtableRecord.fields['Stage'] || 'N/A'}`);
        console.log(`   Reno Duration: ${airtableRecord.fields['fx Reno Duration'] || airtableRecord.fields['Reno Duration'] || 'N/A'}`);
        console.log(`   Technical: ${airtableRecord.fields['Technical...'] || 'N/A'}`);
        break;
      }
    } catch (error: any) {
      // Continuar con el siguiente campo
    }
  }
  
  if (!airtableRecord) {
    console.log(`❌ NO encontrada en Airtable`);
  }
  
  // Buscar en Supabase
  console.log(`\n🔍 Buscando en Supabase...\n`);
  
  const { data: supabaseProperty, error } = await supabase
    .from('properties')
    .select('id, reno_phase, "Set Up Status", address, airtable_property_id')
    .eq('id', propertyId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.log(`❌ Error buscando en Supabase: ${error.message}`);
  } else if (supabaseProperty) {
    console.log(`✅ ENCONTRADA en Supabase:`);
    console.log(`   ID: ${supabaseProperty.id}`);
    console.log(`   Address: ${supabaseProperty.address || 'N/A'}`);
    console.log(`   reno_phase: ${supabaseProperty.reno_phase || 'NULL'}`);
    console.log(`   Set Up Status: ${supabaseProperty['Set Up Status'] || 'NULL'}`);
    console.log(`   airtable_property_id: ${supabaseProperty.airtable_property_id || 'NULL'}`);
  } else {
    console.log(`❌ NO encontrada en Supabase`);
  }
  
  // Comparar estados
  if (airtableRecord && supabaseProperty) {
    console.log(`\n📊 COMPARACIÓN:\n`);
    
    const airtableStatus = airtableRecord.fields['Set Up Status'] || airtableRecord.fields['Set up status'] || 'N/A';
    const supabaseStatus = supabaseProperty['Set Up Status'] || 'NULL';
    const supabasePhase = supabaseProperty.reno_phase || 'NULL';
    
    console.log(`   Airtable - Set Up Status: ${airtableStatus}`);
    console.log(`   Supabase - Set Up Status: ${supabaseStatus}`);
    console.log(`   Supabase - reno_phase: ${supabasePhase}`);
    
    // Verificar si necesita sincronización
    if (airtableStatus === 'Reno in progress' && supabasePhase !== 'reno-in-progress') {
      console.log(`\n⚠️  La propiedad necesita sincronización: debería estar en fase 'reno-in-progress'`);
    }
  } else if (airtableRecord && !supabaseProperty) {
    console.log(`\n⚠️  La propiedad existe en Airtable pero NO en Supabase - necesita ser sincronizada`);
  }
}

const propertyId = process.argv[2] || 'SP-RZ2-NQB-005312';
findProperty(propertyId).catch(console.error);
