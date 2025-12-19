import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/admin/users/check-status?email=user@example.com
 * Verificar estado de un usuario específico
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar que el usuario sea admin o construction_manager
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin' && roleData?.role !== 'construction_manager') {
      return NextResponse.json({ error: 'Forbidden: Admin or Construction Manager access required' }, { status: 403 });
    }

    // Obtener email del query parameter
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    // Buscar usuario en Supabase
    const adminSupabase = createAdminClient();
    const { data: supabaseUsers } = await adminSupabase.auth.admin.listUsers();
    
    const foundUser = supabaseUsers?.users?.find(u => 
      u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!foundUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Obtener rol
    const { data: userRoleData } = await adminSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', foundUser.id)
      .single();

    // Verificar si el usuario está baneado
    let isBanned = false;
    if (foundUser.banned_until) {
      const bannedUntil = new Date(foundUser.banned_until);
      isBanned = bannedUntil > new Date();
    } else if ((foundUser as any).banned === true) {
      // Fallback: verificar campo banned booleano si existe
      isBanned = true;
    }

    return NextResponse.json({
      email: foundUser.email,
      name: foundUser.user_metadata?.name || foundUser.email,
      role: userRoleData?.role || 'user',
      banned: isBanned,
      banned_until: foundUser.banned_until || null,
      status: isBanned ? 'Desactivado' : 'Activo',
      email_confirmed: !!foundUser.email_confirmed_at,
      last_sign_in_at: foundUser.last_sign_in_at,
      created_at: foundUser.created_at,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/users/check-status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
