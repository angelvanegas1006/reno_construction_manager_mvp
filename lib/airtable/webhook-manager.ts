/**
 * Servicio para gestionar webhooks de Airtable programáticamente
 * 
 * Permite crear, listar, actualizar y eliminar webhooks sin usar la interfaz de Airtable
 */

interface AirtableWebhookSpec {
  notificationUrl: string;
  specification: {
    options: {
      filters: {
        dataTypes: ('tableData' | 'tableFields' | 'tableMetadata')[];
      };
    };
  };
}

interface AirtableWebhook {
  id: string;
  notificationUrl: string;
  specification: {
    options: {
      filters: {
        dataTypes: string[];
      };
    };
  };
  isHookEnabled: boolean;
  expirationTime?: string;
}

interface CreateWebhookResponse {
  id: string;
  notificationUrl: string;
  expirationTime: string;
}

/**
 * Obtiene el token de autenticación de Airtable
 */
function getAuthHeaders(): HeadersInit {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_AIRTABLE_API_KEY no está configurado');
  }

  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Crea un webhook en Airtable
 */
export async function createAirtableWebhook(
  baseId: string,
  webhookUrl: string,
  tableId?: string
): Promise<CreateWebhookResponse | null> {
  try {
    const spec: AirtableWebhookSpec = {
      notificationUrl: webhookUrl,
      specification: {
        options: {
          filters: {
            dataTypes: ['tableData'], // Solo queremos cambios en datos de tabla
          },
        },
      },
    };

    // Si se especifica una tabla, agregar filtro
    if (tableId) {
      // Nota: La API de Airtable puede requerir configuración adicional para filtrar por tabla
      // Por ahora, monitoreamos todos los cambios y filtramos en el procesador
    }

    const response = await fetch(
      `https://api.airtable.com/v0/bases/${baseId}/webhooks`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(spec),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Airtable Webhook] Error creating webhook:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return null;
    }

    const data = await response.json();
    console.log('✅ Webhook creado exitosamente:', data.id);
    return data;
  } catch (error) {
    console.error('[Airtable Webhook] Error creating webhook:', error);
    return null;
  }
}

/**
 * Lista todos los webhooks de una base
 */
export async function listAirtableWebhooks(
  baseId: string
): Promise<AirtableWebhook[]> {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/bases/${baseId}/webhooks`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Airtable Webhook] Error listing webhooks:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return [];
    }

    const data = await response.json();
    return data.webhooks || [];
  } catch (error) {
    console.error('[Airtable Webhook] Error listing webhooks:', error);
    return [];
  }
}

/**
 * Elimina un webhook de Airtable
 */
export async function deleteAirtableWebhook(
  baseId: string,
  webhookId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Airtable Webhook] Error deleting webhook:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return false;
    }

    console.log('✅ Webhook eliminado exitosamente:', webhookId);
    return true;
  } catch (error) {
    console.error('[Airtable Webhook] Error deleting webhook:', error);
    return false;
  }
}

/**
 * Actualiza un webhook existente
 */
export async function updateAirtableWebhook(
  baseId: string,
  webhookId: string,
  updates: Partial<AirtableWebhookSpec>
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Airtable Webhook] Error updating webhook:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return false;
    }

    console.log('✅ Webhook actualizado exitosamente:', webhookId);
    return true;
  } catch (error) {
    console.error('[Airtable Webhook] Error updating webhook:', error);
    return false;
  }
}

/**
 * Configura automáticamente el webhook si no existe
 * Busca webhooks existentes con la misma URL y los reutiliza o crea uno nuevo
 */
export async function setupAirtableWebhook(
  baseId: string,
  webhookUrl: string,
  tableId?: string
): Promise<{ webhookId: string; created: boolean } | null> {
  try {
    // 1. Listar webhooks existentes
    const existingWebhooks = await listAirtableWebhooks(baseId);

    // 2. Buscar si ya existe un webhook con la misma URL
    const existingWebhook = existingWebhooks.find(
      (wh) => wh.notificationUrl === webhookUrl
    );

    if (existingWebhook) {
      console.log('✅ Webhook ya existe, reutilizando:', existingWebhook.id);
      return {
        webhookId: existingWebhook.id,
        created: false,
      };
    }

    // 3. Si no existe, crear uno nuevo
    const newWebhook = await createAirtableWebhook(baseId, webhookUrl, tableId);

    if (!newWebhook) {
      return null;
    }

    return {
      webhookId: newWebhook.id,
      created: true,
    };
  } catch (error) {
    console.error('[Airtable Webhook] Error setting up webhook:', error);
    return null;
  }
}


