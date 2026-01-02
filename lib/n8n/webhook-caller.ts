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

/**
 * Llama al webhook de n8n para crear una carpeta en Drive
 * @param propertyId ID de la propiedad en Supabase
 * @returns true si la llamada fue exitosa y se actualizó Supabase, false en caso contrario
 */
export async function createDriveFolderForProperty(propertyId: string): Promise<boolean> {
  const supabase = createClient();
  
  try {
    // Obtener datos de la propiedad
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, address, "Unique ID From Engagements", drive_folder_id, drive_folder_url')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      console.error('[Drive Folder Webhook] Property not found:', propertyId);
      return false;
    }

    // Verificar si ya tiene drive_folder_id o drive_folder_url
    if (property.drive_folder_id || property.drive_folder_url) {
      console.log('[Drive Folder Webhook] Property already has drive folder, skipping:', {
        propertyId,
        hasDriveFolderId: !!property.drive_folder_id,
        hasDriveFolderUrl: !!property.drive_folder_url,
        driveFolderId: property.drive_folder_id,
        driveFolderUrl: property.drive_folder_url,
      });
      return true; // Ya tiene carpeta, consideramos éxito
    }
    
    console.log('[Drive Folder Webhook] Property does not have drive folder, proceeding to create:', {
      propertyId,
      propertyName: property.name,
      propertyAddress: property.address,
    });

    // Validar que tenemos los datos necesarios
    // Usar valores por defecto si faltan algunos campos
    const propertyAddress = property.address;
    // Si no hay name, usar address como fallback
    const propertyName = property.name || property.address || `Property ${propertyId}`;
    const uniqueIdFromEngagements = property['Unique ID From Engagements'];

    console.log('[Drive Folder Webhook] Validating required data:', {
      propertyId,
      address: propertyAddress,
      name: property.name,
      nameFallback: propertyName,
      uniqueId: uniqueIdFromEngagements,
      hasAddress: !!propertyAddress,
      hasName: !!property.name,
      hasUniqueId: !!uniqueIdFromEngagements,
    });

    // Solo address es estrictamente requerido
    if (!propertyAddress) {
      console.error('[Drive Folder Webhook] Missing required address, skipping:', {
        propertyId,
        address: propertyAddress || 'MISSING',
        name: propertyName,
        uniqueId: uniqueIdFromEngagements || 'MISSING',
      });
      return false; // Saltamos la llamada si falta address
    }

    // Si falta uniqueIdFromEngagements, usar propertyId como fallback
    const finalUniqueId = uniqueIdFromEngagements || propertyId;
    
    if (!uniqueIdFromEngagements) {
      console.warn('[Drive Folder Webhook] Missing Unique ID From Engagements, using propertyId as fallback:', {
        propertyId,
        usingPropertyId: true,
      });
    }

    // Preparar payload
    const payload: DriveFolderWebhookPayload = {
      propertyAddress,
      propertyName,
      uniqueIdFromEngagements: finalUniqueId,
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
        // No lanzar error, solo retornar false (silencioso)
        return false;
      }

      const responseData = await response.json().catch(() => ({})) as DriveFolderWebhookResponse;
      console.log('[Drive Folder Webhook] ✅ Success for property:', propertyId);
      console.log('[Drive Folder Webhook] Response:', JSON.stringify(responseData, null, 2));

      // Actualizar Supabase con drive_folder_id y drive_folder_url
      if (responseData.drive_folder_id || responseData.drive_folder_url) {
        const updateData: Record<string, any> = {};
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
          console.error('[Drive Folder Webhook] Error updating Supabase:', updateError);
          return false;
        }

        console.log('[Drive Folder Webhook] ✅ Updated Supabase with drive folder info');
        return true;
      } else {
        console.warn('[Drive Folder Webhook] Response did not include drive_folder_id or drive_folder_url');
        return false;
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[Drive Folder Webhook] Request timed out after 30 seconds');
      } else {
        console.error('[Drive Folder Webhook] Fetch error:', fetchError);
      }
      // No mostrar error al usuario, solo retornar false (silencioso)
      return false;
    }
  } catch (error: any) {
    console.error('[Drive Folder Webhook] ❌ Error calling webhook for property:', propertyId);
    console.error('[Drive Folder Webhook] Error details:', error.message);
    // No mostrar error al usuario, solo retornar false (silencioso)
    return false;
  }
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
 * @param checklistType Tipo de checklist (reno_initial, reno_in_progress, reno_final)
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
    });

    const response = await fetch('/api/webhooks/renoinprogressphotos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        propertyId,
        photoUrls,
      }),
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        const text = await response.text();
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = { message: text || `HTTP ${response.status}` };
        }
      } catch (e) {
        errorData = { message: `HTTP ${response.status} - Failed to read response` };
      }
      
      console.error('[Reno In Progress Photos Webhook] ❌ API route error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        url: response.url,
      });
      return false;
    }

    const result = await response.json();
    console.log('[Reno In Progress Photos Webhook] ✅ Success:', result);
    return true;
  } catch (error: any) {
    console.error('[Reno In Progress Photos Webhook] ❌ Error calling API route:', {
      message: error.message,
      stack: error.stack,
    });
    return false;
  }
}










