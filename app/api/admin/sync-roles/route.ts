import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuth0ManagementClient } from '@/lib/auth0/management-client';

/**
 * POST /api/admin/sync-roles
 * Sincronizar roles de Supabase a Auth0 (solo admin)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar que el usuario sea admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Sincronizar roles a Auth0
    const auth0Client = getAuth0ManagementClient();
    const roles = await auth0Client.syncRolesFromSupabase();

    return NextResponse.json({
      success: true,
      message: 'Roles synced successfully',
      roles: roles.map(r => ({ id: r.id, name: r.name, description: r.description })),
    });
  } catch (error: any) {
    console.error('[POST /api/admin/sync-roles] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

