"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import {
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

function hasValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return !!v;
}

/**
 * La fase del arquitecto se resuelve de forma secuencial según lo que ha
 * completado, pero a partir de "Proyecto Técnico" se usa el project_status
 * de Airtable porque esas fases las mueve el analista de maduración.
 */
function resolveArchitectPhase(p: ProjectRow): RenoKanbanPhase {
  const pa = p as any;
  const statusRaw = (pa.project_status ?? p.reno_phase ?? "") as string;
  const status = statusRaw.trim().toLowerCase();

  const ADVANCED_STATUSES: Record<string, RenoKanbanPhase> = {
    "technical project in progress": "arch-technical-project",
    "ecuv first validation": "arch-ecu-first-validation",
    "ecu first validation": "arch-ecu-first-validation",
    "technical project fine-tuning": "arch-technical-adjustments",
    "technical project fine tuning": "arch-technical-adjustments",
    "ecuv final validation": "arch-ecu-final-validation",
    "ecu final validation": "arch-ecu-final-validation",
    "reno to start": "arch-obra-empezar",
    "pending to start reno": "arch-obra-empezar",
    "pending to budget from renovator": "arch-completed",
    "pending to budget (from renovator)": "arch-completed",
    "reno in progress": "arch-completed",
  };

  if (ADVANCED_STATUSES[status]) return ADVANCED_STATUSES[status];

  // Fases tempranas: "Get project draft", "Pending to validate", "Pending to reserve arras"
  // La fase del arquitecto depende de lo que haya completado:
  const hasMeasurement = hasValue(pa.measurement_date);
  const hasSentToPropHero = hasValue(pa.project_architect_date);

  if (!hasMeasurement) return "arch-pending-measurement";
  if (!hasSentToPropHero) return "arch-preliminary-project";
  return "arch-pending-validation";
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
      .eq("is_maturation_project", true);

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
