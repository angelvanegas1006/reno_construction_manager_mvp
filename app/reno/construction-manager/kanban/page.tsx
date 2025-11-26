"use client";

import { useState } from "react";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { NavbarL1 } from "@/components/layout/navbar-l1";
import { RenoKanbanBoard } from "@/components/reno/reno-kanban-board";
import { RenoKanbanFilters, KanbanFilters } from "@/components/reno/reno-kanban-filters";
import { useI18n } from "@/lib/i18n";
import { useSupabaseKanbanProperties } from "@/hooks/useSupabaseKanbanProperties";
import { Property } from "@/lib/property-storage";

export default function RenoConstructionManagerKanbanPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filters, setFilters] = useState<KanbanFilters>({
    renovatorNames: [],
    technicalConstructors: [],
    areaClusters: [],
  });
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
            filters.areaClusters.length
          }
        />
        
        {/* Kanban Board */}
        <div 
          className="flex-1 overflow-y-auto md:overflow-hidden p-3 md:p-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000]"
          data-scroll-container
        >
          <RenoKanbanBoard searchQuery={searchQuery} filters={filters} />
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








