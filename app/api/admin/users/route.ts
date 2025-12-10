import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuth0ManagementClient } from '@/lib/auth0/management-client';
import { syncAuth0RoleToSupabase } from '@/lib/auth/auth0-role-sync';

/**
 * GET /api/admin/users
 * Listar usuarios (solo admin)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[GET /api/admin/users] Starting...');
    const supabase = await createClient();
    
    // Verificar que el usuario sea admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('[GET /api/admin/users] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized: ' + authError.message }, { status: 401 });
    }
    
    if (!user) {
      console.error('[GET /api/admin/users] No user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[GET /api/admin/users] User:', user.id, user.email);

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError) {
      console.error('[GET /api/admin/users] Role error:', roleError);
      return NextResponse.json({ error: 'Error fetching role: ' + roleError.message }, { status: 500 });
    }

    console.log('[GET /api/admin/users] User role:', roleData?.role);

    if (roleData?.role !== 'admin' && roleData?.role !== 'construction_manager') {
      return NextResponse.json({ error: 'Forbidden: Admin or Construction Manager access required' }, { status: 403 });
    }

    // Obtener usuarios de Supabase usando cliente admin
    console.log('[GET /api/admin/users] Creating admin client...');
    const adminSupabase = createAdminClient();
    
    console.log('[GET /api/admin/users] Listing users...');
    const { data: supabaseUsers, error: supabaseError } = await adminSupabase.auth.admin.listUsers();

    if (supabaseError) {
      console.error('[GET /api/admin/users] Supabase listUsers error:', supabaseError);
      throw supabaseError;
    }

    console.log('[GET /api/admin/users] Found', supabaseUsers?.users?.length || 0, 'users');

    // Obtener roles de Supabase
    const { data: userRoles } = await adminSupabase
      .from('user_roles')
      .select('user_id, role');

    const rolesMap = new Map(userRoles?.map(ur => [ur.user_id, ur.role]) || []);

    // Obtener estado de Google Calendar
    // google_calendar_tokens table not in types yet - using cast
    const { data: googleCalendarTokens } = await (adminSupabase as any)
      .from('google_calendar_tokens')
      .select('user_id');

    const googleCalendarUsers = new Set(googleCalendarTokens?.map((t: any) => t.user_id) || []);

    // Combinar usuarios con sus roles y estado de Google Calendar
    const users = supabaseUsers.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name || u.email,
      role: rolesMap.get(u.id) || 'user',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      app_metadata: u.app_metadata,
      google_calendar_connected: googleCalendarUsers.has(u.id),
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

    if (roleData?.role !== 'admin' && roleData?.role !== 'construction_manager') {
      return NextResponse.json({ error: 'Forbidden: Admin or Construction Manager access required' }, { status: 403 });
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
      // Primero verificar si el usuario ya existe en Auth0
      const existingAuth0User = await auth0Client.getUserByEmail(email);
      
      if (existingAuth0User) {
        // Usuario ya existe en Auth0, actualizar rol si es necesario
        console.log(`[POST /api/admin/users] User ${email} already exists in Auth0, updating role...`);
        if (role) {
          await auth0Client.assignRoleToUser(existingAuth0User.user_id, role);
        }
        auth0User = existingAuth0User;
      } else {
        // Crear nuevo usuario en Auth0
        auth0User = await auth0Client.createUser({
          email,
          password,
          name,
          role,
        });
        console.log(`[POST /api/admin/users] User ${email} created in Auth0`);
      }
    } catch (auth0Error: any) {
      // Si hay otro error, intentar obtener el usuario de todas formas
      if (auth0Error.message?.includes('already exists')) {
        auth0User = await auth0Client.getUserByEmail(email);
        if (auth0User && role) {
          await auth0Client.assignRoleToUser(auth0User.user_id, role);
        }
      } else {
        console.error('[POST /api/admin/users] Auth0 error:', auth0Error);
        throw auth0Error;
      }
    }

    // Crear usuario en Supabase (si no existe)
    let supabaseUserId: string;
    
    try {
      // Buscar usuario existente por email usando listUsers con cliente admin
      const adminSupabase = createAdminClient();
      const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);
      
      if (existingUser) {
        supabaseUserId = existingUser.id;
        // Si el usuario existe y se proporciona una contraseña, actualizarla
        // encrypted_password no está en los tipos de TypeScript, pero existe en runtime
        if (password) {
          const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
            existingUser.id,
            {
              password: password,
              email_confirm: true,
            }
          );
          if (updateError) {
            console.warn('[POST /api/admin/users] Warning: Could not update password for existing user:', updateError);
          }
        }
      } else {
        // Crear usuario en Supabase
        const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
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

