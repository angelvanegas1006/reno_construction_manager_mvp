/**
 * Script para sincronizar propiedades de Upcoming Settlements desde Airtable
 * Ejecutar con: npm run sync:upcoming-settlements
 */

import { syncUpcomingSettlementsFromAirtable } from '../lib/airtable/sync-upcoming-settlements';

async function main() {
  console.log('🚀 Starting Upcoming Settlements sync from Airtable...\n');
  
  try {
    const result = await syncUpcomingSettlementsFromAirtable();
    
    console.log('\n✅ Sync completed successfully!');
    console.log(`   Created: ${result.created}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Errors: ${result.errors}`);
    
    if (result.details.length > 0) {
      console.log('\n📋 Details:');
      result.details.forEach(detail => console.log(`   ${detail}`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during sync:', error);
    process.exit(1);
  }
}

main();


