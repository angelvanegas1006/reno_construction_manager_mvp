"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { use } from "react";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { NavbarL1 } from "@/components/layout/navbar-l1";
import { RenoKanbanBoard } from "@/components/reno/reno-kanban-board";
import { RenoKanbanFilters } from "@/components/reno/reno-kanban-filters";
import { useI18n } from "@/lib/i18n";
import { useRenoProperties } from "@/contexts/reno-properties-context";
import { useRenoFilters } from "@/hooks/useRenoFilters";
import { cn } from "@/lib/utils";

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
  
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { t } = useI18n();
  
  // Use shared properties context instead of fetching independently
  const { allProperties } = useRenoProperties();
  
  // Use unified filters hook
  const { filters, updateFilters, filterBadgeCount } = useRenoFilters();
  
  // Convert RenoFilters to KanbanFilters format for compatibility
  const kanbanFilters = {
    renovatorNames: filters.renovatorNames,
    technicalConstructors: filters.technicalConstructors,
    areaClusters: filters.areaClusters,
    delayedWorks: filters.delayedWorks,
    propertyTypes: filters.propertyTypes ?? [],
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
          />
        </div>
        
        {/* Filters Dialog */}
        <RenoKanbanFilters
          open={isFiltersOpen}
          onOpenChange={setIsFiltersOpen}
          properties={allProperties}
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








