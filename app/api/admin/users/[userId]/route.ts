import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuth0ManagementClient } from '@/lib/auth0/management-client';
import { syncAuth0RoleToSupabase } from '@/lib/auth/auth0-role-sync';

/**
 * PATCH /api/admin/users/[userId]
 * Actualizar usuario (solo admin)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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
    const { email, name, role } = body;
    const { userId } = await params;

    // Actualizar en Supabase usando cliente admin
    const adminSupabase = createAdminClient();
    const updates: any = {};
    if (email) updates.email = email;
    if (name) updates.user_metadata = { name };

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, updates);
      if (updateError) throw updateError;
    }

    // Actualizar rol si se especificó
    if (role) {
      console.log('[PATCH /api/admin/users] Updating role:', { userId, role });
      
      // Actualizar en Supabase usando cliente admin
      try {
        const { error: upsertError } = await adminSupabase
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: role,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (upsertError) {
          console.error('[PATCH /api/admin/users] ❌ Error updating role in Supabase:', upsertError);
          throw new Error(`Failed to update role in Supabase: ${upsertError.message}`);
        } else {
          console.log('[PATCH /api/admin/users] ✅ Role updated in Supabase:', role);
        }
      } catch (supabaseError: any) {
        console.error('[PATCH /api/admin/users] ❌ Error updating role:', supabaseError);
        throw supabaseError;
      }

      // Actualizar en Auth0 (si el usuario tiene auth0_user_id)
      try {
        const { data: supabaseUser } = await adminSupabase.auth.admin.getUserById(userId);
        const auth0UserId = supabaseUser?.user?.app_metadata?.auth0_user_id;
        
        if (auth0UserId) {
          console.log('[PATCH /api/admin/users] Updating Auth0 role:', { auth0UserId, role });
          const auth0Client = getAuth0ManagementClient();
          
          // Obtener roles actuales
          const currentRoles = await auth0Client.getUserRoles(auth0UserId);
          console.log('[PATCH /api/admin/users] Current Auth0 roles:', currentRoles.map(r => r.name));
          
          // Remover todos los roles actuales
          for (const currentRole of currentRoles) {
            await auth0Client.removeRoleFromUser(auth0UserId, currentRole.name);
          }
          
          // Asignar nuevo rol
          await auth0Client.assignRoleToUser(auth0UserId, role);
          console.log('[PATCH /api/admin/users] ✅ Auth0 role updated:', role);
        } else {
          console.log('[PATCH /api/admin/users] No Auth0 user ID found, skipping Auth0 update');
        }
      } catch (auth0Error) {
        console.warn('[PATCH /api/admin/users] Auth0 update failed:', auth0Error);
        // Continuar aunque falle Auth0, el rol ya está en Supabase
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PATCH /api/admin/users] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[userId]
 * Eliminar usuario (solo admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await params;

    // No permitir auto-eliminación
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Eliminar de Supabase usando cliente admin (esto también elimina el rol por CASCADE)
    const adminSupabase = createAdminClient();
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    // Intentar eliminar de Auth0 (si existe)
    try {
      const { data: supabaseUser } = await adminSupabase.auth.admin.getUserById(userId);
      const auth0UserId = supabaseUser?.user?.app_metadata?.auth0_user_id;
      
      if (auth0UserId) {
        const auth0Client = getAuth0ManagementClient();
        await auth0Client.deleteUser(auth0UserId);
      }
    } catch (auth0Error) {
      console.warn('[DELETE /api/admin/users] Auth0 delete failed:', auth0Error);
      // Continuar aunque falle Auth0
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/admin/users] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

