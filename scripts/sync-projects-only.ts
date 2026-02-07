/**
 * Script para ejecutar solo la sincronización de proyectos desde Airtable.
 * Uso: npx tsx scripts/sync-projects-only.ts
 */

import { loadEnvConfig } from '@next/env';
import { syncProjectsFromAirtable } from '../lib/airtable/sync-projects';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  console.log('🚀 Sync de proyectos desde Airtable...\n');
  const tableId = process.env.AIRTABLE_PROJECTS_TABLE_ID || '(no definido)';
  console.log('AIRTABLE_PROJECTS_TABLE_ID:', tableId);

  let result;
  try {
    result = await syncProjectsFromAirtable();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    console.error('❌ Error en syncProjectsFromAirtable:', errMsg);
    if (errStack) console.error(errStack);
    process.exit(1);
  }

  const summary = [
    '\n📋 Resultado:',
    `   skipped: ${result.skipped}`,
    `   created: ${result.created}`,
    `   updated: ${result.updated}`,
    `   errors: ${result.errors}`,
  ].join('\n');
  console.log(summary);

  if (result.skipped) {
    console.log('\n⚠️ Sync de proyectos omitido (falta AIRTABLE_PROJECTS_TABLE_ID o credenciales Airtable).');
  } else if (result.errors > 0) {
    console.log('\n❌ Hubo errores durante el sync.');
    process.exit(1);
  } else {
    console.log('\n✅ Sync de proyectos completado.');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
