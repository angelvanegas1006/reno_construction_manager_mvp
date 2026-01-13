#!/usr/bin/env tsx
/**
 * Script para ejecutar el webhook de n8n para propiedades en reno-in-progress
 * que tienen budget_pdf_url pero no tienen categorías dinámicas
 * 
 * Ejecutar con: npx tsx scripts/run-n8n-webhook-for-properties.ts
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { callN8nCategoriesWebhook, prepareWebhookPayload } from '@/lib/n8n/webhook-caller';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

interface PropertyResult {
  id: string;
  address: string;
  budget_pdf_url: string | null;
  hasCategories: boolean;
  webhookSuccess: boolean;
  webhookError: string | null;
}

async function runN8nWebhookForProperties() {
  console.log('🚀 Ejecutando webhook de n8n para propiedades en reno-in-progress...\n');

  const supabase = createAdminClient();

  try {
    // 1. Obtener todas las propiedades en reno-in-progress con budget_pdf_url
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, address, budget_pdf_url, "Unique ID From Engagements", name, "Client Name", "Client email", renovation_type, area_cluster')
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
    const results: PropertyResult[] = [];
    let webhookCalled = 0;
    let webhookSuccess = 0;
    let webhookFailed = 0;
    let skippedHasCategories = 0;
    let skippedNoPayload = 0;

    for (const property of properties) {
      // Verificar si tiene categorías dinámicas
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
        skippedHasCategories++;
        results.push({
          id: property.id,
          address: property.address || 'Sin dirección',
          budget_pdf_url: property.budget_pdf_url,
          hasCategories: true,
          webhookSuccess: false,
          webhookError: 'Ya tiene categorías',
        });
        continue;
      }

      // Preparar payload
      const payload = prepareWebhookPayload(property as any);
      if (!payload) {
        skippedNoPayload++;
        results.push({
          id: property.id,
          address: property.address || 'Sin dirección',
          budget_pdf_url: property.budget_pdf_url,
          hasCategories: false,
          webhookSuccess: false,
          webhookError: 'No se pudo preparar payload',
        });
        continue;
      }

      // Llamar al webhook
      console.log(`📤 Llamando webhook para ${property.id}...`);
      webhookCalled++;
      
      try {
        const success = await callN8nCategoriesWebhook(payload);
        
        if (success) {
          webhookSuccess++;
          console.log(`✅ Webhook exitoso para ${property.id}\n`);
          results.push({
            id: property.id,
            address: property.address || 'Sin dirección',
            budget_pdf_url: property.budget_pdf_url,
            hasCategories: false,
            webhookSuccess: true,
            webhookError: null,
          });
        } else {
          webhookFailed++;
          console.log(`❌ Webhook falló para ${property.id}\n`);
          results.push({
            id: property.id,
            address: property.address || 'Sin dirección',
            budget_pdf_url: property.budget_pdf_url,
            hasCategories: false,
            webhookSuccess: false,
            webhookError: 'Webhook retornó false',
          });
        }

        // Pequeña pausa entre llamadas para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        webhookFailed++;
        const errorMessage = error.message || String(error);
        console.error(`❌ Error llamando webhook para ${property.id}:`, errorMessage);
        results.push({
          id: property.id,
          address: property.address || 'Sin dirección',
          budget_pdf_url: property.budget_pdf_url,
          hasCategories: false,
          webhookSuccess: false,
          webhookError: errorMessage,
        });
      }
    }

    // 3. Generar informe
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 INFORME: Ejecución del Webhook de n8n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📊 RESUMEN:`);
    console.log(`   Total propiedades con budget_pdf_url: ${properties.length}`);
    console.log(`   ⏭️  Omitidas (ya tienen categorías): ${skippedHasCategories}`);
    console.log(`   ⏭️  Omitidas (no se pudo preparar payload): ${skippedNoPayload}`);
    console.log(`   📤 Webhooks llamados: ${webhookCalled}`);
    console.log(`   ✅ Webhooks exitosos: ${webhookSuccess}`);
    console.log(`   ❌ Webhooks fallidos: ${webhookFailed}\n`);

    // Mostrar propiedades con errores
    const failedProperties = results.filter(r => !r.webhookSuccess && r.webhookError !== 'Ya tiene categorías');
    
    if (failedProperties.length > 0) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`❌ PROPIEDADES CON ERRORES (${failedProperties.length}):`);
      console.log('═══════════════════════════════════════════════════════════════\n');

      failedProperties.forEach((result, index) => {
        console.log(`${index + 1}. ${result.id} - ${result.address}`);
        console.log(`   Error: ${result.webhookError}`);
        console.log(`   budget_pdf_url: ${result.budget_pdf_url ? '✅ Sí' : '❌ No'}\n`);
      });
    }

    // Mostrar propiedades exitosas
    const successProperties = results.filter(r => r.webhookSuccess);
    if (successProperties.length > 0) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`✅ PROPIEDADES EXITOSAS (${successProperties.length}):`);
      console.log('═══════════════════════════════════════════════════════════════\n');

      successProperties.forEach((result, index) => {
        console.log(`${index + 1}. ${result.id} - ${result.address}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Proceso completado\n');

  } catch (error) {
    console.error('❌ Error ejecutando webhooks:', error);
  }
}

// Ejecutar
runN8nWebhookForProperties()
  .then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });
