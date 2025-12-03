"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";

export function Auth0LogoutButton() {
  const { logout } = useAuth0();

  return (
    <Button
      onClick={() =>
        logout({
          logoutParams: {
            returnTo: typeof window !== "undefined" ? window.location.origin : "",
          },
        })
      }
      variant="outline"
    >
      Cerrar Sesión (Auth0)
    </Button>
  );
}









