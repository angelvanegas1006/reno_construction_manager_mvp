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
      
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          reno_phase: 'initial-check',
          'Set Up Status': 'initial check',
          updated_at: new Date().toISOString()
        })
        .in('id', propertyIds);

      if (updateError) {
        console.error('[Initial Check Sync] Error updating reno_phase:', updateError);
      } else {
        console.log(`[Initial Check Sync] ✅ Successfully set reno_phase to 'initial-check' for ${propertyIds.length} properties`);
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

