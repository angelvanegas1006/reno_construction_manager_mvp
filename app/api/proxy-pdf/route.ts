import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route para hacer proxy de PDFs desde AWS S3 con autenticación básica
 * Uso: /api/proxy-pdf?url=<encoded-pdf-url>
 * 
 * Requiere variables de entorno:
 * - AWS_S3_USERNAME: Usuario para autenticación básica en AWS S3
 * - AWS_S3_PASSWORD: Contraseña para autenticación básica en AWS S3
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener credenciales desde variables de entorno
    const awsUsername = process.env.AWS_S3_USERNAME;
    const awsPassword = process.env.AWS_S3_PASSWORD;

    // Log para debugging (sin mostrar la contraseña completa)
    console.log('[Proxy PDF] Checking AWS S3 credentials:', {
      hasUsername: !!awsUsername,
      username: awsUsername || 'NOT SET',
      hasPassword: !!awsPassword,
      passwordLength: awsPassword ? awsPassword.length : 0,
      passwordPreview: awsPassword ? `${awsPassword.substring(0, 3)}***` : 'NOT SET',
    });

    if (!awsUsername || !awsPassword) {
      console.error('[Proxy PDF] Missing AWS S3 credentials in environment variables');
      console.error('[Proxy PDF] Environment check:', {
        AWS_S3_USERNAME: process.env.AWS_S3_USERNAME ? 'SET' : 'NOT SET',
        AWS_S3_PASSWORD: process.env.AWS_S3_PASSWORD ? 'SET' : 'NOT SET',
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('AWS') || k.includes('S3')),
      });
      return NextResponse.json(
        { error: 'Server configuration error: AWS S3 credentials not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const pdfUrl = searchParams.get('url');

    if (!pdfUrl) {
      console.error('[Proxy PDF] Missing url parameter');
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // Decodificar la URL si está codificada
    const decodedUrl = decodeURIComponent(pdfUrl);
    console.log('[Proxy PDF] Attempting to fetch PDF from:', decodedUrl);

    // Crear credenciales para Basic Auth
    const credentials = Buffer.from(`${awsUsername}:${awsPassword}`).toString('base64');

    // Hacer fetch del PDF con autenticación básica
    const response = await fetch(decodedUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    console.log('[Proxy PDF] Response status:', response.status, response.statusText);
    console.log('[Proxy PDF] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error('[Proxy PDF] Error fetching PDF:', {
        status: response.status,
        statusText: response.statusText,
        url: decodedUrl,
        errorText: errorText.substring(0, 500), // Limitar a 500 caracteres
      });
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.status} ${response.statusText}`, url: decodedUrl },
        { status: response.status }
      );
    }

    // Obtener el contenido del PDF
    const pdfBuffer = await response.arrayBuffer();

    // Devolver el PDF con los headers correctos
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="budget.pdf"',
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
      },
    });
  } catch (error: any) {
    console.error('[Proxy PDF] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

