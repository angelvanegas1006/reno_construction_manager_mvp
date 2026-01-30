"use client";

import { useState, useEffect, useMemo } from "react";
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
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { visibleRenoKanbanColumnsFromObraStart, PHASES_FROM_OBRA_START } from "@/lib/reno-kanban-config";
import type { Property } from "@/lib/property-storage";

type ViewMode = "kanban" | "list";

export default function RenoConstructionManagerKanbanProjectsPage() {
  const searchParams = useSearchParams();
  const unwrappedSearchParams = searchParams instanceof Promise ? use(searchParams) : searchParams;
  const router = useRouter();
  const { user, role, isLoading } = useAppAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    const viewModeParam = unwrappedSearchParams.get("viewMode");
    if (viewModeParam === "list" || viewModeParam === "kanban") {
      setViewMode(viewModeParam);
    }
  }, [unwrappedSearchParams]);

  const { t } = useI18n();
  const { allProperties, propertiesByPhase: rawPropertiesByPhase } = useRenoProperties();
  const { filters, updateFilters, filterBadgeCount } = useRenoFilters();

  // Protect route: only admin and construction_manager
  useEffect(() => {
    if (isLoading) return;
    if (!user || !role) {
      router.push("/login");
      return;
    }
    if (role !== "admin" && role !== "construction_manager") {
      router.push("/reno/construction-manager");
      toast.error("No tienes permisos para acceder al Kanban Proyectos / WIP");
    }
  }, [user, role, isLoading, router]);

  // Segundo kanban: mostrar TODAS las viviendas que están en las 5 fases (Obra a empezar → Limpieza), sin filtrar por tipo
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
      "cleaning": [],
      "furnishing-cleaning": [],
      "reno-fixes": [],
      "done": [],
      "orphaned": [],
    };
    if (!rawPropertiesByPhase) return empty;
    for (const phase of PHASES_FROM_OBRA_START) {
      empty[phase] = rawPropertiesByPhase[phase] || [];
    }
    return empty;
  }, [rawPropertiesByPhase]);

  // Lista plana de todas las propiedades del segundo kanban (para el diálogo de filtros)
  const propertiesInObraPhases = useMemo(() => {
    const ids = new Set<string>();
    const list: Property[] = [];
    if (!rawPropertiesByPhase) return list;
    for (const phase of PHASES_FROM_OBRA_START) {
      for (const p of rawPropertiesByPhase[phase] || []) {
        if (!ids.has(p.id)) {
          ids.add(p.id);
          list.push(p);
        }
      }
    }
    return list;
  }, [rawPropertiesByPhase]);

  const kanbanFilters = {
    renovatorNames: filters.renovatorNames,
    technicalConstructors: filters.technicalConstructors,
    areaClusters: filters.areaClusters,
    delayedWorks: filters.delayedWorks,
    propertyTypes: filters.propertyTypes ?? [],
  };

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
          onFilterClick={() => setIsFiltersOpen(true)}
          filterBadgeCount={filterBadgeCount}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

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
            propertiesByPhaseOverride={propertiesByPhaseOverride}
            visibleColumnsOverride={visibleRenoKanbanColumnsFromObraStart}
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
              propertyTypes: newFilters.propertyTypes ?? [],
            });
          }}
        />
      </div>
    </div>
  );
}
