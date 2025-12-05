"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArchitecturalWireframeBackground } from "@/components/architectural-wireframe-background";
import { LoginForm } from "@/components/auth/login-form";
import { useSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { LoginLanguageSelector } from "@/components/auth/login-language-selector";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, loading: supabaseLoading } = useSupabaseAuthContext();
  const { role, isLoading: appLoading } = useAppAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!supabaseLoading && !appLoading && user && role) {
      if (role === 'foreman') {
        router.push("/reno/construction-manager");
      } else if (role === 'admin') {
        router.push("/reno/construction-manager/kanban");
      }
    }
  }, [user, role, supabaseLoading, appLoading, router]);

  // Show loading state
  if (supabaseLoading || appLoading) {
    return (
      <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
        <div className="relative">
          <ArchitecturalWireframeBackground />
        </div>
        <div className="relative flex min-h-screen flex-col items-center justify-center p-8 bg-card dark:bg-[var(--prophero-gray-900)]">
          <div className="text-center text-muted-foreground">
            Cargando...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left column: architectural illustration */}
      <div className="relative">
        <ArchitecturalWireframeBackground />
      </div>

      {/* Right column: login form */}
      <div className="relative flex min-h-screen flex-col items-center justify-center p-8 bg-card dark:bg-[var(--prophero-gray-900)]">
        {/* Language Selector - Top Right */}
        <div className="absolute top-6 right-6">
          <LoginLanguageSelector />
        </div>

        <LoginForm />

        {/* Footer links */}
        <div className="pointer-events-none absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 text-xs">
          <div className="flex items-center justify-center gap-6">
            <a className="pointer-events-auto text-muted-foreground hover:text-foreground hover:underline transition-colors" href="#">{t.login.support}</a>
            <a className="pointer-events-auto text-muted-foreground hover:text-foreground hover:underline transition-colors" href="#">{t.login.privacy}</a>
            <a className="pointer-events-auto text-muted-foreground hover:text-foreground hover:underline transition-colors" href="#">{t.login.terms}</a>
          </div>
          <div className="text-xs text-muted-foreground">
            {t.login.copyright}
          </div>
        </div>
      </div>
    </div>
  );
}


