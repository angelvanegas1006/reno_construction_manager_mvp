"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

export function useAssignedProjectsForForeman(userEmail: string | null) {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(!!userEmail);

  const fetchProjects = useCallback(async () => {
    if (!userEmail?.trim()) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const client = createClient();
      const { data, error } = await client
        .from("projects")
        .select("*")
        .eq("assigned_site_manager_email", userEmail.trim())
        .order("name");
      if (!error) setProjects((data as ProjectRow[]) ?? []);
      else setProjects([]);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, refetch: fetchProjects };
}
