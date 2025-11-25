/**
 * Sincronización desde Airtable hacia Supabase para la fase Reno In Progress
 * Usa la view específica viwQUOrLzUrScuU4k que contiene propiedades en fase Reno In Progress
 */

import { syncPropertiesFromAirtable } from './sync-from-airtable';
import { createAdminClient } from '@/lib/supabase/admin';
import { callN8nCategoriesWebhook, prepareWebhookPayload } from '@/lib/n8n/webhook-caller';

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

    // Llamar al webhook de n8n para propiedades que cumplen los criterios
    await callWebhookForEligibleProperties(supabase);
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

/**
 * Llama al webhook de n8n para propiedades en reno-in-progress que:
 * - Tienen budget_pdf_url
 * - NO tienen categorías dinámicas aún
 * - No se ha llamado antes al webhook (verificado por ausencia de categorías)
 */
async function callWebhookForEligibleProperties(supabase: ReturnType<typeof createAdminClient>) {
  try {
    console.log('[Reno In Progress Sync] Checking properties eligible for webhook call...');

    // Obtener todas las propiedades en reno-in-progress que tienen budget_pdf_url
    const { data: properties, error: fetchError } = await supabase
      .from('properties')
      .select('id, budget_pdf_url, "Unique ID From Engagements", name, address, "Client Name", "Client email", renovation_type, area_cluster')
      .eq('reno_phase', 'reno-in-progress')
      .not('budget_pdf_url', 'is', null);

    if (fetchError) {
      console.error('[Reno In Progress Sync] Error fetching properties for webhook:', fetchError);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('[Reno In Progress Sync] No properties with budget_pdf_url found');
      return;
    }

    console.log(`[Reno In Progress Sync] Found ${properties.length} properties with budget_pdf_url`);

    // Para cada propiedad, verificar si ya tiene categorías
    let webhookCallsCount = 0;
    let skippedCount = 0;

    for (const property of properties) {
      // Verificar si ya tiene categorías dinámicas
      const { data: categories, error: categoriesError } = await supabase
        .from('property_dynamic_categories')
        .select('id')
        .eq('property_id', property.id)
        .limit(1);

      if (categoriesError) {
        console.error(`[Reno In Progress Sync] Error checking categories for property ${property.id}:`, categoriesError);
        continue;
      }

      // Si ya tiene categorías, significa que ya se procesó (o se llamó al webhook antes)
      if (categories && categories.length > 0) {
        console.log(`[Reno In Progress Sync] ⏭️  Skipping property ${property.id} - already has categories`);
        skippedCount++;
        continue;
      }

      // Preparar payload del webhook
      const payload = prepareWebhookPayload(property);
      if (!payload) {
        console.log(`[Reno In Progress Sync] ⏭️  Skipping property ${property.id} - invalid payload`);
        skippedCount++;
        continue;
      }

      // Llamar al webhook
      const success = await callN8nCategoriesWebhook(payload);
      if (success) {
        webhookCallsCount++;
        console.log(`[Reno In Progress Sync] ✅ Webhook called for property ${property.id}`);
      } else {
        console.error(`[Reno In Progress Sync] ❌ Failed to call webhook for property ${property.id}`);
      }
    }

    console.log(`[Reno In Progress Sync] Webhook summary: ${webhookCallsCount} called, ${skippedCount} skipped`);
  } catch (error) {
    console.error('[Reno In Progress Sync] Error calling webhook for eligible properties:', error);
  }
}


