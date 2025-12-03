/**
 * Script para sincronizar propiedades de Final Check desde Airtable
 * Ejecutar con: npm run sync:final-check
 */

import { syncFinalCheckFromAirtable } from '../lib/airtable/sync-final-check';

async function main() {
  console.log('🚀 Starting Final Check sync...\n');
  
  try {
    const result = await syncFinalCheckFromAirtable();
    
    console.log('\n✅ Sync completed successfully!');
    console.log(`   Created: ${result.created}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Errors: ${result.errors}`);
    
    if (result.errors > 0) {
      console.log('\n⚠️  Some errors occurred. Check the details above.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

main();








