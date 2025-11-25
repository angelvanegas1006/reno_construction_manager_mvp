"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

interface Auth0RoleData {
  role: AppRole | null;
  isLoading: boolean;
  error: Error | null;
  isFromAuth0: boolean; // Indica si el rol viene de Auth0 o Supabase
}

/**
 * Hook para obtener el rol del usuario desde Auth0 o Supabase
 * 
 * Prioridad:
 * 1. Rol de Auth0 (si está disponible)
 * 2. Rol de Supabase (fallback)
 * 
 * También sincroniza el rol de Auth0 a Supabase automáticamente
 */
export function useAuth0Role(): Auth0RoleData {
  const { user: auth0User, isAuthenticated, isLoading: auth0Loading, getAccessTokenSilently } = useAuth0();
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromAuth0, setIsFromAuth0] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchRole() {
      setIsLoading(true);
      setError(null);

      try {
        // Si no está autenticado con Auth0, obtener rol solo de Supabase
        if (!isAuthenticated || !auth0User) {
          console.log('[useAuth0Role] ⚠️ Not authenticated with Auth0, fetching from Supabase only');
          await fetchRoleFromSupabase();
          return;
        }

        // Intentar obtener rol de Auth0 primero
        try {
          const accessToken = await getAccessTokenSilently({
            authorizationParams: {
              audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || undefined,
            },
          });

          // Decodificar el token para obtener roles
          const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
          
          // Buscar roles en diferentes lugares del token
          const namespace = process.env.NEXT_PUBLIC_AUTH0_NAMESPACE || 'https://vistral.io';
          const rolesFromToken = 
            tokenPayload[`${namespace}/roles`] || 
            tokenPayload.roles || 
            tokenPayload['https://vistral.io/roles'] ||
            auth0User[`${namespace}/roles`] ||
            auth0User.roles;

          if (rolesFromToken && Array.isArray(rolesFromToken) && rolesFromToken.length > 0) {
            // Auth0 puede tener múltiples roles, tomamos el primero
            const auth0Role = rolesFromToken[0] as string;
            const mappedRole = mapAuth0RoleToAppRole(auth0Role);
            
            if (mappedRole) {
              console.log('[useAuth0Role] ✅ Role from Auth0:', mappedRole);
              setRole(mappedRole);
              setIsFromAuth0(true);
              
              // Sincronizar rol a Supabase
              await syncRoleToSupabase(mappedRole);
              setIsLoading(false);
              return;
            }
          }

          // Si no hay rol en el token, buscar en app_metadata
          const appMetadata = auth0User.app_metadata || {};
          const roleFromMetadata = appMetadata.role;
          
          if (roleFromMetadata) {
            const mappedRole = mapAuth0RoleToAppRole(roleFromMetadata);
            if (mappedRole) {
              console.log('[useAuth0Role] ✅ Role from Auth0 metadata:', mappedRole);
              setRole(mappedRole);
              setIsFromAuth0(true);
              await syncRoleToSupabase(mappedRole);
              setIsLoading(false);
              return;
            }
          }

          console.log('[useAuth0Role] ⚠️ No role found in Auth0 token or metadata, falling back to Supabase');
        } catch (auth0Error) {
          console.warn('[useAuth0Role] ⚠️ Error getting Auth0 token:', auth0Error);
        }

        // Fallback: obtener rol de Supabase
        await fetchRoleFromSupabase();
      } catch (err) {
        console.error('[useAuth0Role] ❌ Error fetching role:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setRole('user'); // Default role
        setIsFromAuth0(false);
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchRoleFromSupabase() {
      try {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        
        if (!supabaseUser) {
          console.log('[useAuth0Role] ⚠️ No Supabase user found');
          setRole('user');
          setIsFromAuth0(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', supabaseUser.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No role assigned, use default
            console.log('[useAuth0Role] ⚠️ No role in Supabase, using default: user');
            setRole('user');
          } else {
            console.warn('[useAuth0Role] ⚠️ Error fetching role from Supabase:', error);
            setRole('user');
          }
        } else {
          const supabaseRole = (data?.role as AppRole) || 'user';
          console.log('[useAuth0Role] ✅ Role from Supabase:', supabaseRole);
          setRole(supabaseRole);
        }
        
        setIsFromAuth0(false);
      } catch (err) {
        console.error('[useAuth0Role] ❌ Error fetching role from Supabase:', err);
        setRole('user');
        setIsFromAuth0(false);
      }
    }

    async function syncRoleToSupabase(auth0Role: AppRole) {
      try {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        
        if (!supabaseUser) {
          console.warn('[useAuth0Role] ⚠️ Cannot sync role: No Supabase user');
          return;
        }

        // Verificar si el rol ya existe y es el mismo
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', supabaseUser.id)
          .single();

        if (existingRole?.role === auth0Role) {
          console.log('[useAuth0Role] ✅ Role already synced:', auth0Role);
          return;
        }

        // Insertar o actualizar rol
        const { error: upsertError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: supabaseUser.id,
            role: auth0Role,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (upsertError) {
          console.warn('[useAuth0Role] ⚠️ Error syncing role to Supabase:', upsertError);
        } else {
          console.log('[useAuth0Role] ✅ Role synced to Supabase:', auth0Role);
        }
      } catch (err) {
        console.error('[useAuth0Role] ❌ Error syncing role:', err);
      }
    }

    function mapAuth0RoleToAppRole(auth0Role: string): AppRole | null {
      // Mapear roles de Auth0 a roles de la app
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

    if (!auth0Loading) {
      fetchRole();
    }
  }, [isAuthenticated, auth0User, auth0Loading, getAccessTokenSilently, supabase]);

  return {
    role,
    isLoading: isLoading || auth0Loading,
    error,
    isFromAuth0,
  };
}

