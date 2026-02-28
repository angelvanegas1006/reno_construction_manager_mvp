"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  initMixpanel,
  trackPageView,
  identifyUser,
  resetMixpanel,
  setUserProperties,
} from "@/lib/mixpanel";
import { useOptionalSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";
import { useAppAuth } from "@/lib/auth/app-auth-context";

function extractNameFromEmail(email: string): string | undefined {
  const local = email.split("@")[0];
  if (!local) return undefined;
  return local
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Mixpanel Provider
 * Initializes Mixpanel, tracks page views and time-on-page.
 * Identifies users with id, email, user_type (role) and name when they log in.
 */
export function MixpanelProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const authContext = useOptionalSupabaseAuthContext();
  const supabaseUser = authContext?.user ?? null;
  const { role } = useAppAuth();
  const lastPathRef = useRef<{ path: string; time: number } | null>(null);
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    initMixpanel();
  }, []);

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

  useEffect(() => {
    if (supabaseUser?.id) {
      const email = supabaseUser.email ?? undefined;
      const name =
        supabaseUser.user_metadata?.full_name ??
        supabaseUser.user_metadata?.name ??
        (email ? extractNameFromEmail(email) : undefined);

      identifyUser(supabaseUser.id, {
        $email: email,
        $name: name,
        email,
        name,
        user_type: role ?? undefined,
      });

      if (identifiedRef.current !== supabaseUser.id) {
        identifiedRef.current = supabaseUser.id;
        setUserProperties({
          $created: supabaseUser.created_at,
          last_login: new Date().toISOString(),
        });
      }
    } else {
      identifiedRef.current = null;
      resetMixpanel();
    }
  }, [supabaseUser?.id, supabaseUser?.email, role]);

  return <>{children}</>;
}

