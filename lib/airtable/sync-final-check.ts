/**
 * Sincronización desde Airtable hacia Supabase para la fase Final Check
 * Usa la view específica viwnDG5TY6wjZhBL2 que contiene propiedades en fase Final Check
 */

import { syncPropertiesFromAirtable } from './sync-from-airtable';
import { createAdminClient } from '@/lib/supabase/admin';

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const AIRTABLE_VIEW_ID_FINAL_CHECK = 'viwnDG5TY6wjZhBL2';

/**
 * Sincroniza propiedades de Final Check desde Airtable
 * Esta función sincroniza propiedades con Set Up Status == "Final Check"
 * Fuerza reno_phase a 'final-check' para todas las propiedades de esta view
 */
export async function syncFinalCheckFromAirtable(): Promise<{
  created: number;
  updated: number;
  errors: number;
  details: string[];
}> {
  console.log('[Final Check Sync] Starting sync for Final Check phase...');
  console.log(`[Final Check Sync] Using view: ${AIRTABLE_VIEW_ID_FINAL_CHECK}`);
  
  const result = await syncPropertiesFromAirtable(
    AIRTABLE_TABLE_ID,
    AIRTABLE_VIEW_ID_FINAL_CHECK
  );
  
  // Después de sincronizar, forzar reno_phase a 'final-check' para todas las propiedades de esta view
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
      console.log(`[Final Check Sync] Forcing reno_phase to 'final-check' for ${propertyIds.length} properties...`);
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          reno_phase: 'final-check',
          'Set Up Status': 'Final Check',
          updated_at: new Date().toISOString()
        })
        .in('id', propertyIds);

      if (updateError) {
        console.error('[Final Check Sync] Error updating reno_phase:', updateError);
      } else {
        console.log(`[Final Check Sync] ✅ Successfully set reno_phase to 'final-check' for ${propertyIds.length} properties`);
      }
    }
  } catch (error) {
    console.error('[Final Check Sync] Error forcing reno_phase:', error);
  }
  
  console.log('[Final Check Sync] Sync completed:', {
    created: result.created,
    updated: result.updated,
    errors: result.errors,
  });
  
  return result;
}

