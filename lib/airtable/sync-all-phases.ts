/**
 * Sync maestro que sincroniza todas las fases del kanban desde Airtable
 * Asegura que las propiedades en Supabase coincidan exactamente con las views de Airtable
 */

import { syncUpcomingSettlementsFromAirtable } from './sync-upcoming-settlements';
import { syncUpcomingRenoBudgetFromAirtable } from './sync-upcoming-reno-budget';
import { syncUpcomingFromAirtable } from './sync-upcoming';
import { syncInitialCheckFromAirtable } from './sync-initial-check';
import { syncRenoInProgressFromAirtable } from './sync-reno-in-progress';
import { syncFurnishingCleaningFromAirtable } from './sync-furnishing-cleaning';
import { syncFinalCheckFromAirtable } from './sync-final-check';
import { createAdminClient } from '@/lib/supabase/admin';

export interface SyncResult {
  phase: string;
  created: number;
  updated: number;
  errors: number;
  details: string[];
}

export interface AllPhasesSyncResult {
  success: boolean;
  timestamp: string;
  phases: SyncResult[];
  totalCreated: number;
  totalUpdated: number;
  totalErrors: number;
}

/**
 * Sincroniza todas las fases del kanban desde Airtable
 * Ejecuta los syncs en orden y asegura que las propiedades coincidan con las views
 */
export async function syncAllPhasesFromAirtable(): Promise<AllPhasesSyncResult> {
  console.log('🔄 Starting complete Airtable sync for all phases...\n');
  const startTime = new Date();
  
  const results: SyncResult[] = [];
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  try {
    // 1. Sync Upcoming Settlements (Upcoming Reno)
    console.log('📋 Phase 1: Upcoming Settlements (Upcoming Reno)');
    console.log('='.repeat(60));
    try {
      const upcomingResult = await syncUpcomingSettlementsFromAirtable();
      results.push({
        phase: 'upcoming-settlements',
        ...upcomingResult,
      });
      totalCreated += upcomingResult.created;
      totalUpdated += upcomingResult.updated;
      totalErrors += upcomingResult.errors;
      console.log(`✅ Upcoming Settlements: ${upcomingResult.created} created, ${upcomingResult.updated} updated, ${upcomingResult.errors} errors\n`);
    } catch (error: any) {
      console.error('❌ Error syncing Upcoming Settlements:', error);
      results.push({
        phase: 'upcoming-settlements',
        created: 0,
        updated: 0,
        errors: 1,
        details: [`Error: ${error.message}`],
      });
      totalErrors++;
    }

    // 2. Sync Upcoming (Pending to validate budget)
    console.log('📋 Phase 2: Upcoming (Pending to validate budget)');
    console.log('='.repeat(60));
    try {
      const upcomingResult = await syncUpcomingFromAirtable();
      results.push({
        phase: 'upcoming',
        ...upcomingResult,
      });
      totalCreated += upcomingResult.created;
      totalUpdated += upcomingResult.updated;
      totalErrors += upcomingResult.errors;
      console.log(`✅ Upcoming: ${upcomingResult.created} created, ${upcomingResult.updated} updated, ${upcomingResult.errors} errors\n`);
    } catch (error: any) {
      console.error('❌ Error syncing Upcoming:', error);
      results.push({
        phase: 'upcoming',
        created: 0,
        updated: 0,
        errors: 1,
        details: [`Error: ${error.message}`],
      });
      totalErrors++;
    }

    // 3. Sync Upcoming Reno Budget
    console.log('📋 Phase 3: Upcoming Reno Budget');
    console.log('='.repeat(60));
    try {
      const renoBudgetResult = await syncUpcomingRenoBudgetFromAirtable();
      results.push({
        phase: 'reno-budget',
        ...renoBudgetResult,
      });
      totalCreated += renoBudgetResult.created;
      totalUpdated += renoBudgetResult.updated;
      totalErrors += renoBudgetResult.errors;
      console.log(`✅ Upcoming Reno Budget: ${renoBudgetResult.created} created, ${renoBudgetResult.updated} updated, ${renoBudgetResult.errors} errors\n`);
    } catch (error: any) {
      console.error('❌ Error syncing Upcoming Reno Budget:', error);
      results.push({
        phase: 'reno-budget',
        created: 0,
        updated: 0,
        errors: 1,
        details: [`Error: ${error.message}`],
      });
      totalErrors++;
    }

    // 4. Sync Initial Check
    console.log('📋 Phase 4: Initial Check');
    console.log('='.repeat(60));
    try {
      const initialCheckResult = await syncInitialCheckFromAirtable();
      results.push({
        phase: 'initial-check',
        ...initialCheckResult,
      });
      totalCreated += initialCheckResult.created;
      totalUpdated += initialCheckResult.updated;
      totalErrors += initialCheckResult.errors;
      console.log(`✅ Initial Check: ${initialCheckResult.created} created, ${initialCheckResult.updated} updated, ${initialCheckResult.errors} errors\n`);
    } catch (error: any) {
      console.error('❌ Error syncing Initial Check:', error);
      results.push({
        phase: 'initial-check',
        created: 0,
        updated: 0,
        errors: 1,
        details: [`Error: ${error.message}`],
      });
      totalErrors++;
    }

    // 5. Sync Reno In Progress
    console.log('📋 Phase 5: Reno In Progress');
    console.log('='.repeat(60));
    try {
      const renoInProgressResult = await syncRenoInProgressFromAirtable();
      results.push({
        phase: 'reno-in-progress',
        ...renoInProgressResult,
      });
      totalCreated += renoInProgressResult.created;
      totalUpdated += renoInProgressResult.updated;
      totalErrors += renoInProgressResult.errors;
      console.log(`✅ Reno In Progress: ${renoInProgressResult.created} created, ${renoInProgressResult.updated} updated, ${renoInProgressResult.errors} errors\n`);
    } catch (error: any) {
      console.error('❌ Error syncing Reno In Progress:', error);
      results.push({
        phase: 'reno-in-progress',
        created: 0,
        updated: 0,
        errors: 1,
        details: [`Error: ${error.message}`],
      });
      totalErrors++;
    }

    // 6. Sync Furnishing & Cleaning
    console.log('📋 Phase 6: Furnishing & Cleaning');
    console.log('='.repeat(60));
    try {
      const furnishingResult = await syncFurnishingCleaningFromAirtable();
      results.push({
        phase: 'furnishing-cleaning',
        ...furnishingResult,
      });
      totalCreated += furnishingResult.created;
      totalUpdated += furnishingResult.updated;
      totalErrors += furnishingResult.errors;
      console.log(`✅ Furnishing & Cleaning: ${furnishingResult.created} created, ${furnishingResult.updated} updated, ${furnishingResult.errors} errors\n`);
    } catch (error: any) {
      console.error('❌ Error syncing Furnishing & Cleaning:', error);
      results.push({
        phase: 'furnishing-cleaning',
        created: 0,
        updated: 0,
        errors: 1,
        details: [`Error: ${error.message}`],
      });
      totalErrors++;
    }

    // 7. Sync Final Check
    console.log('📋 Phase 7: Final Check');
    console.log('='.repeat(60));
    try {
      const finalCheckResult = await syncFinalCheckFromAirtable();
      results.push({
        phase: 'final-check',
        ...finalCheckResult,
      });
      totalCreated += finalCheckResult.created;
      totalUpdated += finalCheckResult.updated;
      totalErrors += finalCheckResult.errors;
      console.log(`✅ Final Check: ${finalCheckResult.created} created, ${finalCheckResult.updated} updated, ${finalCheckResult.errors} errors\n`);
    } catch (error: any) {
      console.error('❌ Error syncing Final Check:', error);
      results.push({
        phase: 'final-check',
        created: 0,
        updated: 0,
        errors: 1,
        details: [`Error: ${error.message}`],
      });
      totalErrors++;
    }

    // 8. Limpiar propiedades que ya no están en ninguna view
    console.log('📋 Phase 8: Cleaning up properties not in any view');
    console.log('='.repeat(60));
    try {
      await cleanupPropertiesNotInViews(results);
    } catch (error: any) {
      console.error('❌ Error cleaning up properties:', error);
    }

    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log('📊 Complete Sync Summary');
    console.log('='.repeat(60));
    console.log(`Total Created: ${totalCreated}`);
    console.log(`Total Updated: ${totalUpdated}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log('='.repeat(60) + '\n');

    return {
      success: totalErrors === 0,
      timestamp: new Date().toISOString(),
      phases: results,
      totalCreated,
      totalUpdated,
      totalErrors,
    };
  } catch (error: any) {
    console.error('❌ Fatal error during complete sync:', error);
    return {
      success: false,
      timestamp: new Date().toISOString(),
      phases: results,
      totalCreated,
      totalUpdated,
      totalErrors: totalErrors + 1,
    };
  }
}

/**
 * Limpia propiedades que ya no están en ninguna view de Airtable
 * Esto asegura que Supabase solo tenga propiedades que existen en Airtable
 * IMPORTANTE: No elimina propiedades, solo reporta cuáles deberían revisarse
 */
async function cleanupPropertiesNotInViews(syncResults: SyncResult[]): Promise<void> {
  const supabase = createAdminClient();
  
  try {
    // Obtener todos los airtable_property_id que fueron sincronizados en esta ejecución
    const syncedAirtableIds = new Set<string>();
    
    for (const result of syncResults) {
      // Extraer IDs de los detalles
      const propertyIds = result.details
        .filter(detail => detail.startsWith('Updated:') || detail.startsWith('Created:'))
        .map(detail => {
          const match = detail.match(/^(Updated|Created):\s+([A-Z0-9-]+)/);
          return match ? match[2] : null;
        })
        .filter(Boolean) as string[];

      if (propertyIds.length > 0) {
        const { data: properties } = await supabase
          .from('properties')
          .select('airtable_property_id')
          .in('id', propertyIds);

        properties?.forEach(p => {
          if (p.airtable_property_id) {
            syncedAirtableIds.add(p.airtable_property_id);
          }
        });
      }
    }

    console.log(`📋 Found ${syncedAirtableIds.size} unique Airtable IDs synchronized in this run`);

    // Obtener todas las propiedades que tienen airtable_property_id y están en fases sincronizadas
    // Incluir las nuevas fases de presupuesto que se asignan automáticamente según Set Up Status
    const syncedPhases = [
      'upcoming-settlements', 
      'upcoming', 
      'reno-budget', // Legacy - se mapea a las nuevas fases según Set Up Status
      'reno-budget-renovator', // Nueva fase
      'reno-budget-client', // Nueva fase
      'reno-budget-start', // Nueva fase
      'initial-check', 
      'reno-in-progress', 
      'furnishing-cleaning', 
      'final-check'
    ];
    const { data: allProperties, error: fetchError } = await supabase
      .from('properties')
      .select('id, airtable_property_id, reno_phase, "Set Up Status"')
      .not('airtable_property_id', 'is', null)
      .in('reno_phase', syncedPhases);

    if (fetchError) {
      console.error('Error fetching all properties:', fetchError);
      return;
    }

    // Encontrar propiedades que tienen airtable_property_id pero no están en ninguna view sincronizada
    const propertiesToReview = allProperties?.filter(
      p => p.airtable_property_id && !syncedAirtableIds.has(p.airtable_property_id)
    ) || [];

    if (propertiesToReview.length > 0) {
      console.log(`\n⚠️  Found ${propertiesToReview.length} properties in synced phases that are not in any Airtable view:`);
      propertiesToReview.forEach(p => {
        console.log(`   - ${p.id} (${p.reno_phase}) - Set Up Status: ${p['Set Up Status'] || 'null'}`);
      });
      console.log('\n   These properties may have been:');
      console.log('   - Removed from Airtable');
      console.log('   - Moved to a different view/phase');
      console.log('   - Need manual review');
      console.log('\n   ⚠️  These properties will remain in Supabase but may need manual adjustment.');
    } else {
      console.log('✅ All properties in synced phases are accounted for in Airtable views');
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

