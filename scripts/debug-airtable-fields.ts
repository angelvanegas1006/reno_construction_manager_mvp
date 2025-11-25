#!/usr/bin/env tsx
/**
 * Script para ver los nombres exactos de los campos en Airtable
 */

import Airtable from 'airtable';

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const tableId = 'tblmX19OTsj3cTHmA';
const viewId = 'viwpYQ0hsSSdFrSD1';

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function main() {
  console.log('🔍 Obteniendo un registro de ejemplo para ver los nombres de campos...\n');

  try {
    const records = await base(tableId)
      .select({
        view: viewId,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) {
      console.log('❌ No se encontraron registros');
      return;
    }

    const record = records[0];
    console.log('📋 Todos los campos disponibles:\n');
    console.log(JSON.stringify(Object.keys(record.fields), null, 2));
    
    console.log('\n\n🔍 Valores de campos específicos que necesitamos:\n');
    const fieldsToCheck = [
      'Area Cluster',
      'Hubspot ID',
      'Required Reno',
      'SetUp Team Notes',
      'Responsible Owner',
      'Technical Constructor',
      'Set up status',
      'Set Up Status',
      'Property Unique ID',
      'Keys Location (If there are)',
      'Stage',
      'Client email',
    ];

    fieldsToCheck.forEach(fieldName => {
      const value = record.fields[fieldName];
      console.log(`${fieldName}:`, value !== undefined ? JSON.stringify(value) : '❌ NO ENCONTRADO');
    });

    console.log('\n\n📝 Todos los campos y valores del primer registro:\n');
    console.log(JSON.stringify(record.fields, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();


