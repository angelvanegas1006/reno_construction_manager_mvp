#!/usr/bin/env tsx
/**
 * Script para verificar que pics_urls se está guardando correctamente en Supabase
 * Uso: npm run check:pics-urls
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

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  console.log('🔍 Verificando pics_urls en Supabase...\n');

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error('❌ Faltan variables de entorno:');
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    process.exit(1);
  }

  const supabase = createAdminClient();

  try {
    // Buscar propiedades con pics_urls
    const { data: properties, error: fetchError } = await supabase
      .from('properties')
      .select('id, address, pics_urls')
      .not('pics_urls', 'is', null)
      .limit(10);

    if (fetchError) {
      console.error('❌ Error:', fetchError);
      process.exit(1);
    }

    if (!properties || properties.length === 0) {
      console.log('⚠️  No se encontraron propiedades con pics_urls');
      console.log('💡 Esto puede significar que:');
      console.log('   1. La migración no se ejecutó correctamente');
      console.log('   2. Las propiedades aún no se han sincronizado desde Airtable');
      console.log('   3. Las propiedades en Airtable no tienen pics_urls\n');
      
      // Verificar si el campo existe
      const { data: anyProperty } = await supabase
        .from('properties')
        .select('id, address')
        .limit(1);
      
      if (anyProperty && anyProperty.length > 0) {
        console.log('✅ La tabla properties existe y tiene datos');
        console.log('   Ejemplo de propiedad:', anyProperty[0].id);
      }
      
      process.exit(0);
    }

    console.log(`✅ Se encontraron ${properties.length} propiedades con pics_urls:\n`);

    properties.forEach((property, index) => {
      const urls = property.pics_urls || [];
      console.log(`${index + 1}. ${property.id}`);
      console.log(`   Dirección: ${property.address || 'N/A'}`);
      console.log(`   URLs: ${urls.length} URL(s)`);
      if (urls.length > 0) {
        urls.slice(0, 3).forEach((url, i) => {
          console.log(`      ${i + 1}. ${url.substring(0, 80)}${url.length > 80 ? '...' : ''}`);
        });
        if (urls.length > 3) {
          console.log(`      ... y ${urls.length - 3} más`);
        }
      }
      console.log('');
    });
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





