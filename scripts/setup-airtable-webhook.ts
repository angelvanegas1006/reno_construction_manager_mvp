#!/usr/bin/env tsx
/**
 * Script para configurar el webhook de Airtable automáticamente
 * 
 * Uso:
 *   npm run setup:airtable-webhook
 *   o
 *   tsx scripts/setup-airtable-webhook.ts
 */

import { setupAirtableWebhook } from '../lib/airtable/webhook-manager';

async function main() {
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
  // Prioridad: AIRTABLE_WEBHOOK_URL > NEXT_PUBLIC_APP_URL > VERCEL_URL > VERCEL_BRANCH_URL
  const appUrl = process.env.AIRTABLE_WEBHOOK_URL 
    ? null // Si está configurado directamente, no construir
    : process.env.NEXT_PUBLIC_APP_URL 
    || process.env.VERCEL_URL 
    || process.env.VERCEL_BRANCH_URL;
  const webhookUrl = process.env.AIRTABLE_WEBHOOK_URL;

  if (!baseId) {
    console.error('❌ NEXT_PUBLIC_AIRTABLE_BASE_ID no está configurado');
    process.exit(1);
  }

  // Construir URL del webhook
  let finalWebhookUrl: string;
  
  if (webhookUrl) {
    // Si está configurado directamente, usarlo
    finalWebhookUrl = webhookUrl;
  } else if (appUrl) {
    // Construir desde la URL de la app
    const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
    finalWebhookUrl = `${baseUrl}/api/webhooks/airtable`;
  } else {
    console.error('❌ No se pudo determinar la URL del webhook.');
    console.error('');
    console.error('   Opciones:');
    console.error('   1. Configura AIRTABLE_WEBHOOK_URL con la URL completa');
    console.error('   2. Configura NEXT_PUBLIC_APP_URL con tu dominio');
    console.error('   3. En Vercel, VERCEL_URL se configura automáticamente');
    console.error('');
    console.error('   Ejemplo:');
    console.error('   AIRTABLE_WEBHOOK_URL=https://tu-app.vercel.app/api/webhooks/airtable');
    process.exit(1);
  }

  console.log('🔧 Configurando webhook de Airtable...');
  console.log(`   Base ID: ${baseId}`);
  console.log(`   Webhook URL: ${finalWebhookUrl}`);

  const result = await setupAirtableWebhook(baseId, finalWebhookUrl);

  if (!result) {
    console.error('❌ No se pudo configurar el webhook');
    process.exit(1);
  }

  if (result.created) {
    console.log('✅ Webhook creado exitosamente!');
    console.log(`   Webhook ID: ${result.webhookId}`);
  } else {
    console.log('✅ Webhook ya existía, reutilizado');
    console.log(`   Webhook ID: ${result.webhookId}`);
  }

  console.log('\n📝 Próximos pasos:');
  console.log('   1. Verifica que el webhook esté activo en Airtable');
  console.log('   2. Prueba actualizando un campo en Airtable');
  console.log('   3. Verifica los logs en tu aplicación');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

