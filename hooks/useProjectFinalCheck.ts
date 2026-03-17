"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type ProjectFinalCheckRow = Database["public"]["Tables"]["project_final_checks"]["Row"];
type ProjectFinalCheckDwellingRow = Database["public"]["Tables"]["project_final_check_dwellings"]["Row"];

export interface ProjectFinalCheckWithDwellings extends ProjectFinalCheckRow {
  dwellings: ProjectFinalCheckDwellingRow[];
}

export function useProjectFinalCheck(projectId: string | null) {
  const [finalCheck, setFinalCheck] = useState<ProjectFinalCheckWithDwellings | null>(null);
  const [loading, setLoading] = useState(!!projectId);

  const fetchFinalCheck = useCallback(async () => {
    if (!projectId) {
      setFinalCheck(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: checkData, error: checkError } = await supabase
        .from("project_final_checks")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (checkError) {
        setFinalCheck(null);
        setLoading(false);
        return;
      }

      if (!checkData) {
        setFinalCheck(null);
        setLoading(false);
        return;
      }

      const { data: dwellingsData } = await supabase
        .from("project_final_check_dwellings")
        .select("*")
        .eq("project_final_check_id", checkData.id)
        .order("property_id");

      setFinalCheck({
        ...checkData,
        dwellings: (dwellingsData ?? []) as ProjectFinalCheckDwellingRow[],
      });
    } catch {
      setFinalCheck(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchFinalCheck();
  }, [fetchFinalCheck]);

  const startFinalCheck = useCallback(
    async (assignedSiteManagerEmail: string | null) => {
      if (!projectId) return null;
      const supabase = createClient();
      const { data: inserted, error: insertError } = await supabase
        .from("project_final_checks")
        .insert({
          project_id: projectId,
          assigned_site_manager_email: assignedSiteManagerEmail,
          status: "in_progress",
        })
        .select("id")
        .single();

      if (insertError || !inserted) return null;

      const { data: properties } = await supabase
        .from("properties")
        .select("id")
        .eq("project_id", projectId);

      if (properties?.length) {
        await supabase.from("project_final_check_dwellings").insert(
          properties.map((p) => ({
            project_final_check_id: inserted.id,
            property_id: p.id,
          }))
        );
      }

      await fetchFinalCheck();
      return inserted.id;
    },
    [projectId, fetchFinalCheck]
  );

  const saveDwelling = useCallback(
    async (
      dwellingId: string,
      data: { estado_vivienda?: string | null; estado_mobiliario?: string | null }
    ) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("project_final_check_dwellings")
        .update(data)
        .eq("id", dwellingId);
      if (!error) {
        setFinalCheck((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            dwellings: prev.dwellings.map((d) =>
              d.id === dwellingId ? { ...d, ...data } : d
            ),
          };
        });
      }
      return error;
    },
    []
  );

  return { finalCheck, loading, refetch: fetchFinalCheck, startFinalCheck, saveDwelling };
}
