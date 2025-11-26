#!/usr/bin/env tsx
/**
 * Script para sincronizar propiedades de Initial Check desde Airtable
 * Usa la view viwFZZ5S3VFCfYP6g que contiene propiedades en fase Initial Check
 * Uso: npm run sync:initial-check
 */

import { loadEnvConfig } from '@next/env';
import { syncInitialCheckFromAirtable } from '../lib/airtable/sync-initial-check';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  console.log('🔄 Iniciando sincronización de Initial Check desde Airtable...\n');

  try {
    const result = await syncInitialCheckFromAirtable();

    console.log('\n✅ Sincronización completada!\n');
    console.log('📊 Resumen:');
    console.log(`   - Creadas: ${result.created}`);
    console.log(`   - Actualizadas: ${result.updated}`);
    console.log(`   - Errores: ${result.errors}\n`);

    if (result.details.length > 0) {
      console.log('📝 Detalles (primeros 20):');
      result.details.slice(0, 20).forEach((detail) => console.log(`   ${detail}`));
      if (result.details.length > 20) {
        console.log(`   ... y ${result.details.length - 20} más`);
      }
    }

    if (result.errors > 0) {
      console.log('\n⚠️  Hay errores. Revisa los detalles arriba.');
      process.exit(1);
    }

    console.log('\n✅ Todas las propiedades de Initial Check han sido sincronizadas correctamente.');
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




