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
import {
  visibleRenoKanbanColumnsObraEnCurso,
  PHASES_OBRA_EN_CURSO,
} from "@/lib/reno-kanban-config";
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
  const { propertiesByPhase: rawPropertiesByPhase } = useRenoProperties();
  const { filters, updateFilters, filterBadgeCount } = useRenoFilters();

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
            visibleColumnsOverride={visibleRenoKanbanColumnsObraEnCurso}
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
