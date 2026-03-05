"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const HEARTBEAT_INTERVAL_MS = 60_000; // 1 minute
const RETRY_DELAY_MS = 5_000;
const MAX_RETRIES = 3;

/**
 * Tracks user sessions by creating a record on mount,
 * sending periodic heartbeats, and finalizing on unmount/close.
 * Retries session creation if the initial insert fails (e.g. transient network error on mobile).
 */
export function useSessionTracker(userId: string | null | undefined) {
  const sessionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);

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
        if (mounted && retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          setTimeout(() => { if (mounted) startSession(); }, RETRY_DELAY_MS);
        }
        return;
      }
      if (mounted && data) {
        sessionIdRef.current = data.id;
        retryCountRef.current = 0;
      }
    }

    function heartbeat() {
      if (!sessionIdRef.current) {
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          startSession();
        }
        return;
      }
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
      navigator.sendBeacon?.(
        "/api/session/end",
        JSON.stringify({ sessionId: sessionIdRef.current, now })
      );
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
      } else if (document.visibilityState === "visible" && !sessionIdRef.current) {
        startSession();
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
