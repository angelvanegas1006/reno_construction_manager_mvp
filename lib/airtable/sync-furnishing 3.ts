/**
 * Sincronización desde Airtable hacia Supabase para la fase Furnishing
 * Usa la view específica viw9NDUaeGIQDvugU que contiene propiedades en fase Furnishing
 */

import { syncPropertiesFromAirtable } from './sync-from-airtable';
import { createAdminClient } from '@/lib/supabase/admin';

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const AIRTABLE_VIEW_ID_FURNISHING = 'viw9NDUaeGIQDvugU';

/**
 * Sincroniza propiedades de Furnishing desde Airtable
 * Esta función sincroniza propiedades con Set Up Status == "Furnishing"
 * Fuerza reno_phase a 'furnishing' para todas las propiedades de esta view
 */
export async function syncFurnishingFromAirtable(): Promise<{
  created: number;
  updated: number;
  errors: number;
  details: string[];
}> {
  console.log('[Furnishing Sync] Starting sync for Furnishing phase...');
  console.log(`[Furnishing Sync] Using view: ${AIRTABLE_VIEW_ID_FURNISHING}`);
  
  const result = await syncPropertiesFromAirtable(
    AIRTABLE_TABLE_ID,
    AIRTABLE_VIEW_ID_FURNISHING
  );
  
  // Después de sincronizar, forzar reno_phase a 'furnishing' para todas las propiedades de esta view
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
      console.log(`[Furnishing Sync] Forcing reno_phase to 'furnishing' for ${propertyIds.length} properties...`);
      
      // Obtener el Set Up Status actual de cada propiedad para preservarlo
      const { data: properties, error: fetchError } = await supabase
        .from('properties')
        .select('id, "Set Up Status"')
        .in('id', propertyIds);

      if (fetchError) {
        console.error('[Furnishing Sync] Error fetching properties:', fetchError);
      } else {
        // Actualizar cada propiedad manteniendo su Set Up Status como "Furnishing"
        for (const property of properties || []) {
          const { error: updateError } = await supabase
            .from('properties')
            .update({ 
              reno_phase: 'furnishing',
              'Set Up Status': 'Furnishing',
              updated_at: new Date().toISOString()
            })
            .eq('id', property.id);

          if (updateError) {
            console.error(`[Furnishing Sync] Error updating property ${property.id}:`, updateError);
          }
        }

        console.log(`[Furnishing Sync] ✅ Successfully set reno_phase to 'furnishing' for ${propertyIds.length} properties`);
      }
    }
  } catch (error) {
    console.error('[Furnishing Sync] Error forcing reno_phase:', error);
  }
  
  console.log('[Furnishing Sync] Sync completed:', {
    created: result.created,
    updated: result.updated,
    errors: result.errors,
  });
  
  return result;
}

