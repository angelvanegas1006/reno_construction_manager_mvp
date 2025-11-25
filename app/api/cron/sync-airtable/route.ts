/**
 * API Route para sincronizar propiedades desde Airtable
 * Se ejecuta como cron job en Vercel
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncPropertiesFromAirtable } from '@/lib/airtable/sync-from-airtable';

// Configuración de Airtable
const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const AIRTABLE_VIEW_ID = 'viwpYQ0hsSSdFrSD1';

/**
 * Verifica que la request viene de Vercel Cron
 */
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Si hay un secret configurado, verificarlo
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  // Si no hay secret, solo verificar que viene de Vercel
  // En producción, Vercel añade el header 'x-vercel-signature'
  const vercelSignature = request.headers.get('x-vercel-signature');
  return !!vercelSignature || process.env.NODE_ENV === 'development';
}

export async function GET(request: NextRequest) {
  try {
    // Verificar que viene de un cron job válido
    if (!verifyCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Airtable Sync Cron] Starting sync...');

    const result = await syncPropertiesFromAirtable(
      AIRTABLE_TABLE_ID,
      AIRTABLE_VIEW_ID
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error('[Airtable Sync Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// También permitir POST para testing manual
export async function POST(request: NextRequest) {
  return GET(request);
}


