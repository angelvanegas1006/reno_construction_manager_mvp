/**
 * Sincronización desde Airtable hacia Supabase para la fase Cleaning
 * Usa la view específica viwLajczYxzQd4UvU que contiene propiedades en fase Cleaning
 */

import { syncPropertiesFromAirtable } from './sync-from-airtable';
import { createAdminClient } from '@/lib/supabase/admin';

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const AIRTABLE_VIEW_ID_CLEANING = 'viwLajczYxzQd4UvU';

/**
 * Sincroniza propiedades de Cleaning desde Airtable
 * Esta función sincroniza propiedades con Set Up Status == "Cleaning"
 * Fuerza reno_phase a 'cleaning' para todas las propiedades de esta view
 */
export async function syncCleaningFromAirtable(): Promise<{
  created: number;
  updated: number;
  errors: number;
  details: string[];
}> {
  console.log('[Cleaning Sync] Starting sync for Cleaning phase...');
  console.log(`[Cleaning Sync] Using view: ${AIRTABLE_VIEW_ID_CLEANING}`);
  
  const result = await syncPropertiesFromAirtable(
    AIRTABLE_TABLE_ID,
    AIRTABLE_VIEW_ID_CLEANING
  );
  
  // Después de sincronizar, forzar reno_phase a 'cleaning' para todas las propiedades de esta view
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
      console.log(`[Cleaning Sync] Forcing reno_phase to 'cleaning' for ${propertyIds.length} properties...`);
      
      // Obtener el Set Up Status actual de cada propiedad para preservarlo
      const { data: properties, error: fetchError } = await supabase
        .from('properties')
        .select('id, "Set Up Status"')
        .in('id', propertyIds);

      if (fetchError) {
        console.error('[Cleaning Sync] Error fetching properties:', fetchError);
      } else {
        // Actualizar cada propiedad manteniendo su Set Up Status como "Cleaning"
        for (const property of properties || []) {
          const { error: updateError } = await supabase
            .from('properties')
            .update({ 
              reno_phase: 'cleaning',
              'Set Up Status': 'Cleaning',
              updated_at: new Date().toISOString()
            })
            .eq('id', property.id);

          if (updateError) {
            console.error(`[Cleaning Sync] Error updating property ${property.id}:`, updateError);
          }
        }

        console.log(`[Cleaning Sync] ✅ Successfully set reno_phase to 'cleaning' for ${propertyIds.length} properties`);
      }
    }
  } catch (error) {
    console.error('[Cleaning Sync] Error forcing reno_phase:', error);
  }
  
  console.log('[Cleaning Sync] Sync completed:', {
    created: result.created,
    updated: result.updated,
    errors: result.errors,
  });
  
  return result;
}

