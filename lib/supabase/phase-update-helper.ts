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
    const { data: currentRow } = await supabase
      .from('properties')
      .select('reno_phase')
      .eq('id', propertyId)
      .single();
    const fromPhase = (currentRow as { reno_phase?: string } | null)?.reno_phase ?? null;

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

    const toPhase = (updates.renoPhase ?? dbUpdates['reno_phase']) as RenoKanbanPhase | undefined;

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
    'pendiente-suministros': 'Utilities activation',
    'final-check-post-suministros': 'Final Check Post Suministros',
    'cleaning': 'Cleaning',
    'furnishing-cleaning': 'Cleaning & Furnishing', // Legacy
    'reno-fixes': 'Reno Fixes',
    'done': 'Done',
    'orphaned': 'Orphaned',
    'analisis-supply': 'Get Project Draft',
    'analisis-reno': 'Pending to validate',
    'administracion-reno': 'Technical project in progress',
    'pendiente-presupuestos-renovador': 'Pending to budget from renovator',
    'obra-a-empezar': 'Pending to start reno',
    'obra-en-progreso': 'Reno in progress',
    'amueblamiento': 'Furnishing',
    'check-final': 'Final check',
    'get-project-draft': 'Get Project Draft',
    'pending-to-validate': 'Pending to Validate',
    'pending-to-reserve-arras': 'Pending to Reserve / Arras',
    'technical-project-in-progress': 'Technical Project in Progress',
    'ecuv-first-validation': 'Ecu first validation',
    'technical-project-fine-tuning': 'Technical project fine-tuning',
    'ecuv-final-validation': 'Ecu final validation',
    'pending-budget-from-renovator': 'Pending to budget (from renovator)',
    'arch-pending-measurement': 'Pending Measurement',
    'arch-preliminary-project': 'Preliminary Project',
    'arch-technical-project': 'Technical Project in Progress',
    'arch-technical-adjustments': 'Technical project fine-tuning',
    'arch-pending-validation': 'Pending to Validate',
    'arch-ecu-first-validation': 'Ecu first validation',
    'arch-ecu-final-validation': 'Ecu final validation',
    'arch-obra-empezar': 'Reno to Start',
    'arch-obra-en-progreso': 'Reno in progress',
    'arch-completed': 'Completed',
    'wip-reno-due-diligence': 'WIP Reno Due Diligence',
    'wip-admin-licencias': 'WIP Admin Licencias',
    'wip-pendiente-presupuesto': 'WIP Pendiente Presupuesto',
    'wip-obra-a-empezar': 'WIP Obra a Empezar',
    'wip-obra-en-progreso': 'WIP Obra en Progreso',
  };

  return phaseToStatusMap[phase] || phase;
}

