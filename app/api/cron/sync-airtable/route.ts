/**
 * API Route para sincronizar propiedades desde Airtable
 * Se ejecuta como cron job en Vercel
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllPhasesFromAirtable } from '@/lib/airtable/sync-all-phases';

/**
 * Verifica que la request viene de Vercel Cron.
 * Vercel envía: Authorization: Bearer CRON_SECRET (si CRON_SECRET está configurado)
 * y User-Agent: vercel-cron/1.0 en todas las invocaciones de cron.
 */
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const userAgent = request.headers.get('user-agent') ?? '';

  // Si hay CRON_SECRET configurado, Vercel lo envía como Bearer token
  if (cronSecret) {
    if (authHeader === `Bearer ${cronSecret}`) return true;
    // Fallback: aceptar también si viene el User-Agent de Vercel Cron (por si el secret no se inyecta en algún entorno)
    if (userAgent.startsWith('vercel-cron/')) return true;
    return false;
  }

  // Sin CRON_SECRET: aceptar si viene de Vercel (User-Agent) o en desarrollo
  if (userAgent.startsWith('vercel-cron/')) return true;
  const vercelSignature = request.headers.get('x-vercel-signature');
  if (vercelSignature) return true;
  return process.env.NODE_ENV === 'development';
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




