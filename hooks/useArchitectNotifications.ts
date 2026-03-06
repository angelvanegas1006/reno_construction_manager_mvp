"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ArchitectNotification {
  id: string;
  project_id: string | null;
  architect_name: string;
  type: "new_project" | "phase_advance" | "validation" | string;
  message: string;
  read: boolean;
  created_at: string;
}

export function useArchitectNotifications(architectName: string | null) {
  const [notifications, setNotifications] = useState<ArchitectNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetch = useCallback(async () => {
    if (!architectName) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("architect_notifications")
        .select("*")
        .eq("architect_name", architectName)
        .eq("read", false)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotifications(data as ArchitectNotification[]);
      }
    } finally {
      setLoading(false);
    }
  }, [architectName]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase
      .from("architect_notifications")
      .update({ read: true })
      .eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!architectName) return;
    await supabase
      .from("architect_notifications")
      .update({ read: true })
      .eq("architect_name", architectName)
      .eq("read", false);
    setNotifications([]);
  }, [architectName]);

  return {
    notifications,
    unreadCount: notifications.length,
    loading,
    markAsRead,
    markAllRead,
    refetch: fetch,
  };
}

/**
 * Helper to insert a notification for an architect.
 * Call this from maturation task list when advancing phases that affect the architect.
 */
export async function insertArchitectNotification({
  projectId,
  architectName,
  type,
  message,
}: {
  projectId: string;
  architectName: string;
  type: string;
  message: string;
}) {
  const supabase = createClient();
  await supabase.from("architect_notifications").insert({
    project_id: projectId,
    architect_name: architectName,
    type,
    message,
  });
}
