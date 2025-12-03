"use client";

import { useState, useMemo, useEffect, startTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { RenoKanbanColumn } from "./reno-kanban-column";
import { RenoHomeLoader } from "./reno-home-loader";
import { Property } from "@/lib/property-storage";
import { useSupabaseKanbanProperties } from "@/hooks/useSupabaseKanbanProperties";
import { calculateOverallProgress } from "@/lib/property-validation";
import { useI18n } from "@/lib/i18n";
import { visibleRenoKanbanColumns, RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { sortPropertiesByExpired } from "@/lib/property-sorting";
import { KanbanFilters } from "./reno-kanban-filters";

interface RenoKanbanBoardProps {
  searchQuery: string;
  filters?: KanbanFilters;
}

// Dummy data and helper functions removed - now using Supabase

export function RenoKanbanBoard({ searchQuery, filters }: RenoKanbanBoardProps) {
  const { t } = useI18n();
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  
  // Refs for columns to enable scrolling
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const boardContainerRef = useRef<HTMLDivElement>(null);
  
  // Store column refs callback
  const setColumnRef = useCallback((key: string, element: HTMLDivElement | null) => {
    if (element) {
      columnRefs.current[key] = element;
    } else {
      delete columnRefs.current[key];
    }
  }, []);

  // Set mounted flag after component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load properties from Supabase (replaces localStorage and mock data)
  const { propertiesByPhase: supabasePropertiesByPhase, loading: supabaseLoading, error: supabaseError } = useSupabaseKanbanProperties();

  const handleCardClick = (property: Property) => {
    // For construction manager, navigate to view-only page
    // Always go to "tareas" tab when clicking from kanban
    startTransition(() => {
      router.push(`/reno/construction-manager/property/${property.id}?tab=tareas`);
    });
  };

  // Use properties from Supabase (no transformation needed, already grouped by phase)
  const transformProperties = useMemo(() => {
    // Return Supabase properties directly, already grouped by phase
    return supabasePropertiesByPhase;
  }, [supabasePropertiesByPhase]);

  // Mock data initialization removed - now using Supabase only

  // Use properties from Supabase only (no mock data, no localStorage)
  const allProperties = useMemo(() => {
    // During SSR or initial render, return empty structure
    if (!isMounted || supabaseLoading) {
      return {
      "upcoming-settlements": [],
      "initial-check": [],
      "reno-budget-renovator": [],
      "reno-budget-client": [],
      "reno-budget-start": [],
      "reno-budget": [], // Legacy
      "reno-in-progress": [],
      "furnishing-cleaning": [],
      "final-check": [],
      "reno-fixes": [],
      "done": [],
    };
    }

    // Use properties from Supabase, already grouped by phase
    // Sort each column: expired first
    // For reno-budget phases, also sort by Days to Start Reno (Since RSD) descending (most days first)
    const sortRenoBudgetPhase = (phase: RenoKanbanPhase) => {
      const expiredFirst = sortPropertiesByExpired(transformProperties[phase] || []);
      // Helper function to check if property exceeds Days to Start Reno limit
      const exceedsDaysLimit = (prop: Property): boolean => {
        return prop.daysToStartRenoSinceRSD !== null && 
               prop.daysToStartRenoSinceRSD !== undefined && 
               prop.daysToStartRenoSinceRSD > 25;
      };
      
      return expiredFirst.sort((a, b) => {
        const aExceeds = exceedsDaysLimit(a);
        const bExceeds = exceedsDaysLimit(b);
        
        // Red cards (exceeding 25 days) first
        if (aExceeds && !bExceeds) return -1;
        if (!aExceeds && bExceeds) return 1;
        
        // Then sort by Days to Start Reno (Since RSD) descending (most days first)
        // Properties without this field go to the end
        const aDays = a.daysToStartRenoSinceRSD ?? -Infinity;
        const bDays = b.daysToStartRenoSinceRSD ?? -Infinity;
        return bDays - aDays; // Descending order (most days first)
      });
    };

    // Sort initial-check and upcoming-settlements phases by days_to_visit (descending, most days first)
    // Red cards (exceeding 5 days) first
    const sortDaysToVisitPhase = (phase: RenoKanbanPhase) => {
      const expiredFirst = sortPropertiesByExpired(transformProperties[phase] || []);
      const exceedsDaysToVisitLimit = (prop: Property): boolean => {
        return prop.daysToVisit !== null && 
               prop.daysToVisit !== undefined && 
               prop.daysToVisit > 5;
      };
      
      return expiredFirst.sort((a, b) => {
        const aExceeds = exceedsDaysToVisitLimit(a);
        const bExceeds = exceedsDaysToVisitLimit(b);
        
        // Red cards (exceeding 5 days) first
        if (aExceeds && !bExceeds) return -1;
        if (!aExceeds && bExceeds) return 1;
        
        // Then sort by days_to_visit descending (most days first)
        // Properties without this field go to the end
        const aDays = a.daysToVisit ?? -Infinity;
        const bDays = b.daysToVisit ?? -Infinity;
        return bDays - aDays; // Descending order (most days first)
      });
    };

    // Sort furnishing-cleaning phase by days_to_property_ready (descending, most days first)
    // Red cards (exceeding 25 days) first
    const sortFurnishingCleaningPhase = (phase: RenoKanbanPhase) => {
      const expiredFirst = sortPropertiesByExpired(transformProperties[phase] || []);
      const exceedsDaysToPropertyReadyLimit = (prop: Property): boolean => {
        return prop.daysToPropertyReady !== null && 
               prop.daysToPropertyReady !== undefined && 
               prop.daysToPropertyReady > 25;
      };
      
      return expiredFirst.sort((a, b) => {
        const aExceeds = exceedsDaysToPropertyReadyLimit(a);
        const bExceeds = exceedsDaysToPropertyReadyLimit(b);
        
        // Red cards (exceeding 25 days) first
        if (aExceeds && !bExceeds) return -1;
        if (!aExceeds && bExceeds) return 1;
        
        // Then sort by days_to_property_ready descending (most days first)
        // Properties without this field go to the end
        const aDays = a.daysToPropertyReady ?? -Infinity;
        const bDays = b.daysToPropertyReady ?? -Infinity;
        return bDays - aDays; // Descending order (most days first)
      });
    };

    const sorted: Record<RenoKanbanPhase, Property[]> = {
      "upcoming-settlements": sortDaysToVisitPhase("upcoming-settlements"),
      "initial-check": sortDaysToVisitPhase("initial-check"),
      "reno-budget-renovator": sortRenoBudgetPhase("reno-budget-renovator"),
      "reno-budget-client": sortRenoBudgetPhase("reno-budget-client"),
      "reno-budget-start": sortRenoBudgetPhase("reno-budget-start"),
      "reno-budget": sortRenoBudgetPhase("reno-budget"), // Legacy
      "reno-in-progress": sortPropertiesByExpired(transformProperties["reno-in-progress"] || []),
      "furnishing-cleaning": sortFurnishingCleaningPhase("furnishing-cleaning"),
      "final-check": sortPropertiesByExpired(transformProperties["final-check"] || []),
      "reno-fixes": sortPropertiesByExpired(transformProperties["reno-fixes"] || []),
      "done": sortPropertiesByExpired(transformProperties["done"] || []),
    };
    
    return sorted;
  }, [isMounted, supabaseLoading, transformProperties]);

  // Filter properties based on search query and filters
  const filteredProperties = useMemo(() => {
    const activeFilters = filters || {
      renovatorNames: [],
      technicalConstructors: [],
      areaClusters: [],
      delayedWorks: false,
    };

    const hasActiveFilters = 
      activeFilters.renovatorNames.length > 0 ||
      activeFilters.technicalConstructors.length > 0 ||
      activeFilters.areaClusters.length > 0 ||
      activeFilters.delayedWorks;

    const query = searchQuery.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const normalizeString = (str: string) => {
      return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const matchesQuery = (property: Property) => {
      if (!query) return true;
      
      if (normalizeString(property.id).includes(query)) {
        return true;
      }
      if (normalizeString(property.fullAddress).includes(query)) {
        return true;
      }
      if (property.price !== undefined && /\d/.test(query)) {
        const priceStr = property.price.toString();
        const priceFormatted = property.price.toLocaleString("es-ES");
        const numericQuery = query.replace(/[^\d]/g, "");
        if (numericQuery && (priceStr.includes(numericQuery) || normalizeString(priceFormatted).includes(query))) {
          return true;
        }
      }
      return false;
    };

    // Helper function to check if a property is marked in red (delayed work)
    const isDelayedWork = (property: Property): boolean => {
      const phase = property.renoPhase;
      
      // reno-in-progress: check duration limit based on reno type
      if (phase === "reno-in-progress" && property.renoDuration && property.renoType) {
        const renoTypeLower = property.renoType.toLowerCase();
        const duration = property.renoDuration;
        
        if (renoTypeLower.includes('light')) {
          return duration > 30;
        } else if (renoTypeLower.includes('medium')) {
          return duration > 60;
        } else if (renoTypeLower.includes('major')) {
          return duration > 120;
        }
      }
      
      // Budget phases: daysToStartRenoSinceRSD > 25
      if ((phase === "reno-budget-renovator" || phase === "reno-budget-client" || phase === "reno-budget-start") && 
          property.daysToStartRenoSinceRSD) {
        return property.daysToStartRenoSinceRSD > 25;
      }
      
      // initial-check and upcoming-settlements: daysToVisit > 5
      if ((phase === "initial-check" || phase === "upcoming-settlements") && 
          property.daysToVisit) {
        return property.daysToVisit > 5;
      }
      
      // furnishing-cleaning: daysToPropertyReady > 25
      if (phase === "furnishing-cleaning" && property.daysToPropertyReady) {
        return property.daysToPropertyReady > 25;
      }
      
      return false;
    };

    const matchesFilters = (property: Property) => {
      // Si no hay filtros activos, mostrar todas las propiedades
      if (!hasActiveFilters) return true;

      // Si el filtro de obras tardías está activo, verificar primero
      if (activeFilters.delayedWorks) {
        if (!isDelayedWork(property)) {
          return false; // Si está activo y la propiedad no es tardía, excluirla
        }
      }

      // Obtener valores de la propiedad
      const renovatorName = (property as any).renovador || 
                           (property as any).supabaseProperty?.["Renovator name"];
      const technicalConstructor = (property as any).supabaseProperty?.["Technical construction"];
      const areaCluster = (property as any).region || 
                         (property as any).supabaseProperty?.area_cluster;

      // Lógica OR: la propiedad debe cumplir al menos uno de los filtros seleccionados
      // Dentro de cada tipo de filtro también es OR (cualquiera de los seleccionados)
      let matchesRenovator = false;
      let matchesTechnical = false;
      let matchesArea = false;

      // Si hay filtros de renovator, verificar si coincide con alguno
      if (activeFilters.renovatorNames.length > 0) {
        if (renovatorName) {
          const normalizedRenovator = normalizeString(renovatorName);
          matchesRenovator = activeFilters.renovatorNames.some(name => 
            normalizedRenovator === normalizeString(name) ||
            normalizedRenovator.includes(normalizeString(name)) ||
            normalizeString(name).includes(normalizedRenovator)
          );
        }
      }

      // Si hay filtros de technical constructor, verificar si coincide con alguno
      if (activeFilters.technicalConstructors.length > 0) {
        if (technicalConstructor) {
          const normalizedTechnical = normalizeString(technicalConstructor);
          matchesTechnical = activeFilters.technicalConstructors.some(constructor => 
            normalizedTechnical === normalizeString(constructor) ||
            normalizedTechnical.includes(normalizeString(constructor)) ||
            normalizeString(constructor).includes(normalizedTechnical)
          );
        }
      }

      // Si hay filtros de area cluster, verificar si coincide con alguno
      if (activeFilters.areaClusters.length > 0) {
        if (areaCluster) {
          const normalizedArea = normalizeString(areaCluster);
          matchesArea = activeFilters.areaClusters.some(cluster => 
            normalizedArea === normalizeString(cluster) ||
            normalizedArea.includes(normalizeString(cluster)) ||
            normalizeString(cluster).includes(normalizedArea)
          );
        }
      }

      // OR lógico entre tipos de filtros: debe cumplir al menos uno de los tipos de filtros activos
      // Si un tipo de filtro no está activo, no se considera en el OR
      const activeFilterTypes: boolean[] = [];
      if (activeFilters.renovatorNames.length > 0) activeFilterTypes.push(matchesRenovator);
      if (activeFilters.technicalConstructors.length > 0) activeFilterTypes.push(matchesTechnical);
      if (activeFilters.areaClusters.length > 0) activeFilterTypes.push(matchesArea);

      // Si solo está activo el filtro de obras tardías (sin otros filtros), mostrar todas las tardías
      if (activeFilters.delayedWorks && activeFilterTypes.length === 0) {
        return true; // Ya verificamos que es tardía arriba
      }

      // Si hay tipos de filtros activos además de obras tardías, al menos uno debe cumplirse
      return activeFilterTypes.length === 0 || activeFilterTypes.some(match => match);
    };

    const matchesAll = (property: Property) => {
      const matchesSearch = !query || matchesQuery(property);
      const matchesFilter = matchesFilters(property);
      return matchesSearch && matchesFilter;
    };

    const filtered: typeof allProperties = {
      "upcoming-settlements": allProperties["upcoming-settlements"].filter(matchesAll),
      "initial-check": allProperties["initial-check"].filter(matchesAll),
      "reno-budget-renovator": allProperties["reno-budget-renovator"].filter(matchesAll),
      "reno-budget-client": allProperties["reno-budget-client"].filter(matchesAll),
      "reno-budget-start": allProperties["reno-budget-start"].filter(matchesAll),
      "reno-budget": allProperties["reno-budget"].filter(matchesAll), // Legacy
      "reno-in-progress": allProperties["reno-in-progress"].filter(matchesAll),
      "furnishing-cleaning": allProperties["furnishing-cleaning"].filter(matchesAll),
      "final-check": allProperties["final-check"].filter(matchesAll),
      "reno-fixes": allProperties["reno-fixes"].filter(matchesAll),
      "done": allProperties["done"].filter(matchesAll),
    };

    // Sort each column: expired first (even after filtering)
    // For reno-budget phases, sort: first red cards (exceeding 25 days), then by Days to Start Reno (Since RSD) descending
    const sortRenoBudgetPhaseFiltered = (phase: RenoKanbanPhase) => {
      const expiredFirst = sortPropertiesByExpired(filtered[phase]);
      // Helper function to check if property exceeds Days to Start Reno limit
      const exceedsDaysLimit = (prop: Property): boolean => {
        return prop.daysToStartRenoSinceRSD !== null && 
               prop.daysToStartRenoSinceRSD !== undefined && 
               prop.daysToStartRenoSinceRSD > 25;
      };
      
      return expiredFirst.sort((a, b) => {
        const aExceeds = exceedsDaysLimit(a);
        const bExceeds = exceedsDaysLimit(b);
        
        // Red cards (exceeding 25 days) first
        if (aExceeds && !bExceeds) return -1;
        if (!aExceeds && bExceeds) return 1;
        
        // Then sort by Days to Start Reno (Since RSD) descending (most days first)
        // Properties without this field go to the end
        const aDays = a.daysToStartRenoSinceRSD ?? -Infinity;
        const bDays = b.daysToStartRenoSinceRSD ?? -Infinity;
        return bDays - aDays; // Descending order (most days first)
      });
    };

    const sorted: typeof filtered = {
      "upcoming-settlements": sortPropertiesByExpired(filtered["upcoming-settlements"]),
      "initial-check": sortPropertiesByExpired(filtered["initial-check"]),
      "reno-budget-renovator": sortRenoBudgetPhaseFiltered("reno-budget-renovator"),
      "reno-budget-client": sortRenoBudgetPhaseFiltered("reno-budget-client"),
      "reno-budget-start": sortRenoBudgetPhaseFiltered("reno-budget-start"),
      "reno-budget": sortRenoBudgetPhaseFiltered("reno-budget"), // Legacy
      "reno-in-progress": (() => {
        const expiredFirst = sortPropertiesByExpired(filtered["reno-in-progress"]);
        // Sort: first red cards (exceeding duration limit), then by duration descending
        return expiredFirst.sort((a, b) => {
          // Helper function to check if property exceeds duration limit
          const exceedsLimit = (prop: Property): boolean => {
            if (!prop.renoDuration || !prop.renoType) return false;
            const renoTypeLower = prop.renoType.toLowerCase();
            const duration = prop.renoDuration;
            
            if (renoTypeLower.includes('light')) {
              return duration > 30;
            } else if (renoTypeLower.includes('medium')) {
              return duration > 60;
            } else if (renoTypeLower.includes('major')) {
              return duration > 120;
            }
            return false;
          };
          
          const aExceeds = exceedsLimit(a);
          const bExceeds = exceedsLimit(b);
          
          // Red cards (exceeding limit) first
          if (aExceeds && !bExceeds) return -1;
          if (!aExceeds && bExceeds) return 1;
          
          // Then sort by duration descending (most days first)
          const aDuration = a.renoDuration ?? -Infinity;
          const bDuration = b.renoDuration ?? -Infinity;
          return bDuration - aDuration;
        });
      })(),
      "furnishing-cleaning": sortPropertiesByExpired(filtered["furnishing-cleaning"]),
      "final-check": sortPropertiesByExpired(filtered["final-check"]),
      "reno-fixes": sortPropertiesByExpired(filtered["reno-fixes"]),
      "done": sortPropertiesByExpired(filtered["done"]),
    };

    return sorted;
  }, [searchQuery, filters, allProperties]);

  // Find first matching property when search query changes
  const highlightedPropertyId = useMemo(() => {
    if (!searchQuery.trim()) {
      return null;
    }
    
    for (const column of visibleRenoKanbanColumns) {
      const properties = filteredProperties[column.key] || [];
      if (properties.length > 0) {
        return properties[0].id;
      }
    }
    
    return null;
  }, [searchQuery, filteredProperties]);

  // Scroll to highlighted property
  useEffect(() => {
    if (!highlightedPropertyId) return;

    let targetColumnKey: RenoKanbanPhase | null = null;
    for (const column of visibleRenoKanbanColumns) {
      const properties = filteredProperties[column.key] || [];
      if (properties.some(p => p.id === highlightedPropertyId)) {
        targetColumnKey = column.key;
        break;
      }
    }

    if (!targetColumnKey) return;

    const timeoutId = setTimeout(() => {
      const columnElement = columnRefs.current[targetColumnKey!];
      if (!columnElement) return;

      if (window.innerWidth >= 768 && boardContainerRef.current) {
        const container = boardContainerRef.current;
        const columnRect = columnElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const scrollLeft = container.scrollLeft + columnRect.left - containerRect.left - (containerRect.width / 2) + (columnRect.width / 2);
        
        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: "smooth",
        });
      } else {
        const scrollableParent = document.querySelector('[data-scroll-container]') as HTMLElement;
        if (scrollableParent) {
          const columnTop = columnElement.offsetTop;
          const columnHeight = columnElement.offsetHeight;
          const parentHeight = scrollableParent.clientHeight;
          
          const targetScroll = columnTop - (parentHeight / 2) + (columnHeight / 2);
          
          scrollableParent.scrollTo({
            top: Math.max(0, targetScroll - 20),
            behavior: "smooth",
          });
        } else {
          columnElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
      
      setTimeout(() => {
        const cardElement = columnElement.querySelector(
          `[data-property-id="${highlightedPropertyId}"]`
        ) as HTMLElement;
        
        if (cardElement) {
          const columnContainer = columnElement.querySelector(
            '[class*="overflow-y-auto"]'
          ) as HTMLElement;
          
          if (columnContainer) {
            const cardTop = cardElement.offsetTop;
            const cardHeight = cardElement.offsetHeight;
            const containerTop = columnContainer.scrollTop;
            const containerHeight = columnContainer.clientHeight;
            
            if (cardTop < containerTop || cardTop + cardHeight > containerTop + containerHeight) {
              columnContainer.scrollTo({
                top: Math.max(0, cardTop - 20),
                behavior: "smooth",
              });
            }
          }
        }
      }, 200);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [highlightedPropertyId, filteredProperties]);

  // Show error message if Supabase fails
  if (supabaseError) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center space-y-2">
          <p className="text-red-600 dark:text-red-400 font-semibold">Error al cargar propiedades</p>
          <p className="text-sm text-muted-foreground">{supabaseError}</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (supabaseLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RenoHomeLoader />
      </div>
    );
  }

  return (
    <div
      ref={boardContainerRef}
      className={cn(
        "h-full",
        "md:overflow-x-auto pb-4",
        "md:scrollbar-hidden",
        isHovered ? "md:scrollbar-visible" : "md:scrollbar-hidden"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        scrollbarWidth: isHovered ? "thin" : "none",
      }}
    >
      {/* Mobile: Vertical layout */}
      <div className="flex flex-col md:hidden gap-6 pb-20">
        {visibleRenoKanbanColumns.map((column) => {
          const properties = filteredProperties[column.key] || [];
          const title = t.kanban[column.translationKey];
          return (
            <RenoKanbanColumn
              key={column.key}
              title={title}
              count={properties.length}
              stage={column.stage}
              properties={properties}
              onCardClick={handleCardClick}
              highlightedPropertyId={highlightedPropertyId}
              onColumnRef={(el) => setColumnRef(column.key, el)}
            />
          );
        })}
      </div>

      {/* Desktop: Horizontal layout */}
      <div className="hidden md:flex h-full gap-4 px-1" style={{ minWidth: "fit-content" }}>
        {visibleRenoKanbanColumns.map((column) => {
          const properties = filteredProperties[column.key] || [];
          const title = t.kanban[column.translationKey];
          return (
            <RenoKanbanColumn
              key={column.key}
              title={title}
              count={properties.length}
              stage={column.stage}
              properties={properties}
              onCardClick={handleCardClick}
              highlightedPropertyId={highlightedPropertyId}
              onColumnRef={(el) => setColumnRef(column.key, el)}
            />
          );
        })}
      </div>
    </div>
  );
}

