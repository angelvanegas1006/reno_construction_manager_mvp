/**
 * Script para sincronizar propiedades de Upcoming (Reno Budget) desde Airtable
 * Ejecutar con: npm run sync:upcoming-reno-budget
 */

import { syncUpcomingRenoBudgetFromAirtable } from '../lib/airtable/sync-upcoming-reno-budget';

async function main() {
  console.log('🚀 Starting Upcoming (Reno Budget) sync from Airtable...\n');
  
  try {
    const result = await syncUpcomingRenoBudgetFromAirtable();
    
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








