"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const HEARTBEAT_INTERVAL_MS = 60_000; // 1 minute

/**
 * Tracks user sessions by creating a record on mount,
 * sending periodic heartbeats, and finalizing on unmount/close.
 */
export function useSessionTracker(userId: string | null | undefined) {
  const sessionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient() as any;
    let mounted = true;

    async function startSession() {
      const { data, error } = await supabase
        .from("user_sessions")
        .insert({ user_id: userId, started_at: new Date().toISOString(), last_active_at: new Date().toISOString() })
        .select("id")
        .single();

      if (error) {
        console.warn("[SessionTracker] Failed to create session:", error.message);
        return;
      }
      if (mounted && data) {
        sessionIdRef.current = data.id;
      }
    }

    function heartbeat() {
      if (!sessionIdRef.current) return;
      supabase
        .from("user_sessions")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", sessionIdRef.current)
        .then(({ error }: any) => {
          if (error) console.warn("[SessionTracker] Heartbeat failed:", error.message);
        });
    }

    function endSession() {
      if (!sessionIdRef.current) return;
      const now = new Date().toISOString();
      supabase
        .from("user_sessions")
        .update({ ended_at: now, last_active_at: now })
        .eq("id", sessionIdRef.current)
        .then(() => {});
      sessionIdRef.current = null;
    }

    startSession();
    intervalRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

    const handleBeforeUnload = () => endSession();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        heartbeat();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      endSession();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId]);
}
