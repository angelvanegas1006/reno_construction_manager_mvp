"use client";

import { Auth0Provider } from "@auth0/auth0-react";
import { ReactNode } from "react";

interface Auth0ProviderWrapperProps {
  children: ReactNode;
}

export function Auth0ProviderWrapper({ children }: Auth0ProviderWrapperProps) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;

  // Validate Auth0 configuration
  if (!domain || !clientId) {
    // En desarrollo, solo mostrar debug (no error) ya que Auth0 es opcional
    if (process.env.NODE_ENV === 'development') {
      console.debug("Auth0 configuration missing. Running without Auth0. Check your .env.local file if you intend to use it.");
    }
    
    // Return children without Auth0Provider if config is missing
    // This allows the app to still work with Supabase auth
    return <>{children}</>;
  }

  // Validate domain format
  if (
    !domain.includes(".auth0.com") &&
    !domain.includes(".us.auth0.com") &&
    !domain.includes(".eu.auth0.com") &&
    !domain.includes(".au.auth0.com")
  ) {
    console.warn(
      "Auth0 domain format might be incorrect. Expected format: your-domain.auth0.com"
    );
  }

  // Construir redirect_uri de forma explícita
  const redirectUri = typeof window !== "undefined" 
    ? `${window.location.origin}/auth/callback`
    : "";

  console.log("[Auth0Provider] Config:", {
    domain,
    clientId: clientId?.substring(0, 10) + "...",
    redirectUri,
  });

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        scope: "openid profile email",
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
      skipRedirectCallback={false}
    >
      {children}
    </Auth0Provider>
  );
}











