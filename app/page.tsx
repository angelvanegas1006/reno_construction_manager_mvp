"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";
import { useAppAuth } from "@/lib/auth/app-auth-context";

export default function HomePage() {
  const router = useRouter();
  const { user, loading: supabaseLoading } = useSupabaseAuthContext();
  const { role, isLoading: appLoading } = useAppAuth();

  useEffect(() => {
    // Wait for auth to load
    if (supabaseLoading || appLoading) {
      return;
    }

    // If user is not authenticated, redirect to login
    if (!user) {
      router.push("/login");
      return;
    }

    // If user is authenticated, redirect based on role
    if (role === 'foreman' || role === 'admin' || role === 'construction_manager') {
      router.push("/reno/construction-manager");
    } else {
      // User without permissions - redirect to login
      router.push("/login");
    }
  }, [user, role, supabaseLoading, appLoading, router]);

  // Show loading state while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        Cargando...
      </div>
    </div>
  );
}
