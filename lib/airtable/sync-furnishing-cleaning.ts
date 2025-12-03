/**
 * Sincronización desde Airtable hacia Supabase para la fase Furnishing & Cleaning
 * Usa la view específica viw9NDUaeGIQDvugU que contiene propiedades en fase Cleaning o Furnishing
 */

import { syncPropertiesFromAirtable } from './sync-from-airtable';
import { createAdminClient } from '@/lib/supabase/admin';

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const AIRTABLE_VIEW_ID_FURNISHING_CLEANING = 'viw9NDUaeGIQDvugU';

/**
 * Sincroniza propiedades de Furnishing & Cleaning desde Airtable
 * Esta función sincroniza propiedades con Set Up Status == "Cleaning" o "Furnishing"
 * Fuerza reno_phase a 'furnishing-cleaning' para todas las propiedades de esta view
 */
export async function syncFurnishingCleaningFromAirtable(): Promise<{
  created: number;
  updated: number;
  errors: number;
  details: string[];
}> {
  console.log('[Furnishing & Cleaning Sync] Starting sync for Furnishing & Cleaning phase...');
  console.log(`[Furnishing & Cleaning Sync] Using view: ${AIRTABLE_VIEW_ID_FURNISHING_CLEANING}`);
  
  const result = await syncPropertiesFromAirtable(
    AIRTABLE_TABLE_ID,
    AIRTABLE_VIEW_ID_FURNISHING_CLEANING
  );
  
  // Después de sincronizar, forzar reno_phase a 'furnishing-cleaning' para todas las propiedades de esta view
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
      console.log(`[Furnishing & Cleaning Sync] Forcing reno_phase to 'furnishing-cleaning' for ${propertyIds.length} properties...`);
      
      // Obtener el Set Up Status actual de cada propiedad para preservarlo
      const { data: properties, error: fetchError } = await supabase
        .from('properties')
        .select('id, "Set Up Status"')
        .in('id', propertyIds);

      if (fetchError) {
        console.error('[Furnishing & Cleaning Sync] Error fetching properties:', fetchError);
      } else {
        // Actualizar cada propiedad manteniendo su Set Up Status original (Cleaning o Furnishing)
        for (const property of properties || []) {
          const setUpStatus = property['Set Up Status'];
          // Si el Set Up Status no es "Cleaning" o "Furnishing", actualizarlo según corresponda
          // Pero si ya es uno de esos, mantenerlo
          const finalSetUpStatus = (setUpStatus === 'Cleaning' || setUpStatus === 'Furnishing') 
            ? setUpStatus 
            : 'Cleaning'; // Default a Cleaning si no está definido

          const { error: updateError } = await supabase
            .from('properties')
            .update({ 
              reno_phase: 'furnishing-cleaning',
              'Set Up Status': finalSetUpStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', property.id);

          if (updateError) {
            console.error(`[Furnishing & Cleaning Sync] Error updating property ${property.id}:`, updateError);
          }
        }

        console.log(`[Furnishing & Cleaning Sync] ✅ Successfully set reno_phase to 'furnishing-cleaning' for ${propertyIds.length} properties`);
      }
    }
  } catch (error) {
    console.error('[Furnishing & Cleaning Sync] Error forcing reno_phase:', error);
  }
  
  console.log('[Furnishing & Cleaning Sync] Sync completed:', {
    created: result.created,
    updated: result.updated,
    errors: result.errors,
  });
  
  return result;
}








