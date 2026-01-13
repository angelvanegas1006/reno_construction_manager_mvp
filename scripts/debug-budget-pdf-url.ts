#!/usr/bin/env tsx
/**
 * Script para debuggear por qué no se está trayendo budget_pdf_url de Airtable
 * Field ID: fldVOO4zqx5HUzIjz
 * Uso: npm run debug:budget-pdf
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

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const AIRTABLE_VIEW_ID_RENO_IN_PROGRESS = 'viwQUOrLzUrScuU4k';
const FIELD_ID_BUDGET = 'fldVOO4zqx5HUzIjz';

function getAirtableBase() {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    throw new Error('Airtable credentials not configured');
  }

  return new Airtable({ apiKey }).base(baseId);
}

async function debugBudgetPdfUrl() {
  console.log('🔍 Debug: Investigando por qué no se trae budget_pdf_url de Airtable\n');

  const requiredEnvVars = [
    'NEXT_PUBLIC_AIRTABLE_API_KEY',
    'NEXT_PUBLIC_AIRTABLE_BASE_ID',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error('❌ Faltan variables de entorno:');
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    process.exit(1);
  }

  const base = getAirtableBase();

  try {
    console.log('📡 Consultando Airtable...');
    console.log(`   Table ID: ${AIRTABLE_TABLE_ID}`);
    console.log(`   View ID: ${AIRTABLE_VIEW_ID_RENO_IN_PROGRESS}`);
    console.log(`   Field ID Budget: ${FIELD_ID_BUDGET}\n`);

    // Obtener algunos registros de la view
    const records = await base(AIRTABLE_TABLE_ID)
      .select({
        view: AIRTABLE_VIEW_ID_RENO_IN_PROGRESS,
        maxRecords: 5, // Solo los primeros 5 para debug
      })
      .all();

    console.log(`📊 Encontrados ${records.length} registros (mostrando primeros 5)\n`);

    if (records.length === 0) {
      console.log('⚠️  No se encontraron registros en la view');
      return;
    }

    // Analizar cada registro
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const fields = record.fields;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Registro ${i + 1}: ${record.id}`);
      console.log('='.repeat(60));

      // Mostrar todos los campos disponibles
      console.log('\n🔍 Todos los campos disponibles en este registro:');
      const fieldNames = Object.keys(fields);
      console.log(`   Total de campos: ${fieldNames.length}`);
      fieldNames.forEach(fieldName => {
        const value = fields[fieldName];
        const valueType = Array.isArray(value) ? 'array' : typeof value;
        const valuePreview = Array.isArray(value) 
          ? `[${value.length} items]` 
          : typeof value === 'object' && value !== null
          ? JSON.stringify(value).substring(0, 100) + '...'
          : String(value).substring(0, 100);
        console.log(`   - ${fieldName}: ${valueType} = ${valuePreview}`);
      });

      // Buscar específicamente el campo de budget
      console.log('\n🎯 Buscando campo Tech Budget Attachment:');
      
      // Intentar diferentes nombres
      const possibleNames = [
        'Tech Budget Attachment',
        'Tech Budget Attachment:',
        'fldVOO4zqx5HUzIjz',
        'Tech Budget',
        'Budget Attachment',
        'Budget PDF',
      ];

      let found = false;
      for (const name of possibleNames) {
        if (fields[name] !== undefined) {
          found = true;
          console.log(`   ✅ Encontrado como: "${name}"`);
          const value = fields[name];
          console.log(`   Tipo: ${Array.isArray(value) ? 'array' : typeof value}`);
          
          if (Array.isArray(value)) {
            console.log(`   Longitud del array: ${value.length}`);
            if (value.length > 0) {
              console.log(`   Primer elemento:`, JSON.stringify(value[0], null, 2));
              
              // Verificar si tiene URL
              if (typeof value[0] === 'object' && value[0].url) {
                console.log(`   ✅ URL encontrada: ${value[0].url}`);
              } else if (typeof value[0] === 'string' && value[0].startsWith('http')) {
                console.log(`   ✅ URL encontrada: ${value[0]}`);
              } else {
                console.log(`   ⚠️  El primer elemento no parece ser una URL`);
              }
            } else {
              console.log(`   ⚠️  El array está vacío`);
            }
          } else if (typeof value === 'string') {
            console.log(`   Valor: ${value}`);
            if (value.startsWith('http')) {
              console.log(`   ✅ Es una URL válida`);
            } else {
              console.log(`   ⚠️  No parece ser una URL`);
            }
          } else if (typeof value === 'object' && value !== null) {
            console.log(`   Objeto:`, JSON.stringify(value, null, 2));
            if ((value as any).url) {
              console.log(`   ✅ URL encontrada en objeto: ${(value as any).url}`);
            }
          }
          break;
        }
      }

      if (!found) {
        console.log(`   ❌ No se encontró el campo con ninguno de estos nombres:`, possibleNames);
        
        // Buscar campos que contengan "budget" o "attachment"
        console.log(`\n   🔍 Buscando campos relacionados (budget, attachment, pdf):`);
        const relatedFields = fieldNames.filter(name => 
          name.toLowerCase().includes('budget') || 
          name.toLowerCase().includes('attachment') ||
          name.toLowerCase().includes('pdf') ||
          name.toLowerCase().includes('tech')
        );
        
        if (relatedFields.length > 0) {
          relatedFields.forEach(fieldName => {
            console.log(`      - ${fieldName}: ${typeof fields[fieldName]}`);
          });
        } else {
          console.log(`      ⚠️  No se encontraron campos relacionados`);
        }
      }

      // Verificar si el field ID está presente directamente
      console.log(`\n🔑 Verificando field ID directamente (${FIELD_ID_BUDGET}):`);
      if (fields[FIELD_ID_BUDGET] !== undefined) {
        console.log(`   ✅ El field ID está presente`);
        console.log(`   Valor:`, JSON.stringify(fields[FIELD_ID_BUDGET], null, 2));
      } else {
        console.log(`   ❌ El field ID no está presente en los campos`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('💡 Recomendaciones:');
    console.log('='.repeat(60));
    console.log('1. Verifica que el campo "Tech Budget Attachment" esté en la view de Airtable');
    console.log('2. Verifica que el campo tenga datos (no esté vacío)');
    console.log('3. Verifica que el nombre del campo sea exactamente "Tech Budget Attachment"');
    console.log('4. Si el campo está en una tabla relacionada, necesitas incluirlo en la view');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

debugBudgetPdfUrl().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});






