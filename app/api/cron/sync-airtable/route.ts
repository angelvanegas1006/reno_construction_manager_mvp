/**
 * API Route para sincronizar propiedades desde Airtable
 * Se ejecuta como cron job en Vercel o manualmente por usuarios con rol admin/construction_manager
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncAllPhasesFromAirtable } from '@/lib/airtable/sync-all-phases';

/**
 * Verifica que la request viene de Vercel Cron.
 */
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const userAgent = request.headers.get('user-agent') ?? '';

  if (cronSecret) {
    if (authHeader === `Bearer ${cronSecret}`) return true;
    if (userAgent.startsWith('vercel-cron/')) return true;
    return false;
  }

  if (userAgent.startsWith('vercel-cron/')) return true;
  const vercelSignature = request.headers.get('x-vercel-signature');
  if (vercelSignature) return true;
  return process.env.NODE_ENV === 'development';
}

const ALLOWED_MANUAL_SYNC_ROLES = ['admin', 'construction_manager'];

/**
 * Verifica que el usuario tiene permiso para ejecutar el sync manualmente (admin o construction_manager).
 */
async function verifyUserCanSync(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return roleData?.role != null && ALLOWED_MANUAL_SYNC_ROLES.includes(roleData.role);
}

async function isAuthorized(request: NextRequest): Promise<boolean> {
  if (verifyCronRequest(request)) return true;
  return verifyUserCanSync();
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
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
      budgetSync: result.budgetSync,
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

// POST para ejecución manual desde el botón "Sync con Airtable" (usuarios admin/construction_manager)
export async function POST(request: NextRequest) {
  return GET(request);
}




