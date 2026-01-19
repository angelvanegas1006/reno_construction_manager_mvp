#!/usr/bin/env tsx

/**
 * Script para verificar si las categorías tienen activities_text
 * Uso: npx tsx scripts/check-categories-activities.ts SP-KMX-CYX-001422
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkCategoriesActivities(propertyId: string) {
  console.log(`🔍 Verificando actividades de categorías para: ${propertyId}\n`);

  const supabase = createAdminClient();

  try {
    // Obtener todas las categorías de la propiedad
    const { data: categories, error } = await supabase
      .from('property_dynamic_categories')
      .select('id, category_name, activities_text, budget_index, created_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error al obtener categorías:', error);
      process.exit(1);
    }

    if (!categories || categories.length === 0) {
      console.log('⚠️  No se encontraron categorías para esta propiedad.');
      console.log('💡 Puede que necesites extraer las categorías desde el presupuesto PDF.\n');
      return;
    }

    console.log(`📊 Total de categorías encontradas: ${categories.length}\n`);

    // Agrupar por nombre de categoría
    const grouped = new Map<string, typeof categories>();
    categories.forEach(cat => {
      const key = cat.category_name;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(cat);
    });

    console.log(`📋 Categorías únicas: ${grouped.size}\n`);

    let categoriesWithActivities = 0;
    let categoriesWithoutActivities = 0;

    grouped.forEach((cats, categoryName) => {
      const hasActivities = cats.some(cat => cat.activities_text && cat.activities_text.trim().length > 0);
      
      if (hasActivities) {
        categoriesWithActivities++;
        console.log(`✅ ${categoryName}`);
        cats.forEach(cat => {
          const activitiesPreview = cat.activities_text 
            ? cat.activities_text.substring(0, 100) + (cat.activities_text.length > 100 ? '...' : '')
            : 'Sin actividades';
          console.log(`   - Presupuesto ${cat.budget_index || 1}: ${activitiesPreview}`);
        });
      } else {
        categoriesWithoutActivities++;
        console.log(`❌ ${categoryName} (sin actividades)`);
        cats.forEach(cat => {
          console.log(`   - Presupuesto ${cat.budget_index || 1}: ID ${cat.id}`);
        });
      }
      console.log('');
    });

    console.log('\n📈 Resumen:');
    console.log(`   ✅ Con actividades: ${categoriesWithActivities}`);
    console.log(`   ❌ Sin actividades: ${categoriesWithoutActivities}`);
    console.log(`   📊 Total: ${grouped.size}`);

    if (categoriesWithoutActivities > 0) {
      console.log('\n💡 Si las categorías no tienen actividades, puedes:');
      console.log('   1. Verificar que el PDF del presupuesto tenga las actividades');
      console.log('   2. Ejecutar la extracción manual desde la UI');
      console.log('   3. Verificar que n8n esté procesando correctamente los PDFs');
    }

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

// Ejecutar
const propertyId = process.argv[2];

if (!propertyId) {
  console.error('❌ Por favor proporciona un ID de propiedad');
  console.error('Uso: npx tsx scripts/check-categories-activities.ts SP-KMX-CYX-001422');
  process.exit(1);
}

checkCategoriesActivities(propertyId);
