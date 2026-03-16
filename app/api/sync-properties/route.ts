import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncAllPhasesUnified } from '@/lib/airtable/sync-unified';

const ALLOWED_ROLES = ['admin', 'construction_manager', 'maturation_analyst', 'foreman'];

async function verifyUserCanSync(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return roleData?.role != null && ALLOWED_ROLES.includes(roleData.role);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await verifyUserCanSync())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Sync Properties] Starting properties-only sync...');
    const result = await syncAllPhasesUnified();

    const summary = [
      `${result.totalCreated} creadas, ${result.totalUpdated} actualizadas`,
      result.totalMovedToOrphaned > 0 ? `${result.totalMovedToOrphaned} orphaned` : null,
      result.totalErrors > 0 ? `${result.totalErrors} errores` : null,
    ].filter(Boolean).join('. ');

    return NextResponse.json({
      success: result.success,
      timestamp: result.timestamp,
      summary,
      totalCreated: result.totalCreated,
      totalUpdated: result.totalUpdated,
      totalErrors: result.totalErrors,
      totalMovedToOrphaned: result.totalMovedToOrphaned,
    });
  } catch (error: any) {
    console.error('[Sync Properties] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
