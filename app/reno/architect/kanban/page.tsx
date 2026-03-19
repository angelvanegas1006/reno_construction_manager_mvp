"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { use } from "react";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { NavbarL1 } from "@/components/layout/navbar-l1";
import { RenoKanbanBoard } from "@/components/reno/reno-kanban-board";
import { ArchitectKanbanFilters, DEFAULT_ARCHITECT_FILTERS, getArchitectFilterBadgeCount } from "@/components/reno/architect-kanban-filters";
import type { ArchitectFilters } from "@/components/reno/architect-kanban-filters";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { useSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";
import { useArchitectProjects } from "@/hooks/useArchitectProjects";
import { useArchitectWipProjects } from "@/hooks/useWipProjects";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  visibleRenoKanbanColumnsArchitect,
  visibleRenoKanbanColumnsWip,
  PHASES_KANBAN_ARCHITECT,
  PHASES_KANBAN_WIP,
} from "@/lib/reno-kanban-config";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import { trackEventWithDevice } from "@/lib/mixpanel";

type ViewMode = "kanban" | "list";
type KanbanMode = "projects" | "wips";

const PHASE_DAY_CONFIG: Partial<Record<RenoKanbanPhase, { field: string; limitDays: number }>> = {
  "arch-pending-measurement": { field: "draft_order_date", limitDays: 7 },
  "arch-preliminary-project": { field: "measurement_date", limitDays: 14 },
  "arch-technical-project": { field: "draft_validation_date", limitDays: 28 },
  "arch-technical-adjustments": { field: "ecu_first_end_date", limitDays: 7 },
};

function calcElapsedDays(project: ProjectRow, phase: RenoKanbanPhase): { elapsed: number | null; limit: number | null } {
  const config = PHASE_DAY_CONFIG[phase];
  if (!config) return { elapsed: null, limit: null };
  const startVal = (project as any)[config.field];
  if (!startVal) return { elapsed: null, limit: config.limitDays };
  const start = new Date(startVal).getTime();
  if (isNaN(start)) return { elapsed: null, limit: config.limitDays };
  const elapsed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
  return { elapsed: Math.max(0, elapsed), limit: config.limitDays };
}

function enrichAndSort(
  byPhase: Record<RenoKanbanPhase, ProjectRow[]>,
): Record<RenoKanbanPhase, ProjectRow[]> {
  const out: Record<string, ProjectRow[]> = {};
  for (const phase of PHASES_KANBAN_ARCHITECT) {
    const projects = byPhase[phase] ?? [];
    const enriched = projects.map((p) => {
      const { elapsed, limit } = calcElapsedDays(p, phase);
      return { ...p, _phaseElapsedDays: elapsed, _phaseLimitDays: limit };
    });
    if (PHASE_DAY_CONFIG[phase]) {
      enriched.sort((a, b) => {
        const da = (a as any)._phaseElapsedDays ?? -1;
        const db = (b as any)._phaseElapsedDays ?? -1;
        return db - da;
      });
    }
    out[phase] = enriched as ProjectRow[];
  }
  return out as Record<RenoKanbanPhase, ProjectRow[]>;
}

function applyFilters(
  byPhase: Record<RenoKanbanPhase, ProjectRow[]>,
  filters: ArchitectFilters,
  phases: RenoKanbanPhase[],
): Record<RenoKanbanPhase, ProjectRow[]> {
  const out: Record<string, ProjectRow[]> = {};
  for (const phase of phases) {
    out[phase] = [];
  }

  for (const phase of phases) {
    if (filters.phase && filters.phase !== phase) continue;
    const projects = byPhase[phase] ?? [];
    for (const p of projects) {
      const pa = p as any;

      if (filters.architectNames.length > 0) {
        const arch = (pa.architect ?? "").toString().trim().toLowerCase();
        if (!filters.architectNames.some((n) => n.toLowerCase() === arch)) continue;
      }

      if (filters.ecuStatus === "con-ecu" && pa.excluded_from_ecu === true) continue;
      if (filters.ecuStatus === "sin-ecu" && pa.excluded_from_ecu !== true) continue;

      if (filters.investmentType !== "all") {
        const inv = (p.investment_type ?? "").toString().trim().toLowerCase();
        if (filters.investmentType === "flip" && !inv.includes("flip")) continue;
        if (filters.investmentType === "yield" && !inv.includes("yield")) continue;
      }

      out[phase].push(p);
    }
  }

  return out as Record<RenoKanbanPhase, ProjectRow[]>;
}

export default function ArchitectKanbanPage() {
  const searchParams = useSearchParams();
  const unwrappedSearchParams =
    searchParams instanceof Promise ? use(searchParams) : searchParams;
  const router = useRouter();
  const { user: supabaseUser } = useSupabaseAuthContext();
  const { user, role, isLoading } = useAppAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [kanbanMode, setKanbanMode] = useState<KanbanMode>("projects");
  const [filters, setFilters] = useState<ArchitectFilters>(DEFAULT_ARCHITECT_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const architectName = useMemo(() => {
    if (!supabaseUser) return null;
    return (
      supabaseUser.user_metadata?.full_name ??
      supabaseUser.user_metadata?.name ??
      null
    );
  }, [supabaseUser]);

  const isAdminView = role === "admin" || role === "construction_manager" || role === "maduration_analyst";

  const {
    projectsByPhase,
    allProjects,
    refetch: refetchProjects,
  } = useArchitectProjects(architectName, isAdminView);

  const {
    projectsByPhase: wipByPhase,
    allProjects: allWipProjects,
    refetch: refetchWip,
  } = useArchitectWipProjects(architectName, isAdminView);

  const [syncLoading, setSyncLoading] = useState(false);

  const activePhases = kanbanMode === "wips" ? PHASES_KANBAN_WIP : PHASES_KANBAN_ARCHITECT;

  const filteredByPhase = useMemo(() => {
    if (kanbanMode === "wips") {
      return applyFilters(wipByPhase, filters, activePhases);
    }
    return enrichAndSort(applyFilters(projectsByPhase, filters, activePhases));
  }, [kanbanMode, projectsByPhase, wipByPhase, filters, activePhases]);

  const filterBadgeCount = getArchitectFilterBadgeCount(filters);

  useEffect(() => {
    const viewModeParam = unwrappedSearchParams.get("viewMode");
    if (viewModeParam === "list" || viewModeParam === "kanban") {
      setViewMode(viewModeParam);
    }
  }, [unwrappedSearchParams]);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !role) {
      router.push("/login");
      return;
    }
    if (role !== "architect" && role !== "admin" && role !== "construction_manager" && role !== "maduration_analyst") {
      router.push("/login");
      toast.error("No tienes permisos para acceder a esta página");
    }
  }, [user, role, isLoading, router]);

  const handleSyncAirtable = useCallback(async () => {
    setSyncLoading(true);
    trackEventWithDevice("Architect Sync Triggered");
    try {
      const res = await fetch("/api/cron/sync-airtable", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || "Error al sincronizar");
      }
      toast.success(
        data.success
          ? `Sincronizado: ${data.totalUpdated ?? 0} actualizadas, ${data.totalCreated ?? 0} creadas`
          : "Sincronización completada con errores"
      );
      await Promise.all([refetchProjects(), refetchWip()]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al sincronizar con Airtable";
      toast.error(message);
    } finally {
      setSyncLoading(false);
    }
  }, [refetchProjects, refetchWip]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    trackEventWithDevice("Architect View Mode Changed", { to: mode });
    setViewMode(mode);
  }, []);

  const handleKanbanModeChange = useCallback((mode: KanbanMode) => {
    trackEventWithDevice("Architect Kanban Mode Changed", { to: mode });
    setKanbanMode(mode);
    setFilters(DEFAULT_ARCHITECT_FILTERS);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        <NavbarL1
          classNameTitle="Kanban Arquitecto"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          syncAirtableButton={{
            label: "Sync con Airtable",
            onClick: handleSyncAirtable,
            loading: syncLoading,
          }}
          onFilterClick={() => setIsFiltersOpen(true)}
          filterBadgeCount={filterBadgeCount}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        <div
          className={cn(
            "flex-1 p-2 md:p-3 lg:p-6 bg-background dark:bg-background",
            viewMode === "list"
              ? "overflow-y-auto"
              : "md:overflow-hidden overflow-y-auto"
          )}
          data-scroll-container
        >
          {/* Toggle Proyectos / WIPs */}
          <div className="mb-3 flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/60 dark:bg-v-gray-800 rounded-lg p-1">
              <button
                onClick={() => handleKanbanModeChange("projects")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  kanbanMode === "projects"
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Proyectos
              </button>
              <button
                onClick={() => handleKanbanModeChange("wips")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  kanbanMode === "wips"
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                WIPs
              </button>
            </div>
          </div>

          <RenoKanbanBoard
            searchQuery={searchQuery}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            viewLevel="project"
            projectsByPhaseOverride={filteredByPhase}
            visibleColumnsOverride={
              kanbanMode === "wips"
                ? visibleRenoKanbanColumnsWip
                : visibleRenoKanbanColumnsArchitect
            }
            fromParam={
              kanbanMode === "wips"
                ? "architect-wip-kanban"
                : "architect-kanban"
            }
          />
        </div>

        <ArchitectKanbanFilters
          open={isFiltersOpen}
          onOpenChange={setIsFiltersOpen}
          allProjects={kanbanMode === "wips" ? allWipProjects : allProjects}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>
    </div>
  );
}
