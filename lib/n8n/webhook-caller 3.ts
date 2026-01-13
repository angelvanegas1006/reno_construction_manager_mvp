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
    console.log('[N8N Webhook] URL:', WEBHOOK_URL);
    console.log('[N8N Webhook] Payload:', JSON.stringify(payload, null, 2));

    // Crear un AbortController para timeout de 30 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[N8N Webhook] Error response:', response.status, errorText);
        throw new Error(`Webhook call failed: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json().catch(() => ({}));
      console.log('[N8N Webhook] ✅ Success for property:', payload.property_id);
      console.log('[N8N Webhook] Response:', JSON.stringify(responseData, null, 2));
      
      return true;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Webhook call timed out after 30 seconds');
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[N8N Webhook] ❌ Error calling webhook for property:', payload.property_id);
    console.error('[N8N Webhook] Error details:', error.message);
    if (error.stack) {
      console.error('[N8N Webhook] Stack trace:', error.stack);
    }
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

  // Si budget_pdf_url tiene múltiples URLs separadas por comas, tomar solo la primera
  const budgetPdfUrl = property.budget_pdf_url.split(',')[0].trim();

  return {
    budget_pdf_url: budgetPdfUrl,
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










