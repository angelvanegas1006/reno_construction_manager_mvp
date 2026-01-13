#!/usr/bin/env tsx
/**
 * Script para extraer categorías del PDF del presupuesto para propiedades en "reno-in-progress"
 * Llama al webhook de n8n para cada propiedad que tiene budget_pdf_url
 * 
 * Uso: npx tsx scripts/extract-categories-reno-in-progress.ts [--force]
 *      --force: Extrae categorías incluso si ya existen
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { createAdminClient } from '../lib/supabase/admin';

const WEBHOOK_URL = 'https://n8n.prod.prophero.com/webhook/send_categories_cursor';

interface WebhookPayload {
  budget_pdf_url: string;
  property_id: string;
  unique_id: string | null;
  property_name: string | null;
  address: string | null;
  client_name: string | null;
  client_email: string | null;
  renovation_type: string | null;
  area_cluster: string | null;
}

/**
 * Prepara el payload del webhook desde los datos de una propiedad
 */
function prepareWebhookPayload(property: any): WebhookPayload | null {
  if (!property.budget_pdf_url) {
    return null;
  }

  // Si budget_pdf_url tiene múltiples URLs separadas por comas, tomar solo la primera
  const budgetPdfUrl = property.budget_pdf_url.split(',')[0].trim();

  return {
    budget_pdf_url: budgetPdfUrl,
    property_id: property.id,
    unique_id: property['Unique ID From Engagements'] || null,
    property_name: property.name || null,
    address: property.address || null,
    client_name: property['Client Name'] || null,
    client_email: property['Client email'] || null,
    renovation_type: property.renovation_type || null,
    area_cluster: property.area_cluster || null,
  };
}

/**
 * Llama al webhook de n8n para extraer categorías
 */
async function callN8nCategoriesWebhook(payload: WebhookPayload): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`   ❌ Error: ${response.status} - ${errorText.substring(0, 200)}`);
        return false;
      }

      await response.json().catch(() => ({}));
      return true;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('   ❌ Timeout después de 30 segundos');
        return false;
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function extractCategories(force: boolean = false) {
  console.log('📤 Extrayendo categorías del PDF para propiedades en "reno-in-progress"\n');
  if (force) {
    console.log('⚠️  Modo FORCE activado: Se extraerán categorías incluso si ya existen\n');
  }
  console.log('='.repeat(80));
  
  const supabase = createAdminClient();
  
  // 1. Obtener todas las propiedades en fase "reno-in-progress" con budget_pdf_url
  const { data: properties, error: propertiesError } = await supabase
    .from('properties')
    .select(`
      id,
      address,
      budget_pdf_url,
      "Unique ID From Engagements",
      name,
      "Client Name",
      "Client email",
      renovation_type,
      area_cluster
    `)
    .eq('reno_phase', 'reno-in-progress')
    .not('budget_pdf_url', 'is', null)
    .order('address');
  
  if (propertiesError) {
    console.error('❌ Error obteniendo propiedades:', propertiesError);
    process.exit(1);
  }
  
  if (!properties || properties.length === 0) {
    console.log('⚠️  No se encontraron propiedades en "reno-in-progress" con budget_pdf_url');
    process.exit(0);
  }
  
  console.log(`\n📋 Total propiedades con PDF: ${properties.length}\n`);
  
  // 2. Verificar cuáles tienen categorías
  const propertiesToProcess: Array<{
    property: any;
    hasCategories: boolean;
    categoriesCount: number;
  }> = [];
  
  for (const property of properties) {
    const { data: categories } = await supabase
      .from('property_dynamic_categories')
      .select('id')
      .eq('property_id', property.id)
      .limit(1);
    
    const hasCategories = categories && categories.length > 0;
    const categoriesCount = categories?.length || 0;
    
    // Si no es force y ya tiene categorías, saltar
    if (!force && hasCategories) {
      continue;
    }
    
    propertiesToProcess.push({
      property,
      hasCategories,
      categoriesCount,
    });
  }
  
  if (propertiesToProcess.length === 0) {
    console.log('✅ Todas las propiedades ya tienen categorías extraídas');
    if (!force) {
      console.log('💡 Usa --force para re-extraer las categorías\n');
    }
    process.exit(0);
  }
  
  console.log(`📤 Propiedades a procesar: ${propertiesToProcess.length}\n`);
  
  // 3. Procesar cada propiedad
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
  };
  
  for (let i = 0; i < propertiesToProcess.length; i++) {
    const { property, hasCategories, categoriesCount } = propertiesToProcess[i];
    const progress = `[${i + 1}/${propertiesToProcess.length}]`;
    
    console.log(`${progress} ${property.address || property.id}`);
    
    if (hasCategories && !force) {
      console.log(`   ⏭️  Ya tiene ${categoriesCount} categorías, saltando...`);
      results.skipped++;
      continue;
    }
    
    if (hasCategories && force) {
      console.log(`   🔄 Re-extracción forzada (tiene ${categoriesCount} categorías)...`);
    } else {
      console.log(`   📤 Extrayendo categorías...`);
    }
    
    const payload = prepareWebhookPayload(property);
    if (!payload) {
      console.log(`   ⚠️  No se pudo preparar payload (sin budget_pdf_url válido)`);
      results.failed++;
      continue;
    }
    
    const success = await callN8nCategoriesWebhook(payload);
    
    if (success) {
      console.log(`   ✅ Webhook llamado exitosamente`);
      results.success++;
    } else {
      console.log(`   ❌ Error llamando al webhook`);
      results.failed++;
    }
    
    // Esperar un poco entre llamadas para no saturar el webhook
    if (i < propertiesToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo entre llamadas
    }
    
    console.log(''); // Línea en blanco
  }
  
  // 4. Resumen final
  console.log('='.repeat(80));
  console.log('\n📊 RESUMEN:\n');
  console.log(`   ✅ Exitosas: ${results.success}`);
  console.log(`   ❌ Fallidas: ${results.failed}`);
  console.log(`   ⏭️  Saltadas: ${results.skipped}`);
  console.log(`   📋 Total procesadas: ${propertiesToProcess.length}\n`);
  
  if (results.success > 0) {
    console.log(`✅ ${results.success} propiedades procesadas exitosamente`);
    console.log('⏳ El workflow de n8n está procesando los PDFs. Las categorías aparecerán cuando se complete el procesamiento.\n');
  }
  
  if (results.failed > 0) {
    console.log(`⚠️  ${results.failed} propiedades fallaron. Revisa los logs arriba para más detalles.\n`);
  }
}

const force = process.argv.includes('--force');

extractCategories(force)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
