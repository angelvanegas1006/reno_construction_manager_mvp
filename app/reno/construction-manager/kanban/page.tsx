"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import type { Property } from "@/lib/property-storage";

type ViewMode = "kanban" | "list";

function normalizePropertyType(t: string | undefined): string {
  return (t ?? "").trim().toLowerCase();
}

const ALL_PHASES: RenoKanbanPhase[] = [
  "upcoming-settlements",
  "initial-check",
  "reno-budget-renovator",
  "reno-budget-client",
  "reno-budget-start",
  "reno-budget",
  "upcoming",
  "reno-in-progress",
  "furnishing",
  "final-check",
  "cleaning",
  "furnishing-cleaning",
  "reno-fixes",
  "done",
  "orphaned",
];

export default function RenoConstructionManagerKanbanPage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  
  // Unwrap searchParams if it's a Promise (Next.js 16+)
  const unwrappedSearchParams = searchParams instanceof Promise ? use(searchParams) : searchParams;
  
  // Restore viewMode from query params when navigating back
  useEffect(() => {
    const viewModeParam = unwrappedSearchParams.get('viewMode');
    if (viewModeParam === 'list' || viewModeParam === 'kanban') {
      setViewMode(viewModeParam);
    }
  }, [unwrappedSearchParams]);
  
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [syncAirtableLoading, setSyncAirtableLoading] = useState(false);
  const { t } = useI18n();
  
  // Use shared properties context instead of fetching independently
  const { allProperties, propertiesByPhase: rawPropertiesByPhase, refetchProperties } = useRenoProperties();

  const handleSyncAirtable = useCallback(async () => {
    setSyncAirtableLoading(true);
    try {
      // 1. Sync propiedades Airtable → Supabase
      const res = await fetch('/api/cron/sync-airtable', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Error al sincronizar');
      }
      toast.success(
        data.success
          ? `Sincronizado: ${data.totalUpdated ?? 0} actualizadas, ${data.totalCreated ?? 0} creadas`
          : 'Sincronización completada con errores'
      );
      await refetchProperties();

      // 2. Disparar n8n: extracción de categorías del PDF de partidas de obra
      try {
        const n8nRes = await fetch('/api/n8n/trigger-categories-extraction', { method: 'POST' });
        const n8nData = await n8nRes.json().catch(() => ({}));
        if (n8nRes.ok && (n8nData.processed > 0 || n8nData.skipped > 0 || n8nData.failed > 0)) {
          if (n8nData.failed > 0) {
            toast.info(
              `Categorías n8n: ${n8nData.processed} procesadas, ${n8nData.skipped} omitidas, ${n8nData.failed} fallos`
            );
          } else {
            toast.success(
              n8nData.processed > 0
                ? `Categorías n8n: ${n8nData.processed} propiedades enviadas a extracción`
                : n8nData.message || 'Extracción de categorías: sin propiedades pendientes'
            );
          }
        }
      } catch (_) {
        toast.warning('Sync completado. No se pudo llamar al escenario n8n de categorías.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al sincronizar con Airtable';
      toast.error(message);
    } finally {
      setSyncAirtableLoading(false);
    }
  }, [refetchProperties]);
  const { user, role } = useAppAuth();

  // Primer kanban: Unit, Building y Lot; si es foreman, además Project/WIP asignados a él (assigned_site_manager_email)
  const propertiesByPhaseExcludingProjectWip = useMemo((): Record<RenoKanbanPhase, Property[]> => {
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
    const isProjectOrWip = (p: Property) =>
      ["project", "wip"].includes(normalizePropertyType((p as Property & { propertyType?: string }).propertyType));
    const isAssignedToCurrentForeman = (p: Property) => {
      if (role !== "foreman" || !user?.email) return false;
      const assigned = (p as any).supabaseProperty?.assigned_site_manager_email;
      return assigned != null && String(assigned).trim().toLowerCase() === user.email.trim().toLowerCase();
    };
    for (const phase of ALL_PHASES) {
      const list = rawPropertiesByPhase[phase] || [];
      // Admin/construction_manager: solo Unit, Building y Lot. Foreman: Unit, Building, Lot y Project/WIP asignados a él
      empty[phase] = list.filter(
        (p) => !isProjectOrWip(p) || isAssignedToCurrentForeman(p)
      );
    }
    return empty;
  }, [rawPropertiesByPhase, role, user?.email]);
  
  // Use unified filters hook
  const { filters, updateFilters, filterBadgeCount } = useRenoFilters();
  
  // Convert RenoFilters to KanbanFilters; en el primer kanban Unit/Building/Lot (excluir Project/WIP del filtro)
  const kanbanFilters = {
    renovatorNames: filters.renovatorNames,
    technicalConstructors: filters.technicalConstructors,
    areaClusters: filters.areaClusters,
    delayedWorks: filters.delayedWorks,
    propertyTypes: (filters.propertyTypes ?? []).filter((t) => ["Unit", "Building", "Lot"].includes(t)),
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar L1: Navegación principal de plataforma */}
      <RenoSidebar 
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        {/* Navbar L1: Navegación secundaria con buscador, filtros */}
        <NavbarL1
          classNameTitle={t.property.management}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          syncAirtableButton={{
            label: 'Sync con Airtable',
            onClick: handleSyncAirtable,
            loading: syncAirtableLoading,
          }}
          onFilterClick={() => {
            setIsFiltersOpen(true);
          }}
          filterBadgeCount={filterBadgeCount}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        
        {/* Kanban Board */}
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
            propertiesByPhaseOverride={propertiesByPhaseExcludingProjectWip}
          />
        </div>
        
        {/* Filters Dialog */}
        <RenoKanbanFilters
          open={isFiltersOpen}
          onOpenChange={setIsFiltersOpen}
          properties={allProperties}
          filters={kanbanFilters}
          propertyTypeOptions={["Unit", "Building", "Lot"]}
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








