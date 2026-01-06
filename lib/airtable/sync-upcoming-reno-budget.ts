/**
 * Sincronización desde Airtable hacia Supabase para la fase Upcoming (Reno Budget)
 * Usa la view específica viwKS3iOiyX5iu5zP que contiene propiedades con
 * Set Up Status == "Pending to validate Budget (Client & renovator) & Reno to start"
 * (propiedades esperando presupuesto de renovación)
 */

import { syncPropertiesFromAirtable } from './sync-from-airtable';
import { createAdminClient } from '@/lib/supabase/admin';

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const AIRTABLE_VIEW_ID_UPCOMING_RENO_BUDGET = 'viwKS3iOiyX5iu5zP';

/**
 * Sincroniza propiedades de Upcoming (Reno Budget) desde Airtable
 * Esta función sincroniza propiedades con Set Up Status == "Pending to validate Budget (Client & renovator) & Reno to start"
 * Fuerza reno_phase a 'reno-budget' para todas las propiedades de esta view
 * También limpia propiedades que ya no están en esta view pero estaban en fase 'reno-budget'
 */
export async function syncUpcomingRenoBudgetFromAirtable(): Promise<{
  created: number;
  updated: number;
  errors: number;
  details: string[];
}> {
  console.log('[Upcoming Reno Budget Sync] Starting sync for Upcoming (Reno Budget) phase...');
  console.log(`[Upcoming Reno Budget Sync] Using view: ${AIRTABLE_VIEW_ID_UPCOMING_RENO_BUDGET}`);
  
  const result = await syncPropertiesFromAirtable(
    AIRTABLE_TABLE_ID,
    AIRTABLE_VIEW_ID_UPCOMING_RENO_BUDGET
  );
  
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
      console.log(`[Upcoming Reno Budget Sync] Forcing reno_phase to 'reno-budget' for ${propertyIds.length} properties...`);

      // Actualizar todas las propiedades sincronizadas a fase 'reno-budget'
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          reno_phase: 'reno-budget',
          updated_at: new Date().toISOString()
        })
        .in('id', propertyIds);

      if (updateError) {
        console.error('[Upcoming Reno Budget Sync] Error updating reno_phase:', updateError);
      } else {
        console.log(`[Upcoming Reno Budget Sync] ✅ Successfully set reno_phase to 'reno-budget' for ${propertyIds.length} properties`);
      }

      // Limpiar propiedades que ya no están en esta view pero estaban en fase 'reno-budget'
      // Obtener todas las propiedades que están en fase 'reno-budget' pero no están en la lista sincronizada
      const { data: allUpcomingProperties, error: fetchError } = await supabase
        .from('properties')
        .select('id, airtable_property_id')
        .eq('reno_phase', 'reno-budget');

      if (fetchError) {
        console.error('[Upcoming Reno Budget Sync] Error fetching existing upcoming properties:', fetchError);
      } else {
        // Obtener los airtable_property_id de las propiedades sincronizadas
        const { data: syncedProperties } = await supabase
          .from('properties')
          .select('airtable_property_id')
          .in('id', propertyIds);

        const syncedAirtableIds = new Set(
          syncedProperties?.map(p => p.airtable_property_id).filter(Boolean) || []
        );

        // Encontrar propiedades que están en 'reno-budget' pero no están en la view sincronizada
        const propertiesToRemove = allUpcomingProperties?.filter(
          p => p.airtable_property_id && !syncedAirtableIds.has(p.airtable_property_id)
        ) || [];

        if (propertiesToRemove.length > 0) {
          console.log(`[Upcoming Reno Budget Sync] Found ${propertiesToRemove.length} properties to remove from 'reno-budget' phase (no longer in view)`);
          // No las eliminamos, solo las movemos a otra fase o las dejamos como están
          // Por ahora solo logueamos para debugging
          console.log('[Upcoming Reno Budget Sync] Properties to review:', propertiesToRemove.map(p => p.id));
        }
      }
    }
  } catch (error) {
    console.error('[Upcoming Reno Budget Sync] Error forcing reno_phase:', error);
  }
  
  console.log('[Upcoming Reno Budget Sync] Sync completed:', {
    created: result.created,
    updated: result.updated,
    errors: result.errors,
  });
  
  return result;
}

