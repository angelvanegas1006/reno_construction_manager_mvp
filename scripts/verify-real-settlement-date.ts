#!/usr/bin/env tsx
/**
 * Script para verificar si real_settlement_date se está sincronizando correctamente desde Airtable
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';
import Airtable from 'airtable';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
// El campo real_settlement_date está en Transactions, no en Properties
const airtableTableName = 'Transactions';

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno de Airtable');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);
const supabase = createAdminClient();

async function main() {
  console.log('🔍 Verificando sincronización de real_settlement_date...\n');
  console.log('📋 Buscando en tabla Transactions (no Properties)...\n');

  try {
    // 1. Obtener algunas propiedades de Airtable que tengan real_settlement_date
    console.log('📋 Buscando propiedades en Transactions con Real settlement date...');
    const airtableRecords: any[] = [];
    
    // Obtener todas las propiedades y filtrar las que tienen real_settlement_date
    await base(airtableTableName)
      .select({
        maxRecords: 100,
      })
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach((record) => {
          // Intentar obtener el campo por field ID o nombres alternativos
          // El field ID es fldpQgS6HzhX0nXal según el usuario
          const realSettlementDate = record.fields['fldpQgS6HzhX0nXal'] || 
                                    record.fields['Real settlement date'] ||
                                    record.fields['Real Settlement Date'];
          if (realSettlementDate) {
            const uniqueId = record.fields['UNIQUEID (from Engagements)'] || 
                           record.fields['Unique ID (From Engagements)'] ||
                           record.fields['Unique ID From Engagements'] ||
                           record.fields['Unique ID'];
            // El uniqueId puede ser un array
            const uniqueIdValue = Array.isArray(uniqueId) ? uniqueId[0] : uniqueId;
            
            if (uniqueIdValue) {
              airtableRecords.push({
                id: record.id,
                uniqueId: uniqueIdValue,
                realSettlementDate: realSettlementDate,
                address: record.fields['Address'],
              });
            }
          }
        });
        fetchNextPage();
      });

    console.log(`✅ Encontradas ${airtableRecords.length} propiedades en Airtable con Real settlement date\n`);

    if (airtableRecords.length === 0) {
      console.log('⚠️ No se encontraron propiedades con Real settlement date en Airtable');
      return;
    }

    // 2. Verificar en Supabase
    console.log('🔍 Verificando en Supabase...\n');
    
    for (const airtableRecord of airtableRecords.slice(0, 5)) {
      if (!airtableRecord.uniqueId) {
        console.log(`⚠️ Propiedad sin Unique ID: ${airtableRecord.address || airtableRecord.id}`);
        continue;
      }

      const { data: supabaseProperty, error } = await supabase
        .from('properties')
        .select('id, address, "Real Settlement Date"')
        .eq('id', airtableRecord.uniqueId)
        .maybeSingle();

      if (error) {
        console.log(`❌ Error buscando ${airtableRecord.uniqueId}: ${error.message}`);
        continue;
      }

      if (!supabaseProperty) {
        console.log(`⚠️ Propiedad ${airtableRecord.uniqueId} no encontrada en Supabase`);
        continue;
      }

      // Convertir fecha de Airtable a formato YYYY-MM-DD
      let airtableDateFormatted: string | null = null;
      if (airtableRecord.realSettlementDate) {
        try {
          const date = new Date(airtableRecord.realSettlementDate);
          if (!isNaN(date.getTime())) {
            airtableDateFormatted = date.toISOString().split('T')[0];
          }
        } catch (e) {
          // Ignore
        }
      }

      const supabaseDate = (supabaseProperty as any)['Real Settlement Date'];
      const match = airtableDateFormatted === supabaseDate;

      console.log(`\n📝 Propiedad: ${supabaseProperty.address || airtableRecord.uniqueId}`);
      console.log(`   Unique ID: ${airtableRecord.uniqueId}`);
      console.log(`   Airtable: ${airtableRecord.realSettlementDate} → ${airtableDateFormatted}`);
      console.log(`   Supabase: ${supabaseDate || 'NULL'}`);
      console.log(`   ${match ? '✅' : '❌'} ${match ? 'Coincide' : 'NO COINCIDE'}`);
    }

    // 3. Estadísticas generales
    console.log('\n\n📊 Estadísticas generales:');
    const { data: allProperties, error: statsError } = await supabase
      .from('properties')
      .select('id, "Real Settlement Date"')
      .not('Real Settlement Date', 'is', null);

    if (statsError) {
      console.error('❌ Error obteniendo estadísticas:', statsError.message);
    } else {
      console.log(`   Propiedades en Supabase con real_settlement_date: ${allProperties?.length || 0}`);
      console.log(`   Propiedades en Airtable con Real settlement date: ${airtableRecords.length}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

