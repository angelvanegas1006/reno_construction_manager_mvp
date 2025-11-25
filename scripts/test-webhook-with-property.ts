#!/usr/bin/env tsx
/**
 * Script para probar el webhook con una propiedad específica
 * Actualiza una propiedad con budget_pdf_url y luego llama al webhook
 * Uso: npm run test:webhook
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
import { callN8nCategoriesWebhook, prepareWebhookPayload } from '../lib/n8n/webhook-caller';

async function main() {
  console.log('🧪 Probando webhook con una propiedad específica...\n');

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
    // Buscar propiedades en reno-in-progress sin categorías
    const { data: allProperties, error: fetchError } = await supabase
      .from('properties')
      .select('id, name, address, budget_pdf_url, reno_phase, "Unique ID From Engagements", "Client Name", "Client email", renovation_type, area_cluster')
      .eq('reno_phase', 'reno-in-progress')
      .limit(10);

    if (fetchError) {
      console.error('❌ Error:', fetchError);
      process.exit(1);
    }

    if (!allProperties || allProperties.length === 0) {
      console.log('❌ No se encontraron propiedades en reno-in-progress');
      process.exit(1);
    }

    // Buscar una propiedad sin categorías
    let property = null;
    for (const prop of allProperties) {
      const { data: categories } = await supabase
        .from('property_dynamic_categories')
        .select('id')
        .eq('property_id', prop.id)
        .limit(1);

      if (!categories || categories.length === 0) {
        property = prop;
        break;
      }
    }

    if (!property) {
      console.log('❌ No se encontraron propiedades sin categorías en reno-in-progress');
      console.log('💡 Todas las propiedades ya tienen categorías. Usa otra propiedad o elimina las categorías de una.\n');
      process.exit(1);
    }

    console.log(`📋 Propiedad seleccionada: ${property.id}`);
    console.log(`   Dirección: ${property.address || 'N/A'}`);
    console.log(`   budget_pdf_url actual: ${property.budget_pdf_url || '❌ Sin URL'}\n`);

    // Si no tiene budget_pdf_url, usar uno de prueba (del ejemplo que proporcionaste)
    if (!property.budget_pdf_url) {
      const testBudgetUrl = 'https://api.portfolio.prod.prophero.com/assets/users/docs?key=users/7e63b1a4-287b-4e9e-8761-9a34488d1dc5/docs/budget-attachment/plaza-del-general-dolz-20--3-d--alzira--2-.pdf';
      
      console.log(`🔧 Actualizando propiedad con budget_pdf_url de prueba...\n`);
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ budget_pdf_url: testBudgetUrl })
        .eq('id', property.id);

      if (updateError) {
        console.error('❌ Error actualizando budget_pdf_url:', updateError);
        process.exit(1);
      }

      property.budget_pdf_url = testBudgetUrl;
      console.log(`✅ Propiedad actualizada con budget_pdf_url de prueba\n`);
    }

    // Ya verificamos que no tiene categorías en el bucle anterior

    console.log('✅ Propiedad lista para probar el webhook:');
    console.log(`   - ID: ${property.id}`);
    console.log(`   - Tiene budget_pdf_url: ✅`);
    console.log(`   - No tiene categorías: ✅`);
    console.log(`   - Está en reno-in-progress: ✅\n`);

    // Preparar payload
    const payload = prepareWebhookPayload(property);
    if (!payload) {
      console.error('❌ No se pudo preparar el payload del webhook');
      process.exit(1);
    }

    console.log('📤 Payload del webhook:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n');

    // Llamar al webhook
    console.log('🚀 Llamando al webhook de n8n...\n');
    const success = await callN8nCategoriesWebhook(payload);

    if (success) {
      console.log('\n✅ Webhook llamado exitosamente!');
      console.log('💡 Las categorías deberían aparecer en la base de datos cuando n8n procese el PDF.\n');
    } else {
      console.log('\n❌ Error al llamar al webhook');
      process.exit(1);
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

