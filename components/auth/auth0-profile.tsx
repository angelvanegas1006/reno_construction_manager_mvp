"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { Loader2 } from "lucide-react";

export function Auth0Profile() {
  const { user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Cargando perfil...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {user.picture && (
        <img
          src={user.picture}
          alt={user.name || "User"}
          className="w-24 h-24 rounded-full object-cover border-2 border-primary"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
          }}
        />
      )}
      <div className="text-center">
        {user.name && (
          <div className="text-lg font-semibold text-foreground mb-1">
            {user.name}
          </div>
        )}
        {user.email && (
          <div className="text-sm text-muted-foreground">{user.email}</div>
        )}
      </div>
    </div>
  );
}


