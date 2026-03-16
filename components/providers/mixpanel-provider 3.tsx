"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initMixpanel, trackPageView, identifyUser, resetMixpanel } from "@/lib/analytics/mixpanel";
import { useSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";

/**
 * Mixpanel Provider
 * Initializes Mixpanel and tracks page views
 * Also identifies users when they log in
 */
export function MixpanelProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user: supabaseUser } = useSupabaseAuthContext();

  // Initialize Mixpanel on mount
  useEffect(() => {
    initMixpanel();
  }, []);

  // Track page views when route changes
  useEffect(() => {
    if (pathname) {
      trackPageView(pathname);
    }
  }, [pathname]);

  // Identify user when they log in
  useEffect(() => {
    if (supabaseUser?.id) {
      identifyUser(supabaseUser.id, {
        email: supabaseUser.email,
        // Add any other user properties you want to track
      });
    } else {
      // Reset when user logs out
      resetMixpanel();
    }
  }, [supabaseUser?.id, supabaseUser?.email]);

  return <>{children}</>;
}

