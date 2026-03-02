"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { use } from "react";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { NavbarL1 } from "@/components/layout/navbar-l1";
import { RenoKanbanBoard } from "@/components/reno/reno-kanban-board";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { useSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";
import { useArchitectProjects } from "@/hooks/useArchitectProjects";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  visibleRenoKanbanColumnsArchitect,
  PHASES_KANBAN_ARCHITECT,
  ARCHITECT_PHASE_LABELS,
} from "@/lib/reno-kanban-config";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import { trackEventWithDevice } from "@/lib/mixpanel";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ViewMode = "kanban" | "list";

interface ArchitectFilters {
  architectNames: string[];
  ecuStatus: "all" | "con-ecu" | "sin-ecu";
  investmentType: "all" | "flip" | "yield";
  phase: string | null;
}

const DEFAULT_FILTERS: ArchitectFilters = {
  architectNames: [],
  ecuStatus: "all",
  investmentType: "all",
  phase: null,
};

function hasActiveFilters(f: ArchitectFilters): boolean {
  return (
    f.architectNames.length > 0 ||
    f.ecuStatus !== "all" ||
    f.investmentType !== "all" ||
    f.phase !== null
  );
}

function applyFilters(
  byPhase: Record<RenoKanbanPhase, ProjectRow[]>,
  filters: ArchitectFilters,
): Record<RenoKanbanPhase, ProjectRow[]> {
  const out: Record<string, ProjectRow[]> = {};
  for (const phase of PHASES_KANBAN_ARCHITECT) {
    out[phase] = [];
  }

  for (const phase of PHASES_KANBAN_ARCHITECT) {
    if (filters.phase && filters.phase !== phase) {
      continue;
    }
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
  const [filters, setFilters] = useState<ArchitectFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

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

  const [syncLoading, setSyncLoading] = useState(false);

  // Available architect names for filter
  const availableArchitects = useMemo(() => {
    const names = new Set<string>();
    for (const p of allProjects) {
      const arch = ((p as any).architect ?? "").toString().trim();
      if (arch) names.add(arch);
    }
    return Array.from(names).sort();
  }, [allProjects]);

  const filteredByPhase = useMemo(
    () => applyFilters(projectsByPhase, filters),
    [projectsByPhase, filters],
  );

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
      await refetchProjects();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al sincronizar con Airtable";
      toast.error(message);
    } finally {
      setSyncLoading(false);
    }
  }, [refetchProjects]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    trackEventWithDevice("Architect View Mode Changed", { to: mode });
    setViewMode(mode);
  }, []);

  const activeFilterCount =
    (filters.architectNames.length > 0 ? 1 : 0) +
    (filters.ecuStatus !== "all" ? 1 : 0) +
    (filters.investmentType !== "all" ? 1 : 0) +
    (filters.phase ? 1 : 0);

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
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        {/* Filter bar */}
        <div className="border-b bg-card px-3 md:px-4 lg:px-6 py-2 flex items-center gap-2 flex-wrap">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {hasActiveFilters(filters) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="gap-1 text-xs text-muted-foreground"
            >
              <X className="h-3 w-3" />
              Limpiar filtros
            </Button>
          )}

          {/* Active filter badges */}
          {filters.architectNames.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 text-xs">
              {name}
              <button
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    architectNames: f.architectNames.filter((n) => n !== name),
                  }))
                }
                className="ml-0.5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.ecuStatus !== "all" && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {filters.ecuStatus === "con-ecu" ? "Con ECU" : "Sin ECU"}
              <button onClick={() => setFilters((f) => ({ ...f, ecuStatus: "all" }))} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.investmentType !== "all" && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {filters.investmentType === "flip" ? "Flip" : "Yield"}
              <button onClick={() => setFilters((f) => ({ ...f, investmentType: "all" }))} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.phase && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {ARCHITECT_PHASE_LABELS[filters.phase] ?? filters.phase}
              <button onClick={() => setFilters((f) => ({ ...f, phase: null }))} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="border-b bg-card px-3 md:px-4 lg:px-6 py-3">
            <div className="flex flex-wrap gap-4">
              {/* Architect filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Arquitecto</label>
                <select
                  className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !filters.architectNames.includes(val)) {
                      setFilters((f) => ({ ...f, architectNames: [...f.architectNames, val] }));
                    }
                    e.target.value = "";
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {availableArchitects
                    .filter((n) => !filters.architectNames.includes(n))
                    .map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                </select>
              </div>

              {/* ECU filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">ECU</label>
                <select
                  className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                  value={filters.ecuStatus}
                  onChange={(e) => setFilters((f) => ({ ...f, ecuStatus: e.target.value as ArchitectFilters["ecuStatus"] }))}
                >
                  <option value="all">Todos</option>
                  <option value="con-ecu">Con ECU</option>
                  <option value="sin-ecu">Sin ECU</option>
                </select>
              </div>

              {/* Investment type filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tipo inversión</label>
                <select
                  className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                  value={filters.investmentType}
                  onChange={(e) => setFilters((f) => ({ ...f, investmentType: e.target.value as ArchitectFilters["investmentType"] }))}
                >
                  <option value="all">Todos</option>
                  <option value="flip">Flip</option>
                  <option value="yield">Yield</option>
                </select>
              </div>

              {/* Phase filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Fase</label>
                <select
                  className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                  value={filters.phase ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, phase: e.target.value || null }))}
                >
                  <option value="">Todas</option>
                  {PHASES_KANBAN_ARCHITECT.map((phase) => (
                    <option key={phase} value={phase}>{ARCHITECT_PHASE_LABELS[phase]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            "flex-1 p-2 md:p-3 lg:p-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000]",
            viewMode === "list"
              ? "overflow-y-auto"
              : "md:overflow-hidden overflow-y-auto"
          )}
          data-scroll-container
        >
          <RenoKanbanBoard
            searchQuery={searchQuery}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            viewLevel="project"
            projectsByPhaseOverride={filteredByPhase}
            visibleColumnsOverride={visibleRenoKanbanColumnsArchitect}
            fromParam="architect-kanban"
          />
        </div>
      </div>
    </div>
  );
}
