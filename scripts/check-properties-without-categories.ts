#!/usr/bin/env tsx
/**
 * Script para verificar cuántas propiedades en reno-in-progress
 * tienen budget_pdf_url pero no tienen categorías dinámicas
 * 
 * Ejecutar con: npx tsx scripts/check-properties-without-categories.ts
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkPropertiesWithoutCategories() {
  console.log('🔍 Verificando propiedades sin categorías dinámicas...\n');

  const supabase = createAdminClient();

  try {
    // 1. Obtener todas las propiedades en reno-in-progress con budget_pdf_url
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, address, budget_pdf_url, "Renovator name"')
      .eq('reno_phase', 'reno-in-progress')
      .not('budget_pdf_url', 'is', null)
      .order('created_at', { ascending: false });

    if (propertiesError) {
      console.error('❌ Error obteniendo propiedades:', propertiesError);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('✅ No hay propiedades en reno-in-progress con budget_pdf_url');
      return;
    }

    console.log(`📊 Total propiedades con budget_pdf_url: ${properties.length}\n`);

    // 2. Verificar cuáles tienen categorías y cuáles no
    const propertiesWithoutCategories: Array<{
      id: string;
      address: string;
      renovator: string | null;
    }> = [];
    const propertiesWithCategories: string[] = [];

    for (const property of properties) {
      const { data: categories, error: categoriesError } = await supabase
        .from('property_dynamic_categories')
        .select('id')
        .eq('property_id', property.id)
        .limit(1);

      if (categoriesError) {
        console.warn(`⚠️  Error verificando categorías para ${property.id}:`, categoriesError.message);
      }

      const hasCategories = categories && categories.length > 0;

      if (hasCategories) {
        propertiesWithCategories.push(property.id);
      } else {
        propertiesWithoutCategories.push({
          id: property.id,
          address: property.address || 'Sin dirección',
          renovator: property['Renovator name'] || null,
        });
      }
    }

    // 3. Generar informe
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 INFORME: Propiedades sin Categorías Dinámicas');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📊 RESUMEN:`);
    console.log(`   Total propiedades con budget_pdf_url: ${properties.length}`);
    console.log(`   ✅ Con categorías dinámicas: ${propertiesWithCategories.length}`);
    console.log(`   ❌ Sin categorías dinámicas: ${propertiesWithoutCategories.length}\n`);

    if (propertiesWithoutCategories.length === 0) {
      console.log('✅ ¡Excelente! Todas las propiedades tienen categorías dinámicas.\n');
      return;
    }

    // Agrupar por renovador
    const byRenovator: Record<string, typeof propertiesWithoutCategories> = {};
    const withoutRenovator: typeof propertiesWithoutCategories = [];

    propertiesWithoutCategories.forEach(prop => {
      const renovator = prop.renovator || 'Sin renovador';
      if (renovator === 'Sin renovador') {
        withoutRenovator.push(prop);
      } else {
        if (!byRenovator[renovator]) {
          byRenovator[renovator] = [];
        }
        byRenovator[renovator].push(prop);
      }
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`❌ PROPIEDADES SIN CATEGORÍAS DINÁMICAS (${propertiesWithoutCategories.length}):`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Mostrar por renovador
    const renovators = Object.keys(byRenovator).sort();
    renovators.forEach(renovator => {
      const props = byRenovator[renovator];
      console.log(`👷 ${renovator} (${props.length} propiedades):`);
      props.forEach((prop, index) => {
        console.log(`   ${index + 1}. ${prop.id} - ${prop.address}`);
      });
    });

    // Mostrar sin renovador
    if (withoutRenovator.length > 0) {
      console.log(`\n❓ Sin renovador asignado (${withoutRenovator.length} propiedades):`);
      withoutRenovator.forEach((prop, index) => {
        console.log(`   ${index + 1}. ${prop.id} - ${prop.address}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 LISTADO COMPLETO:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    propertiesWithoutCategories.forEach((prop, index) => {
      const renovator = prop.renovator || 'Sin renovador';
      console.log(`${index + 1}. ${prop.id} | ${prop.address} | ${renovator}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Verificación completada\n');

  } catch (error) {
    console.error('❌ Error verificando propiedades:', error);
  }
}

// Ejecutar
checkPropertiesWithoutCategories()
  .then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });
