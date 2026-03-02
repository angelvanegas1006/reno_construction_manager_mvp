"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import {
  PHASES_KANBAN_MATURATION,
  PHASES_KANBAN_ARCHITECT,
} from "@/lib/reno-kanban-config";
import type { ProjectRow } from "./useSupabaseProjects";

interface UseArchitectProjectsReturn {
  projectsByPhase: Record<RenoKanbanPhase, ProjectRow[]>;
  allProjects: ProjectRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const STATUSES_EARLY: Set<string> = new Set([
  "get project draft",
  "pending to validate",
]);

function hasAttachments(value: unknown): boolean {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") {
    try { return JSON.parse(value).length > 0; } catch { return false; }
  }
  return false;
}

function resolveArchitectPhase(p: ProjectRow): RenoKanbanPhase {
  const pa = p as any;
  const statusRaw = (pa.project_status ?? p.reno_phase ?? "") as string;
  const status = statusRaw.trim().toLowerCase();

  if (STATUSES_EARLY.has(status)) {
    const hasSqm = pa.usable_square_meters != null && pa.usable_square_meters !== "";
    if (!hasSqm) return "arch-pending-measurement";
    if (!hasAttachments(pa.architect_attachments)) return "arch-preliminary-project";
    return "arch-completed";
  }

  if (status === "technical project in progress") {
    if (!hasAttachments(pa.architect_attachments)) return "arch-technical-project";
    return "arch-completed";
  }

  if (status === "technical project fine-tuning") {
    if (!hasAttachments(pa.architect_attachments)) return "arch-technical-adjustments";
    return "arch-completed";
  }

  return "arch-completed";
}

/**
 * Fetches maturation projects filtered by the logged-in architect's name,
 * then classifies them into the 5 architect-specific kanban phases based on
 * project status and field completion.
 * Pass showAll=true (for admins) to skip the architect name filter.
 */
export function useArchitectProjects(
  architectName: string | null | undefined,
  showAll = false,
): UseArchitectProjectsReturn {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!showAll && (!architectName || !architectName.trim())) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data, error: e } = await supabase
      .from("projects")
      .select("*")
      .in("reno_phase", PHASES_KANBAN_MATURATION as unknown as string[]);

    if (e) {
      setError(e.message);
      setRows([]);
      setLoading(false);
      return;
    }

    if (showAll) {
      setRows((data as ProjectRow[]) ?? []);
    } else {
      const nameLower = architectName!.trim().toLowerCase();
      const filtered = ((data as ProjectRow[]) ?? []).filter((p) => {
        const arch = (p as any).architect;
        if (!arch || typeof arch !== "string") return false;
        return arch.trim().toLowerCase() === nameLower;
      });
      setRows(filtered);
    }

    setLoading(false);
  }, [architectName, showAll]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const projectsByPhase = useMemo((): Record<RenoKanbanPhase, ProjectRow[]> => {
    const out: Record<string, ProjectRow[]> = {};
    for (const phase of PHASES_KANBAN_ARCHITECT) {
      out[phase] = [];
    }
    const seen = new Set<string>();

    for (const p of rows) {
      const id = p.id ?? "";
      if (seen.has(id)) continue;
      seen.add(id);

      const archPhase = resolveArchitectPhase(p);
      if (out[archPhase]) {
        out[archPhase].push(p);
      }
    }
    return out as Record<RenoKanbanPhase, ProjectRow[]>;
  }, [rows]);

  return {
    projectsByPhase,
    allProjects: rows,
    loading,
    error,
    refetch: fetchProjects,
  };
}
