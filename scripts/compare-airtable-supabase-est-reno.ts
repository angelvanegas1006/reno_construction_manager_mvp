/**
 * Script para comparar el campo Est_reno_start_date entre Airtable y Supabase
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import Airtable from 'airtable';
import { createAdminClient } from '../lib/supabase/admin';

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);
const tableName = 'Transactions';
const fieldId = 'fldPX58nQYf9HsTRE';
const fieldNames = ['Est. reno start date', 'Est. Reno Start Date', 'Estimated Reno Start Date', 'Estimated reno start date'];

async function compareFields() {
  console.log('🔍 Comparando Est_reno_start_date entre Airtable y Supabase...\n');

  const supabase = createAdminClient();

  try {
    // 1. Obtener propiedades de Supabase
    const { data: supabaseProperties, error: supabaseError } = await supabase
      .from('properties')
      .select('id, address, "Unique ID From Engagements", Est_reno_start_date');

    if (supabaseError) {
      console.error('❌ Error al consultar Supabase:', supabaseError);
      return;
    }

    console.log(`📊 Propiedades en Supabase: ${supabaseProperties?.length || 0}\n`);

    // 2. Obtener registros de Airtable
    const airtableRecords = new Map<string, { date: string | null; address?: string }>();
    
    await base(tableName)
      .select({
        maxRecords: 500,
      })
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach((record) => {
          const fields = record.fields;
          
          // Buscar el campo por Field ID o por nombre
          let dateValue: any = fields[fieldId];
          if (dateValue === undefined || dateValue === null) {
            for (const name of fieldNames) {
              if (fields[name] !== undefined && fields[name] !== null) {
                dateValue = fields[name];
                break;
              }
            }
          }

          // Formatear fecha si existe
          let formattedDate: string | null = null;
          if (dateValue) {
            try {
              const date = new Date(dateValue);
              if (!isNaN(date.getTime())) {
                formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
              }
            } catch (e) {
              // Ignore
            }
          }

          // Obtener Unique ID para hacer el match
          const uniqueIdValue = 
            fields['UNIQUEID (from Engagements)'] ||
            fields['Unique ID (From Engagements)'] ||
            fields['Unique ID From Engagements'] ||
            fields['Unique ID'];
          
          const uniqueId = Array.isArray(uniqueIdValue) 
            ? uniqueIdValue[0] 
            : uniqueIdValue;

          if (uniqueId) {
            airtableRecords.set(uniqueId, {
              date: formattedDate,
              address: fields['Address'] as string || undefined
            });
          }
        });
        fetchNextPage();
      });

    console.log(`📊 Registros en Airtable con Unique ID: ${airtableRecords.size}\n`);

    // 3. Comparar
    let matches = 0;
    let mismatches = 0;
    let onlyInAirtable = 0;
    let onlyInSupabase = 0;
    let missingInBoth = 0;

    const mismatchDetails: Array<{
      uniqueId: string;
      address?: string;
      airtable: string | null;
      supabase: string | null;
    }> = [];

    supabaseProperties?.forEach(prop => {
      const uniqueId = prop['Unique ID From Engagements'];
      if (!uniqueId) return;

      const airtableData = airtableRecords.get(uniqueId);
      const supabaseDate = prop.Est_reno_start_date;

      if (airtableData) {
        if (airtableData.date === supabaseDate) {
          matches++;
        } else {
          mismatches++;
          mismatchDetails.push({
            uniqueId,
            address: prop.address || airtableData.address,
            airtable: airtableData.date,
            supabase: supabaseDate
          });
        }
      } else {
        // No encontrado en Airtable
        if (supabaseDate) {
          onlyInSupabase++;
        } else {
          missingInBoth++;
        }
      }
    });

    // Propiedades en Airtable que no están en Supabase
    airtableRecords.forEach((data, uniqueId) => {
      const inSupabase = supabaseProperties?.find(p => p['Unique ID From Engagements'] === uniqueId);
      if (!inSupabase && data.date) {
        onlyInAirtable++;
      }
    });

    console.log('📊 Resultados de la comparación:\n');
    console.log(`   ✅ Coinciden: ${matches}`);
    console.log(`   ❌ No coinciden: ${mismatches}`);
    console.log(`   📅 Solo en Airtable (con fecha): ${onlyInAirtable}`);
    console.log(`   📅 Solo en Supabase (con fecha): ${onlyInSupabase}`);
    console.log(`   ⚠️  Sin fecha en ambos: ${missingInBoth}\n`);

    if (mismatches > 0) {
      console.log('🔍 Detalles de las discrepancias (primeras 10):\n');
      mismatchDetails.slice(0, 10).forEach((detail, index) => {
        console.log(`   ${index + 1}. ${detail.address || detail.uniqueId}:`);
        console.log(`      - Airtable: ${detail.airtable || 'null'}`);
        console.log(`      - Supabase: ${detail.supabase || 'null'}`);
      });
    }

    // Estadísticas de fechas
    const airtableWithDate = Array.from(airtableRecords.values()).filter(r => r.date !== null).length;
    const supabaseWithDate = supabaseProperties?.filter(p => p.Est_reno_start_date !== null).length || 0;

    console.log('\n📊 Estadísticas de fechas:\n');
    console.log(`   - Airtable: ${airtableWithDate} de ${airtableRecords.size} tienen fecha (${((airtableWithDate / airtableRecords.size) * 100).toFixed(1)}%)`);
    console.log(`   - Supabase: ${supabaseWithDate} de ${supabaseProperties?.length || 0} tienen fecha (${((supabaseWithDate / (supabaseProperties?.length || 1)) * 100).toFixed(1)}%)\n`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.error) {
      console.error('   Detalles:', error.error);
    }
    process.exit(1);
  }
}

compareFields()
  .then(() => {
    console.log('✅ Comparación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

