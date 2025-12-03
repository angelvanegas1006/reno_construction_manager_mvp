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
import { sortPropertiesByExpired, isPropertyExpired, isDelayedWork } from "@/lib/property-sorting";
import { KanbanFilters } from "./reno-kanban-filters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Calendar, User, Wrench, Clock, ChevronDown, ChevronUp, ArrowUpDown, Columns, Settings, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

type ViewMode = "kanban" | "list";

interface RenoKanbanBoardProps {
  searchQuery: string;
  filters?: KanbanFilters;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

// Dummy data and helper functions removed - now using Supabase

type SortColumn = "id" | "address" | "region" | "renovador" | "renoType" | "estimatedVisit" | "proximaActualizacion" | "progress" | "status";
type SortDirection = "asc" | "desc" | null;

interface ColumnConfig {
  key: SortColumn;
  label: string;
  defaultVisible: boolean;
}

// Column configuration
const COLUMN_CONFIG: ColumnConfig[] = [
  { key: "id", label: "ID", defaultVisible: true },
  { key: "address", label: "Dirección", defaultVisible: true },
  { key: "region", label: "Región", defaultVisible: true },
  { key: "renovador", label: "Renovador", defaultVisible: true },
  { key: "renoType", label: "Tipo Reno", defaultVisible: true },
  { key: "estimatedVisit", label: "Est. Visit", defaultVisible: true },
  { key: "proximaActualizacion", label: "Próxima Actualización", defaultVisible: true },
  { key: "progress", label: "Progreso", defaultVisible: true },
  { key: "status", label: "Estado", defaultVisible: true },
];

export function RenoKanbanBoard({ searchQuery, filters, viewMode = "kanban", onViewModeChange }: RenoKanbanBoardProps) {
  const { t, language } = useI18n();
  const { user } = useSupabaseAuth();
  const supabase = createClient();
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<RenoKanbanPhase>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<RenoKanbanPhase | "all">("all");
  
  // Column visibility state per phase - Map<phase, Set<columns>>
  const [visibleColumnsByPhase, setVisibleColumnsByPhase] = useState<Map<RenoKanbanPhase, Set<SortColumn>>>(() => {
    const defaultColumns = new Set(COLUMN_CONFIG.filter(col => col.defaultVisible).map(col => col.key));
    const map = new Map<RenoKanbanPhase, Set<SortColumn>>();
    visibleRenoKanbanColumns.forEach(col => {
      map.set(col.key, new Set(defaultColumns));
    });
    return map;
  });
  const [isLoadingColumns, setIsLoadingColumns] = useState(true);
  
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
    // Pass viewMode as query param to remember the current view
    startTransition(() => {
      router.push(`/reno/construction-manager/property/${property.id}?viewMode=${viewMode}`);
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
    // Sort each column: expired first, then by phase-specific criteria
    
    // Helper function to check if property exceeds Days to Start Reno limit
    const exceedsDaysToStartLimit = (prop: Property): boolean => {
      return prop.daysToStartRenoSinceRSD !== null && 
             prop.daysToStartRenoSinceRSD !== undefined && 
             prop.daysToStartRenoSinceRSD > 25;
    };
    
    // Helper function to check if property exceeds Days to Visit limit
    const exceedsDaysToVisitLimit = (prop: Property): boolean => {
      return prop.daysToVisit !== null && 
             prop.daysToVisit !== undefined && 
             prop.daysToVisit > 5;
    };
    
    // Helper function to check if property exceeds Days to Property Ready limit
    const exceedsDaysToPropertyReadyLimit = (prop: Property): boolean => {
      return prop.daysToPropertyReady !== null && 
             prop.daysToPropertyReady !== undefined && 
             prop.daysToPropertyReady > 25;
    };
    
    // Sort reno-budget phases by Days to Start Reno (descending, most days first)
    // Red cards (exceeding 25 days) first
    const sortRenoBudgetPhase = (phase: RenoKanbanPhase) => {
      const expiredFirst = sortPropertiesByExpired(transformProperties[phase] || []);
      
      return expiredFirst.sort((a, b) => {
        const aExceeds = exceedsDaysToStartLimit(a);
        const bExceeds = exceedsDaysToStartLimit(b);
        
        // Red cards (exceeding 25 days) first
        if (aExceeds && !bExceeds) return -1;
        if (!aExceeds && bExceeds) return 1;
        
        // Then sort by Days to Start Reno (Since RSD) descending (most days first)
        const aDays = a.daysToStartRenoSinceRSD ?? -Infinity;
        const bDays = b.daysToStartRenoSinceRSD ?? -Infinity;
        return bDays - aDays; // Descending order (most days first)
      });
    };

    // Sort initial-check and upcoming-settlements phases by days_to_visit (descending, most days first)
    // Red cards (exceeding 5 days) first
    const sortDaysToVisitPhase = (phase: RenoKanbanPhase) => {
      const expiredFirst = sortPropertiesByExpired(transformProperties[phase] || []);
      
      return expiredFirst.sort((a, b) => {
        const aExceeds = exceedsDaysToVisitLimit(a);
        const bExceeds = exceedsDaysToVisitLimit(b);
        
        // Red cards (exceeding 5 days) first
        if (aExceeds && !bExceeds) return -1;
        if (!aExceeds && bExceeds) return 1;
        
        // Then sort by days_to_visit descending (most days first)
        const aDays = a.daysToVisit ?? -Infinity;
        const bDays = b.daysToVisit ?? -Infinity;
        return bDays - aDays; // Descending order (most days first)
      });
    };

    // Sort furnishing-cleaning phase by days_to_property_ready (descending, most days first)
    // Red cards (exceeding 25 days) first
    const sortFurnishingCleaningPhase = (phase: RenoKanbanPhase) => {
      const expiredFirst = sortPropertiesByExpired(transformProperties[phase] || []);
      
      return expiredFirst.sort((a, b) => {
        const aExceeds = exceedsDaysToPropertyReadyLimit(a);
        const bExceeds = exceedsDaysToPropertyReadyLimit(b);
        
        // Red cards (exceeding 25 days) first
        if (aExceeds && !bExceeds) return -1;
        if (!aExceeds && bExceeds) return 1;
        
        // Then sort by days_to_property_ready descending (most days first)
        const aDays = a.daysToPropertyReady ?? -Infinity;
        const bDays = b.daysToPropertyReady ?? -Infinity;
        return bDays - aDays; // Descending order (most days first)
      });
    };
    
    const sorted: Record<RenoKanbanPhase, Property[]> = {
      "upcoming-settlements": sortDaysToVisitPhase("upcoming-settlements"),
      "initial-check": sortDaysToVisitPhase("initial-check"),
      "upcoming": sortPropertiesByExpired(transformProperties["upcoming"] || []),
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
      activeFilters.delayedWorks === true;

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

      // Si el filtro de obras tardías está activo, verificar primero
      if (activeFilters.delayedWorks) {
        const phase = property.renoPhase;
        if (!isDelayedWork(property, phase)) {
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
      "upcoming": allProperties["upcoming"].filter(matchesAll),
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
    const sorted: typeof filtered = {
      "upcoming-settlements": sortPropertiesByExpired(filtered["upcoming-settlements"]),
      "initial-check": sortPropertiesByExpired(filtered["initial-check"]),
      "upcoming": sortPropertiesByExpired(filtered["upcoming"]),
      "reno-budget-renovator": sortPropertiesByExpired(filtered["reno-budget-renovator"]),
      "reno-budget-client": sortPropertiesByExpired(filtered["reno-budget-client"]),
      "reno-budget-start": sortPropertiesByExpired(filtered["reno-budget-start"]),
      "reno-budget": sortPropertiesByExpired(filtered["reno-budget"]), // Legacy
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
      'reno-budget-renovator': [],
      'reno-budget-client': [],
      'reno-budget-start': [],
      'reno-budget': [], // Legacy
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

  // Toggle phase collapse
  const togglePhaseCollapse = useCallback((phase: RenoKanbanPhase) => {
    setCollapsedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phase)) {
        newSet.delete(phase);
      } else {
        newSet.add(phase);
      }
      return newSet;
    });
  }, []);

  // Sort function
  const sortProperties = useCallback((
    properties: Array<Property & { currentPhase?: RenoKanbanPhase }>,
    column: SortColumn,
    direction: "asc" | "desc"
  ) => {
    return [...properties].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (column) {
        case "id":
          aValue = (a.uniqueIdFromEngagements || a.id).toLowerCase();
          bValue = (b.uniqueIdFromEngagements || b.id).toLowerCase();
          break;
        case "address":
          aValue = a.fullAddress.toLowerCase();
          bValue = b.fullAddress.toLowerCase();
          break;
        case "region":
          aValue = (a.region || "").toLowerCase();
          bValue = (b.region || "").toLowerCase();
          break;
        case "renovador":
          aValue = (a.renovador || "").toLowerCase();
          bValue = (b.renovador || "").toLowerCase();
          break;
        case "renoType":
          aValue = (a.renoType || "").toLowerCase();
          bValue = (b.renoType || "").toLowerCase();
          break;
        case "estimatedVisit":
          aValue = (a as any).estimatedVisitDate ? new Date((a as any).estimatedVisitDate).getTime() : 0;
          bValue = (b as any).estimatedVisitDate ? new Date((b as any).estimatedVisitDate).getTime() : 0;
          break;
        case "proximaActualizacion":
          aValue = a.proximaActualizacion ? new Date(a.proximaActualizacion).getTime() : 0;
          bValue = b.proximaActualizacion ? new Date(b.proximaActualizacion).getTime() : 0;
          break;
        case "progress":
          aValue = calculateOverallProgress(a.data) ?? -1;
          bValue = calculateOverallProgress(b.data) ?? -1;
          break;
        case "status":
          const aExpired = isPropertyExpired(a);
          const bExpired = isPropertyExpired(b);
          aValue = aExpired ? 1 : 0;
          bValue = bExpired ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, []);

  // Handle column sort
  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }, [sortColumn, sortDirection]);

  // Handle column visibility toggle per phase
  const toggleColumnVisibility = useCallback(async (phase: RenoKanbanPhase, columnKey: SortColumn) => {
    setVisibleColumnsByPhase(prev => {
      const newMap = new Map(prev);
      const phaseColumns = new Set(newMap.get(phase) || []);
      
      if (phaseColumns.has(columnKey)) {
        phaseColumns.delete(columnKey);
      } else {
        phaseColumns.add(columnKey);
      }
      
      newMap.set(phase, phaseColumns);
      
      // Save to Supabase
      if (user?.id) {
        supabase
          .from('user_column_preferences')
          .upsert({
            user_id: user.id,
            view_type: 'reno_kanban_list',
            phase: phase,
            visible_columns: Array.from(phaseColumns),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,view_type,phase',
          })
          .then(({ error }) => {
            if (error) {
              console.warn('[RenoKanbanBoard] Error saving column preferences:', error);
            }
          });
      }
      
      return newMap;
    });
  }, [user?.id, supabase]);

  // Get visible columns for a specific phase
  const getVisibleColumnsForPhase = useCallback((phase: RenoKanbanPhase): Set<SortColumn> => {
    return visibleColumnsByPhase.get(phase) || new Set(COLUMN_CONFIG.filter(col => col.defaultVisible).map(col => col.key));
  }, [visibleColumnsByPhase]);

  // Calculate total count for "All" (must be before early returns)
  const totalCount = useMemo(() => {
    if (!propertiesByPhaseForList) return 0;
    return Object.values(propertiesByPhaseForList).flat().length;
  }, [propertiesByPhaseForList]);

  // Filter phases based on selected filter (must be before early returns)
  const filteredPhases = useMemo(() => {
    if (selectedPhaseFilter === "all") {
      return visibleRenoKanbanColumns;
    }
    return visibleRenoKanbanColumns.filter(col => col.key === selectedPhaseFilter);
  }, [selectedPhaseFilter]);

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

  // Helper functions for sorting (used in list view)
  const sortRenoBudgetPhaseFiltered = useCallback((props: Property[]) => {
    const expiredFirst = sortPropertiesByExpired(props);
    return expiredFirst.sort((a, b) => {
      const aExceeds = a.daysToStartRenoSinceRSD !== null && a.daysToStartRenoSinceRSD !== undefined && a.daysToStartRenoSinceRSD > 25;
      const bExceeds = b.daysToStartRenoSinceRSD !== null && b.daysToStartRenoSinceRSD !== undefined && b.daysToStartRenoSinceRSD > 25;
      if (aExceeds && !bExceeds) return -1;
      if (!aExceeds && bExceeds) return 1;
      const aDays = a.daysToStartRenoSinceRSD ?? -Infinity;
      const bDays = b.daysToStartRenoSinceRSD ?? -Infinity;
      return bDays - aDays;
    });
  }, []);
  
  const sortDaysToVisitPhaseFiltered = useCallback((props: Property[]) => {
    const expiredFirst = sortPropertiesByExpired(props);
    return expiredFirst.sort((a, b) => {
      const aExceeds = a.daysToVisit !== null && a.daysToVisit !== undefined && a.daysToVisit > 5;
      const bExceeds = b.daysToVisit !== null && b.daysToVisit !== undefined && b.daysToVisit > 5;
      if (aExceeds && !bExceeds) return -1;
      if (!aExceeds && bExceeds) return 1;
      const aDays = a.daysToVisit ?? -Infinity;
      const bDays = b.daysToVisit ?? -Infinity;
      return bDays - aDays;
    });
  }, []);
  
  const sortFurnishingCleaningPhaseFiltered = useCallback((props: Property[]) => {
    const expiredFirst = sortPropertiesByExpired(props);
    return expiredFirst.sort((a, b) => {
      const aExceeds = a.daysToPropertyReady !== null && a.daysToPropertyReady !== undefined && a.daysToPropertyReady > 25;
      const bExceeds = b.daysToPropertyReady !== null && b.daysToPropertyReady !== undefined && b.daysToPropertyReady > 25;
      if (aExceeds && !bExceeds) return -1;
      if (!aExceeds && bExceeds) return 1;
      const aDays = a.daysToPropertyReady ?? -Infinity;
      const bDays = b.daysToPropertyReady ?? -Infinity;
      return bDays - aDays;
    });
  }, []);

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

    // Helper to render sort icon
    const renderSortIcon = (column: SortColumn) => {
      if (sortColumn !== column) {
        return <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />;
      }
      if (sortDirection === "asc") {
        return <ChevronUp className="h-3 w-3 text-[var(--prophero-blue-500)]" />;
      }
      if (sortDirection === "desc") {
        return <ChevronDown className="h-3 w-3 text-[var(--prophero-blue-500)]" />;
      }
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />;
    };


    return (
      <div className="flex flex-col h-full">
        {/* Sticky Phase Filter */}
        <div className="sticky top-0 z-10 bg-background border-b border-border pb-3 mb-4 pt-2">
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            {/* All Button */}
            <button
              onClick={() => setSelectedPhaseFilter("all")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0",
                selectedPhaseFilter === "all"
                  ? "bg-[var(--prophero-blue-500)] text-white"
                  : "bg-card dark:bg-[var(--prophero-gray-900)] border border-border text-foreground hover:bg-accent"
              )}
            >
              All ({totalCount})
            </button>
            
            {/* Phase Buttons */}
            {visibleRenoKanbanColumns.map((column) => {
              const count = (propertiesByPhaseForList[column.key] || []).length;
              const phaseLabel = t.kanban[column.translationKey];
              const isSelected = selectedPhaseFilter === column.key;
              
              return (
                <button
                  key={column.key}
                  onClick={() => setSelectedPhaseFilter(column.key)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0",
                    isSelected
                      ? "bg-[var(--prophero-blue-500)] text-white"
                      : "bg-card dark:bg-[var(--prophero-gray-900)] border border-border text-foreground hover:bg-accent"
                  )}
                >
                  {phaseLabel} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Properties List */}
        <div className="space-y-6 pb-4 overflow-y-auto flex-1">
          {filteredPhases.map((column) => {
            let properties = propertiesByPhaseForList[column.key] || [];
            const phaseLabel = t.kanban[column.translationKey];
            const isCollapsed = collapsedPhases.has(column.key);

            if (properties.length === 0) return null;

            // Apply phase-specific sorting first (same as kanban view)
            if (column.key === "upcoming-settlements" || column.key === "initial-check") {
              // Sort by days_to_visit descending, red cards first
              properties = sortDaysToVisitPhaseFiltered(properties);
            } else if (column.key === "reno-budget-renovator" || column.key === "reno-budget-client" || column.key === "reno-budget-start" || column.key === "reno-budget") {
              // Sort by daysToStartRenoSinceRSD descending, red cards first
              properties = sortRenoBudgetPhaseFiltered(properties);
            } else if (column.key === "furnishing-cleaning") {
              // Sort by daysToPropertyReady descending, red cards first
              properties = sortFurnishingCleaningPhaseFiltered(properties);
            } else {
              // Default: expired first
              properties = sortPropertiesByExpired(properties);
            }

            // Apply manual sorting if active (overrides phase-specific sorting)
            if (sortColumn && sortDirection) {
              properties = sortProperties(properties, sortColumn, sortDirection);
            }

          return (
            <div key={column.key} className="bg-card rounded-lg border border-border overflow-hidden">
              {/* Phase Header - Collapsible */}
              <div className="bg-accent dark:bg-[var(--prophero-gray-800)] px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => togglePhaseCollapse(column.key)}
                    className="flex items-center gap-2 hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors rounded px-2 py-1 -ml-2 flex-1 min-w-0"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform rotate-[-90deg] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform flex-shrink-0" />
                    )}
                    <h3 className="font-semibold text-foreground text-lg truncate">{phaseLabel}</h3>
                    <Badge variant="secondary" className="text-sm flex-shrink-0">
                      {properties.length}
                    </Badge>
                  </button>
                  
                  {/* Column Visibility Toggle */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Columns className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {COLUMN_CONFIG.map((colConfig) => (
                        <DropdownMenuCheckboxItem
                          key={colConfig.key}
                          checked={getVisibleColumnsForPhase(column.key).has(colConfig.key)}
                          onCheckedChange={() => toggleColumnVisibility(column.key, colConfig.key)}
                        >
                          {colConfig.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Table - Collapsible */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-accent dark:bg-[var(--prophero-gray-800)] border-b border-border">
                      <tr>
                        {getVisibleColumnsForPhase(column.key).has("id") && (
                          <th 
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                            onClick={() => handleSort("id")}
                          >
                            <div className="flex items-center gap-2">
                              ID
                              {renderSortIcon("id")}
                            </div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("address") && (
                          <th 
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                            onClick={() => handleSort("address")}
                          >
                            <div className="flex items-center gap-2">
                              Dirección
                              {renderSortIcon("address")}
                            </div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("region") && (
                          <th 
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                            onClick={() => handleSort("region")}
                          >
                            <div className="flex items-center gap-2">
                              Región
                              {renderSortIcon("region")}
                            </div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("renovador") && (
                          <th 
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                            onClick={() => handleSort("renovador")}
                          >
                            <div className="flex items-center gap-2">
                              Renovador
                              {renderSortIcon("renovador")}
                            </div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("renoType") && (
                          <th 
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                            onClick={() => handleSort("renoType")}
                          >
                            <div className="flex items-center gap-2">
                              Tipo Reno
                              {renderSortIcon("renoType")}
                            </div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("estimatedVisit") && (
                          <th 
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                            onClick={() => handleSort("estimatedVisit")}
                          >
                            <div className="flex items-center gap-2">
                              Est. Visit
                              {renderSortIcon("estimatedVisit")}
                            </div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("proximaActualizacion") && (
                          <th 
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                            onClick={() => handleSort("proximaActualizacion")}
                          >
                            <div className="flex items-center gap-2">
                              Próxima Actualización
                              {renderSortIcon("proximaActualizacion")}
                            </div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("progress") && (
                          <th 
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                            onClick={() => handleSort("progress")}
                          >
                            <div className="flex items-center gap-2">
                              Progreso
                              {renderSortIcon("progress")}
                            </div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("status") && (
                          <th 
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                            onClick={() => handleSort("status")}
                          >
                            <div className="flex items-center gap-2">
                              Estado
                              {renderSortIcon("status")}
                            </div>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {properties.map((property) => {
                        const expired = isPropertyExpired(property);
                        const isDelayed = isDelayedWork(property, column.key);
                        return (
                          <tr
                            key={property.id}
                            onClick={() => handleCardClick(property)}
                            className={cn(
                              "cursor-pointer hover:bg-accent dark:hover:bg-[var(--prophero-gray-800)] transition-colors relative",
                              expired && "border-l-4 border-l-red-100 dark:border-l-red-900/30 bg-red-50 dark:bg-red-950/10",
                              isDelayed && "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/10"
                            )}
                          >
                            {/* Alert icon in top right corner */}
                            {isDelayed && (
                              <div className="absolute top-2 right-2 z-10">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              </div>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("id") && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">
                                    {property.uniqueIdFromEngagements || property.id}
                                  </span>
                                  {expired && (
                                    <Badge className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-0">
                                      {t.propertyCard.expired}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("address") && (
                              <td className="px-4 py-3">
                                <div className="flex items-start gap-2 max-w-xs">
                                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  <span className="text-sm text-foreground break-words">
                                    {property.fullAddress}
                                  </span>
                                </div>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("region") && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-muted-foreground">
                                  {property.region || "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("renovador") && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm text-foreground">
                                    {property.renovador || "N/A"}
                                  </span>
                                </div>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("renoType") && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                {property.renoType ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {property.renoType}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">N/A</span>
                                )}
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("estimatedVisit") && (
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
                            )}
                            {getVisibleColumnsForPhase(column.key).has("proximaActualizacion") && (
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
                            )}
                            {getVisibleColumnsForPhase(column.key).has("progress") && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                {(() => {
                                  const progress = calculateOverallProgress(property.data);
                                  return progress !== undefined ? (
                                    <div className="flex items-center gap-2 min-w-[100px]">
                                      <span className="text-sm font-semibold text-foreground w-10">
                                        {Math.round(progress)}%
                                      </span>
                                      <Progress value={progress} className="flex-1 h-2" />
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">N/A</span>
                                  );
                                })()}
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("status") && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                {expired ? (
                                  <Badge className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-0">
                                    {t.propertyCard.expired}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    {t.propertyCard.workInProgress || "Active"}
                                  </Badge>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        </div>
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

