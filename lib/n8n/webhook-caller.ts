/**
 * Función para llamar al webhook de n8n para extraer categorías del PDF del presupuesto
 * Webhook: https://n8n.prod.prophero.com/webhook/send_categories_cursor
 */

interface WebhookPayload {
  budget_pdf_url: string;
  property_id: string;
  unique_id: string | null;
  property_name: string | null;
  address: string | null;
  client_name: string | null;
  client_email: string | null;
  renovation_type: string | null;
  area_cluster: string | null;
}

const WEBHOOK_URL = 'https://n8n.prod.prophero.com/webhook/send_categories_cursor';

/**
 * Llama al webhook de n8n para extraer categorías del PDF del presupuesto
 * @param payload Datos de la propiedad para enviar al webhook
 * @returns true si la llamada fue exitosa, false en caso contrario
 */
export async function callN8nCategoriesWebhook(payload: WebhookPayload): Promise<boolean> {
  try {
    console.log('[N8N Webhook] Calling webhook for property:', payload.property_id);
    console.log('[N8N Webhook] Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[N8N Webhook] Error response:', response.status, errorText);
      throw new Error(`Webhook call failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json().catch(() => ({}));
    console.log('[N8N Webhook] ✅ Success for property:', payload.property_id, 'Response:', responseData);
    
    return true;
  } catch (error) {
    console.error('[N8N Webhook] ❌ Error calling webhook for property:', payload.property_id, error);
    return false;
  }
}

/**
 * Prepara el payload del webhook desde los datos de una propiedad de Supabase
 */
export function prepareWebhookPayload(property: {
  id: string;
  budget_pdf_url: string | null;
  "Unique ID From Engagements": string | null;
  name: string | null;
  address: string | null;
  "Client Name": string | null;
  "Client email": string | null;
  renovation_type: string | null;
  area_cluster: string | null;
}): WebhookPayload | null {
  // Validar que existe budget_pdf_url
  if (!property.budget_pdf_url) {
    return null;
  }

  return {
    budget_pdf_url: property.budget_pdf_url,
    property_id: property.id,
    unique_id: property["Unique ID From Engagements"] || null,
    property_name: property.name || null,
    address: property.address || null,
    client_name: property["Client Name"] || null,
    client_email: property["Client email"] || null,
    renovation_type: property.renovation_type || null,
    area_cluster: property.area_cluster || null,
  };
}








