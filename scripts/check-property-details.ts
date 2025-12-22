#!/usr/bin/env tsx
/**
 * Script para verificar detalles de una propiedad específica
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkPropertyDetails(propertyId: string) {
  console.log(`🔍 Verificando detalles de la propiedad: ${propertyId}\n`);

  const supabase = createAdminClient();

  try {
    // 1. Obtener información de la propiedad
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propertyError) {
      console.error('❌ Error obteniendo propiedad:', propertyError);
      return;
    }

    if (!property) {
      console.error('❌ Propiedad no encontrada');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 INFORMACIÓN DE LA PROPIEDAD');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`ID: ${property.id}`);
    console.log(`Dirección: ${property.address || 'N/A'}`);
    console.log(`Fase: ${property.reno_phase || 'N/A'}`);
    console.log(`Set Up Status: ${property['Set Up Status'] || 'N/A'}`);
    console.log(`Renovator: ${property['Renovator name'] || 'N/A'}`);
    console.log(`Budget PDF URL: ${property.budget_pdf_url || '❌ No tiene'}`);
    console.log(`Unique ID: ${property['Unique ID From Engagements'] || 'N/A'}`);
    console.log(`Client Email: ${property['Client email'] || 'N/A'}`);
    console.log(`Renovation Type: ${property.renovation_type || 'N/A'}`);
    console.log(`Area Cluster: ${property.area_cluster || 'N/A'}`);
    console.log(`Created At: ${property.created_at || 'N/A'}`);
    console.log(`Updated At: ${property.updated_at || 'N/A'}\n`);

    // 2. Verificar categorías dinámicas
    const { data: categories, error: categoriesError } = await supabase
      .from('property_dynamic_categories')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (categoriesError) {
      console.error('❌ Error obteniendo categorías:', categoriesError);
    } else {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📊 CATEGORÍAS DINÁMICAS');
      console.log('═══════════════════════════════════════════════════════════════\n');

      if (!categories || categories.length === 0) {
        console.log('❌ No tiene categorías dinámicas\n');
      } else {
        console.log(`✅ Tiene ${categories.length} categoría(s) dinámica(s):\n`);
        categories.forEach((cat, index) => {
          console.log(`${index + 1}. ID: ${cat.id}`);
          console.log(`   Categoría: ${cat.category || 'N/A'}`);
          console.log(`   Valor: ${cat.value || 'N/A'}`);
          console.log(`   Creado: ${cat.created_at || 'N/A'}\n`);
        });
      }
    }

    // 3. Verificar si el budget_pdf_url es válido
    if (property.budget_pdf_url) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('🔗 VERIFICACIÓN DEL BUDGET PDF URL');
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      const budgetUrl = property.budget_pdf_url;
      console.log(`URL: ${budgetUrl}`);
      console.log(`Es válida: ${budgetUrl.startsWith('http://') || budgetUrl.startsWith('https://') ? '✅ Sí' : '❌ No'}`);
      
      // Verificar si tiene múltiples URLs
      if (budgetUrl.includes(',')) {
        const urls = budgetUrl.split(',');
        console.log(`\nTiene ${urls.length} URL(s) separadas por comas:`);
        urls.forEach((url, index) => {
          console.log(`  ${index + 1}. ${url.trim()}`);
        });
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Verificación completada\n');

  } catch (error) {
    console.error('❌ Error verificando propiedad:', error);
  }
}

// Obtener el ID de la propiedad desde los argumentos
const propertyId = process.argv[2];

if (!propertyId) {
  console.error('❌ Por favor proporciona el ID de la propiedad');
  console.log('Uso: npx tsx scripts/check-property-details.ts <PROPERTY_ID>');
  process.exit(1);
}

checkPropertyDetails(propertyId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });
