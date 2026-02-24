"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { initMixpanel, trackPageView, identifyUser, resetMixpanel } from "@/lib/mixpanel";
import { useOptionalSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";
import { useAppAuth } from "@/lib/auth/app-auth-context";

/**
 * Mixpanel Provider
 * Initializes Mixpanel, tracks page views and time-on-page.
 * Identifies users with id, email and user_type (role) when they log in.
 */
export function MixpanelProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const authContext = useOptionalSupabaseAuthContext();
  const supabaseUser = authContext?.user ?? null;
  const { role } = useAppAuth();
  const lastPathRef = useRef<{ path: string; time: number } | null>(null);

  // Initialize Mixpanel on mount
  useEffect(() => {
    initMixpanel();
  }, []);

  // Track page views and time-on-page when route changes
  useEffect(() => {
    if (!pathname) return;

    const now = Date.now();
    const last = lastPathRef.current;
    const extra: Record<string, unknown> = {};
    if (last) {
      extra.previous_page = last.path;
      extra.time_on_previous_page_seconds = Math.round((now - last.time) / 1000);
    }
    lastPathRef.current = { path: pathname, time: now };
    trackPageView(pathname, Object.keys(extra).length ? extra : undefined);
  }, [pathname]);

  // Identify user when they log in (id, email, user_type for segmentation)
  useEffect(() => {
    if (supabaseUser?.id) {
      identifyUser(supabaseUser.id, {
        email: supabaseUser.email ?? undefined,
        user_type: role ?? undefined,
      });
    } else {
      resetMixpanel();
    }
  }, [supabaseUser?.id, supabaseUser?.email, role]);

  return <>{children}</>;
}

