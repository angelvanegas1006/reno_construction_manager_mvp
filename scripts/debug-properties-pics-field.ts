#!/usr/bin/env tsx
/**
 * Script para encontrar el campo de pics_urls en la tabla Properties de Airtable
 * Busca el campo con field ID fldq1FLXBToYEY9W3
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

function getAirtableBase() {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    throw new Error('Airtable credentials not configured');
  }

  return new Airtable({ apiKey }).base(baseId);
}

async function main() {
  console.log('🔍 Buscando el campo de pics_urls en la tabla Properties...\n');

  const base = getAirtableBase();
  const tableId = 'tblmX19OTsj3cTHmA'; // Transactions
  const propertiesTableName = 'Properties';

  try {
    // Obtener un registro de Transactions para obtener el link a Properties
    const transactions = await base(tableId)
      .select({ maxRecords: 1 })
      .firstPage();

    if (transactions.length === 0) {
      console.log('❌ No se encontraron registros en Transactions');
      return;
    }

    const transaction = transactions[0];
    const propertiesLinks = transaction.fields['Properties'] as string[];

    if (!propertiesLinks || propertiesLinks.length === 0) {
      console.log('❌ No se encontró link a Properties en el registro de Transactions');
      return;
    }

    const propertyId = propertiesLinks[0];
    console.log(`✅ Encontrado link a Properties: ${propertyId}\n`);

    // Obtener el registro de Properties con TODOS los campos
    const property = await base(propertiesTableName)
      .find(propertyId);

    console.log(`📋 Campos en Properties (total: ${Object.keys(property.fields).length}):\n`);

    // Buscar campos relacionados con pics/photos/images
    const allFields = Object.keys(property.fields);
    const picsRelated = allFields.filter(k => {
      const lower = k.toLowerCase();
      return lower.includes('pic') || 
             lower.includes('photo') || 
             lower.includes('image') || 
             lower.includes('media') ||
             lower.includes('url') ||
             lower.includes('attach');
    });

    console.log('🔍 Campos relacionados con pics/photos/images/urls/attach:');
    if (picsRelated.length > 0) {
      picsRelated.forEach(fieldName => {
        const value = property.fields[fieldName];
        console.log(`   - ${fieldName}:`, Array.isArray(value) ? `[${value.length} items]` : typeof value === 'string' ? value.substring(0, 100) : value);
      });
    } else {
      console.log('   ❌ No se encontraron campos relacionados');
    }

    console.log('\n📋 Todos los campos de Properties (primeros 50):');
    allFields.slice(0, 50).forEach((fieldName, index) => {
      console.log(`   ${index + 1}. ${fieldName}`);
    });

    if (allFields.length > 50) {
      console.log(`   ... y ${allFields.length - 50} más`);
    }

    // Intentar buscar el campo por field ID usando la API de Airtable
    // Nota: La API de Airtable no expone field IDs directamente, pero podemos intentar
    console.log('\n💡 Nota: Para encontrar el campo por field ID, necesitarías usar la API de Airtable Metadata');
    console.log('   o verificar en la interfaz de Airtable cuál es el nombre real del campo con ID fldq1FLXBToYEY9W3');

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





