#!/usr/bin/env tsx
/**
 * Script para listar todas las tablas en Airtable
 */

import Airtable from 'airtable';

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function main() {
  console.log('🔍 Listando tablas en Airtable...\n');

  try {
    // Airtable no tiene una API directa para listar tablas
    // Pero podemos intentar acceder a tablas comunes
    const commonTableNames = [
      'Properties',
      'Engagements',
      'Transactions',
      'Clients',
      'Properties (from Transactions)',
      'Engagements (from Transactions)',
    ];

    console.log('📋 Intentando acceder a tablas comunes:\n');
    
    for (const tableName of commonTableNames) {
      try {
        const records = await base(tableName)
          .select({
            maxRecords: 1,
          })
          .firstPage();
        
        console.log(`✅ Tabla "${tableName}" existe (${records.length} registro encontrado)`);
      } catch (error: any) {
        console.log(`❌ Tabla "${tableName}" no existe o no es accesible: ${error.message}`);
      }
    }

    // También intentar obtener un registro de la tabla principal para ver campos relacionados
    console.log('\n🔍 Verificando campos relacionados en la tabla principal:\n');
    const mainTableRecords = await base('tblmX19OTsj3cTHmA')
      .select({
        maxRecords: 1,
      })
      .firstPage();

    if (mainTableRecords.length > 0) {
      const record = mainTableRecords[0];
      console.log('Campos de tipo "link" encontrados:');
      Object.keys(record.fields).forEach(fieldName => {
        const value = record.fields[fieldName];
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
          console.log(`  - ${fieldName}: [${value.slice(0, 2).join(', ')}...] (${value.length} links)`);
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();









