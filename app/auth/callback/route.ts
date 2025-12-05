import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncAuth0RoleToSupabase } from '@/lib/auth/auth0-role-sync';

/**
 * Auth0 Callback Handler
 * 
 * Este endpoint maneja el redirect de Auth0 después de la autenticación.
 * Supabase intercambia el código de Auth0 por una sesión.
 * 
 * También sincroniza roles de Auth0 a Supabase automáticamente.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Si hay un error de Auth0, redirigir al login con mensaje
  if (error) {
    console.error('[Auth0 Callback] Error:', error, errorDescription);
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', error || 'auth_error');
    loginUrl.searchParams.set('message', errorDescription || 'Error al autenticar con Auth0');
    return NextResponse.redirect(loginUrl);
  }

  // Si no hay código, algo salió mal
  if (!code) {
    console.error('[Auth0 Callback] No code parameter found');
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', 'no_code');
    loginUrl.searchParams.set('message', 'No se recibió código de autenticación');
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Crear cliente de Supabase
    const supabase = await createClient();

    // Intercambiar código por sesión
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[Auth0 Callback] Error exchanging code:', exchangeError);
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('error', 'exchange_error');
      loginUrl.searchParams.set('message', exchangeError.message || 'Error al intercambiar código por sesión');
      return NextResponse.redirect(loginUrl);
    }

    if (!data.user) {
      console.error('[Auth0 Callback] No user data after exchange');
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('error', 'no_user');
      loginUrl.searchParams.set('message', 'No se pudo obtener información del usuario');
      return NextResponse.redirect(loginUrl);
    }

    // Extraer información de Auth0 del usuario de Supabase
    // Supabase almacena los metadatos de Auth0 en app_metadata y user_metadata
    const appMetadata = data.user.app_metadata || {};
    const userMetadata = data.user.user_metadata || {};
    
    // Intentar obtener roles de Auth0 desde los metadatos
    const auth0Roles = appMetadata.roles || userMetadata.roles || null;
    const auth0RoleFromMetadata = appMetadata.role || userMetadata.role || null;
    
    console.log('[Auth0 Callback] Auth0 metadata:', {
      appMetadata,
      userMetadata,
      auth0Roles,
      auth0RoleFromMetadata,
    });

    // Sincronizar rol de Auth0 a Supabase
    let role: string;
    try {
      role = await syncAuth0RoleToSupabase(
        data.user.id,
        auth0Roles,
        { role: auth0RoleFromMetadata }
      );
      console.log('[Auth0 Callback] ✅ Role synced:', role);
    } catch (syncError) {
      console.error('[Auth0 Callback] ⚠️ Error syncing role, using Supabase role:', syncError);
      // Si falla la sincronización, obtener rol de Supabase
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();
      role = roleData?.role || 'user';
    }

    // Redirigir según el rol
    let redirectUrl = '/login';
    if (role === 'foreman') {
      redirectUrl = '/reno/construction-manager';
    } else if (role === 'admin') {
      redirectUrl = '/reno/construction-manager/kanban';
    } else {
      // Usuario sin permisos
      await supabase.auth.signOut();
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('error', 'no_permission');
      loginUrl.searchParams.set('message', 'No tienes permisos para acceder a esta aplicación');
      return NextResponse.redirect(loginUrl);
    }

    // Redirigir al dashboard correspondiente
    return NextResponse.redirect(new URL(redirectUrl, requestUrl.origin));
  } catch (err: any) {
    console.error('[Auth0 Callback] Unexpected error:', err);
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', 'unexpected_error');
    loginUrl.searchParams.set('message', err.message || 'Error inesperado durante la autenticación');
    return NextResponse.redirect(loginUrl);
  }
}

