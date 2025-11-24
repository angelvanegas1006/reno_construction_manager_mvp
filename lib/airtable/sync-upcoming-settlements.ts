/**
 * Sincronización desde Airtable hacia Supabase para la fase Upcoming Settlements
 * Usa la view específica viwKS3iOiyX5iu5zP que contiene propiedades con
 * Set Up Status == "Pending to validate Budget (Client & renovator) & Reno to start"
 */

import { syncPropertiesFromAirtable } from './sync-from-airtable';
import { createAdminClient } from '@/lib/supabase/admin';

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const AIRTABLE_VIEW_ID_UPCOMING_SETTLEMENTS = 'viwKS3iOiyX5iu5zP';

/**
 * Sincroniza propiedades de Upcoming Settlements desde Airtable
 * Esta función sincroniza propiedades con Set Up Status == "Pending to validate Budget (Client & renovator) & Reno to start"
 * Fuerza reno_phase a 'upcoming-settlements' para todas las propiedades de esta view
 */
export async function syncUpcomingSettlementsFromAirtable(): Promise<{
  created: number;
  updated: number;
  errors: number;
  details: string[];
}> {
  console.log('[Upcoming Settlements Sync] Starting sync for Upcoming Settlements phase...');
  console.log(`[Upcoming Settlements Sync] Using view: ${AIRTABLE_VIEW_ID_UPCOMING_SETTLEMENTS}`);
  
  const result = await syncPropertiesFromAirtable(
    AIRTABLE_TABLE_ID,
    AIRTABLE_VIEW_ID_UPCOMING_SETTLEMENTS
  );
  
  // Después de sincronizar, forzar reno_phase a 'upcoming-settlements' para todas las propiedades de esta view
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
      console.log(`[Upcoming Settlements Sync] Forcing reno_phase to 'upcoming-settlements' for ${propertyIds.length} properties...`);
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          reno_phase: 'upcoming-settlements',
          'Set Up Status': 'Pending to validate Budget (Client & renovator) & Reno to start',
          updated_at: new Date().toISOString()
        })
        .in('id', propertyIds);

      if (updateError) {
        console.error('[Upcoming Settlements Sync] Error updating reno_phase:', updateError);
      } else {
        console.log(`[Upcoming Settlements Sync] ✅ Successfully set reno_phase to 'upcoming-settlements' for ${propertyIds.length} properties`);
      }
    }
  } catch (error) {
    console.error('[Upcoming Settlements Sync] Error forcing reno_phase:', error);
  }
  
  console.log('[Upcoming Settlements Sync] Sync completed:', {
    created: result.created,
    updated: result.updated,
    errors: result.errors,
  });
  
  return result;
}

