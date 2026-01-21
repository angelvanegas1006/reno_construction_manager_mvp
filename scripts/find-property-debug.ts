/**
 * Script para buscar una propiedad y mostrar todos los campos disponibles
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

async function findPropertyDebug(propertyId: string) {
  const base = getAirtableBase();
  const supabase = createAdminClient();
  
  console.log(`\n🔍 Buscando "${propertyId}" con debug completo...\n`);
  
  // Obtener algunos registros de ejemplo para ver los campos disponibles
  console.log('📋 Obteniendo registros de ejemplo para ver campos disponibles...\n');
  
  const sampleRecords: any[] = [];
  await base(AIRTABLE_TABLE_ID)
    .select({ maxRecords: 5 })
    .eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach((r) => sampleRecords.push(r));
      fetchNextPage();
    });
  
  if (sampleRecords.length > 0) {
    console.log('Campos disponibles en Airtable:');
    const firstRecord = sampleRecords[0];
    Object.keys(firstRecord.fields).forEach(key => {
      const value = firstRecord.fields[key];
      const valueStr = Array.isArray(value) ? `[${value.length} items]` : String(value).substring(0, 50);
      console.log(`   - ${key}: ${valueStr}`);
    });
    console.log('');
  }
  
  // Buscar la propiedad específica usando todos los campos posibles
  const searchPatterns = [
    propertyId,
    propertyId.replace(/-/g, ''),
    propertyId.replace(/-/g, ' '),
  ];
  
  for (const pattern of searchPatterns) {
    console.log(`\n🔍 Buscando con patrón: "${pattern}"\n`);
    
    try {
      const records: any[] = [];
      await base(AIRTABLE_TABLE_ID)
        .select({
          filterByFormula: `SEARCH("${pattern}", CONCATENATE({UNIQUEID (from Engagements)}, {Unique ID (From Engagements)}, {Unique ID From Engagements}, {Unique ID}))`,
          maxRecords: 10,
        })
        .eachPage((pageRecords) => {
          pageRecords.forEach((r) => records.push(r));
        });
      
      if (records.length > 0) {
        console.log(`✅ Encontradas ${records.length} coincidencias:\n`);
        records.forEach((record, i) => {
          console.log(`   ${i + 1}. Record ID: ${record.id}`);
          
          // Mostrar todos los campos relacionados con Unique ID
          const uniqueIdFields = [
            'UNIQUEID (from Engagements)',
            'Unique ID (From Engagements)',
            'Unique ID From Engagements',
            'Unique ID',
            'EQ UNIQUEID (fro...)',
          ];
          
          uniqueIdFields.forEach(fieldName => {
            const value = record.fields[fieldName];
            if (value !== undefined) {
              const displayValue = Array.isArray(value) ? value.join(', ') : value;
              console.log(`      ${fieldName}: ${displayValue}`);
            }
          });
          
          console.log(`      Address: ${record.fields['Address'] || 'N/A'}`);
          console.log(`      Transaction Name: ${record.fields['Transaction Name'] || 'N/A'}`);
          console.log(`      Set Up Status: ${record.fields['Set Up Status'] || record.fields['Set up status'] || 'N/A'}`);
          console.log('');
        });
        
        // Verificar si alguna coincide exactamente
        const exactMatch = records.find(r => {
          const uniqueIdValue = 
            r.fields['UNIQUEID (from Engagements)'] ||
            r.fields['Unique ID (From Engagements)'] ||
            r.fields['Unique ID From Engagements'] ||
            r.fields['Unique ID'];
          const uniqueId = Array.isArray(uniqueIdValue) ? uniqueIdValue[0] : uniqueIdValue;
          return uniqueId === propertyId;
        });
        
        if (exactMatch) {
          console.log(`✅ Coincidencia exacta encontrada!\n`);
          return exactMatch;
        }
      }
    } catch (error: any) {
      console.log(`   Error: ${error.message}`);
    }
  }
  
  // Buscar en Supabase
  console.log(`\n🔍 Buscando en Supabase...\n`);
  
  const { data: supabaseProperty, error } = await supabase
    .from('properties')
    .select('id, reno_phase, "Set Up Status", address, airtable_property_id')
    .eq('id', propertyId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.log(`❌ Error: ${error.message}`);
  } else if (supabaseProperty) {
    console.log(`✅ ENCONTRADA en Supabase:`);
    console.log(`   ID: ${supabaseProperty.id}`);
    console.log(`   Address: ${supabaseProperty.address || 'N/A'}`);
    console.log(`   reno_phase: ${supabaseProperty.reno_phase || 'NULL'}`);
    console.log(`   Set Up Status: ${supabaseProperty['Set Up Status'] || 'NULL'}`);
  } else {
    console.log(`❌ NO encontrada en Supabase`);
  }
}

const propertyId = process.argv[2] || 'SP-RZ2-NQB-005312';
findPropertyDebug(propertyId).catch(console.error);
