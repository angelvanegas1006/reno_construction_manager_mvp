/**
 * Función para llamar al webhook de n8n para extraer categorías del PDF del presupuesto
 * Webhook: https://n8n.prod.prophero.com/webhook/send_categories_cursor
 */

import { createClient } from '@/lib/supabase/client';

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
  budget_index?: number; // Índice del presupuesto (1, 2, 3, etc.)
}

interface DriveFolderWebhookPayload {
  propertyAddress: string;
  propertyName: string;
  uniqueIdFromEngagements: string;
}

interface DriveFolderWebhookResponse {
  drive_folder_id?: string;
  drive_folder_url?: string;
}

const WEBHOOK_URL = 'https://n8n.prod.prophero.com/webhook/send_categories_cursor';
const DRIVE_FOLDER_WEBHOOK_URL = 'https://n8n.prod.prophero.com/webhook/creacion_carpeta_drive';

// URLs de webhooks para subir fotos a Drive según tipo de checklist
const INITIAL_CHECK_PHOTOS_WEBHOOK = 'https://n8n.prod.prophero.com/webhook/initialcheck_photos';
const RENOVATION_UPDATES_PHOTOS_WEBHOOK = 'https://n8n.prod.prophero.com/webhook/renovation_updates_photos';
const FINAL_CHECK_PHOTOS_WEBHOOK = 'https://n8n.prod.prophero.com/webhook/finalcheck_photos';
const RENO_IN_PROGRESS_PHOTOS_WEBHOOK = 'https://n8n.prod.prophero.com/webhook/reno_in_progress_photos';

interface PhotoImage {
  url: string;
  filename: string;
}

interface PhotosWebhookPayload {
  driveFolder_id: string;
  drive_folder_url?: string;
  propertyAddress: string;
  images: PhotoImage[];
}

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
 * @param property Datos de la propiedad
 * @param budgetIndex Índice del presupuesto a procesar (1-based). Si no se proporciona, toma el primero.
 */
export function prepareWebhookPayload(
  property: {
    id: string;
    budget_pdf_url: string | null;
    "Unique ID From Engagements": string | null;
    name: string | null;
    address: string | null;
    "Client Name": string | null;
    "Client email": string | null;
    renovation_type: string | null;
    area_cluster: string | null;
  },
  budgetIndex: number = 1
): WebhookPayload | null {
  // Validar que existe budget_pdf_url
  if (!property.budget_pdf_url) {
    return null;
  }

  // Separar múltiples URLs por comas
  const urls = property.budget_pdf_url
    .split(',')
    .map(url => url.trim())
    .filter(url => url.length > 0 && url.startsWith('http'));

  if (urls.length === 0) {
    return null;
  }

  // Seleccionar la URL según el índice (1-based)
  const budgetIndexZeroBased = budgetIndex - 1;
  if (budgetIndexZeroBased < 0 || budgetIndexZeroBased >= urls.length) {
    return null;
  }

  const budgetPdfUrl = urls[budgetIndexZeroBased];

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
    budget_index: budgetIndex, // Incluir budget_index en el payload
  };
}

/**
 * Obtiene la URL del webhook según el tipo de checklist
 */
function getPhotosWebhookUrl(checklistType: 'reno_initial' | 'reno_intermediate' | 'reno_final'): string {
  switch (checklistType) {
    case 'reno_initial':
      return INITIAL_CHECK_PHOTOS_WEBHOOK;
    case 'reno_intermediate':
      return RENOVATION_UPDATES_PHOTOS_WEBHOOK;
    case 'reno_final':
      return FINAL_CHECK_PHOTOS_WEBHOOK;
    default:
      throw new Error(`Unknown checklist type: ${checklistType}`);
  }
}

/**
 * Sube fotos a Drive usando el webhook de n8n
 * @param propertyId ID de la propiedad en Supabase
 * @param checklistType Tipo de checklist (reno_initial, reno_intermediate, reno_final)
 * @param photoUrls Array de objetos con url y filename de las fotos
 * @returns true si la llamada fue exitosa, false en caso contrario
 */
export async function uploadPhotosToDrive(
  propertyId: string,
  checklistType: 'reno_initial' | 'reno_intermediate' | 'reno_final',
  photoUrls: Array<{ url: string; filename: string }>
): Promise<boolean> {
  const supabase = createClient();
  
  try {
    // Validar que hay fotos para subir
    if (!photoUrls || photoUrls.length === 0) {
      console.log('[Photos Drive Webhook] No photos to upload');
      return true; // No hay fotos, consideramos éxito
    }

    // Obtener datos de la propiedad
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, address, drive_folder_id, drive_folder_url')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      console.error('[Photos Drive Webhook] Property not found:', propertyId);
      return false;
    }

    // Validar que tiene drive_folder_id
    if (!property.drive_folder_id) {
      console.log('[Photos Drive Webhook] Property does not have drive_folder_id, skipping:', {
        propertyId,
      });
      return false; // No tiene carpeta Drive, no podemos subir fotos
    }

    // Validar que tiene address
    if (!property.address) {
      console.log('[Photos Drive Webhook] Property does not have address, skipping:', {
        propertyId,
      });
      return false;
    }

    // Preparar payload
    const payload: PhotosWebhookPayload = {
      driveFolder_id: property.drive_folder_id,
      drive_folder_url: property.drive_folder_url || undefined,
      propertyAddress: property.address,
      images: photoUrls.map(photo => ({
        url: photo.url,
        filename: photo.filename,
      })),
    };

    const webhookUrl = getPhotosWebhookUrl(checklistType);

    console.log('[Photos Drive Webhook] Calling webhook for property:', propertyId);
    console.log('[Photos Drive Webhook] Checklist type:', checklistType);
    console.log('[Photos Drive Webhook] URL:', webhookUrl);
    console.log('[Photos Drive Webhook] Photos count:', photoUrls.length);
    console.log('[Photos Drive Webhook] Payload:', JSON.stringify(payload, null, 2));

    // Crear un AbortController para timeout de 60 segundos (más tiempo para múltiples fotos)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(webhookUrl, {
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
        console.error('[Photos Drive Webhook] Error response:', response.status, errorText);
        throw new Error(`Webhook call failed: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json().catch(() => ({}));
      console.log('[Photos Drive Webhook] ✅ Success for property:', propertyId);
      console.log('[Photos Drive Webhook] Response:', JSON.stringify(responseData, null, 2));
      
      return true;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Webhook call timed out after 60 seconds');
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[Photos Drive Webhook] ❌ Error calling webhook for property:', propertyId);
    console.error('[Photos Drive Webhook] Error details:', error.message);
    if (error.stack) {
      console.error('[Photos Drive Webhook] Stack trace:', error.stack);
    }
    // Retornar false para que se muestre error al usuario
    return false;
  }
}

/**
 * Sube fotos de avance de obra al webhook de n8n
 * Usa una API route del servidor para evitar problemas de CORS
 * @param propertyId ID de la propiedad en Supabase
 * @param photoUrls Array de objetos con url y filename de las fotos
 * @returns true si la llamada fue exitosa, false en caso contrario
 */
export async function uploadRenoInProgressPhotos(
  propertyId: string,
  photoUrls: Array<{ url: string; filename: string }>
): Promise<boolean> {
  // Llamar a la API route del servidor para evitar CORS
  try {
    console.log('[Reno In Progress Photos Webhook] 📤 Calling API route with:', {
      propertyId,
      photosCount: photoUrls.length,
      photoUrls: photoUrls.map(p => ({ url: p.url?.substring(0, 50) + '...', filename: p.filename })),
    });

    const requestBody = {
      propertyId,
      photoUrls,
    };

    console.log('[Reno In Progress Photos Webhook] Request body size:', JSON.stringify(requestBody).length, 'bytes');

    const response = await fetch('/api/webhooks/reno-in-progress-photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Reno In Progress Photos Webhook] Response status:', response.status, response.statusText);
    console.log('[Reno In Progress Photos Webhook] Response headers:', Object.fromEntries(response.headers.entries()));

    // Leer el texto de la respuesta una sola vez
    let responseText = '';
    try {
      responseText = await response.text();
      console.log('[Reno In Progress Photos Webhook] Response text length:', responseText.length);
      console.log('[Reno In Progress Photos Webhook] Response text preview:', responseText.substring(0, 500));
    } catch (textError: any) {
      console.error('[Reno In Progress Photos Webhook] Failed to read response text:', textError);
      return false;
    }

    if (!response.ok) {
      // Construir información de error detallada
      const errorInfo: any = {
        status: response.status,
        statusText: response.statusText || 'Unknown',
        url: response.url,
        responseTextLength: responseText?.length || 0,
      };

      // Intentar parsear el JSON de la respuesta
      let errorData: any = null;
      let errorMessage = `Error ${response.status}: ${response.statusText || 'Unknown error'}`;
      
      if (responseText && responseText.trim()) {
          try {
          errorData = JSON.parse(responseText);
          errorInfo.parsedError = errorData;
          
          // Si el objeto parseado está vacío, usar el texto original
          if (!errorData || (typeof errorData === 'object' && Object.keys(errorData).length === 0)) {
            errorInfo.emptyParsedObject = true;
            errorData = { 
              message: responseText.substring(0, 200),
              rawResponse: responseText,
            };
          }
          
          // Extraer mensaje de error del objeto parseado
          errorMessage = errorData?.error || errorData?.message || errorMessage;
        } catch (parseError) {
          // Si no se puede parsear como JSON, usar el texto como mensaje
          errorInfo.parseError = 'Failed to parse JSON';
          errorInfo.parseErrorDetails = parseError instanceof Error ? parseError.message : String(parseError);
          errorInfo.rawResponse = responseText.substring(0, 1000);
          errorData = { 
            message: responseText.substring(0, 200) || errorMessage,
            rawResponse: responseText,
          };
          errorMessage = errorData.message;
        }
      } else {
        errorInfo.noResponseBody = true;
        errorData = { 
          message: errorMessage,
        };
      }
      
      // Asegurar que siempre tengamos un mensaje
      errorInfo.errorMessage = errorMessage;
      errorInfo.errorData = errorData;
      
      // Log detallado del error con toda la información
      console.error('[Reno In Progress Photos Webhook] ❌ API route error:', JSON.stringify(errorInfo, null, 2));
      
      // También log individual para mejor visibilidad en consola
      console.error('[Reno In Progress Photos Webhook] Error summary:', {
        status: response.status,
        statusText: response.statusText,
        message: errorMessage,
        hasResponseText: !!responseText,
        responseTextLength: responseText?.length || 0,
        responseTextPreview: responseText?.substring(0, 300) || 'No response body',
        errorDataKeys: errorData ? Object.keys(errorData) : [],
      });
      
      return false;
    }

    // Si la respuesta es OK, parsear el JSON
    let result: any;
    try {
      if (responseText) {
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('[Reno In Progress Photos Webhook] Failed to parse JSON response:', {
            text: responseText.substring(0, 200),
            parseError,
          });
          result = { rawResponse: responseText.substring(0, 200) };
        }
      } else {
        result = { message: 'Empty response body' };
      }
    } catch (parseError: any) {
      console.error('[Reno In Progress Photos Webhook] Failed to parse response:', parseError);
      result = { error: 'Failed to parse response', details: parseError?.message };
    }

    console.log('[Reno In Progress Photos Webhook] ✅ Success:', result);
    return true;
  } catch (error: any) {
    console.error('[Reno In Progress Photos Webhook] ❌ Error calling API route:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      cause: error?.cause,
    });
    return false;
  }
}

/**
 * Crea una carpeta de Drive para una propiedad usando el webhook de n8n
 * @param propertyId ID de la propiedad en Supabase
 * @returns Promise que se resuelve cuando se crea la carpeta (o si ya existe)
 */
export async function createDriveFolderForProperty(propertyId: string): Promise<void> {
  const supabase = createClient();
  
  try {
    // Obtener datos de la propiedad
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, address, name, "Unique ID From Engagements"')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      console.error('[Drive Folder Webhook] Property not found:', propertyId);
      return; // No lanzar error, solo loguear
    }

    // Si ya tiene drive_folder_id, no hacer nada
    const { data: propertyWithDrive } = await supabase
      .from('properties')
      .select('drive_folder_id')
      .eq('id', propertyId)
      .single();

    if (propertyWithDrive?.drive_folder_id) {
      console.log('[Drive Folder Webhook] Property already has drive_folder_id, skipping:', propertyId);
      return;
    }

    // Validar que tiene los datos necesarios
    if (!property.address || !property["Unique ID From Engagements"]) {
      console.log('[Drive Folder Webhook] Property missing required fields, skipping:', {
        propertyId,
        hasAddress: !!property.address,
        hasUniqueId: !!property["Unique ID From Engagements"],
      });
      return;
    }

    // Preparar payload
    const payload: DriveFolderWebhookPayload = {
      propertyAddress: property.address,
      propertyName: property.name || property.address,
      uniqueIdFromEngagements: property["Unique ID From Engagements"],
    };

    console.log('[Drive Folder Webhook] Calling webhook for property:', propertyId);
    console.log('[Drive Folder Webhook] URL:', DRIVE_FOLDER_WEBHOOK_URL);
    console.log('[Drive Folder Webhook] Payload:', JSON.stringify(payload, null, 2));

    // Crear un AbortController para timeout de 30 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(DRIVE_FOLDER_WEBHOOK_URL, {
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
        console.error('[Drive Folder Webhook] Error response:', response.status, errorText);
        // No lanzar error, solo loguear (es silencioso)
        return;
      }

      const responseData: DriveFolderWebhookResponse = await response.json().catch(() => ({}));
      console.log('[Drive Folder Webhook] ✅ Success for property:', propertyId);
      console.log('[Drive Folder Webhook] Response:', JSON.stringify(responseData, null, 2));
      
      // Actualizar la propiedad con drive_folder_id y drive_folder_url si se recibieron
      if (responseData.drive_folder_id || responseData.drive_folder_url) {
        const updateData: any = {};
        if (responseData.drive_folder_id) {
          updateData.drive_folder_id = responseData.drive_folder_id;
        }
        if (responseData.drive_folder_url) {
          updateData.drive_folder_url = responseData.drive_folder_url;
        }

        const { error: updateError } = await supabase
          .from('properties')
          .update(updateData)
          .eq('id', propertyId);

        if (updateError) {
          console.error('[Drive Folder Webhook] Error updating property with drive folder info:', updateError);
        } else {
          console.log('[Drive Folder Webhook] ✅ Property updated with drive folder info');
        }
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[Drive Folder Webhook] Webhook call timed out after 30 seconds');
      } else {
        console.error('[Drive Folder Webhook] Error calling webhook:', fetchError);
      }
      // No lanzar error, solo loguear (es silencioso)
    }
  } catch (error: any) {
    console.error('[Drive Folder Webhook] ❌ Error creating drive folder for property:', propertyId);
    console.error('[Drive Folder Webhook] Error details:', error.message);
    // No lanzar error, solo loguear (es silencioso)
  }
}
