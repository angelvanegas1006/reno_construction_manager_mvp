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

    // Fetch el HTML desde Supabase Storage
    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error('[Proxy HTML] Error fetching HTML:', {
        status: response.status,
        statusText: response.statusText,
        url: decodedUrl,
        errorText: errorText.substring(0, 500),
      });
      return NextResponse.json(
        { error: `Failed to fetch HTML: ${response.status} ${response.statusText}`, url: decodedUrl },
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

