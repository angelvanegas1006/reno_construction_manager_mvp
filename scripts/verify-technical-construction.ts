#!/usr/bin/env tsx
/**
 * Script para verificar el estado final de Technical construction en Supabase
 * Uso: npm run verify:technical-construction
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
  console.log('🔍 Verificando estado final de Technical construction en Supabase...\n');

  const supabase = createAdminClient();

  try {
    // Obtener todas las propiedades
    const { data: allProperties, error: fetchError } = await supabase
      .from('properties')
      .select('id, address, "Technical construction"')
      .not('id', 'is', null);

    if (fetchError) {
      console.error('❌ Error:', fetchError);
      process.exit(1);
    }

    if (!allProperties || allProperties.length === 0) {
      console.log('⚠️  No se encontraron propiedades');
      process.exit(0);
    }

    // Contar con y sin Technical construction
    const withTechnical = allProperties.filter(p => p['Technical construction']).length;
    const withoutTechnical = allProperties.length - withTechnical;

    // Obtener valores únicos
    const uniqueValues = new Set<string>();
    allProperties.forEach(p => {
      if (p['Technical construction']) {
        uniqueValues.add(p['Technical construction']);
      }
    });

    console.log(`📊 Estadísticas finales:`);
    console.log(`   - Total propiedades: ${allProperties.length}`);
    console.log(`   - Con Technical construction: ${withTechnical}`);
    console.log(`   - Sin Technical construction: ${withoutTechnical}`);
    console.log(`   - Valores únicos: ${uniqueValues.size}\n`);

    if (uniqueValues.size > 0) {
      console.log(`📋 Valores únicos de Technical construction:`);
      Array.from(uniqueValues).sort().forEach((value, index) => {
        const count = allProperties.filter(p => p['Technical construction'] === value).length;
        console.log(`   ${index + 1}. ${value} (${count} propiedades)`);
      });
    }

    // Mostrar algunas propiedades de ejemplo
    console.log(`\n📝 Ejemplos de propiedades con Technical construction (primeras 5):`);
    allProperties
      .filter(p => p['Technical construction'])
      .slice(0, 5)
      .forEach((property, index) => {
        console.log(`   ${index + 1}. ${property.id}`);
        console.log(`      Dirección: ${property.address || 'N/A'}`);
        console.log(`      Technical construction: ${property['Technical construction']}`);
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





