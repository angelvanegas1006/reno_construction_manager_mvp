/**
 * Script para ejecutar el sync completo de todas las fases desde Airtable
 * Ejecutar con: npm run sync:all-phases
 */

import { loadEnvConfig } from '@next/env';
import { syncAllPhasesFromAirtable } from '../lib/airtable/sync-all-phases';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  console.log('🚀 Starting complete Airtable sync for all phases...\n');
  
  try {
    const result = await syncAllPhasesFromAirtable();
    
    if (result.success) {
      console.log('\n✅ Sync completed successfully!');
      console.log(`   Total Created: ${result.totalCreated}`);
      console.log(`   Total Updated: ${result.totalUpdated}`);
      console.log(`   Total Errors: ${result.totalErrors}`);
    } else {
      console.log('\n⚠️  Sync completed with errors');
      console.log(`   Total Created: ${result.totalCreated}`);
      console.log(`   Total Updated: ${result.totalUpdated}`);
      console.log(`   Total Errors: ${result.totalErrors}`);
      
      // Mostrar primeros errores para debugging
      if (result.phases && result.phases.length > 0) {
        console.log('\n📋 Phase details:');
        result.phases.forEach(phase => {
          if (phase.errors > 0 || phase.details.length > 0) {
            console.log(`\n   ${phase.phase}:`);
            phase.details.slice(0, 5).forEach(detail => console.log(`     - ${detail}`));
            if (phase.details.length > 5) {
              console.log(`     ... and ${phase.details.length - 5} more`);
            }
          }
        });
      }
    }
    
    process.exit(result.success ? 0 : 1);
  } catch (error: any) {
    console.error('\n❌ Fatal error during sync:', error);
    process.exit(1);
  }
}

main();






