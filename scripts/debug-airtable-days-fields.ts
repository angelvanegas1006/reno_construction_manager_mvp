#!/usr/bin/env tsx
/**
 * Script para debuggear los campos de días en Airtable
 * Verifica qué campos están disponibles y sus valores
 */

import { loadEnvConfig } from '@next/env';
import Airtable from 'airtable';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  console.log('🔍 Debuggeando campos de días en Airtable...\n');

  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
  const tableId = 'tblmX19OTsj3cTHmA'; // Properties table

  if (!apiKey || !baseId) {
    console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_AIRTABLE_API_KEY o NEXT_PUBLIC_AIRTABLE_BASE_ID');
    process.exit(1);
  }

  const base = new Airtable({ apiKey }).base(baseId);

  try {
    // Obtener algunos registros de ejemplo
    const records = await base(tableId)
      .select({
        maxRecords: 5,
        fields: [], // Obtener todos los campos
      })
      .all();

    if (records.length === 0) {
      console.log('❌ No se encontraron registros');
      return;
    }

    console.log(`📋 Analizando ${records.length} registros de ejemplo...\n`);

    // Buscar campos relacionados con "days", "reno", "start", "settlement", "RSD"
    const keywords = ['days', 'reno', 'start', 'settlement', 'rsd', 'duration', 'ready', 'property'];
    
    records.forEach((record, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Registro ${index + 1}: ${record.id}`);
      console.log('='.repeat(80));
      
      const fields = record.fields;
      const allFieldNames = Object.keys(fields);
      
      // Buscar campos que contengan las keywords
      const relevantFields = allFieldNames.filter(fieldName => {
        const lowerName = fieldName.toLowerCase();
        return keywords.some(keyword => lowerName.includes(keyword));
      });

      console.log('\n🔍 Campos relevantes encontrados:');
      if (relevantFields.length > 0) {
        relevantFields.forEach(fieldName => {
          const value = fields[fieldName];
          console.log(`\n  📌 "${fieldName}":`);
          console.log(`     Tipo: ${typeof value}`);
          console.log(`     Valor: ${JSON.stringify(value)}`);
        });
      } else {
        console.log('  ❌ No se encontraron campos relevantes');
      }

      console.log('\n📋 Todos los nombres de campos disponibles:');
      allFieldNames.sort().forEach(fieldName => {
        console.log(`  - ${fieldName}`);
      });
    });

    // Buscar específicamente el campo que estamos buscando
    console.log('\n\n' + '='.repeat(80));
    console.log('🔎 Búsqueda específica del campo "Days to start reno since settlement date"');
    console.log('='.repeat(80));
    
    const possibleNames = [
      'Days to start reno since settlement date',
      'Days to Start Reno (Since RSD)',
      'Days to Start Reno Since Settlement Date',
      'Days to start reno since RSD',
      'Days to Start Reno Since RSD',
      'Days to Start Reno',
      'Days to start reno',
      'Days To Start Reno Since Settlement Date',
      'Days To Start Reno (Since RSD)',
    ];

    records.forEach((record, index) => {
      const fields = record.fields;
      console.log(`\nRegistro ${index + 1}:`);
      possibleNames.forEach(name => {
        if (fields[name] !== undefined) {
          console.log(`  ✅ "${name}": ${JSON.stringify(fields[name])}`);
        }
      });
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});



