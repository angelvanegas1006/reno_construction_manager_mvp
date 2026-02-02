"use client";

import { useState, useMemo, useEffect, startTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { RenoKanbanColumn } from "./reno-kanban-column";
import { ColumnSelectorDialog } from "./column-selector-dialog";
import { VistralLogoLoader } from "./vistral-logo-loader";
import { Property } from "@/lib/property-storage";
import { useRenoProperties } from "@/contexts/reno-properties-context";
import { calculateOverallProgress } from "@/lib/property-validation";
import { useI18n } from "@/lib/i18n";
import { visibleRenoKanbanColumns, RenoKanbanPhase, type RenoKanbanColumn as RenoKanbanColumnConfig } from "@/lib/reno-kanban-config";
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
import { toast } from "sonner";

type ViewMode = "kanban" | "list";

interface RenoKanbanBoardProps {
  searchQuery: string;
  filters?: KanbanFilters;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  /** When set (e.g. kanban-projects), use this instead of context propertiesByPhase */
  propertiesByPhaseOverride?: Record<RenoKanbanPhase, Property[]>;
  /** When set (e.g. kanban-projects), use these columns instead of visibleRenoKanbanColumns */
  visibleColumnsOverride?: RenoKanbanColumnConfig[];
  /** Query param "from" when navigating to property detail (default "kanban") */
  fromParam?: string;
}

// Dummy data and helper functions removed - now using Supabase

type SortColumn = "id" | "address" | "region" | "renovador" | "renoType" | "estimatedVisit" | "proximaActualizacion" | "progress" | "status" | "daysToVisit" | "daysToStartRenoSinceRSD" | "renoDuration" | "daysToPropertyReady";
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
  { key: "daysToVisit", label: "Días para visitar", defaultVisible: false },
  { key: "daysToStartRenoSinceRSD", label: "Días desde la firma", defaultVisible: false },
  { key: "renoDuration", label: "Duración de la obra", defaultVisible: false },
  { key: "daysToPropertyReady", label: "Días para propiedad lista", defaultVisible: false },
  { key: "progress", label: "Progreso", defaultVisible: true },
  { key: "status", label: "Estado", defaultVisible: true },
];

export function RenoKanbanBoard({ searchQuery, filters, viewMode = "kanban", onViewModeChange, propertiesByPhaseOverride, visibleColumnsOverride, fromParam = "kanban" }: RenoKanbanBoardProps) {
  const { t, language } = useI18n();
  const { user } = useSupabaseAuth();
  const supabase = createClient();
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<RenoKanbanPhase>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<RenoKanbanPhase | "all">("all");

  const visibleColumns = visibleColumnsOverride ?? visibleRenoKanbanColumns;
  
  // Column visibility state per phase - Map<phase, Set<columns>>
  const [visibleColumnsByPhase, setVisibleColumnsByPhase] = useState<Map<RenoKanbanPhase, Set<SortColumn>>>(() => {
    const defaultColumns = new Set(COLUMN_CONFIG.filter(col => col.defaultVisible).map(col => col.key));
    const map = new Map<RenoKanbanPhase, Set<SortColumn>>();
    visibleColumns.forEach(col => {
      map.set(col.key, new Set(defaultColumns));
    });
    return map;
  });
  const [isLoadingColumns, setIsLoadingColumns] = useState(true);
  const [columnSelectorOpen, setColumnSelectorOpen] = useState<{ phase: RenoKanbanPhase | null }>({ phase: null });
  
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

  // Load properties from shared context (no duplicate fetch)
  const { propertiesByPhase: supabasePropertiesByPhase, loading: supabaseLoading, error: supabaseError, refetchProperties } = useRenoProperties();

  const handleCardClick = (property: Property) => {
    // For construction manager, navigate to view-only page
    // Always go to "tareas" tab when clicking from kanban
    // Pass viewMode as query param to remember the current view
    startTransition(() => {
      router.push(`/reno/construction-manager/property/${property.id}?tab=tareas&viewMode=${viewMode}&from=${fromParam}`);
    });
  };

  const handleAssignSiteManager = useCallback(async (propertyId: string, email: string | null) => {
    try {
      const { error } = await supabase
        .from("properties")
        .update({
          assigned_site_manager_email: email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", propertyId);
      if (error) throw error;
      await refetchProperties();
      toast.success(language === "es" ? "Jefe de obra asignado" : "Site manager assigned");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al asignar";
      toast.error(msg);
    }
  }, [supabase, refetchProperties, language]);

  // Use properties from Supabase or override (e.g. kanban-projects)
  const transformProperties = useMemo(() => {
    return propertiesByPhaseOverride ?? supabasePropertiesByPhase;
  }, [propertiesByPhaseOverride, supabasePropertiesByPhase]);

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
      "upcoming": [],
      "reno-in-progress": [],
      "furnishing": [],
      "final-check": [],
      "cleaning": [],
      "furnishing-cleaning": [], // Legacy
      "reno-fixes": [],
      "done": [],
      "orphaned": [],
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

    // Sort furnishing and cleaning phases by days_to_property_ready (descending, most days first)
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

    // Sort reno-in-progress phase by renoDuration (descending, most days first)
    // Red cards (exceeding duration limit) first
    const sortRenoInProgressPhase = (phase: RenoKanbanPhase) => {
      const expiredFirst = sortPropertiesByExpired(transformProperties[phase] || []);
      const exceedsDurationLimit = (prop: Property): boolean => {
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
      
      return expiredFirst.sort((a, b) => {
        const aExceeds = exceedsDurationLimit(a);
        const bExceeds = exceedsDurationLimit(b);
        
        // Red cards (exceeding limit) first
        if (aExceeds && !bExceeds) return -1;
        if (!aExceeds && bExceeds) return 1;
        
        // Then sort by renoDuration descending (most days first)
        // Properties without this field go to the end
        const aDuration = a.renoDuration ?? -Infinity;
        const bDuration = b.renoDuration ?? -Infinity;
        return bDuration - aDuration; // Descending order (most days first)
      });
    };

    // Sort final-check phase by days_to_property_ready (descending, most days first)
    // Red cards (exceeding daysToPropertyReady > 25) first
    const sortFinalCheckPhase = (phase: RenoKanbanPhase) => {
      const expiredFirst = sortPropertiesByExpired(transformProperties[phase] || []);
      
      const exceedsDaysToPropertyReadyLimit = (prop: Property): boolean => {
        if (!prop.daysToPropertyReady) return false;
        return prop.daysToPropertyReady > 25;
      };
      
      return expiredFirst.sort((a, b) => {
        const aExceeds = exceedsDaysToPropertyReadyLimit(a);
        const bExceeds = exceedsDaysToPropertyReadyLimit(b);
        
        // Red cards (exceeding limit) first
        if (aExceeds && !bExceeds) return -1;
        if (!aExceeds && bExceeds) return 1;
        
        // Then sort by daysToPropertyReady descending (most days first)
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
      "upcoming": sortPropertiesByExpired(transformProperties["upcoming"] || []),
      "reno-in-progress": sortRenoInProgressPhase("reno-in-progress"),
      "furnishing": sortFurnishingCleaningPhase("furnishing"),
      "final-check": sortFinalCheckPhase("final-check"),
      "cleaning": sortFurnishingCleaningPhase("cleaning"),
      "furnishing-cleaning": sortFurnishingCleaningPhase("furnishing-cleaning"), // Legacy
      "reno-fixes": sortPropertiesByExpired(transformProperties["reno-fixes"] || []),
      "done": sortPropertiesByExpired(transformProperties["done"] || []),
      "orphaned": [],
    };
    
    // Debug log removed for production
    
    return sorted;
  }, [isMounted, supabaseLoading, transformProperties]);

  // Filter properties based on search query and filters
  const filteredProperties = useMemo(() => {
    // Debug log removed for production
    
    const activeFilters = filters || {
      renovatorNames: [],
      technicalConstructors: [],
      areaClusters: [],
      delayedWorks: false,
      propertyTypes: [],
    };

    const hasActiveFilters = 
      activeFilters.renovatorNames.length > 0 ||
      activeFilters.technicalConstructors.length > 0 ||
      activeFilters.areaClusters.length > 0 ||
      activeFilters.delayedWorks ||
      (activeFilters.propertyTypes?.length ?? 0) > 0;

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
      
      // furnishing and cleaning: daysToPropertyReady > 25
      if ((phase === "furnishing" || phase === "cleaning") && property.daysToPropertyReady) {
        return property.daysToPropertyReady > 25;
      }
      
      // Legacy furnishing-cleaning: daysToPropertyReady > 25
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
      const propertyTypeRaw = (property as any).propertyType ?? (property as any).type ?? '';
      const propertyTypeNormalized = typeof propertyTypeRaw === 'string' ? propertyTypeRaw.trim().toLowerCase() : '';

      // Lógica OR: la propiedad debe cumplir al menos uno de los filtros seleccionados
      // Dentro de cada tipo de filtro también es OR (cualquiera de los seleccionados)
      let matchesRenovator = false;
      let matchesTechnical = false;
      let matchesArea = false;
      let matchesType = false;

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

      // Si hay filtros de tipo (Unit / Building), verificar si coincide.
      // En el primer kanban, Project/WIP asignados al foreman (assigned_site_manager_email) también pasan el filtro de tipo.
      const selectedTypes = activeFilters.propertyTypes ?? [];
      if (selectedTypes.length > 0 && propertyTypeNormalized) {
        matchesType = selectedTypes.some(t => propertyTypeNormalized === t.trim().toLowerCase());
        if (!matchesType && fromParam === "kanban" && user?.email) {
          const isProjectOrWip = ["project", "wip"].includes(propertyTypeNormalized);
          const assigned = (property as any).supabaseProperty?.assigned_site_manager_email;
          const isAssignedToMe = assigned != null && String(assigned).trim().toLowerCase() === user.email.trim().toLowerCase();
          if (isProjectOrWip && isAssignedToMe) matchesType = true;
        }
      }

      // OR lógico entre tipos de filtros: debe cumplir al menos uno de los tipos de filtros activos
      // Si un tipo de filtro no está activo, no se considera en el OR
      const activeFilterTypes: boolean[] = [];
      if (activeFilters.renovatorNames.length > 0) activeFilterTypes.push(matchesRenovator);
      if (activeFilters.technicalConstructors.length > 0) activeFilterTypes.push(matchesTechnical);
      if (activeFilters.areaClusters.length > 0) activeFilterTypes.push(matchesArea);
      if (selectedTypes.length > 0) activeFilterTypes.push(matchesType);

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
      "upcoming": allProperties["upcoming"].filter(matchesAll),
      "reno-in-progress": allProperties["reno-in-progress"].filter(matchesAll),
      "furnishing": allProperties["furnishing"].filter(matchesAll),
      "final-check": allProperties["final-check"].filter(matchesAll),
      "cleaning": allProperties["cleaning"].filter(matchesAll),
      "furnishing-cleaning": allProperties["furnishing-cleaning"].filter(matchesAll), // Legacy
      "reno-fixes": allProperties["reno-fixes"].filter(matchesAll),
      "done": allProperties["done"].filter(matchesAll),
      "orphaned": allProperties["orphaned"].filter(matchesAll),
    };
    
    // Debug: Check filtered results (only in development and when filters are active)
    if (process.env.NODE_ENV === "development" && (hasActiveFilters || query.trim())) {
      console.log('[RenoKanbanBoard] After filtering:', {
        furnishingCount: filtered.furnishing.length,
        cleaningCount: filtered.cleaning.length,
        furnishingIds: filtered.furnishing.slice(0, 3).map(p => p.id),
        cleaningIds: filtered.cleaning.slice(0, 3).map(p => p.id),
        hasActiveFilters,
        query,
        filters: activeFilters,
      });
    }
    
    // Debug log removed for production

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
      "upcoming": sortPropertiesByExpired(filtered["upcoming"]),
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
      "furnishing": (() => {
        const expiredFirst = sortPropertiesByExpired(filtered["furnishing"]);
        // Sort: first red cards (exceeding 25 days), then by days_to_property_ready descending
        return expiredFirst.sort((a, b) => {
          const exceedsDaysLimit = (prop: Property): boolean => {
            return prop.daysToPropertyReady !== null && 
                   prop.daysToPropertyReady !== undefined && 
                   prop.daysToPropertyReady > 25;
          };
          
          const aExceeds = exceedsDaysLimit(a);
          const bExceeds = exceedsDaysLimit(b);
          
          // Red cards (exceeding 25 days) first
          if (aExceeds && !bExceeds) return -1;
          if (!aExceeds && bExceeds) return 1;
          
          // Then sort by days_to_property_ready descending (most days first)
          const aDays = a.daysToPropertyReady ?? -Infinity;
          const bDays = b.daysToPropertyReady ?? -Infinity;
          return bDays - aDays; // Descending order (most days first)
        });
      })(),
      "final-check": (() => {
        const expiredFirst = sortPropertiesByExpired(filtered["final-check"]);
        // Sort by days_to_property_ready descending (most days first)
        return expiredFirst.sort((a, b) => {
          const aDays = a.daysToPropertyReady ?? -Infinity;
          const bDays = b.daysToPropertyReady ?? -Infinity;
          return bDays - aDays; // Descending order (most days first)
        });
      })(),
      "cleaning": (() => {
        const expiredFirst = sortPropertiesByExpired(filtered["cleaning"]);
        // Sort: first red cards (exceeding 25 days), then by days_to_property_ready descending
        return expiredFirst.sort((a, b) => {
          const exceedsDaysLimit = (prop: Property): boolean => {
            return prop.daysToPropertyReady !== null && 
                   prop.daysToPropertyReady !== undefined && 
                   prop.daysToPropertyReady > 25;
          };
          
          const aExceeds = exceedsDaysLimit(a);
          const bExceeds = exceedsDaysLimit(b);
          
          // Red cards (exceeding 25 days) first
          if (aExceeds && !bExceeds) return -1;
          if (!aExceeds && bExceeds) return 1;
          
          // Then sort by days_to_property_ready descending (most days first)
          const aDays = a.daysToPropertyReady ?? -Infinity;
          const bDays = b.daysToPropertyReady ?? -Infinity;
          return bDays - aDays; // Descending order (most days first)
        });
      })(),
      "furnishing-cleaning": sortPropertiesByExpired(filtered["furnishing-cleaning"]), // Legacy
      "reno-fixes": sortPropertiesByExpired(filtered["reno-fixes"]),
      "done": sortPropertiesByExpired(filtered["done"]),
      "orphaned": sortPropertiesByExpired(filtered["orphaned"]),
    };

    return sorted;
  }, [searchQuery, filters, allProperties]);

  // Find first matching property when search query changes
  const highlightedPropertyId = useMemo(() => {
    if (!searchQuery.trim()) {
      return null;
    }
    
    for (const column of visibleColumns) {
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
    for (const column of visibleColumns) {
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
      'furnishing': [],
      'final-check': [],
      'cleaning': [],
      'furnishing-cleaning': [], // Legacy
      'reno-fixes': [],
      'done': [],
      'orphaned': [],
    };

    visibleColumns.forEach((column) => {
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
        case "daysToVisit":
          aValue = a.daysToVisit ?? -1;
          bValue = b.daysToVisit ?? -1;
          break;
        case "daysToStartRenoSinceRSD":
          aValue = a.daysToStartRenoSinceRSD ?? -1;
          bValue = b.daysToStartRenoSinceRSD ?? -1;
          break;
        case "renoDuration":
          aValue = a.renoDuration ?? -1;
          bValue = b.renoDuration ?? -1;
          break;
        case "daysToPropertyReady":
          aValue = a.daysToPropertyReady ?? -1;
          bValue = b.daysToPropertyReady ?? -1;
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

  // Handle column visibility save (called from ColumnSelectorDialog)
  const handleColumnSave = useCallback(async (phase: RenoKanbanPhase, visibleColumns: Set<SortColumn>, columnOrder?: SortColumn[]) => {
    setVisibleColumnsByPhase(prev => {
      const newMap = new Map(prev);
      newMap.set(phase, visibleColumns);
      return newMap;
    });
    
    // Save to Supabase
    if (user?.id) {
      supabase
        .from('user_column_preferences')
        .upsert({
          user_id: user.id,
          view_type: 'reno_kanban_list',
          phase: phase,
          visible_columns: Array.from(visibleColumns),
          column_order: columnOrder ? Array.from(columnOrder) : null,
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
      return visibleColumns;
    }
    return visibleColumns.filter(col => col.key === selectedPhaseFilter);
  }, [selectedPhaseFilter]);

  // Helper functions for sorting (used in list view) - MUST be before early returns
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
        <VistralLogoLoader />
      </div>
    );
  }

  // Render List View
  const renderListView = () => {
    const hasAnyProperties = visibleColumns.some(
      column => (propertiesByPhaseForList[column.key] || []).length > 0
    );

    if (!hasAnyProperties) {
      return (
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">{t.kanban.noPropertiesFound}</p>
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
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 flex items-center gap-2",
                selectedPhaseFilter === "all"
                  ? "bg-[var(--prophero-blue-500)] text-white"
                  : "bg-card dark:bg-[var(--prophero-gray-900)] border border-border text-foreground hover:bg-muted/50 dark:hover:bg-[var(--prophero-gray-800)]"
              )}
            >
              <span>All ({totalCount})</span>
              {(() => {
                const totalAlertCount = visibleColumns.reduce((sum, col) => {
                  const props = propertiesByPhaseForList[col.key] || [];
                  return sum + props.filter((p: Property) => {
                    return isDelayedWork(p, col.key) || isPropertyExpired(p);
                  }).length;
                }, 0);
                return totalAlertCount > 0 ? (
                  <span className="text-xs font-medium text-white bg-red-500 px-2 py-0.5 rounded-full">
                    {totalAlertCount}
                  </span>
                ) : null;
              })()}
            </button>
            
            {/* Phase Buttons */}
            {visibleColumns.map((column) => {
              const properties = propertiesByPhaseForList[column.key] || [];
              const count = properties.length;
              const alertCount = properties.filter(p => {
                return isDelayedWork(p, column.key) || isPropertyExpired(p);
              }).length;
              const phaseLabel = t.kanban[column.translationKey];
              const isSelected = selectedPhaseFilter === column.key;
              
              return (
                <button
                  key={column.key}
                  onClick={() => setSelectedPhaseFilter(column.key)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 flex items-center gap-2",
                    isSelected
                      ? "bg-[var(--prophero-blue-500)] text-white"
                      : "bg-card dark:bg-[var(--prophero-gray-900)] border border-border text-foreground hover:bg-muted/50 dark:hover:bg-[var(--prophero-gray-800)]"
                  )}
                >
                  <span>{phaseLabel} ({count})</span>
                  {alertCount > 0 && (
                    <span className="text-xs font-medium text-white bg-red-500 px-2 py-0.5 rounded-full">
                      {alertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Properties List */}
        <div className="space-y-6 pb-4 overflow-y-auto flex-1">
          {filteredPhases.map((column) => {
            // Use filteredProperties directly to maintain kanban sorting logic
            let properties = filteredProperties[column.key] || [];
            const phaseLabel = t.kanban[column.translationKey];
            const isCollapsed = collapsedPhases.has(column.key);

            if (properties.length === 0) return null;

          // Apply manual sorting if active (this will override kanban sorting)
          if (sortColumn && sortDirection) {
            properties = sortProperties(properties, sortColumn, sortDirection);
          }

          // Helper function to check if property should be marked in red (same logic as cards)
          const shouldMarkRed = (prop: Property, phase: RenoKanbanPhase): boolean => {
            // Check duration limit for reno-in-progress
            if (phase === "reno-in-progress" && prop.renoDuration && prop.renoType) {
              const renoTypeLower = prop.renoType.toLowerCase();
              const duration = prop.renoDuration;
              if (renoTypeLower.includes('light') && duration > 30) return true;
              if (renoTypeLower.includes('medium') && duration > 60) return true;
              if (renoTypeLower.includes('major') && duration > 120) return true;
            }
            
            // Check Days to Start Reno limit for budget phases
            const budgetPhases = ["reno-budget-renovator", "reno-budget-client", "reno-budget-start"];
            if (budgetPhases.includes(phase) && prop.daysToStartRenoSinceRSD && prop.daysToStartRenoSinceRSD > 25) {
              return true;
            }
            
            // Check Days to Visit limit for initial-check and upcoming-settlements
            if ((phase === "initial-check" || phase === "upcoming-settlements") && prop.daysToVisit && prop.daysToVisit > 5) {
              return true;
            }
            
            // Check Days to Property Ready limit for furnishing, cleaning, and final-check
            if ((phase === "furnishing" || phase === "cleaning" || phase === "final-check") && prop.daysToPropertyReady && prop.daysToPropertyReady > 25) {
              return true;
            }
            // Legacy furnishing-cleaning
            if (phase === "furnishing-cleaning" && prop.daysToPropertyReady && prop.daysToPropertyReady > 25) {
              return true;
            }
            
            return false;
          };

          return (
            <div key={column.key} className="bg-card rounded-lg border border-border overflow-hidden">
              {/* Phase Header - Collapsible */}
              <div className="bg-muted/50 dark:bg-[var(--prophero-gray-900)] px-4 py-3 border-b border-border">
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
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant="secondary" className="text-sm">
                        {properties.length}
                      </Badge>
                      {(() => {
                        const alertCount = properties.filter(p => {
                          return isDelayedWork(p, column.key) || isPropertyExpired(p);
                        }).length;
                        return alertCount > 0 ? (
                          <Badge className="text-xs bg-red-500 text-white border-0">
                            {alertCount}
                          </Badge>
                        ) : null;
                      })()}
                    </div>
                  </button>
                  
                  {/* Column Visibility Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setColumnSelectorOpen({ phase: column.key });
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Table - Collapsible */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 dark:bg-[var(--prophero-gray-900)] border-b border-border">
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
                        {getVisibleColumnsForPhase(column.key).has("daysToVisit") && (
                          <th 
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                            onClick={() => handleSort("daysToVisit")}
                          >
                            <div className="flex items-center gap-2">
                              Días para visitar
                              {renderSortIcon("daysToVisit")}
                            </div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("daysToStartRenoSinceRSD") && (
                          <th 
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                            onClick={() => handleSort("daysToStartRenoSinceRSD")}
                          >
                            <div className="flex items-center gap-2">
                              Días desde la firma
                              {renderSortIcon("daysToStartRenoSinceRSD")}
                            </div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("renoDuration") && (
                          <th 
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                            onClick={() => handleSort("renoDuration")}
                          >
                            <div className="flex items-center gap-2">
                              Duración de la obra
                              {renderSortIcon("renoDuration")}
                            </div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("daysToPropertyReady") && (
                          <th 
                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                            onClick={() => handleSort("daysToPropertyReady")}
                          >
                            <div className="flex items-center gap-2">
                              Días para propiedad lista
                              {renderSortIcon("daysToPropertyReady")}
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
                        const isRed = shouldMarkRed(property, column.key);
                        return (
                          <tr
                            key={property.id}
                            onClick={() => handleCardClick(property)}
                            className={cn(
                              "cursor-pointer hover:bg-accent dark:hover:bg-[var(--prophero-gray-800)] transition-colors relative",
                              expired && "bg-red-50 dark:bg-red-950/10",
                              isRed && "bg-red-50 dark:bg-red-950/10"
                            )}
                          >
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
                                {property.renoType ? (() => {
                                  const typeLower = property.renoType.toLowerCase();
                                  let badgeClass = '';
                                  
                                  // Light Reno: Verde fuerte sin borde ni hover
                                  if (typeLower.includes('light')) {
                                    badgeClass = 'bg-green-600 dark:bg-green-600 text-white dark:text-white border-0';
                                  }
                                  // Medium Reno: Verde claro
                                  else if (typeLower.includes('medium')) {
                                    badgeClass = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/30';
                                  }
                                  // Major Reno: Amarillo-naranja claro
                                  else if (typeLower.includes('major')) {
                                    badgeClass = 'bg-yellow-200 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-800/30';
                                  }
                                  // Default: verde claro
                                  else {
                                    badgeClass = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/30';
                                  }
                                  
                                  return (
                                    <Badge className={cn(badgeClass, "text-xs font-medium px-2 py-1 hover:opacity-100")}>
                                      {property.renoType}
                                    </Badge>
                                  );
                                })() : (
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
                            {getVisibleColumnsForPhase(column.key).has("daysToVisit") && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {property.daysToVisit !== null && property.daysToVisit !== undefined 
                                    ? `${property.daysToVisit} días`
                                    : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("daysToStartRenoSinceRSD") && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {property.daysToStartRenoSinceRSD !== null && property.daysToStartRenoSinceRSD !== undefined 
                                    ? `${property.daysToStartRenoSinceRSD} días`
                                    : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("renoDuration") && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {property.renoDuration !== null && property.renoDuration !== undefined 
                                    ? `${property.renoDuration} días`
                                    : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("daysToPropertyReady") && (
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {property.daysToPropertyReady !== null && property.daysToPropertyReady !== undefined 
                                    ? `${property.daysToPropertyReady} días`
                                    : "N/A"}
                                </span>
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
                                    {(property as any)?.supabaseProperty?.['Set Up Status'] || 
                                     property.status || 
                                     t.propertyCard.workInProgress || 
                                     "Active"}
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
        {visibleColumns.map((column) => {
          const properties = filteredProperties[column.key] || [];
          const title = t.kanban[column.translationKey];
          
          // Debug log removed for production
          
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
              fromParam={fromParam}
              onAssignSiteManager={fromParam === "kanban-projects" ? handleAssignSiteManager : undefined}
            />
          );
        })}
      </div>

      {/* Desktop: Horizontal layout */}
      <div className="hidden md:flex h-full gap-4 px-1" style={{ minWidth: "fit-content" }}>
        {visibleColumns.map((column) => {
          const properties = filteredProperties[column.key] || [];
          const title = t.kanban[column.translationKey];
          
          // Debug log removed for production
          
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
              fromParam={fromParam}
              onAssignSiteManager={fromParam === "kanban-projects" ? handleAssignSiteManager : undefined}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {viewMode === "list" ? renderListView() : renderKanbanView()}
      
      {/* Column Selector Dialog */}
      {columnSelectorOpen.phase && (
        <ColumnSelectorDialog
          open={!!columnSelectorOpen.phase}
          onOpenChange={(open) => {
            if (!open) {
              setColumnSelectorOpen({ phase: null });
            }
          }}
          columns={COLUMN_CONFIG}
          visibleColumns={getVisibleColumnsForPhase(columnSelectorOpen.phase)}
          phase={columnSelectorOpen.phase}
          phaseLabel={t.kanban[visibleColumns.find(col => col.key === columnSelectorOpen.phase)?.translationKey || "upcomingSettlements"]}
          onSave={(visibleColumns, columnOrder) => {
            if (columnSelectorOpen.phase) {
              handleColumnSave(columnSelectorOpen.phase, visibleColumns, columnOrder);
            }
          }}
        />
      )}
    </>
  );
}

