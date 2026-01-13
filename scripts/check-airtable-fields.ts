#!/usr/bin/env tsx
/**
 * Script para verificar qué campos tiene una propiedad en Airtable
 */

import { loadEnvConfig } from '@next/env';
import Airtable from 'airtable';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const airtableTableName = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Properties';

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno de Airtable');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function main() {
  console.log('🔍 Verificando campos en Airtable...\n');

  try {
    // Obtener una propiedad de ejemplo
    const records: any[] = [];
    await base(airtableTableName)
      .select({
        maxRecords: 1,
      })
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach((record) => records.push(record));
        fetchNextPage();
      });

    if (records.length === 0) {
      console.log('⚠️ No se encontraron registros en Airtable');
      return;
    }

    const record = records[0];
    console.log('📋 Campos disponibles en Airtable:\n');
    
    // Buscar campos relacionados con "settlement" o "date"
    const settlementFields: string[] = [];
    const dateFields: string[] = [];
    
    Object.keys(record.fields).forEach((fieldName) => {
      const lowerName = fieldName.toLowerCase();
      if (lowerName.includes('settlement')) {
        settlementFields.push(fieldName);
      }
      if (lowerName.includes('date') && lowerName.includes('settlement')) {
        dateFields.push(fieldName);
      }
    });

    console.log('🔍 Campos relacionados con "settlement":');
    settlementFields.forEach(field => {
      const value = record.fields[field];
      console.log(`   - ${field}: ${value || '(vacío)'}`);
    });

    console.log('\n🔍 Campos relacionados con "settlement date":');
    dateFields.forEach(field => {
      const value = record.fields[field];
      console.log(`   - ${field}: ${value || '(vacío)'}`);
    });

    // Buscar el field ID fldpQgS6HzhX0nXal
    console.log('\n🔍 Buscando field ID fldpQgS6HzhX0nXal:');
    const fieldById = record.fields['fldpQgS6HzhX0nXal'];
    if (fieldById !== undefined) {
      console.log(`   ✅ Encontrado: ${fieldById || '(vacío)'}`);
    } else {
      console.log('   ❌ No encontrado con ese field ID');
    }

    // Mostrar todos los campos que contienen "real"
    console.log('\n🔍 Todos los campos que contienen "real":');
    const realFields: string[] = [];
    Object.keys(record.fields).forEach((fieldName) => {
      if (fieldName.toLowerCase().includes('real')) {
        realFields.push(fieldName);
        const value = record.fields[fieldName];
        console.log(`   - ${fieldName}: ${value || '(vacío)'}`);
      }
    });
    
    if (realFields.length === 0) {
      console.log('   ⚠️ No se encontraron campos con "real"');
    }

    // Buscar todos los campos de fecha
    console.log('\n🔍 Todos los campos de fecha (date):');
    const dateFields: string[] = [];
    Object.keys(record.fields).forEach((fieldName) => {
      const lowerName = fieldName.toLowerCase();
      if (lowerName.includes('date')) {
        dateFields.push(fieldName);
        const value = record.fields[fieldName];
        if (typeof value === 'string' || value instanceof Date) {
          console.log(`   - ${fieldName}: ${value || '(vacío)'}`);
        }
      }
    });

    // Mostrar algunos campos de ejemplo para referencia
    console.log('\n📋 Algunos campos de ejemplo:');
    const sampleFields = Object.keys(record.fields).slice(0, 10);
    sampleFields.forEach(field => {
      console.log(`   - ${field}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

