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
import { sortPropertiesByExpired, isPropertyExpired } from "@/lib/property-sorting";
import { KanbanFilters } from "./reno-kanban-filters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, User, Wrench, Clock } from "lucide-react";

type ViewMode = "kanban" | "list";

interface RenoKanbanBoardProps {
  searchQuery: string;
  filters?: KanbanFilters;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

// Dummy data and helper functions removed - now using Supabase

export function RenoKanbanBoard({ searchQuery, filters, viewMode = "kanban", onViewModeChange }: RenoKanbanBoardProps) {
  const { t, language } = useI18n();
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
    // Later, this will open the task execution screen
    startTransition(() => {
      router.push(`/reno/construction-manager/property/${property.id}`);
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
      "upcoming": [],
      "reno-budget": [],
      "reno-in-progress": [],
      "furnishing-cleaning": [],
      "final-check": [],
      "reno-fixes": [],
      "done": [],
    };
    }

    // Use properties from Supabase, already grouped by phase
    // Sort each column: expired first
    const sorted: Record<RenoKanbanPhase, Property[]> = {
      "upcoming-settlements": sortPropertiesByExpired(transformProperties["upcoming-settlements"] || []),
      "initial-check": sortPropertiesByExpired(transformProperties["initial-check"] || []),
      "upcoming": sortPropertiesByExpired(transformProperties["upcoming"] || []),
      "reno-budget": sortPropertiesByExpired(transformProperties["reno-budget"] || []),
      "reno-in-progress": sortPropertiesByExpired(transformProperties["reno-in-progress"] || []),
      "furnishing-cleaning": sortPropertiesByExpired(transformProperties["furnishing-cleaning"] || []),
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
    };

    const hasActiveFilters = 
      activeFilters.renovatorNames.length > 0 ||
      activeFilters.technicalConstructors.length > 0 ||
      activeFilters.areaClusters.length > 0;

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

    const matchesFilters = (property: Property) => {
      // Si no hay filtros activos, mostrar todas las propiedades
      if (!hasActiveFilters) return true;

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

      // Si hay tipos de filtros activos, al menos uno debe cumplirse
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
      "upcoming": allProperties["upcoming"].filter(matchesAll),
      "reno-budget": allProperties["reno-budget"].filter(matchesAll),
      "reno-in-progress": allProperties["reno-in-progress"].filter(matchesAll),
      "furnishing-cleaning": allProperties["furnishing-cleaning"].filter(matchesAll),
      "final-check": allProperties["final-check"].filter(matchesAll),
      "reno-fixes": allProperties["reno-fixes"].filter(matchesAll),
      "done": allProperties["done"].filter(matchesAll),
    };

    // Sort each column: expired first (even after filtering)
    const sorted: typeof filtered = {
      "upcoming-settlements": sortPropertiesByExpired(filtered["upcoming-settlements"]),
      "initial-check": sortPropertiesByExpired(filtered["initial-check"]),
      "upcoming": sortPropertiesByExpired(filtered["upcoming"]),
      "reno-budget": sortPropertiesByExpired(filtered["reno-budget"]),
      "reno-in-progress": sortPropertiesByExpired(filtered["reno-in-progress"]),
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

  // Format date helper (must be defined before early returns)
  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const locale = language === "es" ? "es-ES" : "en-US";
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, [language]);

  // Group properties by phase for list view (must be before early returns)
  const propertiesByPhaseForList = useMemo(() => {
    const grouped: Record<RenoKanbanPhase, Array<Property & { currentPhase?: RenoKanbanPhase }>> = {
      'upcoming-settlements': [],
      'initial-check': [],
      'upcoming': [],
      'reno-budget': [],
      'reno-in-progress': [],
      'furnishing-cleaning': [],
      'final-check': [],
      'reno-fixes': [],
      'done': [],
    };

    visibleRenoKanbanColumns.forEach((column) => {
      const properties = filteredProperties[column.key] || [];
      grouped[column.key] = properties.map(p => ({ ...p, currentPhase: column.key }));
    });

    return grouped;
  }, [filteredProperties]);

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

  // Render List View
  const renderListView = () => {
    const hasAnyProperties = visibleRenoKanbanColumns.some(
      column => (propertiesByPhaseForList[column.key] || []).length > 0
    );

    if (!hasAnyProperties) {
      return (
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No properties found</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 pb-4 overflow-y-auto h-full">
        {visibleRenoKanbanColumns.map((column) => {
          const properties = propertiesByPhaseForList[column.key] || [];
          const phaseLabel = t.kanban[column.translationKey];

          if (properties.length === 0) return null;

          return (
            <div key={column.key} className="bg-card rounded-lg border border-border overflow-hidden">
              {/* Phase Header */}
              <div className="bg-accent dark:bg-[var(--prophero-gray-800)] px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-lg">{phaseLabel}</h3>
                  <Badge variant="secondary" className="text-sm">
                    {properties.length}
                  </Badge>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-accent dark:bg-[var(--prophero-gray-800)] border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Dirección
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Región
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Renovador
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Tipo Reno
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Est. Visit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Próxima Actualización
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Progreso
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {properties.map((property) => {
                      const expired = isPropertyExpired(property);
                      return (
                        <tr
                          key={property.id}
                          onClick={() => handleCardClick(property)}
                          className={cn(
                            "cursor-pointer hover:bg-accent dark:hover:bg-[var(--prophero-gray-800)] transition-colors",
                            expired && "bg-red-50 dark:bg-red-950/10"
                          )}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {property.uniqueIdFromEngagements || property.id}
                              </span>
                              {expired && (
                                <Badge variant="destructive" className="text-xs">
                                  {t.propertyCard.expired}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2 max-w-xs">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-foreground break-words">
                                {property.fullAddress}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-muted-foreground">
                              {property.region || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                {property.renovador || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {property.renoType ? (
                              <Badge variant="secondary" className="text-xs">
                                {property.renoType}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                {(property as any).estimatedVisitDate 
                                  ? formatDate((property as any).estimatedVisitDate)
                                  : "N/A"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                {property.proximaActualizacion 
                                  ? formatDate(property.proximaActualizacion)
                                  : "N/A"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {(property as any).progress !== undefined ? (
                              <div className="text-sm font-semibold text-foreground">
                                {Math.round((property as any).progress)}%
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {expired ? (
                              <Badge variant="destructive" className="text-xs">
                                {t.propertyCard.expired}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {t.propertyCard.workInProgress || "Active"}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Kanban View
  const renderKanbanView = () => (
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
      {/* Mobile: Clean vertical layout */}
      <div className="flex flex-col md:hidden gap-1 pb-20 px-1">
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

  return viewMode === "list" ? renderListView() : renderKanbanView();
}

