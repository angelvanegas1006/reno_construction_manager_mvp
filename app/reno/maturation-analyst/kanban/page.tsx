"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { use } from "react";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { NavbarL1 } from "@/components/layout/navbar-l1";
import { RenoKanbanBoard } from "@/components/reno/reno-kanban-board";
import { MaturationKanbanFilters, DEFAULT_MATURATION_FILTERS, getMaturationFilterBadgeCount } from "@/components/reno/maturation-kanban-filters";
import type { MaturationFilters } from "@/components/reno/maturation-kanban-filters";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { useMaturationProjects } from "@/hooks/useMaturationProjects";
import { useWipProjects } from "@/hooks/useWipProjects";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  visibleRenoKanbanColumnsMaturation,
  visibleRenoKanbanColumnsWip,
  PHASES_KANBAN_MATURATION,
  PHASES_KANBAN_WIP,
} from "@/lib/reno-kanban-config";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import { trackEventWithDevice } from "@/lib/mixpanel";

type ViewMode = "kanban" | "list";
type KanbanMode = "projects" | "wips";

function applyMaturationFilters(
  byPhase: Record<RenoKanbanPhase, ProjectRow[]>,
  filters: MaturationFilters,
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

      if (filters.scouterNames.length > 0) {
        const sc = (pa.scouter ?? "").toString().trim().toLowerCase();
        if (!filters.scouterNames.some((n) => n.toLowerCase() === sc)) continue;
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

export default function MaturationAnalystKanbanPage() {
  const searchParams = useSearchParams();
  const unwrappedSearchParams =
    searchParams instanceof Promise ? use(searchParams) : searchParams;
  const router = useRouter();
  const { user, role, isLoading } = useAppAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [kanbanMode, setKanbanMode] = useState<KanbanMode>("projects");
  const [filters, setFilters] = useState<MaturationFilters>(DEFAULT_MATURATION_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const {
    projectsByPhase,
    allProjects,
    refetch: refetchProjects,
  } = useMaturationProjects();

  const {
    projectsByPhase: wipByPhase,
    allProjects: allWipProjects,
    refetch: refetchWip,
  } = useWipProjects();

  const [syncLoading, setSyncLoading] = useState(false);

  const activePhases = kanbanMode === "wips" ? PHASES_KANBAN_WIP : PHASES_KANBAN_MATURATION;

  const filteredByPhase = useMemo(
    () => applyMaturationFilters(
      kanbanMode === "wips" ? wipByPhase : projectsByPhase,
      filters,
      activePhases,
    ),
    [kanbanMode, projectsByPhase, wipByPhase, filters, activePhases],
  );

  const filterBadgeCount = getMaturationFilterBadgeCount(filters);

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
    if (role !== "maduration_analyst" && role !== "admin" && role !== "construction_manager") {
      router.push("/login");
      toast.error("No tienes permisos para acceder a esta página");
    }
  }, [user, role, isLoading, router]);

  const handleSyncAirtable = useCallback(async () => {
    setSyncLoading(true);
    trackEventWithDevice("Maturation Sync Triggered");
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
    trackEventWithDevice("Maturation View Mode Changed", { to: mode });
    setViewMode(mode);
  }, []);

  const handleKanbanModeChange = useCallback((mode: KanbanMode) => {
    trackEventWithDevice("Maturation Kanban Mode Changed", { to: mode });
    setKanbanMode(mode);
    setFilters(DEFAULT_MATURATION_FILTERS);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        <NavbarL1
          classNameTitle="Maduración de Proyectos"
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
            "flex-1 p-2 md:p-3 lg:p-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000]",
            viewMode === "list"
              ? "overflow-y-auto"
              : "md:overflow-hidden overflow-y-auto"
          )}
          data-scroll-container
        >
          {/* Toggle Proyectos / WIPs */}
          <div className="mb-3 flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/60 dark:bg-[var(--prophero-gray-800)] rounded-lg p-1">
              <button
                onClick={() => handleKanbanModeChange("projects")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  kanbanMode === "projects"
                    ? "bg-[var(--prophero-blue-500)] text-white shadow-sm"
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
                    ? "bg-[var(--prophero-blue-500)] text-white shadow-sm"
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
                : visibleRenoKanbanColumnsMaturation
            }
            fromParam={
              kanbanMode === "wips"
                ? "maturation-wip-kanban"
                : "maturation-kanban"
            }
          />
        </div>

        <MaturationKanbanFilters
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
