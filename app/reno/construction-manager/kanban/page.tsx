"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { use } from "react";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { NavbarL1 } from "@/components/layout/navbar-l1";
import { RenoKanbanBoard } from "@/components/reno/reno-kanban-board";
import { RenoKanbanFilters, KanbanFilters } from "@/components/reno/reno-kanban-filters";
import { useI18n } from "@/lib/i18n";
import { useSupabaseKanbanProperties } from "@/hooks/useSupabaseKanbanProperties";
import { Property } from "@/lib/property-storage";
import { cn } from "@/lib/utils";
import { getTechnicalConstructionNamesFromForemanEmail } from "@/lib/supabase/user-name-utils";

type ViewMode = "kanban" | "list";

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
  
  // Leer filtro de foreman desde URL params y convertirlo a technicalConstructors
  const [filters, setFilters] = useState<KanbanFilters>({
    renovatorNames: [],
    technicalConstructors: [],
    areaClusters: [],
    delayedWorks: false,
  });
  
  // Aplicar filtro de foreman desde URL params al cargar
  useEffect(() => {
    const foremanParam = unwrappedSearchParams.get('foreman');
    if (foremanParam) {
      const foremanEmails = foremanParam.split(',').filter(Boolean);
      // Convertir emails de foreman a nombres de Technical construction
      const technicalConstructorNames = new Set<string>();
      foremanEmails.forEach(email => {
        const names = getTechnicalConstructionNamesFromForemanEmail(email);
        names.forEach(name => technicalConstructorNames.add(name));
      });
      
      if (technicalConstructorNames.size > 0) {
        setFilters(prev => ({
          ...prev,
          technicalConstructors: Array.from(technicalConstructorNames),
        }));
      }
    }
  }, [searchParams]);
  
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { t } = useI18n();
  
  // Obtener todas las propiedades para el componente de filtros
  const { propertiesByPhase } = useSupabaseKanbanProperties();
  
  // Obtener todas las propiedades en un array plano
  const allPropertiesForFilters: Property[] = Object.values(propertiesByPhase || {}).flat();

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
          onFilterClick={() => {
            setIsFiltersOpen(true);
          }}
          filterBadgeCount={
            filters.renovatorNames.length +
            filters.technicalConstructors.length +
            filters.areaClusters.length +
            (filters.delayedWorks ? 1 : 0)
          }
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
            filters={filters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
        
        {/* Filters Dialog */}
        <RenoKanbanFilters
          open={isFiltersOpen}
          onOpenChange={setIsFiltersOpen}
          properties={allPropertiesForFilters}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>
    </div>
  );
}








