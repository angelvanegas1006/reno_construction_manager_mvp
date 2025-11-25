import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuth0ManagementClient } from '@/lib/auth0/management-client';
import { syncAuth0RoleToSupabase } from '@/lib/auth/auth0-role-sync';

/**
 * GET /api/admin/users
 * Listar usuarios (solo admin)
 */
export async function GET(request: NextRequest) {
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

    // Obtener usuarios de Supabase
    const { data: supabaseUsers, error: supabaseError } = await supabase.auth.admin.listUsers();

    if (supabaseError) {
      throw supabaseError;
    }

    // Obtener roles de Supabase
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const rolesMap = new Map(userRoles?.map(ur => [ur.user_id, ur.role]) || []);

    // Combinar usuarios con sus roles
    const users = supabaseUsers.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name || u.email,
      role: rolesMap.get(u.id) || 'user',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      app_metadata: u.app_metadata,
    }));

    return NextResponse.json({ users, total: users.length });
  } catch (error: any) {
    console.error('[GET /api/admin/users] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Crear nuevo usuario (solo admin)
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

    const body = await request.json();
    const { email, password, name, role = 'user' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Crear usuario en Auth0
    const auth0Client = getAuth0ManagementClient();
    let auth0User;
    
    try {
      auth0User = await auth0Client.createUser({
        email,
        password,
        name,
        role,
      });
    } catch (auth0Error: any) {
      // Si el usuario ya existe en Auth0, obtenerlo
      if (auth0Error.message?.includes('already exists')) {
        auth0User = await auth0Client.getUserByEmail(email);
        if (auth0User && role) {
          await auth0Client.assignRoleToUser(auth0User.user_id, role);
        }
      } else {
        throw auth0Error;
      }
    }

    // Crear usuario en Supabase (si no existe)
    let supabaseUserId: string;
    
    try {
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);
      
      if (existingUser?.user) {
        supabaseUserId = existingUser.user.id;
      } else {
        // Crear usuario en Supabase
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: password || undefined,
          email_confirm: true,
          user_metadata: { name },
        });

        if (createError) throw createError;
        if (!newUser.user) throw new Error('Failed to create user');
        
        supabaseUserId = newUser.user.id;
      }
    } catch (supabaseError: any) {
      console.error('[POST /api/admin/users] Supabase error:', supabaseError);
      // Continuar aunque falle Supabase, el usuario ya está en Auth0
      return NextResponse.json({
        error: 'User created in Auth0 but failed to sync to Supabase',
        auth0_user_id: auth0User?.user_id,
      }, { status: 500 });
    }

    // Asignar rol en Supabase
    await syncAuth0RoleToSupabase(supabaseUserId, [role], { role });

    return NextResponse.json({
      success: true,
      user: {
        id: supabaseUserId,
        email,
        name,
        role,
        auth0_user_id: auth0User?.user_id,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/admin/users] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

