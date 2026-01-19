#!/usr/bin/env tsx
/**
 * Script para actualizar budget_index de categorías para una propiedad
 * 
 * Uso: npx tsx scripts/update-budget-index-for-property.ts <propertyId>
 * 
 * Ejemplo: npx tsx scripts/update-budget-index-for-property.ts SP-KMX-CYX-001422
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function updateBudgetIndex(propertyId: string) {
  console.log(`🔄 Actualizando budget_index para propiedad: ${propertyId}\n`);

  const supabase = createAdminClient();

  try {
    // 1. Obtener la propiedad
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, address, budget_pdf_url')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      console.error(`❌ Error obteniendo propiedad: ${propertyError?.message}`);
      process.exit(1);
    }

    console.log(`✅ Propiedad encontrada: ${property.address || propertyId}`);
    console.log(`   Budget URLs: ${property.budget_pdf_url || 'No tiene'}\n`);

    if (!property.budget_pdf_url) {
      console.error('❌ La propiedad no tiene budget_pdf_url');
      process.exit(1);
    }

    // 2. Separar múltiples URLs
    const urls = property.budget_pdf_url
      .split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));

    if (urls.length === 0) {
      console.error('❌ No se encontraron URLs válidas de presupuesto');
      process.exit(1);
    }

    console.log(`📋 Presupuestos encontrados: ${urls.length}`);
    urls.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url.substring(0, 80)}...`);
    });
    console.log('');

    // 3. Obtener categorías actuales
    const { data: categories, error: categoriesError } = await supabase
      .from('property_dynamic_categories')
      .select('id, category_name, budget_index, created_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true });

    if (categoriesError) {
      console.error(`❌ Error obteniendo categorías: ${categoriesError.message}`);
      process.exit(1);
    }

    if (!categories || categories.length === 0) {
      console.log('⚠️  No hay categorías para esta propiedad');
      process.exit(0);
    }

    console.log(`📊 Categorías encontradas: ${categories.length}`);
    console.log(`   Categorías sin budget_index o con valor 1: ${categories.filter(c => !c.budget_index || c.budget_index === 1).length}\n`);

    // 4. Actualizar budget_index
    console.log('🔄 Actualizando budget_index...\n');
    const result = await updateBudgetIndexForCategories(propertyId, urls);

    if (result.errors.length > 0) {
      console.error('⚠️  Errores encontrados:');
      result.errors.forEach(error => {
        console.error(`   - ${error}`);
      });
      console.log('');
    }

    console.log(`✅ Actualización completada:`);
    console.log(`   - Categorías actualizadas: ${result.updated}`);
    console.log(`   - Errores: ${result.errors.length}\n`);

    // 5. Verificar resultado
    const { data: updatedCategories } = await supabase
      .from('property_dynamic_categories')
      .select('id, category_name, budget_index')
      .eq('property_id', propertyId)
      .order('budget_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (updatedCategories && updatedCategories.length > 0) {
      console.log('📋 Categorías actualizadas:');
      const byBudgetIndex = new Map<number, typeof updatedCategories>();
      
      updatedCategories.forEach(cat => {
        const index = cat.budget_index || 1;
        if (!byBudgetIndex.has(index)) {
          byBudgetIndex.set(index, []);
        }
        byBudgetIndex.get(index)!.push(cat);
      });

      byBudgetIndex.forEach((cats, index) => {
        console.log(`\n   Presupuesto ${index} (${cats.length} categorías):`);
        cats.forEach(cat => {
          console.log(`     - ${cat.category_name}`);
        });
      });
    }

    console.log('\n✅ Script completado\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Obtener propertyId de los argumentos
const propertyId = process.argv[2];

if (!propertyId) {
  console.error('❌ Error: Debes proporcionar un propertyId');
  console.error('Uso: npx tsx scripts/update-budget-index-for-property.ts <propertyId>');
  process.exit(1);
}

updateBudgetIndex(propertyId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });
