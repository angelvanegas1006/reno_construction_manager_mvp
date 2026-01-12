import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy route para servir HTML desde Supabase Storage con Content-Type correcto
 * Esto asegura que el navegador renderice el HTML en lugar de mostrarlo como texto plano
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Decodificar la URL si está codificada
    const decodedUrl = decodeURIComponent(url);

    console.log('[Proxy HTML] Fetching HTML from:', decodedUrl);

    // Intentar obtener el archivo directamente desde Supabase Storage usando el cliente autenticado
    // Esto funciona incluso si el bucket no es público, siempre que las políticas RLS lo permitan
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = createClient();
      
      // Extraer el path del archivo desde la URL
      // URL formato: https://xxx.supabase.co/storage/v1/object/public/checklists/{path}
      const urlMatch = decodedUrl.match(/\/storage\/v1\/object\/public\/checklists\/(.+)$/);
      if (urlMatch && urlMatch[1]) {
        const filePath = decodeURIComponent(urlMatch[1]);
        console.log('[Proxy HTML] Attempting to download file directly from Supabase Storage:', filePath);
        
        // Primero verificar si el archivo existe listando el directorio
        const pathParts = filePath.split('/');
        const directory = pathParts.slice(0, -1).join('/');
        const fileName = pathParts[pathParts.length - 1];
        
        console.log('[Proxy HTML] Verificando existencia del archivo:', { directory, fileName });
        
        const { data: files, error: listError } = await supabase.storage
          .from('checklists')
          .list(directory);
        
        if (listError) {
          console.error('[Proxy HTML] Error listing directory:', {
            error: listError.message,
            directory,
            code: listError.statusCode,
          });
        } else {
          const fileExists = files && files.some(f => f.name === fileName);
          console.log('[Proxy HTML] Archivo existe:', fileExists, 'Archivos en directorio:', files?.map(f => f.name));
          
          if (!fileExists) {
            return NextResponse.json(
              { 
                error: `El archivo checklist.html no existe en Storage. Path: ${filePath}. El checklist puede no haber sido finalizado correctamente o el archivo no se subió.`,
                url: decodedUrl,
                path: filePath,
                directory,
                filesInDirectory: files?.map(f => f.name) || [],
              },
              { status: 404 }
            );
          }
        }
        
        // Si el archivo existe, intentar descargarlo
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('checklists')
          .download(filePath);
        
        if (downloadError) {
          console.error('[Proxy HTML] Error downloading from Supabase Storage:', {
            error: downloadError.message,
            path: filePath,
            code: downloadError.statusCode,
          });
          
          // Si es un error de permisos, dar instrucciones
          if (downloadError.message?.includes('row-level security') || downloadError.message?.includes('RLS') || downloadError.message?.includes('policy')) {
            return NextResponse.json(
              { 
                error: 'Error de permisos. El bucket puede no ser público o faltan políticas RLS. Verifica que el bucket "checklists" esté configurado como público y que las políticas RLS permitan acceso de lectura.',
                url: decodedUrl,
                path: filePath,
              },
              { status: 403 }
            );
          }
          
          // Para otros errores, intentar fetch público como fallback
          console.warn('[Proxy HTML] Download failed, trying public fetch as fallback...');
        } else if (fileData) {
          // Convertir Blob a texto
          const htmlContent = await fileData.text();
          console.log('[Proxy HTML] ✅ Successfully downloaded from Supabase Storage');
          return new NextResponse(htmlContent, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=3600',
              'X-Content-Type-Options': 'nosniff',
            },
          });
        }
      }
    } catch (supabaseError: any) {
      console.error('[Proxy HTML] Error using Supabase client:', supabaseError);
      // Continuar con fetch público como fallback
    }

    // Fallback: Intentar fetch público (para buckets públicos)
    console.log('[Proxy HTML] Attempting public fetch as fallback...');
    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error('[Proxy HTML] Error fetching HTML (public fetch also failed):', {
        status: response.status,
        statusText: response.statusText,
        url: decodedUrl,
        errorText: errorText.substring(0, 500),
        headers: Object.fromEntries(response.headers.entries()),
      });
      
      // Mensaje más descriptivo según el error
      let errorMessage = `Failed to fetch HTML: ${response.status} ${response.statusText}`;
      if (response.status === 400) {
        errorMessage += '. El archivo puede no existir o el bucket no está configurado correctamente. Verifica que el bucket "checklists" exista y esté configurado como público.';
      } else if (response.status === 403) {
        errorMessage += '. El bucket puede no ser público o faltan políticas RLS. Ve a Supabase Dashboard → Storage → checklists y verifica que esté marcado como "Public bucket".';
      } else if (response.status === 404) {
        errorMessage += '. El archivo no existe en Storage. El checklist puede no haber sido finalizado correctamente.';
      }
      
      return NextResponse.json(
        { error: errorMessage, url: decodedUrl },
        { status: response.status }
      );
    }

    // Obtener el contenido del HTML
    const htmlContent = await response.text();

    // Devolver el HTML con los headers correctos
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('[Proxy HTML] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

