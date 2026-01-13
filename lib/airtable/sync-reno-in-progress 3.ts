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
  } catch (error) {
    console.error('[Reno In Progress Sync] Error forcing reno_phase:', error);
  }
  
  // Después de sincronizar, llamar automáticamente al webhook de n8n para propiedades elegibles
  try {
    console.log('[Reno In Progress Sync] Checking properties eligible for webhook call...');
    
    // Buscar propiedades en reno-in-progress con budget_pdf_url pero sin categorías dinámicas
    const { data: eligibleProperties, error: fetchError } = await supabase
      .from('properties')
      .select(`
        id,
        budget_pdf_url,
        "Unique ID From Engagements",
        name,
        address,
        "Client Name",
        "Client email",
        renovation_type,
        area_cluster,
        reno_phase
      `)
      .eq('reno_phase', 'reno-in-progress')
      .not('budget_pdf_url', 'is', null);
    
    if (fetchError) {
      console.error('[Reno In Progress Sync] Error fetching eligible properties:', fetchError);
    } else if (eligibleProperties && eligibleProperties.length > 0) {
      console.log(`[Reno In Progress Sync] Found ${eligibleProperties.length} properties with budget_pdf_url`);
      
      // Verificar cuáles no tienen categorías dinámicas
      let webhookCalled = 0;
      let webhookSkipped = 0;
      
      for (const property of eligibleProperties) {
        // Verificar si tiene categorías dinámicas
        const { data: categories, error: categoriesError } = await supabase
          .from('property_dynamic_categories')
          .select('id')
          .eq('property_id', property.id)
          .limit(1);
        
        if (categoriesError) {
          console.error(`[Reno In Progress Sync] Error checking categories for ${property.id}:`, categoriesError);
          continue;
        }
        
        // Si ya tiene categorías, saltar
        if (categories && categories.length > 0) {
          console.log(`[Reno In Progress Sync] ⏭️  Skipping property ${property.id} - already has categories`);
          webhookSkipped++;
          continue;
        }
        
        // Preparar payload y llamar al webhook
        const payload = prepareWebhookPayload(property as any);
        if (!payload) {
          console.warn(`[Reno In Progress Sync] ⚠️  Could not prepare payload for ${property.id}`);
          webhookSkipped++;
          continue;
        }
        
        try {
          const success = await callN8nCategoriesWebhook(payload);
          if (success) {
            console.log(`[Reno In Progress Sync] ✅ Webhook called for property ${property.id}`);
            webhookCalled++;
          } else {
            console.warn(`[Reno In Progress Sync] ⚠️  Webhook call failed for ${property.id}`);
            webhookSkipped++;
          }
        } catch (webhookError) {
          console.error(`[Reno In Progress Sync] ❌ Error calling webhook for ${property.id}:`, webhookError);
          webhookSkipped++;
        }
        
        // Pequeña pausa entre llamadas para no sobrecargar el webhook
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`[Reno In Progress Sync] Webhook summary: ${webhookCalled} called, ${webhookSkipped} skipped`);
    } else {
      console.log('[Reno In Progress Sync] No properties found with budget_pdf_url');
    }
  } catch (error) {
    console.error('[Reno In Progress Sync] Error calling webhooks:', error);
  }
  
  console.log('[Reno In Progress Sync] Sync completed:', {
    created: result.created,
    updated: result.updated,
    errors: result.errors,
  });
  
  return result;
}








