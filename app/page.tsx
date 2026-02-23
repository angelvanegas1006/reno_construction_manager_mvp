"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";
import { useAppAuth } from "@/lib/auth/app-auth-context";

const ROLES_WITH_VIEW_IN_DEVELOPMENT = ["manager_projects", "technical_constructor_projects", "maduration_analyst"] as const;

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
    if (role === "foreman" || role === "admin" || role === "construction_manager") {
      router.push("/reno/construction-manager");
    } else if (role && ["rent_manager", "rent_agent", "tenant"].includes(role)) {
      router.push("/rent");
    } else if (role && ROLES_WITH_VIEW_IN_DEVELOPMENT.includes(role as (typeof ROLES_WITH_VIEW_IN_DEVELOPMENT)[number])) {
      toast.info("Tu vista está en desarrollo. Contacta al administrador.");
      router.push("/login");
    } else {
      // For other roles (user, etc.)
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
