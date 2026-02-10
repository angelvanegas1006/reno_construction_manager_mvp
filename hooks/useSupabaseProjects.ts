"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { PHASES_KANBAN_PROJECTS, SET_UP_STATUS_TO_PROJECT_PHASE } from "@/lib/reno-kanban-config";

export interface ProjectRow {
  id: string;
  name: string | null;
  airtable_project_id: string | null;
  reno_phase: string | null;
  project_status?: string | null;
  created_at: string | null;
  updated_at: string | null;
  investment_type?: string | null;
  area_cluster?: string | null;
  drive_folder?: string | null;
  project_address?: string | null;
  project_unique_id?: string | null;
  type?: string | null;
  renovator?: string | null;
}

/** Mapea Project status (Airtable) → fase Kanban; prioridad sobre reno_phase */
function mapProjectStatusToPhase(project_status: string | null | undefined): RenoKanbanPhase | null {
  if (!project_status || typeof project_status !== "string") return null;
  const raw = project_status.trim();
  if (!raw) return null;
  const mapped = SET_UP_STATUS_TO_PROJECT_PHASE[raw];
  if (mapped) return mapped;
  const normalized = raw.toLowerCase().replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [k, v] of Object.entries(SET_UP_STATUS_TO_PROJECT_PHASE)) {
    const keyNorm = k.toLowerCase().replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (keyNorm === normalized) return v;
  }
  const sortedEntries = Object.entries(SET_UP_STATUS_TO_PROJECT_PHASE).sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of sortedEntries) {
    const keyNorm = k.toLowerCase().replace(/\s+/g, " ");
    if (normalized.includes(keyNorm)) return v;
  }
  return null;
}

interface UseSupabaseProjectsReturn {
  projectsByPhase: Record<RenoKanbanPhase, ProjectRow[]>;
  allProjects: ProjectRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const EMPTY_BY_PHASE: Record<RenoKanbanPhase, ProjectRow[]> = {
  "upcoming-settlements": [],
  "initial-check": [],
  "reno-budget-renovator": [],
  "reno-budget-client": [],
  "reno-budget-start": [],
  "reno-budget": [],
  "upcoming": [],
  "reno-in-progress": [],
  "furnishing": [],
  "final-check": [],
  "pendiente-suministros": [],
  "cleaning": [],
  "furnishing-cleaning": [],
  "reno-fixes": [],
  "done": [],
  "orphaned": [],
  "analisis-supply": [],
  "analisis-reno": [],
  "administracion-reno": [],
  "pendiente-presupuestos-renovador": [],
  "obra-a-empezar": [],
  "obra-en-progreso": [],
  "amueblamiento": [],
  "check-final": [],
};

function mapProjectPhaseForKanban(reno_phase: string | null): RenoKanbanPhase {
  if (!reno_phase) return "obra-en-progreso";
  const p = reno_phase as RenoKanbanPhase;
  if (PHASES_KANBAN_PROJECTS.includes(p)) return p;
  const oldToNew: Record<string, RenoKanbanPhase> = {
    "reno-in-progress": "obra-en-progreso",
    furnishing: "amueblamiento",
    "final-check": "check-final",
    cleaning: "check-final",
  };
  return oldToNew[reno_phase] ?? "obra-en-progreso";
}

function filterPhases(phase: string | null): phase is RenoKanbanPhase {
  return phase != null && PHASES_KANBAN_PROJECTS.includes(phase as RenoKanbanPhase);
}

export function useSupabaseProjects(): UseSupabaseProjectsReturn {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Traer solo proyectos que NO están orphaned (no se muestran en el Kanban)
    const { data, error: e } = await supabase
      .from("projects")
      .select("id, name, airtable_project_id, reno_phase, project_status, created_at, updated_at, investment_type, area_cluster, drive_folder, project_address, project_unique_id, type, renovator")
      .neq("reno_phase", "orphaned");

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
    const out = { ...EMPTY_BY_PHASE };
    const seenInPhase = new Map<RenoKanbanPhase, Set<string>>();
    for (const p of rows) {
      // Prioridad: columna según project_status (Project status de Airtable); si no, reno_phase
      const phase =
        mapProjectStatusToPhase(p.project_status) ?? mapProjectPhaseForKanban(p.reno_phase);
      if (PHASES_KANBAN_PROJECTS.includes(phase)) {
        const id = p.id ?? "";
        if (!seenInPhase.has(phase)) seenInPhase.set(phase, new Set());
        if (seenInPhase.get(phase)!.has(id)) continue;
        seenInPhase.get(phase)!.add(id);
        out[phase].push(p);
      }
    }
    return out;
  }, [rows]);

  const allProjects = useMemo(() => rows, [rows]);

  return {
    projectsByPhase,
    allProjects,
    loading,
    error,
    refetch: fetchProjects,
  };
}
