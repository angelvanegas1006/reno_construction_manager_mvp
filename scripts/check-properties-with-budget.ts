#!/usr/bin/env tsx
/**
 * Script para verificar propiedades con budget_pdf_url en reno-in-progress
 * Uso: npm run check:budget-properties
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
  console.log('🔍 Verificando propiedades con budget_pdf_url en reno-in-progress...\n');

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
    // Buscar propiedades en reno-in-progress con budget_pdf_url
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, name, address, budget_pdf_url, reno_phase')
      .eq('reno_phase', 'reno-in-progress')
      .not('budget_pdf_url', 'is', null)
      .limit(10);

    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }

    if (!properties || properties.length === 0) {
      console.log('⚠️  No se encontraron propiedades con budget_pdf_url en reno-in-progress');
      console.log('\n🔍 Verificando todas las propiedades en reno-in-progress...\n');
      
      const { data: allProps, error: allError } = await supabase
        .from('properties')
        .select('id, name, address, budget_pdf_url, reno_phase')
        .eq('reno_phase', 'reno-in-progress')
        .limit(5);

      if (allError) {
        console.error('❌ Error:', allError);
        process.exit(1);
      }

      if (allProps && allProps.length > 0) {
        console.log(`📊 Encontradas ${allProps.length} propiedades en reno-in-progress (muestra):\n`);
        allProps.forEach((prop, idx) => {
          console.log(`${idx + 1}. ${prop.id}`);
          console.log(`   Nombre: ${prop.name || 'N/A'}`);
          console.log(`   Dirección: ${prop.address || 'N/A'}`);
          console.log(`   budget_pdf_url: ${prop.budget_pdf_url ? '✅ Tiene URL' : '❌ Sin URL'}`);
          console.log('');
        });
      }
    } else {
      console.log(`✅ Encontradas ${properties.length} propiedades con budget_pdf_url:\n`);
      properties.forEach((prop, idx) => {
        console.log(`${idx + 1}. ${prop.id}`);
        console.log(`   Nombre: ${prop.name || 'N/A'}`);
        console.log(`   Dirección: ${prop.address || 'N/A'}`);
        console.log(`   budget_pdf_url: ${prop.budget_pdf_url}`);
        console.log('');
      });

      // Verificar si tienen categorías
      console.log('\n🔍 Verificando categorías dinámicas...\n');
      for (const prop of properties) {
        const { data: categories, error: catError } = await supabase
          .from('property_dynamic_categories')
          .select('id, category_name')
          .eq('property_id', prop.id)
          .limit(5);

        if (catError) {
          console.error(`❌ Error verificando categorías para ${prop.id}:`, catError);
        } else {
          const hasCategories = categories && categories.length > 0;
          console.log(`${prop.id}: ${hasCategories ? `✅ Tiene ${categories.length} categorías` : '❌ Sin categorías'}`);
          if (hasCategories && categories) {
            categories.forEach(cat => {
              console.log(`   - ${cat.category_name}`);
            });
          }
        }
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






