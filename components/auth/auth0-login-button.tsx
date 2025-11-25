"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function Auth0LoginButton() {
  const { loginWithRedirect, isLoading } = useAuth0();

  return (
    <Button
      onClick={() => loginWithRedirect()}
      className="w-full"
      disabled={isLoading}
      variant="outline"
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


