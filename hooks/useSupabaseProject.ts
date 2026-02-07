"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

interface UseSupabaseProjectReturn {
  project: ProjectRow | null;
  properties: PropertyRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSupabaseProject(projectId: string | null): UseSupabaseProjectReturn {
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setProperties([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [projectRes, propertiesRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
        supabase.from("properties").select("*").eq("project_id", projectId).order("address"),
      ]);
      if (projectRes.error) {
        setError(projectRes.error.message);
        setProject(null);
        setProperties([]);
        setLoading(false);
        return;
      }
      if (propertiesRes.error) {
        setError(propertiesRes.error.message);
        setProperties([]);
      } else {
        setProperties((propertiesRes.data as PropertyRow[]) ?? []);
      }
      setProject((projectRes.data as ProjectRow) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading project");
      setProject(null);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { project, properties, loading, error, refetch: fetchData };
}
