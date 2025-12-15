#!/usr/bin/env tsx
/**
 * Script para verificar qué propiedades en reno-in-progress no tienen categorías
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkPropertiesWithoutCategories() {
  const supabase = createAdminClient();
  
  console.log('🔍 Buscando propiedades en reno-in-progress sin categorías...\n');
  
  // Obtener todas las propiedades en reno-in-progress con budget_pdf_url
  const { data: properties, error: fetchError } = await supabase
    .from('properties')
    .select('id, address, name, budget_pdf_url, "Unique ID From Engagements"')
    .eq('reno_phase', 'reno-in-progress')
    .not('budget_pdf_url', 'is', null);
  
  if (fetchError) {
    console.error('❌ Error:', fetchError);
    process.exit(1);
  }
  
  if (!properties || properties.length === 0) {
    console.log('❌ No se encontraron propiedades en reno-in-progress con budget_pdf_url');
    process.exit(0);
  }
  
  console.log(`📊 Total propiedades en reno-in-progress con budget_pdf_url: ${properties.length}\n`);
  
  // Verificar cuáles tienen categorías
  const propertiesWithoutCategories = [];
  
  for (const property of properties) {
    const { data: categories, error: categoriesError } = await supabase
      .from('property_dynamic_categories')
      .select('id')
      .eq('property_id', property.id)
      .limit(1);
    
    if (categoriesError) {
      console.error(`⚠️  Error verificando categorías para ${property.id}:`, categoriesError);
      continue;
    }
    
    if (!categories || categories.length === 0) {
      propertiesWithoutCategories.push(property);
    }
  }
  
  console.log(`✅ Propiedades SIN categorías: ${propertiesWithoutCategories.length}\n`);
  
  if (propertiesWithoutCategories.length > 0) {
    console.log('📋 Lista de propiedades sin categorías:\n');
    propertiesWithoutCategories.forEach((prop, index) => {
      console.log(`${index + 1}. ${prop.id}`);
      console.log(`   Dirección: ${prop.address || prop.name || 'N/A'}`);
      console.log(`   Unique ID: ${prop['Unique ID From Engagements'] || 'N/A'}`);
      const budgetUrl = prop.budget_pdf_url;
      const urlPreview = budgetUrl ? (budgetUrl.length > 80 ? budgetUrl.substring(0, 80) + '...' : budgetUrl) : 'N/A';
      console.log(`   budget_pdf_url: ${budgetUrl ? '✅ Sí' : '❌ No'}`);
      if (budgetUrl) {
        console.log(`   URL: ${urlPreview}`);
      }
      console.log('');
    });
  } else {
    console.log('✅ Todas las propiedades en reno-in-progress ya tienen categorías!');
  }
  
  console.log(`\n📊 Resumen:`);
  console.log(`   - Total propiedades: ${properties.length}`);
  console.log(`   - Con categorías: ${properties.length - propertiesWithoutCategories.length}`);
  console.log(`   - Sin categorías: ${propertiesWithoutCategories.length}`);
}

checkPropertiesWithoutCategories().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

