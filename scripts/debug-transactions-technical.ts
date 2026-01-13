#!/usr/bin/env tsx
/**
 * Script para depurar Technical Constructor en la tabla Transactions de Airtable
 * Uso: npm run debug:transactions-technical
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.warn('⚠️  No se pudo cargar .env.local, usando variables de entorno del sistema');
}

import Airtable from 'airtable';

async function main() {
  console.log('🔍 Depurando Technical Constructor en Transactions...\n');

  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    console.error('❌ Faltan variables de entorno');
    process.exit(1);
  }

  const base = new Airtable({ apiKey }).base(baseId);
  const transactionsTable = base('tblmX19OTsj3cTHmA');

  try {
    console.log('📥 Obteniendo primer registro de Transactions...\n');

    const firstRecord = await transactionsTable.select({ maxRecords: 1 }).firstPage();
    
    if (firstRecord.length === 0) {
      console.log('⚠️  No se encontraron registros');
      process.exit(0);
    }

    const fields = firstRecord[0].fields;
    const allFieldNames = Object.keys(fields);

    console.log(`📋 Total de campos en Transactions: ${allFieldNames.length}\n`);

    // Buscar campos relacionados con technical/constructor
    const technicalFields = allFieldNames.filter(k => {
      const lower = k.toLowerCase();
      return lower.includes('technical') || 
             lower.includes('constructor') || 
             lower.includes('construction') ||
             lower.includes('renovator');
    });

    console.log(`🔍 Campos relacionados con technical/constructor/renovator:`);
    if (technicalFields.length > 0) {
      technicalFields.forEach(field => {
        const value = fields[field];
        console.log(`   - ${field}: ${typeof value === 'string' ? value : JSON.stringify(value).substring(0, 100)}`);
      });
    } else {
      console.log(`   ⚠️  No se encontraron campos relacionados\n`);
    }

    // Mostrar todos los campos (primeros 50)
    console.log(`📋 Todos los campos disponibles (primeros 50):`);
    allFieldNames.slice(0, 50).forEach((field, index) => {
      console.log(`   ${index + 1}. ${field}`);
    });
    if (allFieldNames.length > 50) {
      console.log(`   ... y ${allFieldNames.length - 50} más`);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
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





