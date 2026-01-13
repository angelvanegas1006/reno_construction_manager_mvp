#!/usr/bin/env tsx
/**
 * Script para verificar una propiedad específica con Real Settlement Date
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';
import Airtable from 'airtable';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno de Airtable');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);
const supabase = createAdminClient();

async function main() {
  console.log('🔍 Verificando propiedades con Real Settlement Date...\n');

  try {
    // Obtener algunas propiedades de Supabase que tengan Real Settlement Date
    const { data: supabaseProperties, error } = await supabase
      .from('properties')
      .select('id, address, "Real Settlement Date"')
      .not('Real Settlement Date', 'is', null)
      .limit(5);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (!supabaseProperties || supabaseProperties.length === 0) {
      console.log('⚠️ No se encontraron propiedades con Real Settlement Date en Supabase');
      return;
    }

    console.log(`✅ Encontradas ${supabaseProperties.length} propiedades en Supabase con Real Settlement Date\n`);

    // Verificar cada una en Airtable
    for (const supabaseProp of supabaseProperties) {
      const uniqueId = supabaseProp.id;
      const supabaseDate = (supabaseProp as any)['Real Settlement Date'];

      console.log(`\n📝 Propiedad: ${supabaseProp.address || uniqueId}`);
      console.log(`   Unique ID: ${uniqueId}`);
      console.log(`   Supabase Real Settlement Date: ${supabaseDate}`);

      // Buscar en Airtable
      const records: any[] = [];
      try {
        // Buscar usando el field ID directamente
        await base('Transactions')
          .select({
            maxRecords: 100,
          })
          .eachPage((pageRecords, fetchNextPage) => {
            pageRecords.forEach((record) => {
              const recordUniqueId = record.fields['fldrpCWcjaKEDCy4g'] || 
                                    record.fields['UNIQUEID (from Engagements)'] ||
                                    record.fields['Unique ID (From Engagements)'] ||
                                    record.fields['Unique ID From Engagements'];
              const recordUniqueIdValue = Array.isArray(recordUniqueId) ? recordUniqueId[0] : recordUniqueId;
              if (recordUniqueIdValue === uniqueId) {
                records.push(record);
              }
            });
            fetchNextPage();
          });

        if (records.length > 0) {
          const airtableRecord = records[0];
          const airtableDate = airtableRecord.fields['fldpQgS6HzhX0nXal'] || 
                              airtableRecord.fields['Real settlement date'] ||
                              airtableRecord.fields['Real Settlement Date'];
          
          if (airtableDate) {
            let airtableDateFormatted: string | null = null;
            try {
              const date = new Date(airtableDate);
              if (!isNaN(date.getTime())) {
                airtableDateFormatted = date.toISOString().split('T')[0];
              }
            } catch (e) {
              // Ignore
            }

            console.log(`   Airtable Real Settlement Date: ${airtableDate} → ${airtableDateFormatted}`);
            const match = airtableDateFormatted === supabaseDate;
            console.log(`   ${match ? '✅' : '❌'} ${match ? 'Coincide' : 'NO COINCIDE'}`);
          } else {
            console.log(`   ⚠️ No tiene Real Settlement Date en Airtable`);
          }
        } else {
          console.log(`   ⚠️ No encontrada en Airtable`);
        }
      } catch (error: any) {
        console.log(`   ❌ Error buscando en Airtable: ${error.message}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

