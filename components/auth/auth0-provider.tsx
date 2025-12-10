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
    // Auth0 is optional - only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log("Auth0 configuration not found. Using Supabase auth only.");
      console.log("To enable Auth0, add these to .env.local:");
      console.log("- NEXT_PUBLIC_AUTH0_DOMAIN");
      console.log("- NEXT_PUBLIC_AUTH0_CLIENT_ID");
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

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: typeof window !== "undefined" ? window.location.origin : "",
      }}
    >
      {children}
    </Auth0Provider>
  );
}











