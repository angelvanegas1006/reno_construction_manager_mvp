import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Configuración para Next.js 13+ App Router
// Usar runtime nodejs para tener más control sobre el procesamiento
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos de timeout

const RENO_IN_PROGRESS_PHOTOS_WEBHOOK = 'https://n8n.prod.prophero.com/webhook/reno_in_progress_photos';
const RENO_UPDATES_FOLDER_CREATION_WEBHOOK = 'https://n8n.prod.prophero.com/webhook/reno/updates/foldercreation';
const STORAGE_BUCKET = 'inspection-images';

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
 * API route para subir fotos de avance de obra al webhook de n8n
 * Se llama desde el cliente para evitar problemas de CORS
 */
export async function POST(request: NextRequest) {
  try {
    // Leer el body de manera más robusta para manejar payloads grandes
    let body: any;
    try {
      body = await request.json();
    } catch (jsonError: any) {
      // Si falla el parseo JSON, puede ser por tamaño
      console.error('[Reno In Progress Photos API] ❌ Error parsing JSON:', {
        message: jsonError?.message,
        name: jsonError?.name,
      });
      
      // Intentar leer como texto para debug
      try {
        const text = await request.text();
        console.error('[Reno In Progress Photos API] Body size:', text.length);
        console.error('[Reno In Progress Photos API] Body preview:', text.substring(0, 500));
      } catch (textError) {
        console.error('[Reno In Progress Photos API] Could not read body as text');
      }
      
      return NextResponse.json(
        { 
          error: 'Invalid JSON payload',
          message: 'The request body is too large or invalid. Please try uploading fewer photos at once.',
          details: jsonError?.message,
        },
        { status: 400 }
      );
    }
    
    const { propertyId, photoUrls } = body;

    // Validar parámetros
    if (!propertyId) {
      return NextResponse.json(
        { error: 'propertyId is required' },
        { status: 400 }
      );
    }

    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return NextResponse.json(
        { error: 'photoUrls must be a non-empty array' },
        { status: 400 }
      );
    }

    console.log('[Reno In Progress Photos API] 📤 Processing request:', {
      propertyId,
      photosCount: photoUrls.length,
    });

    const supabase = await createClient();

    // Obtener datos de la propiedad
    console.log('[Reno In Progress Photos API] 🔍 Fetching property data for ID:', propertyId);
    
    // Intentar buscar por UUID primero (id)
    const propertySelect = 'id, address, drive_folder_id, drive_folder_url, drive_folder_reno_updates_id, drive_folder_reno_updates_url, "Unique ID From Engagements"';
    let { data: property, error: propertyError } = await supabase
      .from('properties')
      .select(propertySelect)
      .eq('id', propertyId)
      .single();
    
    // Si no se encuentra por UUID, intentar buscar por Unique ID From Engagements
    if (propertyError && propertyError.code === 'PGRST116') {
      console.log('[Reno In Progress Photos API] Property not found by UUID, trying Unique ID From Engagements...');
      const { data: propertyByUniqueId, error: uniqueIdError } = await supabase
        .from('properties')
        .select(propertySelect)
        .eq('"Unique ID From Engagements"', propertyId)
        .single();
      
      if (!uniqueIdError && propertyByUniqueId) {
        property = propertyByUniqueId;
        propertyError = null;
        console.log('[Reno In Progress Photos API] ✅ Found property by Unique ID From Engagements');
      } else {
        propertyError = uniqueIdError;
      }
    }

    if (propertyError) {
      console.error('[Reno In Progress Photos API] ❌ Error fetching property:', {
        propertyId,
        error: propertyError,
        message: propertyError.message,
        code: propertyError.code,
      });
      return NextResponse.json(
        { error: 'Property not found', details: propertyError.message },
        { status: 404 }
      );
    }

    if (!property) {
      console.error('[Reno In Progress Photos API] ❌ Property not found:', propertyId);
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    console.log('[Reno In Progress Photos API] ✅ Property found:', {
      propertyId: property.id,
      address: property.address,
      hasDriveFolderId: !!property.drive_folder_id,
      hasDriveFolderUrl: !!property.drive_folder_url,
    });

    // Validar que tiene drive_folder_id
    if (!property.drive_folder_id) {
      console.warn('[Reno In Progress Photos API] ⚠️ Property does not have drive_folder_id');
      return NextResponse.json(
        { error: 'Property does not have a Drive folder. Please create one first.' },
        { status: 400 }
      );
    }

    // Validar que tiene address
    if (!property.address) {
      console.warn('[Reno In Progress Photos API] ⚠️ Property does not have address');
      return NextResponse.json(
        { error: 'Property does not have an address' },
        { status: 400 }
      );
    }

    // Si no tenemos subcarpeta de reno updates, crearla primero (una sola vez)
    if (!property.drive_folder_reno_updates_id) {
      console.log('[Reno In Progress Photos API] 📁 No reno updates folder, calling folder creation webhook...');
      const folderPayload = {
        address: property.address,
        uniqueId: property['Unique ID From Engagements'] ?? null,
        drive_folder_id: property.drive_folder_id,
        drive_folder_url: property.drive_folder_url ?? undefined,
      };
      const folderRes = await fetch(RENO_UPDATES_FOLDER_CREATION_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderPayload),
      });
      if (!folderRes.ok) {
        const errText = await folderRes.text();
        console.error('[Reno In Progress Photos API] ❌ Folder creation webhook failed:', folderRes.status, errText);
        return NextResponse.json(
          {
            error: 'No se pudo crear la carpeta de avances en Drive',
            details: errText.substring(0, 300),
          },
          { status: 502 }
        );
      }
      const folderData = (await folderRes.json().catch(() => ({}))) as { drive_folder_id?: string; drive_folder_url?: string };
      const subfolderId = folderData.drive_folder_id;
      const subfolderUrl = folderData.drive_folder_url;
      if (subfolderId) {
        const updateData: Record<string, string | null> = { drive_folder_reno_updates_id: subfolderId };
        if (subfolderUrl != null) updateData.drive_folder_reno_updates_url = subfolderUrl;
        const { error: updateErr } = await supabase
          .from('properties')
          .update(updateData)
          .eq('id', property.id)
          .is('drive_folder_reno_updates_id', null);
        if (!updateErr) {
          (property as any).drive_folder_reno_updates_id = subfolderId;
          if (subfolderUrl != null) (property as any).drive_folder_reno_updates_url = subfolderUrl;
          console.log('[Reno In Progress Photos API] ✅ Reno updates folder saved:', subfolderId);
        }
      }
      // El segundo POST debe enviar solo los id de la subcarpeta recién creada, nunca la carpeta principal
      if (!(property as any).drive_folder_reno_updates_id) {
        console.error('[Reno In Progress Photos API] ❌ Folder webhook did not return drive_folder_id');
        return NextResponse.json(
          {
            error: 'No se recibió el id de la carpeta de avances desde el servicio. No se pueden subir fotos.',
          },
          { status: 502 }
        );
      }
      // Dar tiempo al workflow de n8n a terminar y a que los datos estén disponibles antes del siguiente POST
      const FOLDER_CREATION_DELAY_MS = 3500;
      console.log('[Reno In Progress Photos API] ⏳ Esperando', FOLDER_CREATION_DELAY_MS / 1000, 's antes de subir fotos...');
      await new Promise((resolve) => setTimeout(resolve, FOLDER_CREATION_DELAY_MS));
    }

    // Subir todas las fotos a Supabase Storage en paralelo
    console.log('[Reno In Progress Photos API] 📤 Uploading all photos to Supabase Storage in parallel...');
    
    const uploadPromises = photoUrls.map(async (photo: PhotoImage, index: number) => {
      try {
        // Convertir base64 a File
        const base64Data = photo.url.includes(',') ? photo.url.split(',')[1] : photo.url;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        // Detectar tipo MIME
        const mimeMatch = photo.url.match(/data:([^;]+);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const blob = new Blob([byteArray], { type: mimeType });
        const file = new File([blob], photo.filename, { type: mimeType });
        
        // Generar nombre único para el archivo (usar index para evitar colisiones de timestamp)
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileExtension = photo.filename.split('.').pop() || 'jpg';
        const fileName = `${timestamp}_${index}_${randomString}.${fileExtension}`;
        
        // Path: propertyId/reno-in-progress/fileName
        const storagePath = `${property.id}/reno-in-progress/${fileName}`;
        
        // Subir a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, {
            contentType: mimeType,
            upsert: false,
          });
        
        if (uploadError) {
          console.error('[Reno In Progress Photos API] ❌ Error uploading to Storage:', {
            filename: photo.filename,
            error: uploadError.message,
          });
          // Retornar null para indicar error, pero mantener el orden
          return { index, url: null, filename: photo.filename, error: uploadError.message };
        }
        
        // Obtener URL pública
        const { data: publicUrlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(uploadData.path);
        
        console.log('[Reno In Progress Photos API] ✅ Uploaded to Storage:', {
          filename: photo.filename,
          url: publicUrlData.publicUrl,
        });
        
        return { index, url: publicUrlData.publicUrl, filename: photo.filename, error: null };
      } catch (storageError: any) {
        console.error('[Reno In Progress Photos API] ❌ Error processing photo for Storage:', {
          filename: photo.filename,
          error: storageError.message,
        });
        return { index, url: null, filename: photo.filename, error: storageError.message };
      }
    });
    
    // Esperar a que todas las subidas terminen
    const uploadResults = await Promise.all(uploadPromises);
    
    // Ordenar resultados por índice para mantener el orden original
    uploadResults.sort((a, b) => a.index - b.index);
    
    const successfulUploads = uploadResults.filter(r => r.url !== null);
    const failedUploads = uploadResults.filter(r => r.url === null);
    
    console.log('[Reno In Progress Photos API] ✅ Storage uploads completed:', {
      total: photoUrls.length,
      successful: successfulUploads.length,
      failed: failedUploads.length,
    });
    
    // Si todas las fotos fallaron, retornar error
    if (successfulUploads.length === 0) {
      return NextResponse.json(
        { 
          error: 'No se pudieron subir las fotos a Storage',
          details: failedUploads.map(f => ({ filename: f.filename, error: f.error })),
        },
        { status: 500 }
      );
    }

    // Registrar en BD para mostrarlas en Estado de la propiedad
    const rows = successfulUploads.map((r) => ({
      property_id: property.id,
      file_url: r.url!,
      file_name: r.filename,
    }));
    let insertClient = supabase;
    try {
      insertClient = createAdminClient();
    } catch {
      // Si no hay SUPABASE_SERVICE_ROLE_KEY, usar cliente de sesión (RLS aplica)
    }
    const { error: insertError } = await insertClient
      .from('property_progress_photos')
      .insert(rows);
    const photosSavedToStatus = !insertError;
    if (insertError) {
      console.error('[Reno In Progress Photos API] ❌ Error guardando fotos en property_progress_photos:', insertError.message, insertError.code);
    } else {
      console.log('[Reno In Progress Photos API] ✅ Fotos registradas en BD:', rows.length, 'para property_id:', property.id);
    }

    // Preparar payload para n8n: enviar solo los id/url de la subcarpeta de reno updates (la última creada), nunca la carpeta principal
    const renoUpdatesFolderId = property.drive_folder_reno_updates_id;
    const renoUpdatesFolderUrl = property.drive_folder_reno_updates_url ?? undefined;
    if (!renoUpdatesFolderId) {
      console.error('[Reno In Progress Photos API] ❌ Missing drive_folder_reno_updates_id before photo webhook');
      return NextResponse.json(
        { error: 'Falta la carpeta de avances en Drive. Intenta de nuevo.' },
        { status: 500 }
      );
    }
    const payload: PhotosWebhookPayload = {
      driveFolder_id: renoUpdatesFolderId,
      drive_folder_url: renoUpdatesFolderUrl,
      propertyAddress: property.address,
      images: uploadResults.map((result) => ({
        url: result.url || photoUrls[result.index].url, // Usar URL de Storage si está disponible, sino base64 original
        filename: result.filename,
      })),
    };

    console.log('[Reno In Progress Photos API] Calling webhook:', {
      url: RENO_IN_PROGRESS_PHOTOS_WEBHOOK,
      photosCount: photoUrls.length,
    });

    // Crear un AbortController para timeout de 60 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(RENO_IN_PROGRESS_PHOTOS_WEBHOOK, {
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
        console.error('[Reno In Progress Photos API] ❌ Webhook error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500),
          url: RENO_IN_PROGRESS_PHOTOS_WEBHOOK,
        });
        
        // Mensaje más amigable según el tipo de error
        let errorMessage = `Error al conectar con el servicio de almacenamiento`;
        if (response.status === 404) {
          errorMessage = `El servicio de almacenamiento no está disponible. Por favor, contacta al administrador.`;
        } else if (response.status >= 500) {
          errorMessage = `Error en el servidor de almacenamiento. Por favor, intenta más tarde.`;
        }
        
        return NextResponse.json(
          { 
            error: errorMessage,
            status: response.status,
            details: errorText.substring(0, 500),
          },
          { status: 502 } // Bad Gateway - el webhook externo falló
        );
      }

      const responseData = await response.json().catch(() => ({}));
      console.log('[Reno In Progress Photos API] ✅ Success:', {
        propertyId: property.id,
        photosCount: photoUrls.length,
      });
      
      return NextResponse.json({
        success: true,
        message: 'Photos uploaded successfully',
        response: responseData,
        photosSavedToStatus,
        propertyIdUsed: property.id,
        ...(insertError && { insertError: insertError.message, insertCode: insertError.code }),
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[Reno In Progress Photos API] ❌ Timeout');
        return NextResponse.json(
          { error: 'Webhook call timed out after 60 seconds' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[Reno In Progress Photos API] ❌ Error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
    });
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error?.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}



