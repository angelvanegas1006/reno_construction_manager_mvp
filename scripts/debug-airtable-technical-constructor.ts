#!/usr/bin/env tsx
/**
 * Script para depurar Technical Constructor en Airtable
 * Verifica directamente en la tabla Properties cuántas tienen el campo
 * Uso: npm run debug:airtable-technical
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
  console.log('🔍 Depurando Technical Constructor en Airtable...\n');

  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_AIRTABLE_API_KEY o NEXT_PUBLIC_AIRTABLE_BASE_ID');
    process.exit(1);
  }

  const base = new Airtable({ apiKey }).base(baseId);
  const propertiesTable = base('Properties');

  try {
    let totalProperties = 0;
    let withTechnicalConstructor = 0;
    let withoutTechnicalConstructor = 0;
    const uniqueValues = new Set<string>();

    console.log('📥 Obteniendo todas las propiedades de Airtable...\n');

    await propertiesTable
      .select({
        // Obtener todos los campos
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach((record) => {
          totalProperties++;
          
          const technicalConstructor = record.fields['Technical Constructor'] || 
                                     record.fields['Technical construction'] ||
                                     null;

          if (technicalConstructor && typeof technicalConstructor === 'string' && technicalConstructor.trim()) {
            withTechnicalConstructor++;
            uniqueValues.add(technicalConstructor.trim());
          } else {
            withoutTechnicalConstructor++;
          }
        });
        fetchNextPage();
      });

    console.log(`📊 Estadísticas de Properties en Airtable:`);
    console.log(`   - Total propiedades: ${totalProperties}`);
    console.log(`   - Con Technical Constructor: ${withTechnicalConstructor}`);
    console.log(`   - Sin Technical Constructor: ${withoutTechnicalConstructor}`);
    console.log(`   - Valores únicos: ${uniqueValues.size}\n`);

    if (uniqueValues.size > 0) {
      console.log(`📋 Valores únicos de Technical Constructor:`);
      Array.from(uniqueValues).sort().forEach((value, index) => {
        console.log(`   ${index + 1}. ${value}`);
      });
    }

    // Verificar si hay campos relacionados con "technical" o "constructor"
    console.log(`\n🔍 Verificando campos disponibles en Properties (primer registro)...`);
    const firstRecord = await propertiesTable.select({ maxRecords: 1 }).firstPage();
    if (firstRecord.length > 0) {
      const fields = firstRecord[0].fields;
      const technicalFields = Object.keys(fields).filter(k => {
        const lower = k.toLowerCase();
        return lower.includes('technical') || lower.includes('constructor') || lower.includes('construction');
      });
      
      console.log(`   Campos relacionados con technical/constructor:`);
      if (technicalFields.length > 0) {
        technicalFields.forEach(field => {
          console.log(`   - ${field}: ${fields[field]}`);
        });
      } else {
        console.log(`   ⚠️  No se encontraron campos relacionados`);
      }
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





