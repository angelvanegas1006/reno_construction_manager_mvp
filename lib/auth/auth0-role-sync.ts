import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

/**
 * Sincroniza el rol de Auth0 a Supabase
 * 
 * Esta función se llama desde el callback de Auth0 después de que el usuario
 * se autentica exitosamente.
 */
export async function syncAuth0RoleToSupabase(
  supabaseUserId: string,
  auth0Roles: string[] | null,
  auth0Metadata?: { role?: string }
): Promise<AppRole> {
  const supabase = await createClient();
  
  // Mapear rol de Auth0 a rol de la app
  function mapAuth0RoleToAppRole(auth0Role: string): AppRole | null {
    const roleMap: Record<string, AppRole> = {
      'admin': 'admin',
      'foreman': 'foreman',
      'user': 'user',
      // Aliases comunes
      'jefe_de_obra': 'foreman',
      'administrator': 'admin',
      'usuario': 'user',
    };

    const normalizedRole = auth0Role.toLowerCase().trim();
    return roleMap[normalizedRole] || null;
  }

  // Determinar el rol desde Auth0
  let auth0Role: AppRole | null = null;

  // Prioridad 1: Roles del array
  if (auth0Roles && auth0Roles.length > 0) {
    for (const role of auth0Roles) {
      const mappedRole = mapAuth0RoleToAppRole(role);
      if (mappedRole) {
        auth0Role = mappedRole;
        break; // Tomar el primer rol válido
      }
    }
  }

  // Prioridad 2: Rol de metadata
  if (!auth0Role && auth0Metadata?.role) {
    auth0Role = mapAuth0RoleToAppRole(auth0Metadata.role);
  }

  // Si no hay rol de Auth0, usar default
  const finalRole: AppRole = auth0Role || 'user';

  // Sincronizar a Supabase
  try {
    const { error: upsertError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: supabaseUserId,
        role: finalRole,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('[syncAuth0RoleToSupabase] ❌ Error syncing role:', upsertError);
      // Continuar con el rol por defecto aunque falle la sincronización
    } else {
      console.log('[syncAuth0RoleToSupabase] ✅ Role synced:', finalRole);
    }
  } catch (err) {
    console.error('[syncAuth0RoleToSupabase] ❌ Unexpected error:', err);
  }

  return finalRole;
}

/**
 * Extrae roles del token de Auth0
 */
export function extractRolesFromAuth0Token(token: string): string[] | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const namespace = process.env.NEXT_PUBLIC_AUTH0_NAMESPACE || 'https://vistral.io';
    
    return (
      payload[`${namespace}/roles`] ||
      payload.roles ||
      payload['https://vistral.io/roles'] ||
      null
    );
  } catch (err) {
    console.error('[extractRolesFromAuth0Token] ❌ Error parsing token:', err);
    return null;
  }
}








