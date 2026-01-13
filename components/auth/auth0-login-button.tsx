"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";

export function Auth0LoginButton() {
  const { loginWithRedirect, isLoading, error: auth0Error, isAuthenticated, user: auth0User } = useAuth0();
  const { user: supabaseUser } = useSupabaseAuthContext();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Verificar que Auth0 esté listo
    console.log("[Auth0LoginButton] useEffect - Auth0 state:", { isLoading, auth0Error, isAuthenticated });
    if (!isLoading && !auth0Error) {
      setIsReady(true);
      console.log("[Auth0LoginButton] ✅ Auth0 is ready");
    } else if (auth0Error) {
      console.error("[Auth0LoginButton] ❌ Auth0 error:", auth0Error);
      setIsReady(false);
    } else if (isLoading) {
      console.log("[Auth0LoginButton] ⏳ Auth0 is loading...");
      setIsReady(false);
    }
  }, [isLoading, auth0Error]);

  // Escuchar eventos de creación de usuario de Auth0
  useEffect(() => {
    const handleAuth0UserCreated = () => {
      console.log("[Auth0LoginButton] 📢 Received auth0-user-created event, clearing processing flag...");
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("auth0_callback_processing");
        hasRedirectedRef.current = false;
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("auth0-user-created", handleAuth0UserCreated);
      return () => {
        window.removeEventListener("auth0-user-created", handleAuth0UserCreated);
      };
    }
  }, []);

  // Si el usuario está autenticado con Auth0 pero no hay usuario en Supabase, redirigir al callback
  // PERO solo si no estamos ya en la página de callback para evitar loops infinitos
  useEffect(() => {
    const isOnCallbackPage = typeof window !== "undefined" && window.location.pathname === "/auth/callback";
    
    // Resetear el ref si hay un usuario de Supabase o si no estamos autenticados
    if (supabaseUser || !isAuthenticated) {
      hasRedirectedRef.current = false;
      // Limpiar flag de sessionStorage si hay usuario
      if (supabaseUser && typeof window !== "undefined") {
        sessionStorage.removeItem("auth0_callback_processing");
      }
      return;
    }
    
    // No redirigir si:
    // 1. Ya estamos en el callback
    // 2. Ya hay un usuario en Supabase
    // 3. Ya redirigimos
    if (isOnCallbackPage || supabaseUser || hasRedirectedRef.current) {
      return;
    }

    // Verificar si el callback está procesando - pero con timeout para evitar esperar indefinidamente
    if (typeof window !== "undefined") {
      const callbackProcessing = sessionStorage.getItem("auth0_callback_processing");
      if (callbackProcessing === "true") {
        // Verificar cuánto tiempo lleva procesando
        const processingStart = sessionStorage.getItem("auth0_callback_processing_start");
        const now = Date.now();
        const processingTime = processingStart ? now - parseInt(processingStart) : 0;
        
        // Si lleva más de 10 segundos procesando, limpiar y reintentar
        if (processingTime > 10000) {
          console.warn("[Auth0LoginButton] ⏱️ Callback processing timeout, clearing flag and retrying...");
          sessionStorage.removeItem("auth0_callback_processing");
          sessionStorage.removeItem("auth0_callback_processing_start");
          hasRedirectedRef.current = false;
        } else {
          if (!processingStart) {
            sessionStorage.setItem("auth0_callback_processing_start", now.toString());
          }
          console.log("[Auth0LoginButton] ⏳ Callback is processing, waiting...", { processingTime });
          return;
        }
      }
    }
    
    // Solo redirigir una vez, usando un ref para evitar múltiples redirecciones
    if (!isLoading && isAuthenticated && auth0User && !supabaseUser) {
      console.log("[Auth0LoginButton] 🔄 User authenticated with Auth0 but no Supabase user, redirecting to callback...");
      hasRedirectedRef.current = true;
      // Marcar que estamos procesando el callback
      if (typeof window !== "undefined") {
        sessionStorage.setItem("auth0_callback_processing", "true");
        sessionStorage.setItem("auth0_callback_processing_start", Date.now().toString());
      }
      router.push("/auth/callback");
    }
  }, [isLoading, isAuthenticated, auth0User, supabaseUser, router]);

  const handleLogin = () => {
    console.log("[Auth0LoginButton] ====== Button clicked ======");
    console.log("[Auth0LoginButton] Auth0 state:", {
      isLoading,
      isAuthenticated,
      error: auth0Error,
      isReady,
    });
    
    // No bloquear si no está listo, intentar de todas formas
    if (!isReady && isLoading) {
      console.warn("[Auth0LoginButton] ⚠️ Auth0 still loading, but attempting login anyway");
    }

    if (auth0Error) {
      console.error("[Auth0LoginButton] ❌ Auth0 error detected:", auth0Error);
      toast.error(`Error de Auth0: ${auth0Error.message || "Error desconocido"}`);
      return;
    }
    
    const redirectUri = typeof window !== "undefined" 
      ? `${window.location.origin}/auth/callback`
      : undefined;
    
    console.log("[Auth0LoginButton] Redirect URI:", redirectUri);
    console.log("[Auth0LoginButton] Calling loginWithRedirect...");
    
    try {
      // loginWithRedirect redirige inmediatamente, no devuelve una promesa
      loginWithRedirect({
        authorizationParams: {
          redirect_uri: redirectUri,
        },
      });
      console.log("[Auth0LoginButton] ✅ loginWithRedirect called (should redirect now)");
    } catch (error: any) {
      console.error("[Auth0LoginButton] ❌ Error during login:", error);
      console.error("[Auth0LoginButton] Error details:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      toast.error(`Error al iniciar sesión con Auth0: ${error?.message || "Error desconocido"}`);
    }
  };

  // Mostrar error si hay uno
  if (auth0Error) {
    console.error("[Auth0LoginButton] Auth0 error detected:", auth0Error);
  }

  console.log("[Auth0LoginButton] Render state:", {
    isLoading,
    isReady,
    hasError: !!auth0Error,
    isAuthenticated,
    hasAuth0User: !!auth0User,
    hasSupabaseUser: !!supabaseUser,
  });

  // Si ya está autenticado con Auth0 pero no hay usuario en Supabase, mostrar mensaje
  if (!isLoading && isAuthenticated && auth0User && !supabaseUser) {
    return (
      <Button
        className="w-full"
        disabled={true}
        variant="outline"
        type="button"
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Completando autenticación...
      </Button>
    );
  }

  return (
    <Button
      onClick={(e) => {
        console.log("[Auth0LoginButton] 🔵 onClick event fired!", {
          type: e.type,
          target: e.target,
          currentTarget: e.currentTarget,
        });
        handleLogin();
      }}
      onMouseDown={(e) => {
        console.log("[Auth0LoginButton] 🟢 onMouseDown event fired!");
      }}
      className="w-full"
      disabled={isLoading || (isAuthenticated && !supabaseUser)}
      variant="outline"
      type="button"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Conectando...
        </>
      ) : (
        "Continuar con Auth0"
      )}
    </Button>
  );
}











