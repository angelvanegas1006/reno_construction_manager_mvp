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
import { useSupabaseProjects } from "@/hooks/useSupabaseProjects";
import { useRenoFilters } from "@/hooks/useRenoFilters";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { visibleRenoKanbanColumnsProjects, PHASES_KANBAN_PROJECTS } from "@/lib/reno-kanban-config";
import type { Property } from "@/lib/property-storage";
import { Button } from "@/components/ui/button";
import { Building2, FolderKanban } from "lucide-react";

type ViewMode = "kanban" | "list";
type ViewLevel = "property" | "project";

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
  const { allProperties, propertiesByPhase: rawPropertiesByPhase } = useRenoProperties();
  const { projectsByPhase: rawProjectsByPhase } = useSupabaseProjects();
  const { filters, updateFilters, filterBadgeCount } = useRenoFilters();

  // Mapa proyecto id → propiedades vinculadas (properties.project_id) para mostrar en tarjetas
  const propertiesByProjectId = useMemo((): Record<string, Property[]> => {
    const map: Record<string, Property[]> = {};
    if (!allProperties?.length) return map;
    for (const p of allProperties) {
      const projectId = (p as any).supabaseProperty?.project_id ?? (p as any).project_id;
      if (!projectId || typeof projectId !== "string") continue;
      if (!map[projectId]) map[projectId] = [];
      map[projectId].push(p);
    }
    return map;
  }, [allProperties]);

  // Proteger ruta: solo admin y construction_manager. Jefes de obra (foreman) no tienen acceso.
  useEffect(() => {
    if (isLoading) return;
    if (!user || !role) {
      router.push("/login");
      return;
    }
    if (role !== "admin" && role !== "construction_manager") {
      router.push("/reno/construction-manager");
      if (role !== "foreman") {
        toast.error("No tienes permisos para acceder al Kanban Proyectos / WIP");
      }
    }
  }, [user, role, isLoading, router]);

  // Helper: tipo de propiedad (Project, WIP, Unit, Building)
  const getPropertyType = (p: Property): string =>
    ((p as any).propertyType ?? (p as any).type ?? (p as any).supabaseProperty?.type ?? "").toString().trim();

  // Segundo kanban: solo fases Obra en curso → Limpieza y solo tipos Project/WIP (sin Unit/Building).
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
    for (const phase of PHASES_KANBAN_PROJECTS) {
      const list = (rawPropertiesByPhase[phase] || []).filter((p) => {
        const t = getPropertyType(p).toLowerCase();
        return allowedTypes.includes(t);
      });
      empty[phase] = list;
    }
    return empty;
  }, [rawPropertiesByPhase]);

  // Lista plana del segundo kanban (solo Project/WIP) para el diálogo de filtros
  const propertiesInObraPhases = useMemo(() => {
    const ids = new Set<string>();
    const list: Property[] = [];
    const allowedTypes = ["project", "wip"];
    if (!rawPropertiesByPhase) return list;
    for (const phase of PHASES_KANBAN_PROJECTS) {
      for (const p of rawPropertiesByPhase[phase] || []) {
        const t = ((p as any).propertyType ?? (p as any).type ?? (p as any).supabaseProperty?.type ?? "").toString().trim().toLowerCase();
        if (!allowedTypes.includes(t)) continue;
        if (!ids.has(p.id)) {
          ids.add(p.id);
          list.push(p);
        }
      }
    }
    return list;
  }, [rawPropertiesByPhase]);

  // En este kanban solo mostramos Project/WIP; fijamos el filtro de tipo para que el board no muestre Unit/Building
  const kanbanFilters = useMemo(
    () => ({
      renovatorNames: filters.renovatorNames,
      technicalConstructors: filters.technicalConstructors,
      areaClusters: filters.areaClusters,
      delayedWorks: filters.delayedWorks,
      propertyTypes: ["Project", "WIP"] as string[],
    }),
    [filters.renovatorNames, filters.technicalConstructors, filters.areaClusters, filters.delayedWorks]
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
            "flex-1 flex flex-col p-2 md:p-3 lg:p-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000]",
            viewMode === "list" ? "overflow-y-auto" : "md:overflow-hidden overflow-y-auto"
          )}
          data-scroll-container
        >
          <div className="flex items-center gap-2 mb-2 md:mb-3 flex-shrink-0">
            <span className="text-sm text-muted-foreground mr-1">Ver:</span>
            <div className="flex rounded-lg border border-border bg-card p-1 gap-0.5">
              <Button
                variant={viewLevel === "property" ? "default" : "ghost"}
                size="sm"
                className="gap-1.5 h-8"
                onClick={() => setViewLevel("property")}
              >
                <Building2 className="h-3.5 w-3.5" />
                Por propiedad
              </Button>
              <Button
                variant={viewLevel === "project" ? "default" : "ghost"}
                size="sm"
                className="gap-1.5 h-8"
                onClick={() => setViewLevel("project")}
              >
                <FolderKanban className="h-3.5 w-3.5" />
                Por proyecto
              </Button>
            </div>
          </div>
          <RenoKanbanBoard
            searchQuery={searchQuery}
            filters={kanbanFilters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            propertiesByPhaseOverride={viewLevel === "property" ? propertiesByPhaseOverride : undefined}
            projectsByPhaseOverride={viewLevel === "project" ? rawProjectsByPhase : undefined}
            viewLevel={viewLevel}
            visibleColumnsOverride={visibleRenoKanbanColumnsProjects}
            fromParam="kanban-projects"
            propertiesByProjectId={viewLevel === "project" ? propertiesByProjectId : undefined}
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
