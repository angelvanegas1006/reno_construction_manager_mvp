"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { use } from "react";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { NavbarL1 } from "@/components/layout/navbar-l1";
import { RenoKanbanBoard } from "@/components/reno/reno-kanban-board";
import { RenoKanbanFilters } from "@/components/reno/reno-kanban-filters";
import { useI18n } from "@/lib/i18n";
import { useRenoProperties } from "@/contexts/reno-properties-context";
import { useRenoFilters } from "@/hooks/useRenoFilters";
import { useSupabaseProjects } from "@/hooks/useSupabaseProjects";
import { usePropertiesByProjectId } from "@/hooks/usePropertiesByProjectId";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import {
  visibleRenoKanbanColumnsObraEnCurso,
  visibleRenoKanbanColumnsProjects,
  PHASES_OBRA_EN_CURSO,
  PHASES_KANBAN_PROJECTS,
} from "@/lib/reno-kanban-config";
import type { Property } from "@/lib/property-storage";

type ViewMode = "kanban" | "list";
type ViewLevel = "project" | "property"; // L1 = project, L2 = property

export default function RenoConstructionManagerKanbanProjectsPage() {
  const searchParams = useSearchParams();
  const unwrappedSearchParams = searchParams instanceof Promise ? use(searchParams) : searchParams;
  const router = useRouter();
  const { user, role, isLoading } = useAppAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [viewLevel, setViewLevel] = useState<ViewLevel>("project");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    const viewModeParam = unwrappedSearchParams.get("viewMode");
    if (viewModeParam === "list" || viewModeParam === "kanban") {
      setViewMode(viewModeParam);
    }
  }, [unwrappedSearchParams]);

  const { t } = useI18n();
  const { propertiesByPhase: rawPropertiesByPhase, refetchProperties } = useRenoProperties();
  const { projectsByPhase: projectsByPhaseRaw, refetch: refetchProjects } = useSupabaseProjects();
  const { propertiesByProjectId, refetch: refetchPropertiesByProjectId } = usePropertiesByProjectId();
  const { filters, updateFilters, filterBadgeCount } = useRenoFilters();
  const [syncAirtableLoading, setSyncAirtableLoading] = useState(false);

  const handleSyncAirtable = useCallback(async () => {
    setSyncAirtableLoading(true);
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
      await refetchProperties();
      await refetchProjects();
      await refetchPropertiesByProjectId();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al sincronizar con Airtable";
      toast.error(message);
    } finally {
      setSyncAirtableLoading(false);
    }
  }, [refetchProperties, refetchProjects, refetchPropertiesByProjectId]);

  // Proteger ruta: solo admin y construction_manager. Foreman no tiene acceso.
  useEffect(() => {
    if (isLoading) return;
    if (!user || !role) {
      router.push("/login");
      return;
    }
    if (role !== "admin" && role !== "construction_manager") {
      router.push("/reno/construction-manager");
      if (role === "foreman") {
        toast.error("No tienes permisos para acceder al Kanban Proyectos / WIP");
      }
    }
  }, [user, role, isLoading, router]);

  const getPropertyType = (p: Property): string =>
    ((p as any).propertyType ?? (p as any).type ?? (p as any).supabaseProperty?.type ?? "")
      .toString()
      .trim()
      .toLowerCase();

  // Kanban Proyectos: solo Project y WIP, fases desde obra en proceso (reno-in-progress, furnishing, final-check, pendiente-suministros, cleaning)
  const propertiesByPhaseOverride = useMemo((): Record<RenoKanbanPhase, Property[]> => {
    const empty: Record<RenoKanbanPhase, Property[]> = {
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
      "final-check-post-suministros": [],
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
    if (!rawPropertiesByPhase) return empty;
    const allowedTypes = ["project", "wip"];
    for (const phase of PHASES_OBRA_EN_CURSO) {
      const list = (rawPropertiesByPhase[phase] || []).filter((p) => {
        const pt = getPropertyType(p);
        return allowedTypes.includes(pt);
      });
      empty[phase] = list;
    }
    return empty;
  }, [rawPropertiesByPhase]);

  const propertiesInObraPhases = useMemo(() => {
    const ids = new Set<string>();
    const list: Property[] = [];
    const allowedTypes = ["project", "wip"];
    if (!rawPropertiesByPhase) return list;
    for (const phase of PHASES_OBRA_EN_CURSO) {
      for (const p of rawPropertiesByPhase[phase] || []) {
        const pt = getPropertyType(p);
        if (!allowedTypes.includes(pt)) continue;
        if (!ids.has(p.id)) {
          ids.add(p.id);
          list.push(p);
        }
      }
    }
    return list;
  }, [rawPropertiesByPhase]);

  // L1: proyectos agrupados por fase (useSupabaseProjects ya filtra por PHASES_KANBAN_PROJECTS)
  const projectsByPhaseOverride = projectsByPhaseRaw;

  const kanbanFilters = useMemo(
    () => ({
      renovatorNames: filters.renovatorNames,
      technicalConstructors: filters.technicalConstructors,
      areaClusters: filters.areaClusters,
      delayedWorks: filters.delayedWorks,
      propertyTypes: ["Project", "WIP"] as string[],
    }),
    [
      filters.renovatorNames,
      filters.technicalConstructors,
      filters.areaClusters,
      filters.delayedWorks,
    ]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        <NavbarL1
          classNameTitle={t.nav.kanbanProjects}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          syncAirtableButton={{
            label: "Sync con Airtable",
            onClick: handleSyncAirtable,
            loading: syncAirtableLoading,
          }}
          onFilterClick={() => setIsFiltersOpen(true)}
          filterBadgeCount={filterBadgeCount}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Toggle Proyectos L1 / Unidades L2 */}
        <div className="flex items-center gap-2 px-4 md:px-3 lg:px-4 py-2 border-b bg-card/50">
          <span className="text-sm text-muted-foreground">Vista:</span>
          <div className="flex items-center gap-1 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg p-1">
            <button
              onClick={() => setViewLevel("project")}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewLevel === "project"
                  ? "bg-[var(--prophero-blue-500)] text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Proyectos L1"
            >
              Proyectos L1
            </button>
            <button
              onClick={() => setViewLevel("property")}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewLevel === "property"
                  ? "bg-[var(--prophero-blue-500)] text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Unidades L2"
            >
              Unidades L2
            </button>
          </div>
        </div>

        <div
          className={cn(
            "flex-1 p-2 md:p-3 lg:p-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000]",
            viewMode === "list" ? "overflow-y-auto" : "md:overflow-hidden overflow-y-auto"
          )}
          data-scroll-container
        >
          <RenoKanbanBoard
            searchQuery={searchQuery}
            filters={kanbanFilters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            viewLevel={viewLevel}
            propertiesByPhaseOverride={viewLevel === "property" ? propertiesByPhaseOverride : undefined}
            projectsByPhaseOverride={viewLevel === "project" ? projectsByPhaseOverride : undefined}
            propertiesByProjectId={viewLevel === "project" ? propertiesByProjectId : undefined}
            visibleColumnsOverride={
              viewLevel === "project" ? visibleRenoKanbanColumnsProjects : visibleRenoKanbanColumnsObraEnCurso
            }
            fromParam="kanban-projects"
          />
        </div>

        <RenoKanbanFilters
          open={isFiltersOpen}
          onOpenChange={setIsFiltersOpen}
          properties={propertiesInObraPhases}
          filters={kanbanFilters}
          onFiltersChange={(newFilters) => {
            updateFilters({
              renovatorNames: newFilters.renovatorNames,
              technicalConstructors: newFilters.technicalConstructors,
              areaClusters: newFilters.areaClusters,
              delayedWorks: newFilters.delayedWorks,
              propertyTypes: ["Project", "WIP"],
            });
          }}
          propertyTypeLocked={true}
          propertyTypeOptions={["Project", "WIP"]}
        />
      </div>
    </div>
  );
}
