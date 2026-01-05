/**
 * Sincronización desde Airtable hacia Supabase para la fase Initial Check
 * Usa la view específica viwFZZ5S3VFCfYP6g que contiene propiedades en Initial Check
 */

import { syncPropertiesFromAirtable } from './sync-from-airtable';
import { createAdminClient } from '@/lib/supabase/admin';

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const AIRTABLE_VIEW_ID_INITIAL_CHECK = 'viwFZZ5S3VFCfYP6g';

/**
 * Sincroniza propiedades de Initial Check desde Airtable
 * Esta función debe mantener el mismo número de propiedades en ambos lados
 * Fuerza reno_phase a 'initial-check' para todas las propiedades de esta view
 */
export async function syncInitialCheckFromAirtable(): Promise<{
  created: number;
  updated: number;
  errors: number;
  details: string[];
}> {
  console.log('[Initial Check Sync] Starting sync for Initial Check phase...');
  console.log(`[Initial Check Sync] Using view: ${AIRTABLE_VIEW_ID_INITIAL_CHECK}`);
  
  const result = await syncPropertiesFromAirtable(
    AIRTABLE_TABLE_ID,
    AIRTABLE_VIEW_ID_INITIAL_CHECK
  );
  
  // Después de sincronizar, forzar reno_phase a 'initial-check' para todas las propiedades de esta view
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
      console.log(`[Initial Check Sync] Forcing reno_phase to 'initial-check' for ${propertyIds.length} properties...`);
      
      // Actualizar todas las propiedades sincronizadas a fase 'initial-check'
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          reno_phase: 'initial-check',
          updated_at: new Date().toISOString()
        })
        .in('id', propertyIds);

      if (updateError) {
        console.error('[Initial Check Sync] Error updating reno_phase:', updateError);
      } else {
        console.log(`[Initial Check Sync] ✅ Successfully set reno_phase to 'initial-check' for ${propertyIds.length} properties`);
      }

      // Limpiar propiedades que ya no están en esta view pero estaban en fase 'initial-check'
      // Obtener todas las propiedades que están en fase 'initial-check' pero no están en la lista sincronizada
      const { data: allInitialCheckProperties, error: fetchError } = await supabase
        .from('properties')
        .select('id, airtable_property_id')
        .eq('reno_phase', 'initial-check');

      if (fetchError) {
        console.error('[Initial Check Sync] Error fetching existing initial-check properties:', fetchError);
      } else {
        // Obtener los airtable_property_id de las propiedades sincronizadas
        const { data: syncedProperties } = await supabase
          .from('properties')
          .select('airtable_property_id')
          .in('id', propertyIds);

        const syncedAirtableIds = new Set(
          syncedProperties?.map(p => p.airtable_property_id).filter(Boolean) || []
        );

        // Encontrar propiedades que están en 'initial-check' pero no están en la view sincronizada
        const propertiesToRemove = allInitialCheckProperties?.filter(
          p => p.airtable_property_id && !syncedAirtableIds.has(p.airtable_property_id)
        ) || [];

        if (propertiesToRemove.length > 0) {
          console.log(`[Initial Check Sync] Found ${propertiesToRemove.length} properties to remove from 'initial-check' phase (no longer in view)`);
          // No las eliminamos, solo las movemos a otra fase o las dejamos como están
          // Por ahora solo logueamos para debugging
          console.log('[Initial Check Sync] Properties to review:', propertiesToRemove.map(p => p.id));
        }
      }
    }
  } catch (error) {
    console.error('[Initial Check Sync] Error forcing reno_phase:', error);
  }
  
  console.log('[Initial Check Sync] Sync completed:', {
    created: result.created,
    updated: result.updated,
    errors: result.errors,
  });
  
  return result;
}

