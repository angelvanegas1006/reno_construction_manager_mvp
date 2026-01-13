/**
 * Script para verificar que el campo Est_reno_start_date se lee correctamente de Airtable
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import Airtable from 'airtable';

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_AIRTABLE_API_KEY o NEXT_PUBLIC_AIRTABLE_BASE_ID');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);
const tableName = 'Transactions';
const fieldId = 'fldPX58nQYf9HsTRE';
const fieldNames = ['Est. reno start date', 'Est. Reno Start Date', 'Estimated Reno Start Date', 'Estimated reno start date'];

async function verifyField() {
  console.log('🔍 Verificando campo Est_reno_start_date en Airtable...\n');
  console.log(`   - Tabla: ${tableName}`);
  console.log(`   - Field ID: ${fieldId}`);
  console.log(`   - Nombres alternativos: ${fieldNames.join(', ')}\n`);

  try {
    const records: any[] = [];
    
    await base(tableName)
      .select({
        maxRecords: 20, // Solo las primeras 20 para verificar
      })
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach((record) => {
          records.push(record);
        });
        fetchNextPage();
      });

    console.log(`📊 Analizando ${records.length} registros de Airtable...\n`);

    let withFieldId = 0;
    let withFieldName = 0;
    let withAnyName = 0;
    let total = 0;

    records.forEach((record, index) => {
      const fields = record.fields;
      total++;

      // Verificar por field ID
      const byFieldId = fields[fieldId];
      if (byFieldId !== undefined && byFieldId !== null) {
        withFieldId++;
        console.log(`✅ Registro ${index + 1} (ID: ${record.id}):`);
        console.log(`   - Por Field ID (${fieldId}): ${byFieldId}`);
      }

      // Verificar por nombres
      let foundByName = false;
      for (const name of fieldNames) {
        if (fields[name] !== undefined && fields[name] !== null) {
          if (!foundByName) {
            withFieldName++;
            foundByName = true;
            if (!byFieldId) {
              console.log(`✅ Registro ${index + 1} (ID: ${record.id}):`);
              console.log(`   - Por nombre "${name}": ${fields[name]}`);
            }
          }
        }
      }

      if (byFieldId || foundByName) {
        withAnyName++;
      }

      // Mostrar todos los campos que contienen "start" o "reno" para debugging
      if (index < 5) {
        const relevantFields = Object.keys(fields).filter(key => 
          key.toLowerCase().includes('start') || 
          key.toLowerCase().includes('reno') ||
          key.toLowerCase().includes('est')
        );
        if (relevantFields.length > 0) {
          console.log(`\n   📋 Campos relevantes en registro ${index + 1}:`);
          relevantFields.forEach(field => {
            console.log(`      - ${field}: ${fields[field]}`);
          });
        }
      }
    });

    console.log(`\n📊 Resumen:`);
    console.log(`   - Total registros analizados: ${total}`);
    console.log(`   - Con campo por Field ID (${fieldId}): ${withFieldId}`);
    console.log(`   - Con campo por nombre: ${withFieldName}`);
    console.log(`   - Con campo (cualquier método): ${withAnyName}`);
    console.log(`   - Sin campo: ${total - withAnyName}\n`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.error) {
      console.error('   Detalles:', error.error);
    }
    process.exit(1);
  }
}

verifyField()
  .then(() => {
    console.log('✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

