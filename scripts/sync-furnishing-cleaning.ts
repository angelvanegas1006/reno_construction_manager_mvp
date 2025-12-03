/**
 * Script para sincronizar propiedades de Furnishing & Cleaning desde Airtable
 * Ejecutar con: npm run sync:furnishing-cleaning
 */

import { syncFurnishingCleaningFromAirtable } from '../lib/airtable/sync-furnishing-cleaning';

async function main() {
  console.log('🚀 Starting Furnishing & Cleaning sync...\n');
  
  try {
    const result = await syncFurnishingCleaningFromAirtable();
    
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








