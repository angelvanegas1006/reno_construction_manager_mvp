/**
 * Script para buscar propiedad por nombre de transacción
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

async function findByTransactionName(searchTerm: string) {
  const base = getAirtableBase();
  const supabase = createAdminClient();
  
  console.log(`\n🔍 Buscando por nombre de transacción: "${searchTerm}"...\n`);
  
  try {
    const records: any[] = [];
    await base(AIRTABLE_TABLE_ID)
      .select({
        filterByFormula: `SEARCH("${searchTerm}", {Transaction Name})`,
        maxRecords: 20,
      })
      .eachPage((pageRecords) => {
        pageRecords.forEach((r) => records.push(r));
      });
    
    if (records.length > 0) {
      console.log(`✅ Encontradas ${records.length} coincidencias:\n`);
      
      let targetProperty: any = null;
      
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const uniqueIdValue = 
          record.fields['UNIQUEID (from Engagements)'] ||
          record.fields['Unique ID (From Engagements)'] ||
          record.fields['Unique ID From Engagements'] ||
          record.fields['Unique ID'];
        
        const uniqueId = Array.isArray(uniqueIdValue) 
          ? uniqueIdValue[0] 
          : uniqueIdValue;
        
        console.log(`   ${i + 1}. Record ID: ${record.id}`);
        console.log(`      Transaction Name: ${record.fields['Transaction Name'] || 'N/A'}`);
        console.log(`      Unique ID: ${uniqueId || 'N/A'}`);
        console.log(`      Address: ${record.fields['Address'] || 'N/A'}`);
        console.log(`      Set Up Status: ${record.fields['Set Up Status'] || record.fields['Set up status'] || 'N/A'}`);
        console.log(`      Stage: ${record.fields['Stage'] || 'N/A'}`);
        console.log(`      Reno Duration: ${record.fields['fx Reno Duration'] || record.fields['Reno Duration'] || 'N/A'}`);
        console.log('');
        
        // Si coincide con el ID que buscamos, guardar para procesar después
        if (uniqueId === 'SP-RZ2-NQB-005312' || uniqueId === 'SP-RZ2-NQB005312') {
          targetProperty = { record, uniqueId };
        }
      }
      
      // Procesar la propiedad objetivo si se encontró
      if (targetProperty) {
        console.log(`\n   ✅ Propiedad objetivo encontrada!\n`);
        
        const { data: supabaseProperty } = await supabase
          .from('properties')
          .select('id, reno_phase, "Set Up Status", address')
          .eq('id', targetProperty.uniqueId)
          .single();
        
        if (supabaseProperty) {
          console.log(`   Estado actual en Supabase:`);
          console.log(`      reno_phase: ${supabaseProperty.reno_phase || 'NULL'}`);
          console.log(`      Set Up Status: ${supabaseProperty['Set Up Status'] || 'NULL'}`);
          
          // Si está en "Reno in progress" en Airtable pero no en Supabase, actualizar
          const airtableStatus = targetProperty.record.fields['Set Up Status'] || targetProperty.record.fields['Set up status'];
          console.log(`   Set Up Status en Airtable: ${airtableStatus}`);
          
          if (airtableStatus === 'Reno in progress' && supabaseProperty.reno_phase !== 'reno-in-progress') {
            console.log(`\n   🔧 Actualizando fase a 'reno-in-progress'...\n`);
            
            const { error: updateError } = await supabase
              .from('properties')
              .update({ 
                reno_phase: 'reno-in-progress',
                'Set Up Status': 'Reno in progress',
                updated_at: new Date().toISOString()
              })
              .eq('id', targetProperty.uniqueId);
            
            if (updateError) {
              console.error(`   ❌ Error: ${updateError.message}`);
            } else {
              console.log(`   ✅ Fase actualizada correctamente`);
            }
          }
        }
      }
    } else {
      console.log(`❌ No se encontraron coincidencias`);
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

const searchTerm = process.argv[2] || 'Santiago de la Mata';
findByTransactionName(searchTerm).catch(console.error);
