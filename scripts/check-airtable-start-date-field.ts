#!/usr/bin/env tsx
/**
 * Script para verificar el campo "Reno Start Date" en Airtable
 */

import { loadEnvConfig } from '@next/env';
import Airtable from 'airtable';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const tableName = 'Transactions';
const FIELD_ID = 'fldCnB9pCmpG5khiH';

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno de Airtable');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function checkStartDateField() {
  console.log('\n🔍 Verificando campo "Reno Start Date" en Airtable...\n');
  
  try {
    // Obtener algunos registros para ver qué campos tienen
    // Usar solo el field ID ya que el nombre puede variar
    const records = await base(tableName).select({
      fields: ['UNIQUEID (from Engagements)', FIELD_ID, 'Address'],
      maxRecords: 10,
    }).firstPage();
    
    console.log(`✅ Registros obtenidos: ${records.length}\n`);
    
    records.forEach((record: any, index) => {
      console.log(`\n📋 Registro ${index + 1}:`);
      console.log(`   ID: ${record.id}`);
      console.log(`   Unique ID: ${record.fields['UNIQUEID (from Engagements)'] || 'N/A'}`);
      console.log(`   Address: ${record.fields['Address'] || 'N/A'}`);
      console.log(`   Campo por ID (${FIELD_ID}): ${record.fields[FIELD_ID] || '(vacío)'}`);
      console.log(`   Tipo del valor: ${record.fields[FIELD_ID] ? typeof record.fields[FIELD_ID] : 'N/A'}`);
      if (record.fields[FIELD_ID]) {
        console.log(`   Valor completo:`, record.fields[FIELD_ID]);
      }
    });
    
    // Buscar registros que tengan el campo relleno
    console.log('\n🔍 Buscando registros con el campo relleno...\n');
    
    const allRecords = await base(tableName).select({
      fields: ['UNIQUEID (from Engagements)', FIELD_ID, 'Address'],
      maxRecords: 100,
    }).all();
    
    const withFieldId = allRecords.filter((r: any) => r.fields[FIELD_ID]);
    
    console.log(`   Registros con campo por ID (${FIELD_ID}): ${withFieldId.length}`);
    
    if (withFieldId.length > 0) {
      console.log('\n   Ejemplos con campo por ID:');
      withFieldId.slice(0, 3).forEach((record: any, i) => {
        console.log(`   ${i + 1}. ${record.fields['UNIQUEID (from Engagements)'] || 'N/A'}`);
        console.log(`      ${record.fields[FIELD_ID]}`);
      });
    }
    
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.error) {
      console.error('   Detalles:', JSON.stringify(error.error, null, 2));
    }
  }
}

checkStartDateField().catch(console.error);

