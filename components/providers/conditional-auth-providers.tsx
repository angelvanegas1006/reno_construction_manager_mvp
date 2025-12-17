"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { SupabaseAuthProvider } from "@/lib/auth/supabase-auth-context";
import { AppAuthProvider } from "@/lib/auth/app-auth-context";
import { Auth0ProviderWrapper } from "@/components/auth/auth0-provider";
import { MixpanelProvider } from "@/components/providers/mixpanel-provider";

interface ConditionalAuthProvidersProps {
  children: ReactNode;
}

/**
 * Componente que condicionalmente renderiza providers de autenticación
 * basado en la ruta actual. Para rutas públicas (/checklist-public), 
 * no renderiza los providers de autenticación.
 */
export function ConditionalAuthProviders({ children }: ConditionalAuthProvidersProps) {
  const pathname = usePathname();
  
  // Rutas públicas que no requieren autenticación
  const isPublicRoute = pathname?.startsWith('/checklist-public') || 
                       pathname?.startsWith('/api/proxy-html');

  // Para rutas públicas, renderizar solo los children sin providers de auth
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Para rutas protegidas, renderizar con todos los providers de autenticación
  return (
    <Auth0ProviderWrapper>
      <AuthProvider>
        <SupabaseAuthProvider>
          <AppAuthProvider>
            <MixpanelProvider>
              {children}
            </MixpanelProvider>
          </AppAuthProvider>
        </SupabaseAuthProvider>
      </AuthProvider>
    </Auth0ProviderWrapper>
  );
}

