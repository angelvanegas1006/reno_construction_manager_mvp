/**
 * Configuration for Reno Construction Manager Kanban phases
 */
export type RenoKanbanPhase = 
  | "upcoming-settlements"
  | "initial-check"
  | "reno-budget-renovator"
  | "reno-budget-client"
  | "reno-budget-start"
  | "reno-budget" // Legacy phase - hidden but kept for compatibility
  | "upcoming" // Additional phase from upstream
  | "reno-in-progress"
  | "furnishing"
  | "final-check"
  | "pendiente-suministros" // Después de Revisión Final; Set Up Status = Utilities activation
  | "final-check-post-suministros" // Solo en Kanban Proyectos/WIP; vista viw4S8L4DT1sSFbtO
  | "cleaning"
  | "furnishing-cleaning" // Legacy - kept for compatibility
  | "reno-fixes"
  | "done"
  | "orphaned" // Fase para propiedades que no están en ninguna vista de Airtable (no visible)
  // Fases Kanban Proyectos (mapeo desde Set Up Status / Project status en Airtable)
  | "analisis-supply"
  | "analisis-reno"
  | "administracion-reno"
  | "pendiente-presupuestos-renovador"
  | "obra-a-empezar"
  | "obra-en-progreso"
  | "amueblamiento"
  | "check-final";

export interface RenoKanbanColumn {
  key: RenoKanbanPhase;
  stage: RenoKanbanPhase;
  translationKey: keyof {
    upcomingSettlements: string;
    initialCheck: string;
    renoBudgetRenovator: string;
    renoBudgetClient: string;
    renoBudgetStart: string;
    upcoming: string;
    renoBudget: string;
    renoInProgress: string;
    furnishing: string;
    finalCheck: string;
    pendienteSuministros: string;
    finalCheckPostSuministros: string;
    cleaning: string;
    furnishingCleaning: string; // Legacy
    renoFixes: string;
    done: string;
  };
  /** Etiqueta fija para columna (p. ej. Kanban Proyectos); si existe se usa en lugar de translationKey */
  label?: string;
}

export const renoKanbanColumns: RenoKanbanColumn[] = [
  { key: "upcoming-settlements", stage: "upcoming-settlements", translationKey: "upcomingSettlements" },
  { key: "initial-check", stage: "initial-check", translationKey: "initialCheck" },
  { key: "reno-budget-renovator", stage: "reno-budget-renovator", translationKey: "renoBudgetRenovator" },
  { key: "reno-budget-client", stage: "reno-budget-client", translationKey: "renoBudgetClient" },
  { key: "reno-budget-start", stage: "reno-budget-start", translationKey: "renoBudgetStart" },
  { key: "reno-budget", stage: "reno-budget", translationKey: "renoBudget" }, // Legacy - hidden
  { key: "upcoming", stage: "upcoming", translationKey: "upcoming" }, // Additional phase from upstream
  { key: "reno-in-progress", stage: "reno-in-progress", translationKey: "renoInProgress" },
  { key: "furnishing", stage: "furnishing", translationKey: "furnishing" },
  { key: "final-check", stage: "final-check", translationKey: "finalCheck" },
  { key: "pendiente-suministros", stage: "pendiente-suministros", translationKey: "pendienteSuministros" },
  { key: "final-check-post-suministros", stage: "final-check-post-suministros", translationKey: "finalCheckPostSuministros" },
  { key: "cleaning", stage: "cleaning", translationKey: "cleaning" },
  { key: "furnishing-cleaning", stage: "furnishing-cleaning", translationKey: "furnishingCleaning" }, // Legacy - hidden
  { key: "reno-fixes", stage: "reno-fixes", translationKey: "renoFixes" },
  { key: "done", stage: "done", translationKey: "done" },
];

// Visible columns for Kanban Units/Buildings/Lots (excluding hidden phases and Final Check Post Suministros)
// Final Check Post Suministros solo se muestra en Kanban Proyectos/WIP (visibleRenoKanbanColumnsObraEnCurso)
export const visibleRenoKanbanColumns: RenoKanbanColumn[] = renoKanbanColumns.filter(
  (column) =>
    column.key !== "reno-fixes" &&
    column.key !== "done" &&
    column.key !== "orphaned" &&
    column.key !== "reno-budget" &&
    column.key !== "upcoming" &&
    column.key !== "furnishing-cleaning" &&
    column.key !== "final-check-post-suministros" // Solo en Kanban Proyectos/WIP
);

// Columns for "Kanban Proyectos / WIP": desde presupuesto (reno-budget) hasta cleaning (legacy, para otros usos)
export const PHASES_FROM_OBRA_START: RenoKanbanPhase[] = [
  "reno-budget",
  "reno-budget-start",
  "reno-in-progress",
  "furnishing",
  "final-check",
  "cleaning",
];
// Usar renoKanbanColumns para incluir reno-budget (en visibleRenoKanbanColumns está oculta)
export const visibleRenoKanbanColumnsFromObraStart: RenoKanbanColumn[] =
  renoKanbanColumns.filter(
    (col) =>
      PHASES_FROM_OBRA_START.includes(col.key) &&
      col.key !== "reno-fixes" &&
      col.key !== "done" &&
      col.key !== "orphaned"
  );

// Obra en curso: 6 fases con asignación a jefe de obra (incl. Final Check Post Suministros)
export const PHASES_OBRA_EN_CURSO: RenoKanbanPhase[] = [
  "reno-in-progress",
  "furnishing",
  "final-check",
  "pendiente-suministros",
  "final-check-post-suministros",
  "cleaning",
];

// Fases iniciales: desde upcoming-settlements hasta reno-budget-start
export const PHASES_FASES_INICIALES: RenoKanbanPhase[] = [
  "upcoming-settlements",
  "initial-check",
  "reno-budget-renovator",
  "reno-budget-client",
  "reno-budget-start",
];

export const visibleRenoKanbanColumnsObraEnCurso: RenoKanbanColumn[] =
  renoKanbanColumns.filter(
    (col) =>
      PHASES_OBRA_EN_CURSO.includes(col.key) &&
      col.key !== "reno-fixes" &&
      col.key !== "done" &&
      col.key !== "orphaned"
  );

export const visibleRenoKanbanColumnsFasesIniciales: RenoKanbanColumn[] =
  renoKanbanColumns.filter(
    (col) =>
      PHASES_FASES_INICIALES.includes(col.key) &&
      col.key !== "reno-fixes" &&
      col.key !== "done" &&
      col.key !== "orphaned"
  );

// Kanban Proyectos/WIP: 8 fases según Set Up Status (view viwz8q4V40BQwSO2N)
export const PHASES_KANBAN_PROJECTS: RenoKanbanPhase[] = [
  "analisis-supply",
  "analisis-reno",
  "administracion-reno",
  "pendiente-presupuestos-renovador",
  "obra-a-empezar",
  "obra-en-progreso",
  "amueblamiento",
  "check-final",
];

/** Etiquetas de columnas del Kanban Proyectos (izq. del ; en la especificación) */
export const PROJECT_KANBAN_PHASE_LABELS: Record<string, string> = {
  "analisis-supply": "Analísis de Supply",
  "analisis-reno": "Analísis Reno",
  "administracion-reno": "Administración de Reno",
  "pendiente-presupuestos-renovador": "Pendiente Presupuestos Renovador",
  "obra-a-empezar": "Obra a Empezar",
  "obra-en-progreso": "Obra en Progreso",
  "amueblamiento": "Amueblamiento",
  "check-final": "Check Final",
};

export const visibleRenoKanbanColumnsProjects: RenoKanbanColumn[] = PHASES_KANBAN_PROJECTS.map(
  (key) => ({
    key,
    stage: key,
    translationKey: "renoInProgress" as const,
    label: PROJECT_KANBAN_PHASE_LABELS[key] ?? key,
  })
);

/** View ID de Airtable para sincronizar proyectos (única fuente) */
export const AIRTABLE_PROJECTS_VIEW_ID = "viwz8q4V40BQwSO2N";

/** Mapeo Set Up Status / Project status (Airtable) → reno_phase (Supabase) */
export const SET_UP_STATUS_TO_PROJECT_PHASE: Record<string, RenoKanbanPhase> = {
  "Get Project Draft": "analisis-supply",
  "Pending to reserve (arras)": "analisis-supply",
  "Pending to validate": "analisis-reno",
  "Technical project in progress": "administracion-reno",
  "Ecu first validation": "administracion-reno",
  "Technical project fine-tuning": "administracion-reno",
  "Ecu final validation": "administracion-reno",
  "Pending to budget from renovator": "pendiente-presupuestos-renovador",
  "Pending to start reno": "obra-a-empezar",
  "Reno in progress": "obra-en-progreso",
  "Furnishing": "amueblamiento",
  "Final check": "check-final",
};








