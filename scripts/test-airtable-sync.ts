#!/usr/bin/env tsx
/**
 * Script para probar la sincronización de Airtable manualmente
 * Uso: npm run test:sync-airtable
 */

import { syncPropertiesFromAirtable } from '../lib/airtable/sync-from-airtable';

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const AIRTABLE_VIEW_ID = 'viwpYQ0hsSSdFrSD1';

async function main() {
  console.log('🔄 Iniciando sincronización de Airtable...\n');

  // Verificar variables de entorno
  const requiredEnvVars = [
    'NEXT_PUBLIC_AIRTABLE_API_KEY',
    'NEXT_PUBLIC_AIRTABLE_BASE_ID',
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

  try {
    const result = await syncPropertiesFromAirtable(
      AIRTABLE_TABLE_ID,
      AIRTABLE_VIEW_ID
    );

    console.log('\n✅ Sincronización completada!\n');
    console.log('📊 Resumen:');
    console.log(`   - Creadas: ${result.created}`);
    console.log(`   - Actualizadas: ${result.updated}`);
    console.log(`   - Errores: ${result.errors}\n`);

    if (result.details.length > 0) {
      console.log('📝 Detalles:');
      result.details.forEach((detail) => console.log(`   ${detail}`));
    }

    if (result.errors > 0) {
      console.log('\n⚠️  Hay errores. Revisa los detalles arriba.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Error durante la sincronización:');
    console.error(error.message);
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

