import { createClient } from '@/lib/supabase/client';
import { mapSetUpStatusToKanbanPhase } from './kanban-mapping';
import type { RenoKanbanPhase } from '@/lib/reno-kanban-config';

/**
 * Helper function to update both Set Up Status and reno_phase consistently
 * This ensures that both fields are always in sync
 */
export async function updatePropertyPhaseConsistent(
  propertyId: string,
  updates: {
    setUpStatus?: string;
    renoPhase?: RenoKanbanPhase;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  try {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // If Set Up Status is provided, use it and map to reno_phase
    if (updates.setUpStatus) {
      dbUpdates['Set Up Status'] = updates.setUpStatus;
      
      // Map Set Up Status to reno_phase if reno_phase is not explicitly provided
      if (!updates.renoPhase) {
        const mappedPhase = mapSetUpStatusToKanbanPhase(updates.setUpStatus);
        if (mappedPhase) {
          dbUpdates['reno_phase'] = mappedPhase;
        }
      }
    }

    // If reno_phase is explicitly provided, use it
    if (updates.renoPhase) {
      dbUpdates['reno_phase'] = updates.renoPhase;
    }

    const { error } = await supabase
      .from('properties')
      .update(dbUpdates)
      .eq('id', propertyId);

    if (error) {
      console.error(`[updatePropertyPhaseConsistent] Error updating property ${propertyId}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[updatePropertyPhaseConsistent] ✅ Updated property ${propertyId}:`, dbUpdates);
    return { success: true };
  } catch (error: any) {
    console.error(`[updatePropertyPhaseConsistent] Unexpected error:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper to get the Set Up Status value for a given reno_phase
 * This is the reverse mapping of mapSetUpStatusToKanbanPhase
 */
export function getSetUpStatusForPhase(phase: RenoKanbanPhase): string {
  const phaseToStatusMap: Record<RenoKanbanPhase, string> = {
    'upcoming-settlements': 'Pending to visit',
    'initial-check': 'initial check',
    'reno-budget-renovator': 'Pending to budget (from Renovator)',
    'reno-budget-client': 'Pending to budget (from Client)',
    'reno-budget-start': 'Reno to start',
    'reno-budget': 'Pending to validate budget',
    'upcoming': 'Pending to validate budget',
    'reno-in-progress': 'Reno in progress',
    'furnishing': 'Furnishing',
    'final-check': 'Final Check',
    'cleaning': 'Cleaning',
    'furnishing-cleaning': 'Cleaning & Furnishing', // Legacy
    'reno-fixes': 'Reno Fixes',
    'done': 'Done',
    'orphaned': 'Orphaned',
  };

  return phaseToStatusMap[phase] || phase;
}

