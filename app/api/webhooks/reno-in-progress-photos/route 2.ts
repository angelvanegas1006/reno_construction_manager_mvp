import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
 * API route para subir fotos de avance de obra al webhook de n8n
 * Se llama desde el cliente para evitar problemas de CORS
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    // Preparar payload
    const payload: PhotosWebhookPayload = {
      driveFolder_id: property.drive_folder_id,
      drive_folder_url: property.drive_folder_url || undefined,
      propertyAddress: property.address,
      images: photoUrls.map((photo: PhotoImage) => ({
        url: photo.url,
        filename: photo.filename,
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
        console.error('[Reno In Progress Photos API] Error response:', response.status, errorText);
        return NextResponse.json(
          { error: `Webhook call failed: ${response.status}`, details: errorText },
          { status: response.status }
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



