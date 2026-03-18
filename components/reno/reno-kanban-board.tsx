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
import { visibleRenoKanbanColumns, RenoKanbanPhase, PROJECT_KANBAN_PHASE_LABELS, MATURATION_PHASE_LABELS, ARCHITECT_PHASE_LABELS, type RenoKanbanColumn as RenoKanbanColumnConfig } from "@/lib/reno-kanban-config";
import { sortPropertiesByExpired, isPropertyExpired, isDelayedWork, shouldShowExpiredBadge } from "@/lib/property-sorting";
import { trackEventWithDevice } from "@/lib/mixpanel";
import { KanbanFilters } from "./reno-kanban-filters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Calendar, User, Wrench, Clock, ChevronDown, ChevronUp, ArrowUpDown, Columns, Settings, AlertTriangle, Download } from "lucide-react";
import { CsvExportDialog, type CsvColumn } from "./csv-export-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PropertySidePanel } from "./property-side-panel";
import { ProjectSidePanel } from "./project-side-panel";
import { createClient } from "@/lib/supabase/client";
import { getForemanEmailFromName } from "@/lib/supabase/user-name-utils";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "sonner";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";

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
  /** "property" = cards are properties (default); "project" = cards are projects */
  viewLevel?: "property" | "project";
  /** When viewLevel === "project", use this for cards (projects by phase) */
  projectsByPhaseOverride?: Record<RenoKanbanPhase, ProjectRow[]>;
  /** When viewLevel === "project", map project id → linked properties for cards */
  propertiesByProjectId?: Record<string, Property[]>;
}

// Dummy data and helper functions removed - now using Supabase

type SortColumn = "id" | "address" | "region" | "renovador" | "renoType" | "estimatedVisit" | "proximaActualizacion" | "progress" | "status" | "daysToVisit" | "daysToStartRenoSinceRSD" | "renoDuration" | "daysToPropertyReady" | "budgetPhReadyDate" | "renovatorBudgetApprovalDate" | "initialVisitDate" | "estRenoStartDate" | "renoStartDate" | "renoEstimatedEndDate" | "renoEndDate";
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
  { key: "budgetPhReadyDate", label: "Budget PH ready date", defaultVisible: false },
  { key: "renovatorBudgetApprovalDate", label: "Renovator budget approval date", defaultVisible: false },
  { key: "initialVisitDate", label: "Fecha de visita inicial", defaultVisible: false },
  { key: "estRenoStartDate", label: "Est. reno start date", defaultVisible: false },
  { key: "renoStartDate", label: "Reno start date", defaultVisible: false },
  { key: "renoEstimatedEndDate", label: "Reno estimated end date", defaultVisible: false },
  { key: "renoEndDate", label: "Reno end date", defaultVisible: false },
];

const DATE_COLUMN_KEYS: SortColumn[] = [
  "budgetPhReadyDate",
  "renovatorBudgetApprovalDate",
  "initialVisitDate",
  "estRenoStartDate",
  "renoStartDate",
  "renoEstimatedEndDate",
  "renoEndDate",
];

const BASE_COLS: SortColumn[] = ["address", "region", "renoType"];

const DEFAULT_COLUMNS_BY_PHASE: Partial<Record<RenoKanbanPhase, SortColumn[]>> = {
  "upcoming-settlements": [...BASE_COLS, "daysToVisit", "daysToStartRenoSinceRSD", "estimatedVisit"],
  "initial-check": [...BASE_COLS, "daysToVisit", "daysToStartRenoSinceRSD", "initialVisitDate"],
  "reno-budget-renovator": [...BASE_COLS, "renovador", "estRenoStartDate", "daysToStartRenoSinceRSD"],
  "reno-budget-client": [...BASE_COLS, "renovador", "estRenoStartDate", "daysToStartRenoSinceRSD"],
  "reno-budget-start": [...BASE_COLS, "renovador", "estRenoStartDate", "renoStartDate"],
  "reno-in-progress": [...BASE_COLS, "renovador", "renoDuration", "proximaActualizacion", "renoStartDate", "renoEstimatedEndDate", "progress"],
  "furnishing": [...BASE_COLS, "renovador", "daysToPropertyReady", "renoEndDate"],
  "final-check": [...BASE_COLS, "renovador", "daysToPropertyReady", "renoEndDate"],
  "pendiente-suministros": [...BASE_COLS, "renovador", "daysToPropertyReady", "renoEndDate"],
  "cleaning": [...BASE_COLS, "renovador", "daysToPropertyReady", "renoEndDate"],
};

function getDefaultColumnsForPhase(phase: RenoKanbanPhase): Set<SortColumn> {
  const phaseDefaults = DEFAULT_COLUMNS_BY_PHASE[phase];
  if (phaseDefaults) return new Set(phaseDefaults);
  return new Set([...BASE_COLS, "progress"]);
}

export function RenoKanbanBoard({ searchQuery, filters, viewMode = "kanban", onViewModeChange, propertiesByPhaseOverride, visibleColumnsOverride, fromParam = "kanban", viewLevel = "property", projectsByPhaseOverride, propertiesByProjectId }: RenoKanbanBoardProps) {
  const { t, language } = useI18n();
  const { user } = useSupabaseAuth();
  const supabase = createClient();
  const [isHovered, setIsHovered] = useState(false);

  const columnConfigWithTranslations = useMemo((): ColumnConfig[] => {
    const dateLabels: Partial<Record<SortColumn, string>> = {
      budgetPhReadyDate: t.propertyDates?.budgetPhReadyDate,
      renovatorBudgetApprovalDate: t.propertyDates?.renovatorBudgetApprovalDate,
      initialVisitDate: t.propertyDates?.initialVisitDate,
      estRenoStartDate: t.propertyDates?.estRenoStartDate,
      renoStartDate: t.propertyDates?.renoStartDate,
      renoEstimatedEndDate: t.propertyDates?.renoEstimatedEndDate,
      renoEndDate: t.propertyDates?.renoEndDate,
    };
    return COLUMN_CONFIG.map((col) => ({
      ...col,
      label: DATE_COLUMN_KEYS.includes(col.key) && dateLabels[col.key] ? dateLabels[col.key]! : col.label,
    }));
  }, [t.propertyDates]);
  const [isMounted, setIsMounted] = useState(false);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<RenoKanbanPhase>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<RenoKanbanPhase | "all">("all");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedProjectRow, setSelectedProjectRow] = useState<ProjectRow | null>(null);
  const [csvExportOpen, setCsvExportOpen] = useState(false);
  const [csvExportMode, setCsvExportMode] = useState<"property" | "project">("property");

  type ProjectSortCol = "name" | "projectId" | "type" | "investmentType" | "area" | "renovator" | "status" | "propertiesCount" | "projectStartDate" | "settlementDate" | "scouter" | "architect" | "excludedEcu" | "measurementDate" | "measurementLimit" | "preliminaryDate" | "preliminaryLimit" | "ecuUploadDate" | "ecuEstEndDate" | "adjustmentStartDate" | "adjustmentLimit" | "ecuContact" | "estProperties" | "propertiesToConvert" | "arrasDeadline" | "draftOrderDate" | "projectDraftDate" | "draftValidationDate" | "projectEndDate" | "projectArchitectDate" | "ecuFirstStartDate" | "ecuFirstEndDate" | "ecuFinalStartDate" | "ecuFinalEndDate" | "ecuDeliveryDate" | "definitiveValidationDate" | "architectFee" | "renovationSpend" | "lead" | "operationName" | "estimatedSettlementDate" | "estRenoStartDateProj" | "renovationExecutor";
  const [projectSortCol, setProjectSortCol] = useState<ProjectSortCol | null>(null);
  const [projectSortDir, setProjectSortDir] = useState<"asc" | "desc" | null>(null);
  const isArchitectView = fromParam === "architect-kanban";

  const visibleColumns = visibleColumnsOverride ?? visibleRenoKanbanColumns;
  
  // Column visibility state per phase - Map<phase, Set<columns>>
  const [visibleColumnsByPhase, setVisibleColumnsByPhase] = useState<Map<RenoKanbanPhase, Set<SortColumn>>>(() => {
    const map = new Map<RenoKanbanPhase, Set<SortColumn>>();
    visibleColumns.forEach(col => {
      map.set(col.key, getDefaultColumnsForPhase(col.key));
    });
    return map;
  });
  const [isLoadingColumns, setIsLoadingColumns] = useState(true);
  const [columnSelectorOpen, setColumnSelectorOpen] = useState<{ phase: RenoKanbanPhase | null }>({ phase: null });

  // Project column visibility
  const PROJECT_COL_CONFIG: { key: ProjectSortCol; label: string; defaultVisible: boolean; category?: "shown" | "popular" | "hidden" }[] = useMemo(() => {
    const base: { key: ProjectSortCol; label: string; defaultVisible: boolean; category?: "shown" | "popular" | "hidden" }[] = [
      { key: "projectId", label: "ID", defaultVisible: true },
      { key: "name", label: "Nombre", defaultVisible: true },
      { key: "propertiesCount", label: "Propiedades", defaultVisible: true },
      ...(!isArchitectView ? [{ key: "scouter" as ProjectSortCol, label: "Scouter", defaultVisible: true }] : []),
      { key: "architect", label: "Arquitecto", defaultVisible: true },
      { key: "excludedEcu", label: "ECU", defaultVisible: true },
      { key: "type", label: "Tipo", defaultVisible: true },
      ...(!isArchitectView ? [{ key: "investmentType" as ProjectSortCol, label: "Inversión", defaultVisible: true }] : []),
      { key: "area", label: "Zona", defaultVisible: true },
      { key: "renovator", label: "Renovador", defaultVisible: false, category: "popular" as const },
      { key: "projectStartDate", label: "Inicio Proyecto", defaultVisible: false, category: "popular" as const },
      { key: "settlementDate", label: "Fecha Liquidación", defaultVisible: false, category: "popular" as const },
      { key: "status", label: "Estado", defaultVisible: false },
      // Grupo 1 - Campos solicitados
      { key: "ecuContact", label: "Contacto ECU", defaultVisible: false, category: "popular" as const },
      { key: "estProperties", label: "Est. Propiedades", defaultVisible: false, category: "popular" as const },
      { key: "propertiesToConvert", label: "Props. a Convertir", defaultVisible: false, category: "popular" as const },
      { key: "arrasDeadline", label: "Fecha Arras", defaultVisible: false, category: "popular" as const },
      // Grupo 2 - Fechas clave maduración
      { key: "draftOrderDate", label: "Encargo Anteproyecto", defaultVisible: false, category: "popular" as const },
      { key: "measurementDate" as ProjectSortCol, label: "Fecha Medición", defaultVisible: false, category: "popular" as const },
      { key: "projectDraftDate", label: "Fecha Anteproyecto", defaultVisible: false },
      { key: "draftValidationDate", label: "Validación Anteproyecto", defaultVisible: false },
      { key: "projectEndDate", label: "Fecha Proyecto", defaultVisible: false },
      { key: "projectArchitectDate", label: "Fecha Arquitecto", defaultVisible: false },
      // Grupo 3 - Fechas ECU
      { key: "ecuFirstStartDate", label: "ECU Inicio 1ª Val.", defaultVisible: false },
      { key: "ecuFirstEndDate", label: "ECU Fin 1ª Val.", defaultVisible: false },
      { key: "ecuFinalStartDate", label: "ECU Inicio Final", defaultVisible: false },
      { key: "ecuFinalEndDate", label: "ECU Fin Final", defaultVisible: false },
      { key: "ecuDeliveryDate", label: "Entrega ECU", defaultVisible: false },
      { key: "definitiveValidationDate", label: "Validación Definitiva", defaultVisible: false },
      // Grupo 4 - Info adicional
      { key: "architectFee", label: "Honorarios Arquitecto", defaultVisible: false },
      { key: "renovationSpend", label: "Gasto Reno", defaultVisible: false },
      { key: "lead", label: "Lead", defaultVisible: false },
      { key: "operationName", label: "Nombre Operación", defaultVisible: false },
      { key: "estimatedSettlementDate", label: "Liquidación Est.", defaultVisible: false },
      { key: "estRenoStartDateProj", label: "Est. Reno Start", defaultVisible: false },
      { key: "renovationExecutor", label: "Ejecutor Reno", defaultVisible: false },
    ];
    return base;
  }, [isArchitectView]);

  const getDefaultProjectCols = useCallback((): Set<ProjectSortCol> => {
    return new Set(PROJECT_COL_CONFIG.filter(c => c.defaultVisible).map(c => c.key));
  }, [PROJECT_COL_CONFIG]);

  const [visibleProjectColsByPhase, setVisibleProjectColsByPhase] = useState<Map<RenoKanbanPhase, Set<ProjectSortCol>>>(() => new Map());
  const [projectColSelectorOpen, setProjectColSelectorOpen] = useState<{ phase: RenoKanbanPhase | null }>({ phase: null });

  const getVisibleProjectCols = useCallback((phase: RenoKanbanPhase): Set<ProjectSortCol> => {
    return visibleProjectColsByPhase.get(phase) || getDefaultProjectCols();
  }, [visibleProjectColsByPhase, getDefaultProjectCols]);

  const handleProjectColumnSave = useCallback((phase: RenoKanbanPhase, cols: Set<ProjectSortCol>) => {
    setVisibleProjectColsByPhase(prev => {
      const m = new Map(prev);
      m.set(phase, cols);
      return m;
    });
    if (user?.id) {
      supabase
        .from('user_column_preferences')
        .upsert({
          user_id: user.id,
          view_type: 'project_kanban_list',
          phase: phase,
          visible_columns: Array.from(cols),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,view_type,phase',
        })
        .then(({ error }) => {
          if (error) console.warn('[RenoKanbanBoard] Error saving project column preferences:', error);
        });
    }
  }, [user?.id, supabase]);
  
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

  // Load saved column preferences from Supabase
  useEffect(() => {
    if (!user?.id) { setIsLoadingColumns(false); return; }
    (async () => {
      try {
        // Load property column preferences
        const { data: propPrefs } = await supabase
          .from('user_column_preferences')
          .select('phase, visible_columns')
          .eq('user_id', user.id)
          .eq('view_type', 'reno_kanban_list');
        if (propPrefs && propPrefs.length > 0) {
          setVisibleColumnsByPhase(prev => {
            const m = new Map(prev);
            propPrefs.forEach(row => {
              if (row.visible_columns && row.visible_columns.length > 0) {
                m.set(row.phase as RenoKanbanPhase, new Set(row.visible_columns as SortColumn[]));
              }
            });
            return m;
          });
        }
        // Load project column preferences
        const { data: projPrefs } = await supabase
          .from('user_column_preferences')
          .select('phase, visible_columns')
          .eq('user_id', user.id)
          .eq('view_type', 'project_kanban_list');
        if (projPrefs && projPrefs.length > 0) {
          setVisibleProjectColsByPhase(prev => {
            const m = new Map(prev);
            projPrefs.forEach(row => {
              if (row.visible_columns && row.visible_columns.length > 0) {
                m.set(row.phase as RenoKanbanPhase, new Set(row.visible_columns as ProjectSortCol[]));
              }
            });
            return m;
          });
        }
      } catch (err) {
        console.warn('[RenoKanbanBoard] Error loading column preferences:', err);
      } finally {
        setIsLoadingColumns(false);
      }
    })();
  }, [user?.id]);

  // Load properties from shared context (no duplicate fetch)
  const { propertiesByPhase: supabasePropertiesByPhase, loading: supabaseLoading, error: supabaseError, refetchProperties } = useRenoProperties();

  const handleCardClick = (property: Property) => {
    startTransition(() => {
      router.push(`/reno/construction-manager/property/${property.id}?tab=tareas&viewMode=${viewMode}&from=${fromParam}`);
    });
  };

  const handleProjectClick = useCallback((project: ProjectRow) => {
    startTransition(() => {
      let basePath: string;
      if (fromParam === "maturation-kanban") {
        basePath = `/reno/maturation-analyst/project/${project.id}`;
      } else if (fromParam === "maturation-wip-kanban") {
        basePath = `/reno/maturation-analyst/wip/${project.id}`;
      } else if (fromParam === "architect-kanban") {
        basePath = `/reno/architect/project/${project.id}`;
      } else {
        basePath = `/reno/construction-manager/project/${project.id}`;
      }
      router.push(`${basePath}?viewMode=${viewMode}&from=${fromParam}`);
    });
  }, [router, viewMode, fromParam]);

  const handleAssignSiteManager = useCallback(async (propertyId: string, email: string | null, currentPhase?: RenoKanbanPhase) => {
    try {
      const updates: { assigned_site_manager_email: string | null; updated_at: string; reno_phase?: string } = {
        assigned_site_manager_email: email,
        updated_at: new Date().toISOString(),
      };
      // From vista de proyectos (kanban-projects): do NOT change reno_phase so the card stays in its column.
      // From other views: when assigning from Final Check Post Suministros, move property to Final Check in Units kanban.
      if (fromParam !== "kanban-projects" && currentPhase === "final-check-post-suministros") {
        updates.reno_phase = "final-check";
      }
      const { error } = await supabase
        .from("properties")
        .update(updates)
        .eq("id", propertyId);
      if (error) throw error;
      await refetchProperties();
      toast.success(language === "es" ? "Jefe de obra asignado" : "Site manager assigned");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al asignar";
      toast.error(msg);
    }
  }, [supabase, refetchProperties, language, fromParam]);

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
      "pendiente-suministros": [],
      "final-check-post-suministros": [],
      "cleaning": [],
      "furnishing-cleaning": [], // Legacy
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
      "get-project-draft": [],
      "pending-to-validate": [],
      "pending-to-reserve-arras": [],
      "technical-project-in-progress": [],
      "ecuv-first-validation": [],
      "technical-project-fine-tuning": [],
      "ecuv-final-validation": [],
      "pending-budget-from-renovator": [],
      "arch-pending-measurement": [],
      "arch-preliminary-project": [],
      "arch-technical-project": [],
      "arch-technical-adjustments": [],
      "arch-pending-validation": [],
      "arch-ecu-first-validation": [],
      "arch-ecu-final-validation": [],
      "arch-obra-empezar": [],
      "arch-obra-en-progreso": [],
      "arch-completed": [],
      "wip-reno-due-diligence": [],
      "wip-admin-licencias": [],
      "wip-pendiente-presupuesto": [],
      "wip-obra-a-empezar": [],
      "wip-obra-en-progreso": [],
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
      "pendiente-suministros": sortFinalCheckPhase("pendiente-suministros"),
      "final-check-post-suministros": sortFinalCheckPhase("final-check-post-suministros"),
      "cleaning": sortFurnishingCleaningPhase("cleaning"),
      "furnishing-cleaning": sortFurnishingCleaningPhase("furnishing-cleaning"), // Legacy
      "reno-fixes": sortPropertiesByExpired(transformProperties["reno-fixes"] || []),
      "done": sortPropertiesByExpired(transformProperties["done"] || []),
      "orphaned": [],
      "analisis-supply": sortPropertiesByExpired(transformProperties["analisis-supply"] || []),
      "analisis-reno": sortPropertiesByExpired(transformProperties["analisis-reno"] || []),
      "administracion-reno": sortPropertiesByExpired(transformProperties["administracion-reno"] || []),
      "pendiente-presupuestos-renovador": sortPropertiesByExpired(transformProperties["pendiente-presupuestos-renovador"] || []),
      "obra-a-empezar": sortPropertiesByExpired(transformProperties["obra-a-empezar"] || []),
      "obra-en-progreso": sortPropertiesByExpired(transformProperties["obra-en-progreso"] || []),
      "amueblamiento": sortPropertiesByExpired(transformProperties["amueblamiento"] || []),
      "check-final": sortPropertiesByExpired(transformProperties["check-final"] || []),
      "get-project-draft": [],
      "pending-to-validate": [],
      "pending-to-reserve-arras": [],
      "technical-project-in-progress": [],
      "ecuv-first-validation": [],
      "technical-project-fine-tuning": [],
      "ecuv-final-validation": [],
      "pending-budget-from-renovator": [],
      "arch-pending-measurement": [],
      "arch-preliminary-project": [],
      "arch-technical-project": [],
      "arch-technical-adjustments": [],
      "arch-pending-validation": [],
      "arch-ecu-first-validation": [],
      "arch-ecu-final-validation": [],
      "arch-obra-empezar": [],
      "arch-obra-en-progreso": [],
      "arch-completed": [],
      "wip-reno-due-diligence": [],
      "wip-admin-licencias": [],
      "wip-pendiente-presupuesto": [],
      "wip-obra-a-empezar": [],
      "wip-obra-en-progreso": [],
    };
    
    // Debug log removed for production
    
    return sorted;
  }, [isMounted, supabaseLoading, transformProperties]);

  const kanbanViewedEmittedRef = useRef(false);
  useEffect(() => {
    if (!isMounted || supabaseLoading || kanbanViewedEmittedRef.current) return;
    const flat = Object.values(transformProperties).flat();
    if (flat.length === 0) return;
    kanbanViewedEmittedRef.current = true;
    const delayedCount = flat.filter((p) => isDelayedWork(p, p.renoPhase)).length;
    trackEventWithDevice("Kanban Viewed", {
      from_param: fromParam,
      view_level: viewLevel,
      total_properties: flat.length,
      delayed_works_count: delayedCount,
    });
  }, [isMounted, supabaseLoading, transformProperties, fromParam, viewLevel]);

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
      
      // furnishing, cleaning, final-check, pendiente-suministros: daysToPropertyReady > 25
      if ((phase === "furnishing" || phase === "cleaning" || phase === "final-check" || phase === "pendiente-suministros") && property.daysToPropertyReady) {
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

      // Si hay filtros de technical constructor (jefe de obra), verificar si coincide con alguno.
      // Incluir también Project/WIP asignados a ese jefe por assigned_site_manager_email.
      if (activeFilters.technicalConstructors.length > 0) {
        if (technicalConstructor) {
          const normalizedTechnical = normalizeString(technicalConstructor);
          matchesTechnical = activeFilters.technicalConstructors.some(constructor => 
            normalizedTechnical === normalizeString(constructor) ||
            normalizedTechnical.includes(normalizeString(constructor)) ||
            normalizeString(constructor).includes(normalizedTechnical)
          );
        }
        if (!matchesTechnical && (propertyTypeNormalized === "project" || propertyTypeNormalized === "wip")) {
          const assignedEmail = (property as any).supabaseProperty?.assigned_site_manager_email;
          if (assignedEmail) {
            const assignedNorm = String(assignedEmail).trim().toLowerCase();
            const selectedEmails = activeFilters.technicalConstructors
              .map((name) => getForemanEmailFromName(name))
              .filter((e): e is string => e != null)
              .map((e) => e.trim().toLowerCase());
            if (selectedEmails.includes(assignedNorm)) matchesTechnical = true;
          }
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

      // Si hay filtros de tipo (Unit / Building / Lot), verificar si coincide.
      // Aceptar coincidencia exacta o que el type contenga la palabra (ej. "Unit & Building" → Unit y Building).
      // En el primer kanban, Project/WIP asignados al foreman (assigned_site_manager_email) también pasan el filtro de tipo.
      const selectedTypes = activeFilters.propertyTypes ?? [];
      if (selectedTypes.length > 0) {
        if (propertyTypeNormalized) {
          const typeMatchesSelected = (needle: string) => {
            const n = needle.trim().toLowerCase();
            return propertyTypeNormalized === n || propertyTypeNormalized.includes(n);
          };
          matchesType = selectedTypes.some(t => typeMatchesSelected(t));
        }
        if (!matchesType && fromParam === "kanban" && user?.email) {
          const isProjectOrWip = ["project", "wip"].includes(propertyTypeNormalized);
          const assigned = (property as any).supabaseProperty?.assigned_site_manager_email;
          const isAssignedToMe = assigned != null && String(assigned).trim().toLowerCase() === user.email.trim().toLowerCase();
          if (isProjectOrWip && isAssignedToMe) matchesType = true;
        }
      }

      // AND lógico entre categorías de filtros: la propiedad debe cumplir TODOS los filtros activos.
      // Ej.: Lot + Jefe de obra Elier Claudio → solo Lots que tengan a Elier Claudio como jefe de obra.
      const activeFilterResults: boolean[] = [];
      if (activeFilters.renovatorNames.length > 0) activeFilterResults.push(matchesRenovator);
      if (activeFilters.technicalConstructors.length > 0) activeFilterResults.push(matchesTechnical);
      if (activeFilters.areaClusters.length > 0) activeFilterResults.push(matchesArea);
      if (selectedTypes.length > 0) activeFilterResults.push(matchesType);

      // Si solo está activo el filtro de obras tardías (sin otros filtros), mostrar todas las tardías
      if (activeFilters.delayedWorks && activeFilterResults.length === 0) {
        return true; // Ya verificamos que es tardía arriba
      }

      // Si hay filtros activos, la propiedad debe cumplir todos (AND)
      return activeFilterResults.length === 0 || activeFilterResults.every(match => match);
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
      "pendiente-suministros": allProperties["pendiente-suministros"].filter(matchesAll),
      "final-check-post-suministros": allProperties["final-check-post-suministros"].filter(matchesAll),
      "cleaning": allProperties["cleaning"].filter(matchesAll),
      "furnishing-cleaning": allProperties["furnishing-cleaning"].filter(matchesAll), // Legacy
      "reno-fixes": allProperties["reno-fixes"].filter(matchesAll),
      "done": allProperties["done"].filter(matchesAll),
      "orphaned": allProperties["orphaned"].filter(matchesAll),
      "analisis-supply": allProperties["analisis-supply"].filter(matchesAll),
      "analisis-reno": allProperties["analisis-reno"].filter(matchesAll),
      "administracion-reno": allProperties["administracion-reno"].filter(matchesAll),
      "pendiente-presupuestos-renovador": allProperties["pendiente-presupuestos-renovador"].filter(matchesAll),
      "obra-a-empezar": allProperties["obra-a-empezar"].filter(matchesAll),
      "obra-en-progreso": allProperties["obra-en-progreso"].filter(matchesAll),
      "amueblamiento": allProperties["amueblamiento"].filter(matchesAll),
      "check-final": allProperties["check-final"].filter(matchesAll),
      "get-project-draft": allProperties["get-project-draft"].filter(matchesAll),
      "pending-to-validate": allProperties["pending-to-validate"].filter(matchesAll),
      "pending-to-reserve-arras": allProperties["pending-to-reserve-arras"].filter(matchesAll),
      "technical-project-in-progress": allProperties["technical-project-in-progress"].filter(matchesAll),
      "ecuv-first-validation": allProperties["ecuv-first-validation"].filter(matchesAll),
      "technical-project-fine-tuning": allProperties["technical-project-fine-tuning"].filter(matchesAll),
      "ecuv-final-validation": allProperties["ecuv-final-validation"].filter(matchesAll),
      "pending-budget-from-renovator": allProperties["pending-budget-from-renovator"].filter(matchesAll),
      "arch-pending-measurement": allProperties["arch-pending-measurement"].filter(matchesAll),
      "arch-preliminary-project": allProperties["arch-preliminary-project"].filter(matchesAll),
      "arch-technical-project": allProperties["arch-technical-project"].filter(matchesAll),
      "arch-technical-adjustments": allProperties["arch-technical-adjustments"].filter(matchesAll),
      "arch-pending-validation": allProperties["arch-pending-validation"].filter(matchesAll),
      "arch-ecu-first-validation": allProperties["arch-ecu-first-validation"].filter(matchesAll),
      "arch-ecu-final-validation": allProperties["arch-ecu-final-validation"].filter(matchesAll),
      "arch-obra-empezar": allProperties["arch-obra-empezar"].filter(matchesAll),
      "arch-obra-en-progreso": allProperties["arch-obra-en-progreso"].filter(matchesAll),
      "arch-completed": allProperties["arch-completed"].filter(matchesAll),
      "wip-reno-due-diligence": (allProperties["wip-reno-due-diligence"] ?? []).filter(matchesAll),
      "wip-admin-licencias": (allProperties["wip-admin-licencias"] ?? []).filter(matchesAll),
      "wip-pendiente-presupuesto": (allProperties["wip-pendiente-presupuesto"] ?? []).filter(matchesAll),
      "wip-obra-a-empezar": (allProperties["wip-obra-a-empezar"] ?? []).filter(matchesAll),
      "wip-obra-en-progreso": (allProperties["wip-obra-en-progreso"] ?? []).filter(matchesAll),
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
      "pendiente-suministros": (() => {
        const expiredFirst = sortPropertiesByExpired(filtered["pendiente-suministros"]);
        return expiredFirst.sort((a, b) => {
          const aDays = a.daysToPropertyReady ?? -Infinity;
          const bDays = b.daysToPropertyReady ?? -Infinity;
          return bDays - aDays;
        });
      })(),
      "final-check-post-suministros": (() => {
        const expiredFirst = sortPropertiesByExpired(filtered["final-check-post-suministros"]);
        return expiredFirst.sort((a, b) => {
          const aDays = a.daysToPropertyReady ?? -Infinity;
          const bDays = b.daysToPropertyReady ?? -Infinity;
          return bDays - aDays;
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
      "analisis-supply": sortPropertiesByExpired(filtered["analisis-supply"]),
      "analisis-reno": sortPropertiesByExpired(filtered["analisis-reno"]),
      "administracion-reno": sortPropertiesByExpired(filtered["administracion-reno"]),
      "pendiente-presupuestos-renovador": sortPropertiesByExpired(filtered["pendiente-presupuestos-renovador"]),
      "obra-a-empezar": sortPropertiesByExpired(filtered["obra-a-empezar"]),
      "obra-en-progreso": sortPropertiesByExpired(filtered["obra-en-progreso"]),
      "amueblamiento": sortPropertiesByExpired(filtered["amueblamiento"]),
      "check-final": sortPropertiesByExpired(filtered["check-final"]),
      "get-project-draft": filtered["get-project-draft"] || [],
      "pending-to-validate": filtered["pending-to-validate"] || [],
      "pending-to-reserve-arras": filtered["pending-to-reserve-arras"] || [],
      "technical-project-in-progress": filtered["technical-project-in-progress"] || [],
      "ecuv-first-validation": filtered["ecuv-first-validation"] || [],
      "technical-project-fine-tuning": filtered["technical-project-fine-tuning"] || [],
      "ecuv-final-validation": filtered["ecuv-final-validation"] || [],
      "pending-budget-from-renovator": filtered["pending-budget-from-renovator"] || [],
      "arch-pending-measurement": filtered["arch-pending-measurement"] || [],
      "arch-preliminary-project": filtered["arch-preliminary-project"] || [],
      "arch-technical-project": filtered["arch-technical-project"] || [],
      "arch-technical-adjustments": filtered["arch-technical-adjustments"] || [],
      "arch-pending-validation": filtered["arch-pending-validation"] || [],
      "arch-ecu-first-validation": filtered["arch-ecu-first-validation"] || [],
      "arch-ecu-final-validation": filtered["arch-ecu-final-validation"] || [],
      "arch-obra-empezar": filtered["arch-obra-empezar"] || [],
      "arch-obra-en-progreso": filtered["arch-obra-en-progreso"] || [],
      "arch-completed": filtered["arch-completed"] || [],
      "wip-reno-due-diligence": filtered["wip-reno-due-diligence"] || [],
      "wip-admin-licencias": filtered["wip-admin-licencias"] || [],
      "wip-pendiente-presupuesto": filtered["wip-pendiente-presupuesto"] || [],
      "wip-obra-a-empezar": filtered["wip-obra-a-empezar"] || [],
      "wip-obra-en-progreso": filtered["wip-obra-en-progreso"] || [],
    };

    return sorted;
  }, [searchQuery, filters, allProperties]);

  // When viewLevel === "project", filter projects by search + filters y dedupe por id
  const filteredProjectsByPhase = useMemo((): Record<RenoKanbanPhase, ProjectRow[]> | null => {
    if (viewLevel !== "project" || !projectsByPhaseOverride) return null;

    const query = searchQuery.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const activeFilters = filters || {
      renovatorNames: [],
      technicalConstructors: [],
      areaClusters: [],
      delayedWorks: false,
      propertyTypes: [],
    };
    const hasActiveFilters =
      activeFilters.renovatorNames.length > 0 ||
      activeFilters.areaClusters.length > 0 ||
      (activeFilters.propertyTypes?.length ?? 0) > 0;

    const normalizeString = (str: string) =>
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const areaClusterDisplay = (raw: string | null | undefined): string => {
      const s = (raw ?? "").toString().trim();
      if (!s || ["[]", "[\"\"]", "['']"].includes(s.replace(/\s/g, ""))) return "";
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const parts = parsed.filter((x) => x != null && String(x).trim() !== "");
          return parts.map((x) => String(x).trim()).join(", ");
        }
      } catch {
        /* plain string */
      }
      return s;
    };

    const matchesSearch = (p: ProjectRow) => {
      if (!query) return true;
      const nameNorm = normalizeString(p.name || "");
      if (nameNorm.includes(query)) return true;
      const uniqueId = (p.project_unique_id || p.id || "").toString();
      if (normalizeString(uniqueId).includes(query)) return true;
      const areaDisplay = areaClusterDisplay(p.area_cluster);
      if (areaDisplay && normalizeString(areaDisplay).includes(query)) return true;
      const invType = (p.investment_type ?? "").toString();
      if (invType && normalizeString(invType).includes(query)) return true;
      const typeStr = (p.type ?? "").toString();
      if (typeStr && normalizeString(typeStr).includes(query)) return true;
      return false;
    };

    const matchesFilters = (p: ProjectRow) => {
      if (!hasActiveFilters) return true;

      let matchesArea = true;
      let matchesRenovator = true;
      let matchesType = true;

      if (activeFilters.areaClusters.length > 0) {
        const areaDisplay = areaClusterDisplay(p.area_cluster);
        const areaNorm = areaDisplay ? normalizeString(areaDisplay) : "";
        matchesArea = areaNorm
          ? activeFilters.areaClusters.some(
              (c) =>
                areaNorm === normalizeString(c) ||
                areaNorm.includes(normalizeString(c)) ||
                normalizeString(c).includes(areaNorm)
            )
          : false;
      }

      if (activeFilters.renovatorNames.length > 0) {
        const renovator = (p.renovator ?? "").toString().trim();
        const renovatorNorm = normalizeString(renovator);
        matchesRenovator = renovatorNorm
          ? activeFilters.renovatorNames.some(
              (n) =>
                renovatorNorm === normalizeString(n) ||
                renovatorNorm.includes(normalizeString(n)) ||
                normalizeString(n).includes(renovatorNorm)
            )
          : false;
      }

      const selectedTypes = activeFilters.propertyTypes ?? [];
      if (selectedTypes.length > 0) {
        const typeRaw = (p.type ?? "").toString().trim().toLowerCase();
        matchesType = typeRaw
          ? selectedTypes.some(
              (t) => typeRaw === normalizeString(t) || typeRaw.includes(normalizeString(t))
            )
          : false;
      }

      return matchesArea && matchesRenovator && matchesType;
    };

    const empty: Record<RenoKanbanPhase, ProjectRow[]> = {
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
      "final-check-post-suministros": [],
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
      "get-project-draft": [],
      "pending-to-validate": [],
      "pending-to-reserve-arras": [],
      "technical-project-in-progress": [],
      "ecuv-first-validation": [],
      "technical-project-fine-tuning": [],
      "ecuv-final-validation": [],
      "pending-budget-from-renovator": [],
      "arch-pending-measurement": [],
      "arch-preliminary-project": [],
      "arch-technical-project": [],
      "arch-technical-adjustments": [],
      "arch-pending-validation": [],
      "arch-ecu-first-validation": [],
      "arch-ecu-final-validation": [],
      "arch-obra-empezar": [],
      "arch-obra-en-progreso": [],
      "arch-completed": [],
      "wip-reno-due-diligence": [],
      "wip-admin-licencias": [],
      "wip-pendiente-presupuesto": [],
      "wip-obra-a-empezar": [],
      "wip-obra-en-progreso": [],
    };

    for (const col of visibleColumns) {
      const raw = (projectsByPhaseOverride[col.key] || []).filter(
        (p) => matchesSearch(p) && matchesFilters(p)
      );
      const seen = new Set<string>();
      const list = raw.filter((p) => {
        const id = p.id ?? "";
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      empty[col.key] = list;
    }
    return empty;
  }, [viewLevel, projectsByPhaseOverride, searchQuery, filters, visibleColumns]);

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
      'pendiente-suministros': [],
      'final-check-post-suministros': [],
      'cleaning': [],
      'furnishing-cleaning': [], // Legacy
      'reno-fixes': [],
      'done': [],
      'orphaned': [],
      'analisis-supply': [],
      'analisis-reno': [],
      'administracion-reno': [],
      'pendiente-presupuestos-renovador': [],
      'obra-a-empezar': [],
      'obra-en-progreso': [],
      'amueblamiento': [],
      'check-final': [],
      'get-project-draft': [],
      'pending-to-validate': [],
      'pending-to-reserve-arras': [],
      'technical-project-in-progress': [],
      'ecuv-first-validation': [],
      'technical-project-fine-tuning': [],
      'ecuv-final-validation': [],
      'pending-budget-from-renovator': [],
      'arch-pending-measurement': [],
      'arch-preliminary-project': [],
      'arch-pending-validation': [],
      'arch-technical-project': [],
      'arch-ecu-first-validation': [],
      'arch-technical-adjustments': [],
      'arch-ecu-final-validation': [],
      'arch-obra-empezar': [],
      'arch-obra-en-progreso': [],
      'arch-completed': [],
      'wip-reno-due-diligence': [],
      'wip-admin-licencias': [],
      'wip-pendiente-presupuesto': [],
      'wip-obra-a-empezar': [],
      'wip-obra-en-progreso': [],
    };

    visibleColumns.forEach((column) => {
      const properties = filteredProperties[column.key] || [];
      grouped[column.key] = properties.map(p => ({ ...p, currentPhase: column.key }));
    });

    return grouped;
  }, [filteredProperties]);

  // En móvil, con búsqueda activa: solo mostrar fases que tienen resultados
  const mobileVisibleColumns = useMemo(() => {
    if (searchQuery.trim().length === 0) return visibleColumns;
    return visibleColumns.filter((column) => {
      const isProjectView = viewLevel === "project" && filteredProjectsByPhase;
      const properties = isProjectView ? [] : (filteredProperties[column.key] || []);
      const projects = isProjectView ? (filteredProjectsByPhase?.[column.key] || []) : undefined;
      const count = isProjectView ? (projects?.length ?? 0) : properties.length;
      return count > 0;
    });
  }, [searchQuery, visibleColumns, viewLevel, filteredProperties, filteredProjectsByPhase]);

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
        case "budgetPhReadyDate":
        case "renovatorBudgetApprovalDate":
        case "initialVisitDate":
        case "estRenoStartDate":
        case "renoStartDate":
        case "renoEstimatedEndDate":
        case "renoEndDate": {
          const getDate = (p: Property, k: SortColumn): number => {
            const sp = (p as any).supabaseProperty;
            const field = k === "budgetPhReadyDate" ? sp?.budget_ph_ready_date
              : k === "renovatorBudgetApprovalDate" ? sp?.renovator_budget_approval_date
              : k === "initialVisitDate" ? sp?.initial_visit_date
              : k === "estRenoStartDate" ? sp?.est_reno_start_date
              : k === "renoStartDate" ? sp?.start_date
              : k === "renoEstimatedEndDate" ? sp?.estimated_end_date
              : sp?.reno_end_date;
            return field ? new Date(field).getTime() : 0;
          };
          aValue = getDate(a, column);
          bValue = getDate(b, column);
          break;
        }
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
    return visibleColumnsByPhase.get(phase) || getDefaultColumnsForPhase(phase);
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

  // ─── CSV Export helpers (must be before early returns) ──────────────
  const csvPropertyColumns = useMemo((): CsvColumn[] => {
    const cols: CsvColumn[] = [
      { key: "phase", label: "Fase" },
    ];
    columnConfigWithTranslations.forEach((c) => cols.push({ key: c.key, label: c.label }));
    return cols;
  }, [columnConfigWithTranslations]);

  const csvPropertyRows = useMemo((): Record<string, unknown>[] => {
    const rows: Record<string, unknown>[] = [];
    const fmtDate = (v?: string | null) => {
      if (!v) return "";
      const d = new Date(v);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" });
    };
    const phasesForList = selectedPhaseFilter === "all"
      ? visibleColumns
      : visibleColumns.filter((c) => c.key === selectedPhaseFilter);

    phasesForList.forEach((col) => {
      const phaseLabel = PROJECT_KANBAN_PHASE_LABELS[col.key] ?? MATURATION_PHASE_LABELS[col.key] ?? t.kanban[col.translationKey] ?? col.key;
      const properties = filteredProperties[col.key] || [];
      properties.forEach((p) => {
        const a = p as any;
        rows.push({
          phase: phaseLabel,
          id: a.uniqueIdFromEngagements || a.id,
          address: a.address || "",
          region: a.region || "",
          renovador: a.renovador || "",
          renoType: a.renoType || "",
          estimatedVisit: a.estimatedVisitDate ? fmtDate(a.estimatedVisitDate) : "",
          proximaActualizacion: a.nextUpdate ? fmtDate(a.nextUpdate) : "",
          daysToVisit: a.daysToVisit ?? "",
          daysToStartRenoSinceRSD: a.daysToStartRenoSinceRSD ?? "",
          renoDuration: a.renoDuration ?? "",
          daysToPropertyReady: a.daysToPropertyReady ?? "",
          progress: a.progress != null ? `${Math.round(a.progress)}%` : "",
          status: a.status || "",
          budgetPhReadyDate: a.budgetPhReadyDate ? fmtDate(a.budgetPhReadyDate) : "",
          renovatorBudgetApprovalDate: a.renovatorBudgetApprovalDate ? fmtDate(a.renovatorBudgetApprovalDate) : "",
          initialVisitDate: a.initialVisitDate ? fmtDate(a.initialVisitDate) : "",
          estRenoStartDate: a.estRenoStartDate ? fmtDate(a.estRenoStartDate) : "",
          renoStartDate: a.renoStartDate ? fmtDate(a.renoStartDate) : "",
          renoEstimatedEndDate: a.renoEstimatedEndDate ? fmtDate(a.renoEstimatedEndDate) : "",
          renoEndDate: a.renoEndDate ? fmtDate(a.renoEndDate) : "",
        });
      });
    });
    return rows;
  }, [visibleColumns, filteredProperties, selectedPhaseFilter, t.kanban, columnConfigWithTranslations]);

  const csvProjectColumns = useMemo((): CsvColumn[] => {
    const cols: CsvColumn[] = [{ key: "phase", label: "Fase" }];
    PROJECT_COL_CONFIG.forEach((c) => cols.push({ key: c.key, label: c.label }));
    return cols;
  }, [PROJECT_COL_CONFIG]);

  const csvProjectRows = useMemo((): Record<string, unknown>[] => {
    const rows: Record<string, unknown>[] = [];
    const fmtDate = (v?: string | null) => {
      if (!v) return "";
      const d = new Date(v);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" });
    };
    const parseAreaCsv = (raw: string | null | undefined): string => {
      if (!raw) return "";
      try {
        const parsed = JSON.parse(raw.replace(/'/g, '"'));
        if (Array.isArray(parsed)) return parsed.join(", ");
      } catch { /* ignore */ }
      return raw.replace(/^\[|\]$/g, "").replace(/"/g, "").trim();
    };
    if (!filteredProjectsByPhase) return rows;
    const phasesForList = selectedPhaseFilter === "all"
      ? visibleColumns
      : visibleColumns.filter((c) => c.key === selectedPhaseFilter);

    phasesForList.forEach((col) => {
      const phaseLabel = PROJECT_KANBAN_PHASE_LABELS[col.key] ?? MATURATION_PHASE_LABELS[col.key] ?? ARCHITECT_PHASE_LABELS[col.key] ?? t.kanban[col.translationKey] ?? col.key;
      const projects = filteredProjectsByPhase[col.key] || [];
      projects.forEach((proj) => {
        const pa = proj as any;
        const ptc = pa.properties_to_convert;
        const ptcS = ptc != null ? String(ptc).trim() : "";
        rows.push({
          phase: phaseLabel,
          projectId: proj.project_unique_id || proj.id?.slice(0, 8) || "",
          name: proj.name || "",
          propertiesCount: ptcS && ptcS !== "0" ? ptcS : (pa.est_properties ?? ""),
          scouter: pa.scouter || "",
          architect: pa.architect || "",
          excludedEcu: pa.excluded_from_ecu === true ? "Sin ECU" : "Con ECU",
          type: pa.type || "",
          investmentType: pa.investment_type || "",
          area: parseAreaCsv(pa.area_cluster),
          renovator: pa.renovator || "",
          projectStartDate: pa.project_start_date ? fmtDate(pa.project_start_date) : "",
          settlementDate: pa.settlement_date ? fmtDate(pa.settlement_date) : "",
          status: pa.project_status || "",
          ecuContact: pa.ecu_contact || "",
          estProperties: pa.est_properties || "",
          propertiesToConvert: pa.properties_to_convert || "",
          arrasDeadline: pa.arras_deadline ? fmtDate(pa.arras_deadline) : "",
          draftOrderDate: pa.draft_order_date ? fmtDate(pa.draft_order_date) : "",
          measurementDate: pa.measurement_date ? fmtDate(pa.measurement_date) : "",
          projectDraftDate: pa.project_draft_date ? fmtDate(pa.project_draft_date) : "",
          draftValidationDate: pa.draft_validation_date ? fmtDate(pa.draft_validation_date) : "",
          projectEndDate: pa.project_end_date ? fmtDate(pa.project_end_date) : "",
          projectArchitectDate: pa.project_architect_date ? fmtDate(pa.project_architect_date) : "",
          ecuFirstStartDate: pa.ecu_first_start_date ? fmtDate(pa.ecu_first_start_date) : "",
          ecuFirstEndDate: pa.ecu_first_end_date ? fmtDate(pa.ecu_first_end_date) : "",
          ecuFinalStartDate: pa.ecu_final_start_date ? fmtDate(pa.ecu_final_start_date) : "",
          ecuFinalEndDate: pa.ecu_final_end_date ? fmtDate(pa.ecu_final_end_date) : "",
          ecuDeliveryDate: pa.ecu_delivery_date ? fmtDate(pa.ecu_delivery_date) : "",
          definitiveValidationDate: pa.definitive_validation_date ? fmtDate(pa.definitive_validation_date) : "",
          architectFee: pa.architect_fee != null ? Number(pa.architect_fee) : "",
          renovationSpend: pa.renovation_spend != null ? Number(pa.renovation_spend) : "",
          lead: pa.lead || "",
          operationName: pa.operation_name || "",
          estimatedSettlementDate: pa.estimated_settlement_date ? fmtDate(pa.estimated_settlement_date) : "",
          estRenoStartDateProj: pa.est_reno_start_date ? fmtDate(pa.est_reno_start_date) : "",
          renovationExecutor: pa.renovation_executor || "",
        });
      });
    });
    return rows;
  }, [visibleColumns, filteredProjectsByPhase, selectedPhaseFilter, t.kanban, PROJECT_COL_CONFIG]);

  const canExportCsv = fromParam === "maturation-kanban" || fromParam === "maturation-wip-kanban" || fromParam === "kanban-projects";

  const handleOpenCsvExport = useCallback((mode: "property" | "project") => {
    setCsvExportMode(mode);
    setCsvExportOpen(true);
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
      <>
      <div className="flex flex-col h-full">
        {/* Sticky Phase Filter — Segmented Control */}
        <div className="sticky top-0 z-10 bg-background pb-3 mb-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/60 dark:bg-muted/30 rounded-lg p-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
              <button
                onClick={() => setSelectedPhaseFilter("all")}
                className={cn(
                  "relative px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1.5",
                  selectedPhaseFilter === "all"
                    ? "bg-background dark:bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Todos
                <span className={cn("text-[10px] tabular-nums", selectedPhaseFilter === "all" ? "text-foreground/60" : "text-muted-foreground/70")}>{totalCount}</span>
                {(() => {
                  const totalAlertCount = visibleColumns.reduce((sum, col) => {
                    const props = propertiesByPhaseForList[col.key] || [];
                    return sum + props.filter((p: Property) => {
                      return isDelayedWork(p, col.key) || shouldShowExpiredBadge(p, col.key);
                    }).length;
                  }, 0);
                  return totalAlertCount > 0 ? (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 text-[9px] font-bold text-white bg-red-500 rounded-full px-1">
                      {totalAlertCount}
                    </span>
                  ) : null;
                })()}
              </button>

              {visibleColumns.map((column) => {
                const properties = propertiesByPhaseForList[column.key] || [];
                const count = properties.length;
                const alertCount = properties.filter(p => {
                  return isDelayedWork(p, column.key) || shouldShowExpiredBadge(p, column.key);
                }).length;
                const phaseLabel = (column as RenoKanbanColumnConfig & { label?: string }).label ?? PROJECT_KANBAN_PHASE_LABELS[column.key] ?? t.kanban[column.translationKey];
                const isSelected = selectedPhaseFilter === column.key;

                return (
                  <button
                    key={column.key}
                    onClick={() => setSelectedPhaseFilter(column.key)}
                    className={cn(
                      "relative px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1.5",
                      isSelected
                        ? "bg-background dark:bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {phaseLabel}
                    <span className={cn("text-[10px] tabular-nums", isSelected ? "text-foreground/60" : "text-muted-foreground/70")}>{count}</span>
                    {alertCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 text-[9px] font-bold text-white bg-red-500 rounded-full px-1">
                        {alertCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                const allPhaseKeys = filteredPhases.map(c => c.key);
                const allCollapsed = allPhaseKeys.every(k => collapsedPhases.has(k));
                if (allCollapsed) {
                  setCollapsedPhases(new Set());
                } else {
                  setCollapsedPhases(new Set(allPhaseKeys));
                }
              }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-accent/50 flex-shrink-0 whitespace-nowrap"
              title={filteredPhases.every(c => collapsedPhases.has(c.key)) ? "Expandir todo" : "Colapsar todo"}
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", filteredPhases.every(c => collapsedPhases.has(c.key)) && "-rotate-90")} />
              <span className="hidden sm:inline">{filteredPhases.every(c => collapsedPhases.has(c.key)) ? "Expandir" : "Colapsar"}</span>
            </button>
            {canExportCsv && (
              <button
                onClick={() => handleOpenCsvExport("property")}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-accent/50 flex-shrink-0 whitespace-nowrap"
                title="Exportar CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}
          </div>
        </div>

        {/* Properties List */}
        <div className="space-y-3 pb-4 overflow-y-auto flex-1">
          {filteredPhases.map((column) => {
            // Use filteredProperties directly to maintain kanban sorting logic
            let properties = filteredProperties[column.key] || [];
            const phaseLabel = (column as RenoKanbanColumnConfig & { label?: string }).label ?? PROJECT_KANBAN_PHASE_LABELS[column.key] ?? t.kanban[column.translationKey];
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
            <div key={column.key} className="bg-card rounded-lg border border-border/60 overflow-hidden shadow-sm">
              {/* Phase Header */}
              <div className="px-4 py-2.5 border-b border-border/40 bg-muted/30 dark:bg-muted/10">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => togglePhaseCollapse(column.key)}
                    className="flex items-center gap-2 hover:bg-accent/50 transition-colors rounded-md px-2 py-1 -ml-2 flex-1 min-w-0"
                  >
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0", isCollapsed && "-rotate-90")} />
                    <h3 className="font-semibold text-foreground text-base truncate">{phaseLabel}</h3>
                    <span className="text-xs font-medium text-muted-foreground tabular-nums bg-muted rounded-full px-2 py-0.5 flex-shrink-0">
                      {properties.length}
                    </span>
                    {(() => {
                      const alertCount = properties.filter(p => {
                        return isDelayedWork(p, column.key) || shouldShowExpiredBadge(p, column.key);
                      }).length;
                      return alertCount > 0 ? (
                        <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 flex-shrink-0">
                          {alertCount}
                        </span>
                      ) : null;
                    })()}
                  </button>

                  <button
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent/50 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setColumnSelectorOpen({ phase: column.key });
                    }}
                  >
                    <Settings className="h-3 w-3" />
                    <span>Más campos</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/20 dark:bg-muted/10 border-b border-border/40 sticky top-0">
                      <tr>
                        {getVisibleColumnsForPhase(column.key).has("id") && (
                          <th 
                            className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors"
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
                            className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors"
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
                            className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors"
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
                            className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors"
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
                            className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors"
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
                            className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors"
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
                            className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors"
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
                            className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors"
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
                            className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors"
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
                            className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors"
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
                            className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors"
                            onClick={() => handleSort("daysToPropertyReady")}
                          >
                            <div className="flex items-center gap-2">
                              Días para propiedad lista
                              {renderSortIcon("daysToPropertyReady")}
                            </div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("budgetPhReadyDate") && (
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => handleSort("budgetPhReadyDate")}>
                            <div className="flex items-center gap-2">{columnConfigWithTranslations.find(c => c.key === "budgetPhReadyDate")?.label ?? "Budget PH ready date"} {renderSortIcon("budgetPhReadyDate")}</div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("renovatorBudgetApprovalDate") && (
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => handleSort("renovatorBudgetApprovalDate")}>
                            <div className="flex items-center gap-2">{columnConfigWithTranslations.find(c => c.key === "renovatorBudgetApprovalDate")?.label ?? "Renovator budget approval date"} {renderSortIcon("renovatorBudgetApprovalDate")}</div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("initialVisitDate") && (
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => handleSort("initialVisitDate")}>
                            <div className="flex items-center gap-2">{columnConfigWithTranslations.find(c => c.key === "initialVisitDate")?.label ?? "Fecha de visita inicial"} {renderSortIcon("initialVisitDate")}</div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("estRenoStartDate") && (
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => handleSort("estRenoStartDate")}>
                            <div className="flex items-center gap-2">{columnConfigWithTranslations.find(c => c.key === "estRenoStartDate")?.label ?? "Est. reno start date"} {renderSortIcon("estRenoStartDate")}</div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("renoStartDate") && (
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => handleSort("renoStartDate")}>
                            <div className="flex items-center gap-2">{columnConfigWithTranslations.find(c => c.key === "renoStartDate")?.label ?? "Reno start date"} {renderSortIcon("renoStartDate")}</div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("renoEstimatedEndDate") && (
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => handleSort("renoEstimatedEndDate")}>
                            <div className="flex items-center gap-2">{columnConfigWithTranslations.find(c => c.key === "renoEstimatedEndDate")?.label ?? "Reno estimated end date"} {renderSortIcon("renoEstimatedEndDate")}</div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("renoEndDate") && (
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => handleSort("renoEndDate")}>
                            <div className="flex items-center gap-2">{columnConfigWithTranslations.find(c => c.key === "renoEndDate")?.label ?? "Reno end date"} {renderSortIcon("renoEndDate")}</div>
                          </th>
                        )}
                        {getVisibleColumnsForPhase(column.key).has("progress") && (
                          <th 
                            className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors"
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
                            className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors"
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
                    <tbody className="divide-y divide-border/40">
                      {properties.map((property, idx) => {
                        const showExpired = shouldShowExpiredBadge(property, column.key);
                        const isRed = shouldMarkRed(property, column.key);
                        const hasLeftRedBorder = showExpired || isRed;
                        return (
                          <tr
                            key={property.id}
                            onClick={() => setSelectedProperty(property)}
                            className={cn(
                              "cursor-pointer transition-colors relative group",
                              hasLeftRedBorder && "border-l-[3px] border-l-red-500",
                              selectedProperty?.id === property.id && "bg-accent/80 dark:bg-accent/30",
                              idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/5" : "",
                              "hover:bg-accent/60 dark:hover:bg-accent/20"
                            )}
                          >
                            {getVisibleColumnsForPhase(column.key).has("id") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="text-sm font-medium text-foreground">
                                  {property.uniqueIdFromEngagements || property.id}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("address") && (
                              <td className="px-3 py-2.5">
                                <div className="flex items-start gap-2 max-w-xs">
                                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  <span className="text-sm text-foreground break-words">
                                    {property.fullAddress}
                                  </span>
                                </div>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("region") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="text-sm text-muted-foreground">
                                  {property.region || "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("renovador") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm text-foreground">
                                    {property.renovador || "N/A"}
                                  </span>
                                </div>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("renoType") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {property.renoType ? (() => {
                                  const typeLower = property.renoType.toLowerCase();
                                  const isNoReno = typeLower.includes('no reno') || typeLower.includes('no_reno');

                                  let dotColor = 'bg-green-500';
                                  if (isNoReno) {
                                    dotColor = 'bg-gray-600 dark:bg-gray-400';
                                  } else if (typeLower.includes('light')) {
                                    dotColor = 'bg-green-600';
                                  } else if (typeLower.includes('medium')) {
                                    dotColor = 'bg-amber-500';
                                  } else if (typeLower.includes('major')) {
                                    dotColor = 'bg-orange-500';
                                  }

                                  return (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                                      <span className={cn("h-2 w-2 rounded-full flex-shrink-0", dotColor)} />
                                      {property.renoType}
                                    </span>
                                  );
                                })() : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("estimatedVisit") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
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
                              <td className="px-3 py-2.5 whitespace-nowrap">
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
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {property.daysToVisit !== null && property.daysToVisit !== undefined 
                                    ? `${property.daysToVisit} días`
                                    : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("daysToStartRenoSinceRSD") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {property.daysToStartRenoSinceRSD !== null && property.daysToStartRenoSinceRSD !== undefined 
                                    ? `${property.daysToStartRenoSinceRSD} días`
                                    : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("renoDuration") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {property.renoDuration !== null && property.renoDuration !== undefined 
                                    ? `${property.renoDuration} días`
                                    : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("daysToPropertyReady") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {property.daysToPropertyReady !== null && property.daysToPropertyReady !== undefined 
                                    ? `${property.daysToPropertyReady} días`
                                    : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("budgetPhReadyDate") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {(property as any).supabaseProperty?.budget_ph_ready_date ? formatDate((property as any).supabaseProperty.budget_ph_ready_date) : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("renovatorBudgetApprovalDate") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {(property as any).supabaseProperty?.renovator_budget_approval_date ? formatDate((property as any).supabaseProperty.renovator_budget_approval_date) : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("initialVisitDate") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {(property as any).supabaseProperty?.initial_visit_date ? formatDate((property as any).supabaseProperty.initial_visit_date) : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("estRenoStartDate") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {(property as any).supabaseProperty?.est_reno_start_date ? formatDate((property as any).supabaseProperty.est_reno_start_date) : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("renoStartDate") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {(property as any).supabaseProperty?.start_date ? formatDate((property as any).supabaseProperty.start_date) : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("renoEstimatedEndDate") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {(property as any).supabaseProperty?.estimated_end_date ? formatDate((property as any).supabaseProperty.estimated_end_date) : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("renoEndDate") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="text-sm text-foreground">
                                  {(property as any).supabaseProperty?.reno_end_date ? formatDate((property as any).supabaseProperty.reno_end_date) : "N/A"}
                                </span>
                              </td>
                            )}
                            {getVisibleColumnsForPhase(column.key).has("progress") && (
                              <td className="px-3 py-2.5 whitespace-nowrap">
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
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <Badge variant="outline" className="text-xs">
                                  {(property as any)?.supabaseProperty?.['Set Up Status'] || 
                                   property.status || 
                                   t.propertyCard.workInProgress || 
                                   "Active"}
                                </Badge>
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

      {/* Side Panel Sheet */}
      <Sheet open={!!selectedProperty} onOpenChange={(open) => { if (!open) setSelectedProperty(null); }}>
        <SheetContent side="right" className="w-[90vw] sm:w-[50vw] sm:max-w-2xl p-0 overflow-hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Detalle de vivienda</SheetTitle>
            <SheetDescription>Resumen de la propiedad seleccionada</SheetDescription>
          </SheetHeader>
          {selectedProperty && (
            <div className="p-6 h-full overflow-y-auto">
              <PropertySidePanel
                property={selectedProperty}
                viewMode={viewMode}
                fromParam={fromParam}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
      </>
    );
  };

  // Render Project List View (for viewLevel === "project")
  const renderProjectListView = () => {
    if (!filteredProjectsByPhase) return null;

    const hasAny = visibleColumns.some(
      (col) => (filteredProjectsByPhase[col.key] || []).length > 0
    );

    if (!hasAny) {
      return (
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No se encontraron proyectos</p>
          </div>
        </div>
      );
    }

    const projectTotalCount = visibleColumns.reduce(
      (sum, col) => sum + (filteredProjectsByPhase[col.key] || []).length,
      0
    );

    const handleProjectSort = (col: ProjectSortCol) => {
      if (projectSortCol === col) {
        if (projectSortDir === "asc") setProjectSortDir("desc");
        else if (projectSortDir === "desc") { setProjectSortCol(null); setProjectSortDir(null); }
        else setProjectSortDir("asc");
      } else {
        setProjectSortCol(col);
        setProjectSortDir("asc");
      }
    };

    const renderProjectSortIcon = (col: ProjectSortCol) => {
      if (projectSortCol !== col) return <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />;
      if (projectSortDir === "asc") return <ChevronUp className="h-3 w-3 text-[var(--prophero-blue-500)]" />;
      return <ChevronDown className="h-3 w-3 text-[var(--prophero-blue-500)]" />;
    };

    const ARCHITECT_PHASE_DATE_COLS: Record<string, { cols: { key: ProjectSortCol; label: string; field: string; isLimit?: boolean; baseDateField?: string; limitDays?: number }[] }> = {
      "arch-pending-measurement": {
        cols: [
          { key: "measurementDate", label: "F. Medición", field: "measurement_date" },
          { key: "measurementLimit", label: "F. Límite Medición", field: "draft_order_date", isLimit: true, baseDateField: "draft_order_date", limitDays: 7 },
        ],
      },
      "arch-preliminary-project": {
        cols: [
          { key: "preliminaryDate", label: "F. Anteproyecto", field: "project_draft_date" },
          { key: "preliminaryLimit", label: "F. Límite Anteproyecto", field: "measurement_date", isLimit: true, baseDateField: "measurement_date", limitDays: 14 },
        ],
      },
      "arch-ecu-first-validation": {
        cols: [
          { key: "ecuUploadDate", label: "F. Subida ECU", field: "ecu_first_start_date" },
          { key: "ecuEstEndDate", label: "F. Est. Fin ECU", field: "draft_validation_date", isLimit: true, baseDateField: "draft_validation_date", limitDays: 28 },
        ],
      },
      "arch-technical-adjustments": {
        cols: [
          { key: "adjustmentStartDate", label: "F. Inicio Ajustes", field: "ecu_first_end_date" },
          { key: "adjustmentLimit", label: "F. Límite Ajustes", field: "ecu_first_end_date", isLimit: true, baseDateField: "ecu_first_end_date", limitDays: 7 },
        ],
      },
    };

    const getArchitectDateValue = (proj: ProjectRow, col: typeof ARCHITECT_PHASE_DATE_COLS[string]["cols"][number]): string | null => {
      if (col.isLimit && col.baseDateField && col.limitDays) {
        const baseVal = (proj as any)[col.baseDateField];
        if (!baseVal) return null;
        const base = new Date(baseVal);
        if (isNaN(base.getTime())) return null;
        const limit = new Date(base.getTime() + col.limitDays * 24 * 60 * 60 * 1000);
        return limit.toISOString();
      }
      return (proj as any)[col.field] || null;
    };

    const isDatePastLimit = (dateStr: string | null): boolean => {
      if (!dateStr) return false;
      return new Date(dateStr).getTime() < Date.now();
    };

    const sortProjectRows = (rows: ProjectRow[]) => {
      if (!projectSortCol || !projectSortDir) return rows;
      return [...rows].sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";
        switch (projectSortCol) {
          case "name": aVal = (a.name ?? "").toLowerCase(); bVal = (b.name ?? "").toLowerCase(); break;
          case "projectId": aVal = (a.project_unique_id ?? a.id ?? "").toLowerCase(); bVal = (b.project_unique_id ?? b.id ?? "").toLowerCase(); break;
          case "type": aVal = ((a as any).type ?? "").toLowerCase(); bVal = ((b as any).type ?? "").toLowerCase(); break;
          case "investmentType": aVal = ((a as any).investment_type ?? "").toLowerCase(); bVal = ((b as any).investment_type ?? "").toLowerCase(); break;
          case "area": aVal = ((a as any).area_cluster ?? "").toLowerCase(); bVal = ((b as any).area_cluster ?? "").toLowerCase(); break;
          case "propertiesCount": {
            const ptcA = (a as any).properties_to_convert; const ptcAStr = ptcA != null ? String(ptcA).trim() : "";
            const ptcB = (b as any).properties_to_convert; const ptcBStr = ptcB != null ? String(ptcB).trim() : "";
            aVal = ptcAStr && ptcAStr !== "0" ? Number(ptcAStr) || 0 : Number((a as any).est_properties) || 0;
            bVal = ptcBStr && ptcBStr !== "0" ? Number(ptcBStr) || 0 : Number((b as any).est_properties) || 0;
            break;
          }
          case "renovator": aVal = ((a as any).renovator ?? "").toLowerCase(); bVal = ((b as any).renovator ?? "").toLowerCase(); break;
          case "scouter": aVal = ((a as any).scouter ?? "").toLowerCase(); bVal = ((b as any).scouter ?? "").toLowerCase(); break;
          case "architect": aVal = ((a as any).architect ?? "").toLowerCase(); bVal = ((b as any).architect ?? "").toLowerCase(); break;
          case "excludedEcu": aVal = (a as any).excluded_from_ecu === true ? 1 : 0; bVal = (b as any).excluded_from_ecu === true ? 1 : 0; break;
          case "status": aVal = ((a as any).project_status ?? "").toLowerCase(); bVal = ((b as any).project_status ?? "").toLowerCase(); break;
          case "projectStartDate": {
            const da = (a as any).project_start_date; const db = (b as any).project_start_date;
            aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break;
          }
          case "settlementDate": {
            const sa = (a as any).settlement_date; const sb = (b as any).settlement_date;
            aVal = sa ? new Date(sa).getTime() : 0; bVal = sb ? new Date(sb).getTime() : 0; break;
          }
          case "measurementDate": { const da = (a as any).measurement_date; const db = (b as any).measurement_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "preliminaryDate": { const da = (a as any).project_draft_date; const db = (b as any).project_draft_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "ecuUploadDate": { const da = (a as any).ecu_first_start_date; const db = (b as any).ecu_first_start_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "adjustmentStartDate": { const da = (a as any).ecu_first_end_date; const db = (b as any).ecu_first_end_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "measurementLimit": case "preliminaryLimit": case "ecuEstEndDate": case "adjustmentLimit": break;
          case "ecuContact": aVal = ((a as any).ecu_contact ?? "").toLowerCase(); bVal = ((b as any).ecu_contact ?? "").toLowerCase(); break;
          case "estProperties": aVal = Number((a as any).est_properties) || 0; bVal = Number((b as any).est_properties) || 0; break;
          case "propertiesToConvert": aVal = Number((a as any).properties_to_convert) || 0; bVal = Number((b as any).properties_to_convert) || 0; break;
          case "arrasDeadline": { const da = (a as any).arras_deadline; const db = (b as any).arras_deadline; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "draftOrderDate": { const da = (a as any).draft_order_date; const db = (b as any).draft_order_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "projectDraftDate": { const da = (a as any).project_draft_date; const db = (b as any).project_draft_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "draftValidationDate": { const da = (a as any).draft_validation_date; const db = (b as any).draft_validation_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "projectEndDate": { const da = (a as any).project_end_date; const db = (b as any).project_end_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "projectArchitectDate": { const da = (a as any).project_architect_date; const db = (b as any).project_architect_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "ecuFirstStartDate": { const da = (a as any).ecu_first_start_date; const db = (b as any).ecu_first_start_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "ecuFirstEndDate": { const da = (a as any).ecu_first_end_date; const db = (b as any).ecu_first_end_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "ecuFinalStartDate": { const da = (a as any).ecu_final_start_date; const db = (b as any).ecu_final_start_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "ecuFinalEndDate": { const da = (a as any).ecu_final_end_date; const db = (b as any).ecu_final_end_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "ecuDeliveryDate": { const da = (a as any).ecu_delivery_date; const db = (b as any).ecu_delivery_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "definitiveValidationDate": { const da = (a as any).definitive_validation_date; const db = (b as any).definitive_validation_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "architectFee": aVal = Number((a as any).architect_fee) || 0; bVal = Number((b as any).architect_fee) || 0; break;
          case "renovationSpend": aVal = Number((a as any).renovation_spend) || 0; bVal = Number((b as any).renovation_spend) || 0; break;
          case "lead": aVal = ((a as any).lead ?? "").toLowerCase(); bVal = ((b as any).lead ?? "").toLowerCase(); break;
          case "operationName": aVal = ((a as any).operation_name ?? "").toLowerCase(); bVal = ((b as any).operation_name ?? "").toLowerCase(); break;
          case "estimatedSettlementDate": { const da = (a as any).estimated_settlement_date; const db = (b as any).estimated_settlement_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "estRenoStartDateProj": { const da = (a as any).est_reno_start_date; const db = (b as any).est_reno_start_date; aVal = da ? new Date(da).getTime() : 0; bVal = db ? new Date(db).getTime() : 0; break; }
          case "renovationExecutor": aVal = ((a as any).renovation_executor ?? "").toLowerCase(); bVal = ((b as any).renovation_executor ?? "").toLowerCase(); break;
          default: break;
        }
        if (aVal < bVal) return projectSortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return projectSortDir === "asc" ? 1 : -1;
        return 0;
      });
    };

    const parseArea = (raw: string | null | undefined): string => {
      if (!raw) return "";
      const trimmed = raw.trim();
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter((x: unknown) => x != null && String(x).trim()).map(String).join(", ");
      } catch { /* not JSON */ }
      return trimmed;
    };

    const projectFilteredPhases = selectedPhaseFilter === "all"
      ? visibleColumns.filter((col) => (filteredProjectsByPhase[col.key] || []).length > 0)
      : visibleColumns.filter((col) => col.key === selectedPhaseFilter);

    const isMaturationList = fromParam === "maturation-kanban";

    return (
      <>
      <div className="flex flex-col h-full">
        {/* Phase filter — Segmented Control */}
        <div className="sticky top-0 z-10 bg-background pb-3 mb-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/60 dark:bg-muted/30 rounded-lg p-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
              <button
                onClick={() => setSelectedPhaseFilter("all")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1.5",
                  selectedPhaseFilter === "all"
                    ? "bg-background dark:bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Todos
                <span className={cn("text-[10px] tabular-nums", selectedPhaseFilter === "all" ? "text-foreground/60" : "text-muted-foreground/70")}>{projectTotalCount}</span>
              </button>
              {visibleColumns.map((col) => {
                const count = (filteredProjectsByPhase[col.key] || []).length;
                const phaseLabel = (col as RenoKanbanColumnConfig & { label?: string }).label ?? PROJECT_KANBAN_PHASE_LABELS[col.key] ?? t.kanban[col.translationKey];
                const isSelected = selectedPhaseFilter === col.key;
                return (
                  <button
                    key={col.key}
                    onClick={() => setSelectedPhaseFilter(col.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1.5",
                      isSelected
                        ? "bg-background dark:bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {phaseLabel}
                    <span className={cn("text-[10px] tabular-nums", isSelected ? "text-foreground/60" : "text-muted-foreground/70")}>{count}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                const allPhaseKeys = projectFilteredPhases.map(c => c.key);
                const allCollapsed = allPhaseKeys.every(k => collapsedPhases.has(k));
                if (allCollapsed) {
                  setCollapsedPhases(new Set());
                } else {
                  setCollapsedPhases(new Set(allPhaseKeys));
                }
              }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-accent/50 flex-shrink-0 whitespace-nowrap"
              title={projectFilteredPhases.every(c => collapsedPhases.has(c.key)) ? "Expandir todo" : "Colapsar todo"}
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", projectFilteredPhases.every(c => collapsedPhases.has(c.key)) && "-rotate-90")} />
              <span className="hidden sm:inline">{projectFilteredPhases.every(c => collapsedPhases.has(c.key)) ? "Expandir" : "Colapsar"}</span>
            </button>
            {canExportCsv && (
              <button
                onClick={() => handleOpenCsvExport("project")}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-accent/50 flex-shrink-0 whitespace-nowrap"
                title="Exportar CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}
          </div>
        </div>

        {/* Project tables grouped by phase */}
        <div className="space-y-3 pb-4 overflow-y-auto flex-1">
          {projectFilteredPhases.map((column) => {
            const projects = sortProjectRows(filteredProjectsByPhase[column.key] || []);
            if (projects.length === 0) return null;
            const phaseLabel = (column as RenoKanbanColumnConfig & { label?: string }).label ?? PROJECT_KANBAN_PHASE_LABELS[column.key] ?? t.kanban[column.translationKey];
            const isCollapsed = collapsedPhases.has(column.key);

            return (
              <div key={column.key} className="bg-card rounded-lg border border-border/60 overflow-hidden shadow-sm">
                {/* Phase header */}
                <div className="px-4 py-2.5 border-b border-border/40 bg-muted/30 dark:bg-muted/10">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => togglePhaseCollapse(column.key)}
                      className="flex items-center gap-2 hover:bg-accent/50 transition-colors rounded-md px-2 py-1 -ml-2 flex-1 min-w-0"
                    >
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0", isCollapsed && "-rotate-90")} />
                      <h3 className="font-semibold text-foreground text-base truncate">{phaseLabel}</h3>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums bg-muted rounded-full px-2 py-0.5 flex-shrink-0">
                        {projects.length}
                      </span>
                    </button>

                    <button
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent/50 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectColSelectorOpen({ phase: column.key });
                      }}
                    >
                      <Settings className="h-3 w-3" />
                      <span>{isArchitectView ? "Ordenar columnas" : "Más campos"}</span>
                    </button>
                  </div>
                </div>

                {/* Table */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/20 dark:bg-muted/10 border-b border-border/40 sticky top-0">
                        {(() => {
                          const vc = getVisibleProjectCols(column.key);
                          const thCls = "px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider cursor-pointer hover:bg-accent/40 transition-colors";
                          return (
                            <tr>
                              {vc.has("projectId") && <th className={thCls} onClick={() => handleProjectSort("projectId")}><div className="flex items-center gap-2">ID {renderProjectSortIcon("projectId")}</div></th>}
                              {vc.has("name") && <th className={thCls} onClick={() => handleProjectSort("name")}><div className="flex items-center gap-2">Nombre {renderProjectSortIcon("name")}</div></th>}
                              {vc.has("propertiesCount") && <th className={thCls} onClick={() => handleProjectSort("propertiesCount")}><div className="flex items-center gap-2">Propiedades {renderProjectSortIcon("propertiesCount")}</div></th>}
                              {vc.has("scouter") && <th className={thCls} onClick={() => handleProjectSort("scouter")}><div className="flex items-center gap-2">Scouter {renderProjectSortIcon("scouter")}</div></th>}
                              {vc.has("architect") && <th className={thCls} onClick={() => handleProjectSort("architect")}><div className="flex items-center gap-2">Arquitecto {renderProjectSortIcon("architect")}</div></th>}
                              {vc.has("excludedEcu") && <th className={thCls} onClick={() => handleProjectSort("excludedEcu")}><div className="flex items-center gap-2">ECU {renderProjectSortIcon("excludedEcu")}</div></th>}
                              {vc.has("type") && <th className={thCls} onClick={() => handleProjectSort("type")}><div className="flex items-center gap-2">Tipo {renderProjectSortIcon("type")}</div></th>}
                              {vc.has("investmentType") && <th className={thCls} onClick={() => handleProjectSort("investmentType")}><div className="flex items-center gap-2">Inversión {renderProjectSortIcon("investmentType")}</div></th>}
                              {vc.has("area") && <th className={thCls} onClick={() => handleProjectSort("area")}><div className="flex items-center gap-2">Zona {renderProjectSortIcon("area")}</div></th>}
                              {vc.has("renovator") && <th className={thCls} onClick={() => handleProjectSort("renovator")}><div className="flex items-center gap-2">Renovador {renderProjectSortIcon("renovator")}</div></th>}
                              {vc.has("projectStartDate") && <th className={thCls} onClick={() => handleProjectSort("projectStartDate")}><div className="flex items-center gap-2">Inicio Proyecto {renderProjectSortIcon("projectStartDate")}</div></th>}
                              {vc.has("settlementDate") && <th className={thCls} onClick={() => handleProjectSort("settlementDate")}><div className="flex items-center gap-2">Fecha Liquidación {renderProjectSortIcon("settlementDate")}</div></th>}
                              {vc.has("status") && <th className={thCls} onClick={() => handleProjectSort("status")}><div className="flex items-center gap-2">Estado {renderProjectSortIcon("status")}</div></th>}
                              {vc.has("ecuContact") && <th className={thCls} onClick={() => handleProjectSort("ecuContact")}><div className="flex items-center gap-2">Contacto ECU {renderProjectSortIcon("ecuContact")}</div></th>}
                              {vc.has("estProperties") && <th className={thCls} onClick={() => handleProjectSort("estProperties")}><div className="flex items-center gap-2">Est. Propiedades {renderProjectSortIcon("estProperties")}</div></th>}
                              {vc.has("propertiesToConvert") && <th className={thCls} onClick={() => handleProjectSort("propertiesToConvert")}><div className="flex items-center gap-2">Props. a Convertir {renderProjectSortIcon("propertiesToConvert")}</div></th>}
                              {vc.has("arrasDeadline") && <th className={thCls} onClick={() => handleProjectSort("arrasDeadline")}><div className="flex items-center gap-2">Fecha Arras {renderProjectSortIcon("arrasDeadline")}</div></th>}
                              {vc.has("draftOrderDate") && <th className={thCls} onClick={() => handleProjectSort("draftOrderDate")}><div className="flex items-center gap-2">Encargo Anteproyecto {renderProjectSortIcon("draftOrderDate")}</div></th>}
                              {vc.has("projectDraftDate") && <th className={thCls} onClick={() => handleProjectSort("projectDraftDate")}><div className="flex items-center gap-2">Fecha Anteproyecto {renderProjectSortIcon("projectDraftDate")}</div></th>}
                              {vc.has("draftValidationDate") && <th className={thCls} onClick={() => handleProjectSort("draftValidationDate")}><div className="flex items-center gap-2">Val. Anteproyecto {renderProjectSortIcon("draftValidationDate")}</div></th>}
                              {vc.has("projectEndDate") && <th className={thCls} onClick={() => handleProjectSort("projectEndDate")}><div className="flex items-center gap-2">Fecha Proyecto {renderProjectSortIcon("projectEndDate")}</div></th>}
                              {vc.has("projectArchitectDate") && <th className={thCls} onClick={() => handleProjectSort("projectArchitectDate")}><div className="flex items-center gap-2">Fecha Arquitecto {renderProjectSortIcon("projectArchitectDate")}</div></th>}
                              {vc.has("ecuFirstStartDate") && <th className={thCls} onClick={() => handleProjectSort("ecuFirstStartDate")}><div className="flex items-center gap-2">ECU Inicio 1ª Val. {renderProjectSortIcon("ecuFirstStartDate")}</div></th>}
                              {vc.has("ecuFirstEndDate") && <th className={thCls} onClick={() => handleProjectSort("ecuFirstEndDate")}><div className="flex items-center gap-2">ECU Fin 1ª Val. {renderProjectSortIcon("ecuFirstEndDate")}</div></th>}
                              {vc.has("ecuFinalStartDate") && <th className={thCls} onClick={() => handleProjectSort("ecuFinalStartDate")}><div className="flex items-center gap-2">ECU Inicio Final {renderProjectSortIcon("ecuFinalStartDate")}</div></th>}
                              {vc.has("ecuFinalEndDate") && <th className={thCls} onClick={() => handleProjectSort("ecuFinalEndDate")}><div className="flex items-center gap-2">ECU Fin Final {renderProjectSortIcon("ecuFinalEndDate")}</div></th>}
                              {vc.has("ecuDeliveryDate") && <th className={thCls} onClick={() => handleProjectSort("ecuDeliveryDate")}><div className="flex items-center gap-2">Entrega ECU {renderProjectSortIcon("ecuDeliveryDate")}</div></th>}
                              {vc.has("definitiveValidationDate") && <th className={thCls} onClick={() => handleProjectSort("definitiveValidationDate")}><div className="flex items-center gap-2">Val. Definitiva {renderProjectSortIcon("definitiveValidationDate")}</div></th>}
                              {vc.has("architectFee") && <th className={thCls} onClick={() => handleProjectSort("architectFee")}><div className="flex items-center gap-2">Honorarios Arq. {renderProjectSortIcon("architectFee")}</div></th>}
                              {vc.has("renovationSpend") && <th className={thCls} onClick={() => handleProjectSort("renovationSpend")}><div className="flex items-center gap-2">Gasto Reno {renderProjectSortIcon("renovationSpend")}</div></th>}
                              {vc.has("lead") && <th className={thCls} onClick={() => handleProjectSort("lead")}><div className="flex items-center gap-2">Lead {renderProjectSortIcon("lead")}</div></th>}
                              {vc.has("operationName") && <th className={thCls} onClick={() => handleProjectSort("operationName")}><div className="flex items-center gap-2">Nombre Operación {renderProjectSortIcon("operationName")}</div></th>}
                              {vc.has("estimatedSettlementDate") && <th className={thCls} onClick={() => handleProjectSort("estimatedSettlementDate")}><div className="flex items-center gap-2">Liquidación Est. {renderProjectSortIcon("estimatedSettlementDate")}</div></th>}
                              {vc.has("estRenoStartDateProj") && <th className={thCls} onClick={() => handleProjectSort("estRenoStartDateProj")}><div className="flex items-center gap-2">Est. Reno Start {renderProjectSortIcon("estRenoStartDateProj")}</div></th>}
                              {vc.has("renovationExecutor") && <th className={thCls} onClick={() => handleProjectSort("renovationExecutor")}><div className="flex items-center gap-2">Ejecutor Reno {renderProjectSortIcon("renovationExecutor")}</div></th>}
                              {isArchitectView && ARCHITECT_PHASE_DATE_COLS[column.key]?.cols.map((dc) => (
                                <th key={dc.key} className={thCls} onClick={() => handleProjectSort(dc.key)}>
                                  <div className="flex items-center gap-2">{dc.label} {renderProjectSortIcon(dc.key)}</div>
                                </th>
                              ))}
                            </tr>
                          );
                        })()}
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {projects.map((proj, idx) => {
                          const investType = ((proj as any).investment_type ?? "").toString().trim().toLowerCase();
                          const isFlip = investType.includes("flip");
                          const isYield = investType.includes("yield");
                          const typeRaw = ((proj as any).type ?? "").toString().trim();
                          const typeLower = typeRaw.toLowerCase();
                          const area = parseArea((proj as any).area_cluster);

                          return (
                            <tr
                              key={proj.id}
                              onClick={() => setSelectedProjectRow(proj)}
                              className={cn(
                                "cursor-pointer transition-colors",
                                selectedProjectRow?.id === proj.id && "bg-accent/80 dark:bg-accent/30",
                                idx % 2 === 1 ? "bg-muted/20 dark:bg-muted/5 hover:bg-accent/60 dark:hover:bg-accent/20" : "hover:bg-accent/60 dark:hover:bg-accent/20"
                              )}
                            >
                              {(() => {
                                const vc = getVisibleProjectCols(column.key);
                                const tdCls = "px-3 py-2.5 whitespace-nowrap";
                                return (
                                  <>
                                    {vc.has("projectId") && <td className={tdCls}><span className="text-sm font-medium text-foreground">{proj.project_unique_id || proj.id?.slice(0, 8)}</span></td>}
                                    {vc.has("name") && <td className="px-3 py-2.5"><span className="text-sm text-foreground font-medium break-words max-w-xs inline-block">{proj.name || "Sin nombre"}</span></td>}
                                    {vc.has("propertiesCount") && <td className={tdCls}><span className="text-sm text-foreground">{(() => { const ptc = (proj as any).properties_to_convert; const ptcS = ptc != null ? String(ptc).trim() : ""; return ptcS && ptcS !== "0" ? ptcS : ((proj as any).est_properties ?? "—"); })()}</span></td>}
                                    {vc.has("scouter") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).scouter || "—"}</span></td>}
                                    {vc.has("architect") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).architect || "—"}</span></td>}
                                    {vc.has("excludedEcu") && <td className={tdCls}>{(proj as any).excluded_from_ecu === true ? (<Badge variant="outline" className="text-xs border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">Sin ECU</Badge>) : (<span className="text-sm text-muted-foreground">Con ECU</span>)}</td>}
                                    {vc.has("type") && <td className={tdCls}>{typeRaw ? (<span className={cn("inline-flex items-center rounded-full text-xs font-medium px-2 py-1", typeLower === "project" && "bg-blue-600 text-white", typeLower === "wip" && "bg-sky-200 dark:bg-neutral-700/40 text-sky-800 dark:text-neutral-200 border border-sky-300 dark:border-neutral-600/50", typeLower === "new build" && "bg-blue-200 dark:bg-neutral-700/40 text-blue-800 dark:text-neutral-200 border border-blue-200 dark:border-neutral-600/50", !["project", "wip", "new build"].includes(typeLower) && "bg-muted text-muted-foreground border border-border")}>{typeRaw}</span>) : <span className="text-sm text-muted-foreground">—</span>}</td>}
                                    {vc.has("investmentType") && <td className={tdCls}>{isFlip ? (<Badge variant="outline" className="text-xs border-green-600 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30">Flip</Badge>) : isYield ? (<Badge variant="outline" className="text-xs border-blue-600 text-blue-700 dark:text-neutral-400 bg-blue-50 dark:bg-white/10">Yield</Badge>) : (proj as any).investment_type ? (<Badge variant="secondary" className="text-xs">{(proj as any).investment_type}</Badge>) : <span className="text-sm text-muted-foreground">—</span>}</td>}
                                    {vc.has("area") && <td className={tdCls}><span className="text-sm text-muted-foreground">{area || "—"}</span></td>}
                                    {vc.has("renovator") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).renovator || "—"}</span></td>}
                                    {vc.has("projectStartDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).project_start_date ? formatDate((proj as any).project_start_date) : "—"}</span></td>}
                                    {vc.has("settlementDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).settlement_date ? formatDate((proj as any).settlement_date) : "—"}</span></td>}
                                    {vc.has("status") && <td className={tdCls}><Badge variant="outline" className="text-xs">{(proj as any).project_status || "—"}</Badge></td>}
                                    {vc.has("ecuContact") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).ecu_contact || "—"}</span></td>}
                                    {vc.has("estProperties") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).est_properties || "—"}</span></td>}
                                    {vc.has("propertiesToConvert") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).properties_to_convert || "—"}</span></td>}
                                    {vc.has("arrasDeadline") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).arras_deadline ? formatDate((proj as any).arras_deadline) : "—"}</span></td>}
                                    {vc.has("draftOrderDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).draft_order_date ? formatDate((proj as any).draft_order_date) : "—"}</span></td>}
                                    {vc.has("projectDraftDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).project_draft_date ? formatDate((proj as any).project_draft_date) : "—"}</span></td>}
                                    {vc.has("draftValidationDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).draft_validation_date ? formatDate((proj as any).draft_validation_date) : "—"}</span></td>}
                                    {vc.has("projectEndDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).project_end_date ? formatDate((proj as any).project_end_date) : "—"}</span></td>}
                                    {vc.has("projectArchitectDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).project_architect_date ? formatDate((proj as any).project_architect_date) : "—"}</span></td>}
                                    {vc.has("ecuFirstStartDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).ecu_first_start_date ? formatDate((proj as any).ecu_first_start_date) : "—"}</span></td>}
                                    {vc.has("ecuFirstEndDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).ecu_first_end_date ? formatDate((proj as any).ecu_first_end_date) : "—"}</span></td>}
                                    {vc.has("ecuFinalStartDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).ecu_final_start_date ? formatDate((proj as any).ecu_final_start_date) : "—"}</span></td>}
                                    {vc.has("ecuFinalEndDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).ecu_final_end_date ? formatDate((proj as any).ecu_final_end_date) : "—"}</span></td>}
                                    {vc.has("ecuDeliveryDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).ecu_delivery_date ? formatDate((proj as any).ecu_delivery_date) : "—"}</span></td>}
                                    {vc.has("definitiveValidationDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).definitive_validation_date ? formatDate((proj as any).definitive_validation_date) : "—"}</span></td>}
                                    {vc.has("architectFee") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).architect_fee != null ? `${Number((proj as any).architect_fee).toLocaleString("es-ES")} €` : "—"}</span></td>}
                                    {vc.has("renovationSpend") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).renovation_spend != null ? `${Number((proj as any).renovation_spend).toLocaleString("es-ES")} €` : "—"}</span></td>}
                                    {vc.has("lead") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).lead || "—"}</span></td>}
                                    {vc.has("operationName") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).operation_name || "—"}</span></td>}
                                    {vc.has("estimatedSettlementDate") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).estimated_settlement_date ? formatDate((proj as any).estimated_settlement_date) : "—"}</span></td>}
                                    {vc.has("estRenoStartDateProj") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).est_reno_start_date ? formatDate((proj as any).est_reno_start_date) : "—"}</span></td>}
                                    {vc.has("renovationExecutor") && <td className={tdCls}><span className="text-sm text-foreground">{(proj as any).renovation_executor || "—"}</span></td>}
                                    {isArchitectView && ARCHITECT_PHASE_DATE_COLS[column.key]?.cols.map((dc) => {
                                      const val = getArchitectDateValue(proj, dc);
                                      const isPast = dc.isLimit && isDatePastLimit(val);
                                      return (
                                        <td key={dc.key} className={tdCls}>
                                          {val ? (
                                            <span className={cn("text-sm", isPast ? "text-destructive font-medium" : "text-foreground")}>
                                              {formatDate(val)}
                                            </span>
                                          ) : (
                                            <span className="text-sm text-muted-foreground">—</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </>
                                );
                              })()}
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

      {/* Project Side Panel */}
      <Sheet open={!!selectedProjectRow} onOpenChange={(open) => { if (!open) setSelectedProjectRow(null); }}>
        <SheetContent side="right" className="w-[90vw] sm:w-[50vw] sm:max-w-2xl p-0 overflow-hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Detalle del proyecto</SheetTitle>
            <SheetDescription>Panel lateral con resumen del proyecto</SheetDescription>
          </SheetHeader>
          {selectedProjectRow && (
            <div className="p-6 h-full overflow-y-auto">
              <ProjectSidePanel
                project={selectedProjectRow}
                viewMode="list"
                fromParam={fromParam}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
      </>
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
      {/* Mobile: solo mostrar fases con resultados cuando hay búsqueda activa */}
      <div className="flex flex-col md:hidden gap-1 pb-20 px-1">
        {mobileVisibleColumns.map((column) => {
          const isProjectView = viewLevel === "project" && filteredProjectsByPhase;
          const properties = isProjectView ? [] : (filteredProperties[column.key] || []);
          const projects = isProjectView ? (filteredProjectsByPhase?.[column.key] || []) : undefined;
          const count = isProjectView ? (projects?.length ?? 0) : properties.length;
          const titleMobile = (column as RenoKanbanColumnConfig & { label?: string }).label ?? PROJECT_KANBAN_PHASE_LABELS[column.key] ?? t.kanban[column.translationKey];
          return (
            <RenoKanbanColumn
              key={column.key}
              title={titleMobile}
              count={count}
              stage={column.stage}
              properties={properties}
              onCardClick={handleCardClick}
              highlightedPropertyId={highlightedPropertyId}
              onColumnRef={(el) => setColumnRef(column.key, el)}
              fromParam={fromParam}
              onAssignSiteManager={undefined}
              projects={projects}
              onProjectClick={handleProjectClick}
              propertiesByProjectId={propertiesByProjectId}
            />
          );
        })}
      </div>

      {/* Desktop: Horizontal layout */}
      <div className="hidden md:flex h-full gap-4 px-1" style={{ minWidth: "fit-content" }}>
        {visibleColumns.map((column) => {
          const isProjectView = viewLevel === "project" && filteredProjectsByPhase;
          const properties = isProjectView ? [] : (filteredProperties[column.key] || []);
          const projects = isProjectView ? (filteredProjectsByPhase?.[column.key] || []) : undefined;
          const count = isProjectView ? (projects?.length ?? 0) : properties.length;
          const titleDesktop = (column as RenoKanbanColumnConfig & { label?: string }).label ?? PROJECT_KANBAN_PHASE_LABELS[column.key] ?? t.kanban[column.translationKey];
          return (
            <RenoKanbanColumn
              key={column.key}
              title={titleDesktop}
              count={count}
              stage={column.stage}
              properties={properties}
              onCardClick={handleCardClick}
              highlightedPropertyId={highlightedPropertyId}
              onColumnRef={(el) => setColumnRef(column.key, el)}
              fromParam={fromParam}
              onAssignSiteManager={undefined}
              projects={projects}
              onProjectClick={handleProjectClick}
              propertiesByProjectId={propertiesByProjectId}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {viewMode === "list"
        ? (viewLevel === "project" && filteredProjectsByPhase ? renderProjectListView() : renderListView())
        : renderKanbanView()}
      
      {/* Column Selector Dialog */}
      {columnSelectorOpen.phase && (
        <ColumnSelectorDialog
          open={!!columnSelectorOpen.phase}
          onOpenChange={(open) => {
            if (!open) {
              setColumnSelectorOpen({ phase: null });
            }
          }}
          columns={columnConfigWithTranslations}
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

      {/* Project Column Selector Dialog */}
      {projectColSelectorOpen.phase && (
        <ColumnSelectorDialog
          open={!!projectColSelectorOpen.phase}
          onOpenChange={(open) => {
            if (!open) {
              setProjectColSelectorOpen({ phase: null });
            }
          }}
          columns={PROJECT_COL_CONFIG}
          visibleColumns={getVisibleProjectCols(projectColSelectorOpen.phase)}
          phase={projectColSelectorOpen.phase}
          phaseLabel={(() => {
            const col = visibleColumns.find(c => c.key === projectColSelectorOpen.phase);
            return (col as any)?.label || PROJECT_KANBAN_PHASE_LABELS[projectColSelectorOpen.phase!] || MATURATION_PHASE_LABELS[projectColSelectorOpen.phase!] || ARCHITECT_PHASE_LABELS[projectColSelectorOpen.phase!] || projectColSelectorOpen.phase || "";
          })()}
          onSave={(cols) => {
            if (projectColSelectorOpen.phase) {
              handleProjectColumnSave(projectColSelectorOpen.phase, cols as Set<ProjectSortCol>);
            }
          }}
          reorderOnly={isArchitectView}
        />
      )}

      {/* CSV Export Dialog */}
      <CsvExportDialog
        open={csvExportOpen}
        onOpenChange={setCsvExportOpen}
        columns={csvExportMode === "project" ? csvProjectColumns : csvPropertyColumns}
        rows={csvExportMode === "project" ? csvProjectRows : csvPropertyRows}
        filenamePrefix={csvExportMode === "project" ? "proyectos" : "propiedades"}
      />
    </>
  );
}

