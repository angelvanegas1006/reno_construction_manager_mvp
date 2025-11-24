import { createClient } from '@/lib/supabase/server';

interface AirtableWebhookPayload {
  eventType: 'record.created' | 'record.updated' | 'record.deleted';
  timestamp: string;
  base: {
    id: string;
  };
  payload: {
    baseId: string;
    webhookId: string;
    eventId: string;
    timestamp: string;
    eventType: string;
    payload: {
      changedTablesById?: Record<string, {
        changedRecordsById?: Record<string, {
          current: {
            id: string;
            cellValuesByFieldId?: Record<string, any>;
            name?: string;
          };
          previous?: {
            id: string;
            cellValuesByFieldId?: Record<string, any>;
          };
        }>;
      }>;
    };
  };
}

interface ProcessResult {
  success: boolean;
  updates?: string[];
  error?: string;
}

/**
 * Procesa un webhook de Airtable y actualiza Supabase
 */
export async function processAirtableWebhook(
  payload: AirtableWebhookPayload
): Promise<ProcessResult> {
  const supabase = await createClient();
  const updates: string[] = [];

  try {
    const { payload: webhookPayload } = payload;
    const changedTables = webhookPayload.payload.changedTablesById || {};

    // Procesar cada tabla que cambió
    for (const [tableId, tableChanges] of Object.entries(changedTables)) {
      const changedRecords = tableChanges.changedRecordsById || {};

      // Procesar cada registro que cambió
      for (const [recordId, recordChange] of Object.entries(changedRecords)) {
        const current = recordChange.current;
        const previous = recordChange.previous;
        const cellValues = current.cellValuesByFieldId || {};
        const previousValues = previous?.cellValuesByFieldId || {};

        // Buscar el Property ID en los campos
        // Airtable puede usar IDs de campo o nombres, intentamos varios
        // Primero buscar por nombres comunes, luego por valores en cualquier campo
        let propertyId: string | null = null;
        
        // Intentar encontrar Property ID por nombre de campo
        for (const key of Object.keys(cellValues)) {
          const value = cellValues[key];
          if (typeof value === 'string' && (
            key.includes('Property ID') || 
            key.includes('property_id') ||
            key.includes('Unique ID')
          )) {
            propertyId = value;
            break;
          }
        }
        
        // Si no encontramos por nombre, buscar en todos los valores
        if (!propertyId) {
          for (const value of Object.values(cellValues)) {
            if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
              propertyId = value;
              break;
            }
          }
        }
        
        // Último recurso: usar el nombre del registro si existe
        if (!propertyId && current.name) {
          propertyId = current.name;
        }

        if (!propertyId) {
          console.warn('[Airtable Webhook] No property ID found in record:', recordId, 'Available fields:', Object.keys(cellValues));
          continue;
        }

        // Detectar qué campos cambiaron
        const changes: Record<string, any> = {};

        // Mapeo de campos de Airtable a Supabase
        const fieldMappings: Record<string, string> = {
          'Set Up Status': 'Set Up Status',
          'Estimated Visit Date': 'Estimated Visit Date',
          'Setup Status Notes': 'Setup Status Notes',
          'Last Phase Change Date': 'Last Phase Change Date',
          'Initial Check Complete': 'Initial Check Complete',
          'Final Check Complete': 'Final Check Complete',
          'Checklist Progress': 'Checklist Progress',
        };

        // Verificar cada campo mapeado
        for (const [airtableField, supabaseField] of Object.entries(fieldMappings)) {
          const currentValue = cellValues[airtableField];
          const previousValue = previousValues[airtableField];

          if (currentValue !== previousValue && currentValue !== undefined) {
            changes[supabaseField] = currentValue;
          }
        }

        // Si hay cambios, actualizar Supabase
        if (Object.keys(changes).length > 0) {
          console.log(`[Airtable Webhook] Updating property ${propertyId} with changes:`, changes);

          // Buscar la propiedad en Supabase por diferentes campos posibles
          let updateQuery = supabase
            .from('properties')
            .update(changes);

          // Intentar encontrar por diferentes campos
          const { data: property } = await supabase
            .from('properties')
            .select('id')
            .or(`id.eq.${propertyId},airtable_property_id.eq.${propertyId},"Unique ID From Engagements".eq.${propertyId}`)
            .single();

          if (property) {
            const { error } = await supabase
              .from('properties')
              .update(changes)
              .eq('id', property.id);

            if (error) {
              console.error(`[Airtable Webhook] Error updating property ${property.id}:`, error);
              continue;
            }

            updates.push(`Updated property ${property.id}: ${Object.keys(changes).join(', ')}`);

            // Si cambió el "Set Up Status", también podemos mover la fase en el Kanban
            if (changes['Set Up Status']) {
              await handlePhaseChange(property.id, changes['Set Up Status'], supabase);
              updates.push(`Phase changed to: ${changes['Set Up Status']}`);
            }
          } else {
            console.warn(`[Airtable Webhook] Property not found: ${propertyId}`);
          }
        }
      }
    }

    return {
      success: true,
      updates,
    };
  } catch (error: any) {
    console.error('[Airtable Webhook] Error processing webhook:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Maneja cambios de fase desde Airtable
 */
async function handlePhaseChange(
  propertyId: string,
  newPhase: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    // Mapear fase de Airtable a fase interna
    const phaseMapping: Record<string, string> = {
      'Upcoming Settlements': 'upcoming-settlements',
      'Initial Check': 'initial-check',
      'In Progress': 'in-progress',
      'Final Check': 'final-check',
      'Completed': 'completed',
      'Nuevas Escrituras': 'nuevas-escrituras',
    };

    const internalPhase = phaseMapping[newPhase] || newPhase.toLowerCase().replace(/\s+/g, '-');

    // Actualizar el campo "Set Up Status" en Supabase
    const { error } = await supabase
      .from('properties')
      .update({ 'Set Up Status': internalPhase })
      .eq('id', propertyId);

    if (error) {
      console.error(`[Airtable Webhook] Error updating phase for ${propertyId}:`, error);
      return;
    }

    console.log(`[Airtable Webhook] ✅ Phase updated: ${propertyId} → ${internalPhase}`);

    // Aquí puedes agregar lógica adicional:
    // - Crear notificaciones
    // - Disparar eventos
    // - Actualizar otros sistemas
    // - etc.
  } catch (error) {
    console.error('[Airtable Webhook] Error handling phase change:', error);
  }
}

