/**
 * API Route para sincronizar propiedades desde Airtable
 * Se ejecuta como cron job en Vercel
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllPhasesFromAirtable } from '@/lib/airtable/sync-all-phases';

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

    console.log('[Airtable Sync Cron] Starting complete sync for all phases...');

    const result = await syncAllPhasesFromAirtable();

    return NextResponse.json({
      success: result.success,
      timestamp: result.timestamp,
      totalCreated: result.totalCreated,
      totalUpdated: result.totalUpdated,
      totalErrors: result.totalErrors,
      phases: result.phases,
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




