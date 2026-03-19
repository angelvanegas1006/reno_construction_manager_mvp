"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, ExternalLink } from "lucide-react";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { Button } from "@/components/ui/button";

const ALLOWED_ROLES = ["admin", "construction_manager", "foreman", "set_up_analyst", "maduration_analyst"];
const UPDATES_URL = "https://updates.vistral.io/en";

export default function UpdatesPage() {
  const router = useRouter();
  const { user, role, isLoading } = useAppAuth();
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || !ALLOWED_ROLES.includes(role || ""))) {
      router.replace("/login");
    }
  }, [isLoading, user, role, router]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!iframeLoaded) {
        setIframeError(true);
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [iframeLoaded]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (iframeError && !iframeLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-2rem)] gap-4 p-4">
        <Sparkles className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Novedades de producto</h1>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          No se pudo cargar la página de novedades dentro de la app. Puedes abrirla directamente en una nueva pestaña.
        </p>
        <Button asChild>
          <a href={UPDATES_URL} target="_blank" rel="noopener noreferrer" className="gap-2">
            <ExternalLink className="h-4 w-4" /> Abrir Novedades
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-2rem)] flex flex-col p-4 gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold">Novedades de producto</h1>
        </div>
        <a
          href={UPDATES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Abrir en nueva pestaña <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="flex-1 rounded-xl border border-border/50 overflow-hidden shadow-sm bg-card relative">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          src={UPDATES_URL}
          className="w-full h-full border-0"
          onLoad={() => setIframeLoaded(true)}
          allow="clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title="Vistral Product Updates"
        />
      </div>
    </div>
  );
}
