/**
 * Sincronización desde Airtable hacia Supabase para la fase Reno In Progress
 * Usa la view específica viwQUOrLzUrScuU4k que contiene propiedades en fase Reno In Progress
 */

import { syncPropertiesFromAirtable } from './sync-from-airtable';
import { createAdminClient } from '@/lib/supabase/admin';

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const AIRTABLE_VIEW_ID_RENO_IN_PROGRESS = 'viwQUOrLzUrScuU4k';

/**
 * Sincroniza propiedades de Reno In Progress desde Airtable
 * Esta función sincroniza propiedades con Set Up Status == "Reno in progress"
 * Fuerza reno_phase a 'reno-in-progress' para todas las propiedades de esta view
 */
export async function syncRenoInProgressFromAirtable(): Promise<{
  created: number;
  updated: number;
  errors: number;
  details: string[];
}> {
  console.log('[Reno In Progress Sync] Starting sync for Reno In Progress phase...');
  console.log(`[Reno In Progress Sync] Using view: ${AIRTABLE_VIEW_ID_RENO_IN_PROGRESS}`);
  
  const result = await syncPropertiesFromAirtable(
    AIRTABLE_TABLE_ID,
    AIRTABLE_VIEW_ID_RENO_IN_PROGRESS
  );
  
  // Después de sincronizar, forzar reno_phase a 'reno-in-progress' para todas las propiedades de esta view
  const supabase = createAdminClient();
  
  try {
    // Obtener todas las propiedades que fueron sincronizadas (basado en los detalles)
    const propertyIds = result.details
      .filter(detail => detail.startsWith('Updated:') || detail.startsWith('Created:'))
      .map(detail => {
        const match = detail.match(/^(Updated|Created):\s+([A-Z0-9-]+)/);
        return match ? match[2] : null;
      })
      .filter(Boolean) as string[];

    if (propertyIds.length > 0) {
      console.log(`[Reno In Progress Sync] Forcing reno_phase to 'reno-in-progress' for ${propertyIds.length} properties...`);
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          reno_phase: 'reno-in-progress',
          'Set Up Status': 'Reno in progress',
          updated_at: new Date().toISOString()
        })
        .in('id', propertyIds);

      if (updateError) {
        console.error('[Reno In Progress Sync] Error updating reno_phase:', updateError);
      } else {
        console.log(`[Reno In Progress Sync] ✅ Successfully set reno_phase to 'reno-in-progress' for ${propertyIds.length} properties`);
      }
    }
  } catch (error) {
    console.error('[Reno In Progress Sync] Error forcing reno_phase:', error);
  }
  
  console.log('[Reno In Progress Sync] Sync completed:', {
    created: result.created,
    updated: result.updated,
    errors: result.errors,
  });
  
  return result;
}

