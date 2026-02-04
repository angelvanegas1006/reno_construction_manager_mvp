import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Configuración para Next.js 13+ App Router
// Usar runtime nodejs para tener más control sobre el procesamiento
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos de timeout

const RENO_IN_PROGRESS_PHOTOS_WEBHOOK = 'https://n8n.prod.prophero.com/webhook/reno_in_progress_photos';
const DRIVE_FOLDER_WEBHOOK_URL = 'https://n8n.prod.prophero.com/webhook/creacion_carpeta_drive';
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
    let { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, address, drive_folder_id, drive_folder_url, "Unique ID From Engagements"')
      .eq('id', propertyId)
      .single();
    
    // Si no se encuentra por UUID, intentar buscar por Unique ID From Engagements
    if (propertyError && propertyError.code === 'PGRST116') {
      console.log('[Reno In Progress Photos API] Property not found by UUID, trying Unique ID From Engagements...');
      const { data: propertyByUniqueId, error: uniqueIdError } = await supabase
        .from('properties')
        .select('id, address, drive_folder_id, drive_folder_url, "Unique ID From Engagements"')
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

    // Si no tiene drive_folder_id, crear la carpeta Drive primero (obras en proceso puede no haberla creado en initial check)
    if (!property.drive_folder_id) {
      const address = property.address;
      const uniqueId = property['Unique ID From Engagements'];
      if (!address || !uniqueId) {
        console.warn('[Reno In Progress Photos API] ⚠️ Property missing address or Unique ID, cannot create Drive folder');
        return NextResponse.json(
          { error: 'Property missing address or Unique ID. Cannot create Drive folder.' },
          { status: 400 }
        );
      }
      console.log('[Reno In Progress Photos API] 📁 Creating Drive folder for property (missing drive_folder_id)...');
      try {
        const drivePayload = {
          propertyAddress: address,
          propertyName: property.name || address,
          uniqueIdFromEngagements: uniqueId,
        };
        const driveRes = await fetch(DRIVE_FOLDER_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(drivePayload),
        });
        if (!driveRes.ok) {
          const errText = await driveRes.text();
          console.error('[Reno In Progress Photos API] ❌ Drive folder webhook failed:', driveRes.status, errText);
          return NextResponse.json(
            { error: 'Failed to create Drive folder.', details: errText },
            { status: 502 }
          );
        }
        const driveData = (await driveRes.json().catch(() => ({}))) as { drive_folder_id?: string; drive_folder_url?: string };
        if (driveData.drive_folder_id || driveData.drive_folder_url) {
          const updateData: Record<string, string> = {};
          if (driveData.drive_folder_id) updateData.drive_folder_id = driveData.drive_folder_id;
          if (driveData.drive_folder_url) updateData.drive_folder_url = driveData.drive_folder_url;
          const { error: updateErr } = await supabase
            .from('properties')
            .update(updateData)
            .eq('id', property.id);
          if (updateErr) {
            console.error('[Reno In Progress Photos API] ❌ Error updating property with drive folder:', updateErr);
          } else {
            console.log('[Reno In Progress Photos API] ✅ Property updated with drive_folder_id');
            property.drive_folder_id = driveData.drive_folder_id ?? property.drive_folder_id;
            property.drive_folder_url = driveData.drive_folder_url ?? property.drive_folder_url;
          }
        } else {
          console.warn('[Reno In Progress Photos API] ⚠️ Drive folder webhook did not return drive_folder_id');
          return NextResponse.json(
            { error: 'Drive folder creation did not return folder ID.' },
            { status: 502 }
          );
        }
      } catch (driveErr: any) {
        console.error('[Reno In Progress Photos API] ❌ Error creating Drive folder:', driveErr?.message || driveErr);
        return NextResponse.json(
          { error: 'Error creating Drive folder.', details: driveErr?.message },
          { status: 502 }
        );
      }
    }

    // Validar que tiene address
    if (!property.address) {
      console.warn('[Reno In Progress Photos API] ⚠️ Property does not have address');
      return NextResponse.json(
        { error: 'Property does not have an address' },
        { status: 400 }
      );
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
    
    // Preparar payload para n8n con todas las fotos (usar URLs de Storage si están disponibles, sino usar base64)
    const payload: PhotosWebhookPayload = {
      driveFolder_id: property.drive_folder_id,
      drive_folder_url: property.drive_folder_url || undefined,
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



