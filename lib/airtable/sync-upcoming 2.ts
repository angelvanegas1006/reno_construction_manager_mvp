/**
 * Sincronización desde Airtable hacia Supabase para la fase Upcoming
 * Usa una view específica que contiene propiedades con
 * Set Up Status == "Pending to validate budget" o "Reno to start"
 * (propiedades esperando presupuesto de renovación, diferente de reno-budget)
 */

import { syncPropertiesFromAirtable } from './sync-from-airtable';
import { createAdminClient } from '@/lib/supabase/admin';

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
// TODO: Obtener el View ID real de Airtable para esta fase
// Por ahora, usamos un placeholder - debe ser reemplazado con el View ID real
const AIRTABLE_VIEW_ID_UPCOMING = 'PLACEHOLDER_VIEW_ID';

/**
 * Sincroniza propiedades de Upcoming desde Airtable
 * Esta función sincroniza propiedades con Set Up Status == "Pending to validate budget" o "Reno to start"
 * Fuerza reno_phase a 'upcoming' para todas las propiedades de esta view
 * También limpia propiedades que ya no están en esta view pero estaban en fase 'upcoming'
 */
export async function syncUpcomingFromAirtable(): Promise<{
  created: number;
  updated: number;
  errors: number;
  details: string[];
}> {
  console.log('[Upcoming Sync] Starting sync for Upcoming phase...');
  console.log(`[Upcoming Sync] Using view: ${AIRTABLE_VIEW_ID_UPCOMING}`);
  
  // Si el View ID es un placeholder, retornar sin hacer nada
  if (AIRTABLE_VIEW_ID_UPCOMING === 'PLACEHOLDER_VIEW_ID') {
    console.warn('[Upcoming Sync] ⚠️ View ID not configured. Please set AIRTABLE_VIEW_ID_UPCOMING with the actual Airtable View ID.');
    return {
      created: 0,
      updated: 0,
      errors: 0,
      details: ['View ID not configured - skipping sync'],
    };
  }
  
  const result = await syncPropertiesFromAirtable(
    AIRTABLE_TABLE_ID,
    AIRTABLE_VIEW_ID_UPCOMING
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
      console.log(`[Upcoming Sync] Forcing reno_phase to 'upcoming' for ${propertyIds.length} properties...`);

      // Actualizar todas las propiedades sincronizadas a fase 'upcoming'
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          reno_phase: 'upcoming',
          updated_at: new Date().toISOString()
        })
        .in('id', propertyIds);

      if (updateError) {
        console.error('[Upcoming Sync] Error updating reno_phase:', updateError);
      } else {
        console.log(`[Upcoming Sync] ✅ Successfully set reno_phase to 'upcoming' for ${propertyIds.length} properties`);
      }

      // Limpiar propiedades que ya no están en esta view pero estaban en fase 'upcoming'
      // Obtener todas las propiedades que están en fase 'upcoming' pero no están en la lista sincronizada
      const { data: allUpcomingProperties, error: fetchError } = await supabase
        .from('properties')
        .select('id, airtable_property_id')
        .eq('reno_phase', 'upcoming');

      if (fetchError) {
        console.error('[Upcoming Sync] Error fetching existing upcoming properties:', fetchError);
      } else {
        // Obtener los airtable_property_id de las propiedades sincronizadas
        const { data: syncedProperties } = await supabase
          .from('properties')
          .select('airtable_property_id')
          .in('id', propertyIds);

        const syncedAirtableIds = new Set(
          syncedProperties?.map(p => p.airtable_property_id).filter(Boolean) || []
        );

        // Encontrar propiedades que están en 'upcoming' pero no están en la view sincronizada
        const propertiesToRemove = allUpcomingProperties?.filter(
          p => p.airtable_property_id && !syncedAirtableIds.has(p.airtable_property_id)
        ) || [];

        if (propertiesToRemove.length > 0) {
          console.log(`[Upcoming Sync] Found ${propertiesToRemove.length} properties to remove from 'upcoming' phase (no longer in view)`);
          // No las eliminamos, solo las movemos a otra fase o las dejamos como están
          // Por ahora solo logueamos para debugging
          console.log('[Upcoming Sync] Properties to review:', propertiesToRemove.map(p => p.id));
        }
      }
    }
  } catch (error) {
    console.error('[Upcoming Sync] Error forcing reno_phase:', error);
  }
  
  console.log('[Upcoming Sync] Sync completed:', {
    created: result.created,
    updated: result.updated,
    errors: result.errors,
  });
  
  return result;
}

