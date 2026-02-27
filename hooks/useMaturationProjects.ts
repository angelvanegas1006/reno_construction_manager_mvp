"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import {
  PHASES_KANBAN_MATURATION,
  MATURATION_PROJECT_STATUS_TO_PHASE,
} from "@/lib/reno-kanban-config";
import type { ProjectRow } from "./useSupabaseProjects";

function mapMaturationStatusToPhase(
  project_status: string | null | undefined
): RenoKanbanPhase | null {
  if (!project_status || typeof project_status !== "string") return null;
  const raw = project_status.trim();
  if (!raw) return null;
  const mapped = MATURATION_PROJECT_STATUS_TO_PHASE[raw];
  if (mapped) return mapped;
  const normalized = raw
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  for (const [k, v] of Object.entries(MATURATION_PROJECT_STATUS_TO_PHASE)) {
    const keyNorm = k
      .toLowerCase()
      .replace(/\s+/g, " ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (keyNorm === normalized) return v;
  }
  const sortedEntries = Object.entries(MATURATION_PROJECT_STATUS_TO_PHASE).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [k, v] of sortedEntries) {
    const keyNorm = k.toLowerCase().replace(/\s+/g, " ");
    if (normalized.includes(keyNorm)) return v;
  }
  return null;
}

function mapMaturationPhase(reno_phase: string | null): RenoKanbanPhase {
  if (!reno_phase) return "get-project-draft";
  const p = reno_phase as RenoKanbanPhase;
  if (PHASES_KANBAN_MATURATION.includes(p)) return p;
  return "get-project-draft";
}

interface UseMaturationProjectsReturn {
  projectsByPhase: Record<RenoKanbanPhase, ProjectRow[]>;
  allProjects: ProjectRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMaturationProjects(): UseMaturationProjectsReturn {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
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
    setRows((data as ProjectRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const projectsByPhase = useMemo((): Record<RenoKanbanPhase, ProjectRow[]> => {
    const out: Record<string, ProjectRow[]> = {};
    for (const phase of PHASES_KANBAN_MATURATION) {
      out[phase] = [];
    }
    const seenInPhase = new Map<string, Set<string>>();
    for (const p of rows) {
      const phase =
        mapMaturationStatusToPhase(p.project_status) ??
        mapMaturationPhase(p.reno_phase);
      if (PHASES_KANBAN_MATURATION.includes(phase)) {
        const id = p.id ?? "";
        if (!seenInPhase.has(phase)) seenInPhase.set(phase, new Set());
        if (seenInPhase.get(phase)!.has(id)) continue;
        seenInPhase.get(phase)!.add(id);
        if (!out[phase]) out[phase] = [];
        out[phase].push(p);
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
