"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import {
  PHASES_KANBAN_WIP,
  WIP_PROJECT_STATUS_TO_PHASE,
} from "@/lib/reno-kanban-config";
import type { ProjectRow } from "./useSupabaseProjects";

function mapWipPhase(reno_phase: string | null): RenoKanbanPhase {
  if (!reno_phase) return "wip-reno-due-diligence";
  const p = reno_phase as RenoKanbanPhase;
  if (PHASES_KANBAN_WIP.includes(p)) return p;
  return "wip-reno-due-diligence";
}

function mapWipStatusToPhase(
  wip_status: string | null | undefined,
  hasBudgetDoc?: boolean
): RenoKanbanPhase | null {
  if (!wip_status || typeof wip_status !== "string") return null;
  const raw = wip_status.trim();
  if (!raw) return null;
  let mapped = WIP_PROJECT_STATUS_TO_PHASE[raw] ?? null;
  if (!mapped) {
    const normalized = raw
      .toLowerCase()
      .replace(/\s+/g, " ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    for (const [k, v] of Object.entries(WIP_PROJECT_STATUS_TO_PHASE)) {
      const keyNorm = k
        .toLowerCase()
        .replace(/\s+/g, " ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (keyNorm === normalized) { mapped = v; break; }
    }
  }
  if (mapped === "wip-obra-a-empezar" && !hasBudgetDoc) {
    return "wip-pendiente-presupuesto";
  }
  return mapped;
}

interface UseWipProjectsReturn {
  projectsByPhase: Record<RenoKanbanPhase, ProjectRow[]>;
  allProjects: ProjectRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWipProjects(): UseWipProjectsReturn {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from("projects")
      .select("*")
      .eq("is_wip_project", true);

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
    for (const phase of PHASES_KANBAN_WIP) {
      out[phase] = [];
    }
    const seenInPhase = new Map<string, Set<string>>();
    for (const p of rows) {
      const hasBudget = Array.isArray((p as any).renovator_budget_doc)
        ? (p as any).renovator_budget_doc.length > 0
        : !!(p as any).renovator_budget_doc;
      const phase =
        mapWipStatusToPhase((p as any).wip_status, hasBudget) ?? mapWipPhase(p.reno_phase);
      if (PHASES_KANBAN_WIP.includes(phase)) {
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

/**
 * WIP projects for architect view — filtered by architect name.
 */
export function useArchitectWipProjects(
  architectName: string | null,
  isAdminView: boolean
): UseWipProjectsReturn {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from("projects")
      .select("*")
      .eq("is_wip_project", true);

    if (!isAdminView && architectName) {
      query = query.eq("architect", architectName);
    }

    const { data, error: e } = await query;
    if (e) {
      setError(e.message);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((data as ProjectRow[]) ?? []);
    setLoading(false);
  }, [architectName, isAdminView]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const projectsByPhase = useMemo((): Record<RenoKanbanPhase, ProjectRow[]> => {
    const out: Record<string, ProjectRow[]> = {};
    for (const phase of PHASES_KANBAN_WIP) {
      out[phase] = [];
    }
    const seenInPhase = new Map<string, Set<string>>();
    for (const p of rows) {
      const hasBudget = Array.isArray((p as any).renovator_budget_doc)
        ? (p as any).renovator_budget_doc.length > 0
        : !!(p as any).renovator_budget_doc;
      const phase =
        mapWipStatusToPhase((p as any).wip_status, hasBudget) ?? mapWipPhase(p.reno_phase);
      if (PHASES_KANBAN_WIP.includes(phase)) {
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
