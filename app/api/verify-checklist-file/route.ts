import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * API route para verificar si un archivo HTML de checklist existe en Storage
 * GET /api/verify-checklist-file?propertyId=SP-TJP-JXR-005643&type=initial
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('propertyId');
    const type = searchParams.get('type') || 'initial';

    if (!propertyId) {
      return NextResponse.json(
        { error: 'propertyId es requerido' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const results: any = {
      propertyId,
      type,
      bucket: null,
      file: null,
      download: null,
      publicUrl: null,
    };

    // 1. Verificar bucket
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      return NextResponse.json(
        { 
          error: 'Error listando buckets',
          details: bucketsError.message,
          results,
        },
        { status: 500 }
      );
    }

    const checklistsBucket = buckets?.find(b => b.name === 'checklists');
    if (!checklistsBucket) {
      return NextResponse.json(
        { 
          error: 'Bucket "checklists" no encontrado',
          solution: 'Ve a Supabase Dashboard → Storage → Buckets y crea un bucket llamado "checklists"',
          results,
        },
        { status: 404 }
      );
    }

    results.bucket = {
      name: checklistsBucket.name,
      public: checklistsBucket.public,
      id: checklistsBucket.id,
    };

    // 2. Verificar archivo
    const filePath = `${propertyId}/${type}/checklist.html`;
    const { data: files, error: listError } = await supabase.storage
      .from('checklists')
      .list(`${propertyId}/${type}`);

    if (listError) {
      return NextResponse.json(
        { 
          error: 'Error listando directorio',
          details: listError.message,
          path: `${propertyId}/${type}/`,
          results,
        },
        { status: 500 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { 
          error: 'No se encontraron archivos en el directorio',
          path: `${propertyId}/${type}/`,
          results,
        },
        { status: 404 }
      );
    }

    results.file = {
      directory: `${propertyId}/${type}/`,
      files: files.map(f => ({
        name: f.name,
        size: f.metadata?.size || 0,
        created_at: f.created_at,
        updated_at: f.updated_at,
      })),
    };

    const htmlFile = files.find(f => f.name === 'checklist.html');
    if (!htmlFile) {
      return NextResponse.json(
        { 
          error: 'El archivo checklist.html NO existe',
          expectedPath: filePath,
          filesFound: files.map(f => f.name),
          results,
        },
        { status: 404 }
      );
    }

    // 3. Intentar descargar el archivo
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('checklists')
      .download(filePath);

    if (downloadError) {
      results.download = {
        success: false,
        error: downloadError.message,
        statusCode: downloadError.statusCode,
      };

      return NextResponse.json(
        { 
          error: 'Error descargando archivo',
          details: downloadError.message,
          statusCode: downloadError.statusCode,
          results,
        },
        { status: 500 }
      );
    }

    if (fileData) {
      const htmlContent = await fileData.text();
      results.download = {
        success: true,
        contentLength: htmlContent.length,
        preview: htmlContent.substring(0, 200),
      };
    }

    // 4. Generar URL pública
    const { data: publicUrlData } = supabase.storage
      .from('checklists')
      .getPublicUrl(filePath);

    results.publicUrl = publicUrlData.publicUrl;

    return NextResponse.json({
      success: true,
      message: 'Archivo verificado exitosamente',
      results,
    });
  } catch (error: any) {
    console.error('[verify-checklist-file] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
