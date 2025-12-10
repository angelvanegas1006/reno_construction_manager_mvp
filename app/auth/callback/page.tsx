"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth0 } from "@auth0/auth0-react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

type AppRole = "admin" | "foreman" | "construction_manager" | "user";

/**
 * Mapea rol de Auth0 a rol de la app
 */
function mapAuth0RoleToAppRole(auth0Role: string): AppRole | null {
  const roleMap: Record<string, AppRole> = {
    "admin": "admin",
    "construction_manager": "construction_manager",
    "foreman": "foreman",
    "user": "user",
    // Aliases comunes
    "jefe_de_obra": "foreman",
    "administrator": "admin",
    "usuario": "user",
  };

  const normalizedRole = auth0Role.toLowerCase().trim();
  return roleMap[normalizedRole] || null;
}

/**
 * Sincroniza el rol de Auth0 a Supabase (versión cliente)
 */
async function syncAuth0RoleToSupabaseClient(
  supabaseUserId: string,
  auth0Roles: string[] | null,
  auth0Metadata?: { role?: string }
): Promise<AppRole> {
  const supabase = createClient();

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
  const finalRole: AppRole = auth0Role || "user";

  // Sincronizar a Supabase
  try {
    const { error: upsertError } = await supabase
      .from("user_roles")
      .upsert(
        {
          user_id: supabaseUserId,
          role: finalRole,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (upsertError) {
      console.error("[syncAuth0RoleToSupabaseClient] ❌ Error syncing role:", upsertError);
    } else {
      console.log("[syncAuth0RoleToSupabaseClient] ✅ Role synced:", finalRole);
    }
  } catch (err) {
    console.error("[syncAuth0RoleToSupabaseClient] ❌ Unexpected error:", err);
  }

  return finalRole;
}

export default function Auth0CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user, getAccessTokenSilently, error: auth0Error } = useAuth0();
  const supabase = createClient();

  useEffect(() => {
    const handleCallback = async () => {
      // Marcar que estamos procesando el callback
      if (typeof window !== "undefined") {
        sessionStorage.setItem("auth0_callback_processing", "true");
      }

      // Si hay un error de Auth0 en la URL
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        console.error("[Auth0 Callback] Error from Auth0:", error, errorDescription);
        // Limpiar flag antes de redirigir
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("auth0_callback_processing");
        }
        router.push(`/login?error=${error}&message=${encodeURIComponent(errorDescription || "Error al autenticar con Auth0")}`);
        return;
      }

      // Si Auth0 está cargando, esperar
      if (isLoading) {
        return;
      }

      // Si hay un error del SDK de Auth0
      if (auth0Error) {
        console.error("[Auth0 Callback] Auth0 SDK error:", auth0Error);
        // Limpiar flag antes de redirigir
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("auth0_callback_processing");
        }
        router.push(`/login?error=auth0_error&message=${encodeURIComponent(auth0Error.message || "Error al autenticar con Auth0")}`);
        return;
      }

      // Si no está autenticado después de cargar, algo salió mal
      if (!isAuthenticated || !user) {
        console.error("[Auth0 Callback] Not authenticated after callback");
        // Limpiar flag antes de redirigir
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("auth0_callback_processing");
        }
        router.push("/login?error=not_authenticated&message=" + encodeURIComponent("No se pudo autenticar con Auth0"));
        return;
      }

      try {
        console.log("[Auth0 Callback] User authenticated:", user.email);

        // Obtener el token de Auth0 para extraer roles
        let auth0Roles: string[] | null = null;
        let auth0Role: string | null = null;

        try {
          const token = await getAccessTokenSilently();
          // Decodificar el token JWT para obtener los roles
          const tokenParts = token.split(".");
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const namespace = process.env.NEXT_PUBLIC_AUTH0_NAMESPACE || "https://vistral.io";
            auth0Roles = payload[`${namespace}/roles`] || payload.roles || null;
            auth0Role = payload[`${namespace}/role`] || payload.role || null;
            
            console.log("[Auth0 Callback] 🔍 Token payload:", {
              namespace,
              rolesFromNamespace: payload[`${namespace}/roles`],
              rolesFromPayload: payload.roles,
              roleFromNamespace: payload[`${namespace}/role`],
              roleFromPayload: payload.role,
              allKeys: Object.keys(payload),
            });
            console.log("[Auth0 Callback] 📋 Extracted roles:", { auth0Roles, auth0Role });
          }
        } catch (tokenError) {
          console.warn("[Auth0 Callback] Could not get Auth0 token:", tokenError);
        }

        // Obtener usuario de Supabase
        // Primero intentar obtener la sesión (más seguro que getUser cuando no hay sesión)
        let supabaseUser = null;
        let supabaseUserId: string | null = null;
        
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (session?.user && !sessionError) {
            supabaseUser = session.user;
            supabaseUserId = session.user.id;
            console.log("[Auth0 Callback] Supabase session exists:", supabaseUserId);
          } else {
            // Intentar getUser como fallback (puede fallar si no hay sesión, pero lo manejamos)
            try {
              const { data: { user }, error: userError } = await supabase.auth.getUser();
              if (user && !userError) {
                supabaseUser = user;
                supabaseUserId = user.id;
                console.log("[Auth0 Callback] Supabase user found via getUser:", supabaseUserId);
              }
            } catch (getUserError: any) {
              // Es normal que falle si no hay sesión, especialmente cuando el usuario viene de Auth0
              console.log("[Auth0 Callback] No Supabase session found (this is normal for Auth0 users):", getUserError?.message || "No session");
            }
          }
        } catch (sessionError: any) {
          // Es normal que no haya sesión cuando el usuario viene de Auth0
          console.log("[Auth0 Callback] No Supabase session found (this is normal for Auth0 users):", sessionError?.message || "No session");
        }

        let role: AppRole = "user";

        if (supabaseUser && supabaseUserId) {
          // Usuario existe en Supabase, sincronizar rol
          console.log("[Auth0 Callback] Supabase user exists:", supabaseUserId);
          role = await syncAuth0RoleToSupabaseClient(
            supabaseUserId,
            auth0Roles,
            { role: auth0Role || undefined }
          );
          console.log("[Auth0 Callback] ✅ Role synced:", role);
        } else {
          // No hay usuario en Supabase, crear uno usando la API
          console.log("[Auth0 Callback] ⚠️ No Supabase user found, creating...");
          
          try {
            const createUserResponse = await fetch("/api/auth/create-supabase-user", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: user.email,
                name: user.name || user.email,
                auth0Roles,
                auth0Role,
              }),
            });

            if (!createUserResponse.ok) {
              const errorData = await createUserResponse.json();
              throw new Error(errorData.error || "Failed to create user in Supabase");
            }

            const createUserData = await createUserResponse.json();
            supabaseUserId = createUserData.user_id;
            role = createUserData.role;
            
            console.log("[Auth0 Callback] ✅ User created in Supabase:", supabaseUserId, "Role:", role);
            
            // Disparar evento personalizado INMEDIATAMENTE para que useSupabaseAuth empiece a buscar
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("auth0-user-created", { detail: { userId: supabaseUserId, email: user.email } }));
              console.log("[Auth0 Callback] 📢 Dispatched auth0-user-created event immediately");
              
              // También disparar después de un delay para asegurar que se detecte
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent("auth0-user-created", { detail: { userId: supabaseUserId, email: user.email } }));
                console.log("[Auth0 Callback] 📢 Dispatched auth0-user-created event (delayed)");
              }, 1000);
            }
            
            // Esperar un momento para asegurar que el usuario esté completamente disponible en la BD
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Intentar refrescar la sesión de Supabase (puede fallar si no hay sesión, lo cual es normal)
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                await supabase.auth.refreshSession();
                console.log("[Auth0 Callback] ✅ Session refreshed");
              } else {
                console.log("[Auth0 Callback] ⚠️ No session to refresh (this is normal for new Auth0 users)");
              }
            } catch (refreshError: any) {
              // Es normal que falle si no hay sesión, especialmente para usuarios nuevos de Auth0
              console.log("[Auth0 Callback] ⚠️ Could not refresh session (this is normal):", refreshError?.message || "No session");
            }
          } catch (createError: any) {
            console.error("[Auth0 Callback] ❌ Error creating user in Supabase:", createError);
            
            // Usar el rol de Auth0 directamente como fallback
            if (auth0Roles && auth0Roles.length > 0) {
              const mappedRole = mapAuth0RoleToAppRole(auth0Roles[0]);
              role = mappedRole || "user";
            } else if (auth0Role) {
              const mappedRole = mapAuth0RoleToAppRole(auth0Role);
              role = mappedRole || "user";
            }

            console.log("[Auth0 Callback] ⚠️ Using Auth0 role without Supabase sync:", role);
          }
        }

        // Redirigir según el rol
        let redirectUrl = "/login";
        if (role === "foreman") {
          redirectUrl = "/reno/construction-manager";
        } else if (role === "admin" || role === "construction_manager") {
          redirectUrl = "/reno/construction-manager/kanban";
        } else {
          // Usuario sin permisos - pero para angel.vanegas@prophero.com debería ser construction_manager
          console.warn("[Auth0 Callback] ⚠️ User has role 'user', but email is:", user.email);
          if (user.email === "angel.vanegas@prophero.com" && supabaseUserId) {
            console.log("[Auth0 Callback] 🔧 Fixing role for angel.vanegas@prophero.com to construction_manager");
            // Actualizar el rol usando una API route con cliente admin
            try {
              const updateRoleResponse = await fetch("/api/auth/update-user-role", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  user_id: supabaseUserId,
                  role: "construction_manager",
                }),
              });

              if (updateRoleResponse.ok) {
                const updateData = await updateRoleResponse.json();
                role = updateData.role || "construction_manager";
                redirectUrl = "/reno/construction-manager/kanban";
                console.log("[Auth0 Callback] ✅ Role updated to construction_manager");
              } else {
                const errorData = await updateRoleResponse.json();
                console.error("[Auth0 Callback] ❌ Error updating role:", errorData);
                // Continuar con el rol user pero redirigir al kanban de todas formas
                role = "construction_manager";
                redirectUrl = "/reno/construction-manager/kanban";
              }
            } catch (updateError: any) {
              console.error("[Auth0 Callback] ❌ Error updating role:", updateError);
              // Continuar con el rol user pero redirigir al kanban de todas formas
              role = "construction_manager";
              redirectUrl = "/reno/construction-manager/kanban";
            }
          } else {
            router.push("/login?error=no_permission&message=" + encodeURIComponent("No tienes permisos para acceder a esta aplicación"));
            return;
          }
        }

        // Limpiar flags de sessionStorage antes de redirigir
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("auth0_callback_processing");
          sessionStorage.removeItem("auth0_callback_processing_start");
        }
        
        console.log("[Auth0 Callback] ✅ Redirecting to:", redirectUrl);
        
        // Esperar un momento antes de redirigir para dar tiempo a que los eventos se procesen
        await new Promise(resolve => setTimeout(resolve, 500));
        
        router.push(redirectUrl);
      } catch (err: any) {
        console.error("[Auth0 Callback] Unexpected error:", err);
        // Limpiar flag antes de redirigir
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("auth0_callback_processing");
        }
        router.push(`/login?error=unexpected_error&message=${encodeURIComponent(err.message || "Error inesperado durante la autenticación")}`);
      }
    };

    handleCallback();
  }, [isAuthenticated, isLoading, user, auth0Error, searchParams, router, getAccessTokenSilently, supabase]);

  // Mostrar loading mientras procesa
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Autenticando...</p>
      </div>
    </div>
  );
}

