/**
 * Script para sincronizar propiedades de Reno In Progress desde Airtable
 * Ejecutar con: npm run sync:reno-in-progress
 */

import { loadEnvConfig } from '@next/env';
import { syncRenoInProgressFromAirtable } from '../lib/airtable/sync-reno-in-progress';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  console.log('🚀 Starting Reno In Progress sync...\n');
  
  try {
    const result = await syncRenoInProgressFromAirtable();
    
    console.log('\n✅ Sync completed!');
    console.log(`   Created: ${result.created}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Errors: ${result.errors}`);
    
    process.exit(result.errors > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();






