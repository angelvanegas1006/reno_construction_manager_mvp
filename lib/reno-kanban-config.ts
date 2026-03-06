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
  | "check-final"
  // Fases Kanban Maduración (Maturation Analyst)
  | "get-project-draft"
  | "pending-to-validate"
  | "pending-to-reserve-arras"
  | "technical-project-in-progress"
  | "ecuv-first-validation"
  | "technical-project-fine-tuning"
  | "ecuv-final-validation"
  | "pending-budget-from-renovator"
  // Fases Kanban Arquitecto
  | "arch-pending-measurement"
  | "arch-preliminary-project"
  | "arch-pending-validation"
  | "arch-technical-project"
  | "arch-ecu-first-validation"
  | "arch-technical-adjustments"
  | "arch-ecu-final-validation"
  | "arch-obra-empezar"
  | "arch-completed";

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

// Kanban Proyectos L1: 5 fases según Project status (Airtable). Orphaned no se muestra.
export const PHASES_KANBAN_PROJECTS: RenoKanbanPhase[] = [
  "pendiente-presupuestos-renovador",
  "obra-a-empezar",
  "obra-en-progreso",
  "amueblamiento",
  "check-final",
];

/** Etiquetas de columnas del Kanban Proyectos L1 */
export const PROJECT_KANBAN_PHASE_LABELS: Record<string, string> = {
  "pendiente-presupuestos-renovador": "Pendiente Presupuestos (Renovador)",
  "obra-a-empezar": "Obra a Empezar",
  "obra-en-progreso": "Obra en Progreso",
  "amueblamiento": "Amueblamiento",
  "check-final": "Revisión Final",
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

/** Mapeo Project status (Airtable) → reno_phase (Supabase) para Kanban Proyectos L1 */
export const SET_UP_STATUS_TO_PROJECT_PHASE: Record<string, RenoKanbanPhase> = {
  "Pending to budget (from renovator)": "pendiente-presupuestos-renovador",
  "Pending to budget from renovator": "pendiente-presupuestos-renovador",
  "Pending to start reno": "obra-a-empezar",
  "Reno in progress": "obra-en-progreso",
  "Furnishing": "amueblamiento",
  "Final check": "check-final",
};

// ---------------------------------------------------------------------------
// Kanban Maduración (Maturation Analyst)
// ---------------------------------------------------------------------------

/** View ID de Airtable para la vista de maduración de proyectos */
export const AIRTABLE_MATURATION_PROJECTS_VIEW_ID = "viwGr62VwUAlFCvcH";

/** Fases del Kanban de Maduración (orden de columnas) */
export const PHASES_KANBAN_MATURATION: RenoKanbanPhase[] = [
  "get-project-draft",
  "pending-to-validate",
  "pending-to-reserve-arras",
  "technical-project-in-progress",
  "ecuv-first-validation",
  "technical-project-fine-tuning",
  "ecuv-final-validation",
  "pending-budget-from-renovator",
  "obra-a-empezar",
  "obra-en-progreso",
];

/** Etiquetas en español para las columnas del Kanban de Maduración */
export const MATURATION_PHASE_LABELS: Record<string, string> = {
  "get-project-draft": "Borrador de Proyecto",
  "pending-to-validate": "Pendiente de Validación",
  "pending-to-reserve-arras": "Pendiente de Reserva / Arras",
  "technical-project-in-progress": "Proyecto Técnico en Progreso",
  "ecuv-first-validation": "ECU / Ayto Primera Validación",
  "technical-project-fine-tuning": "Ajuste Proyecto Técnico",
  "ecuv-final-validation": "ECU / Ayto Validación Final",
  "pending-budget-from-renovator": "Pendiente Presupuesto Renovador",
  "obra-a-empezar": "Obra a Empezar",
  "obra-en-progreso": "Obra en Progreso",
};

/** Mapeo Project status (Airtable) → reno_phase para Kanban Maduración */
export const MATURATION_PROJECT_STATUS_TO_PHASE: Record<string, RenoKanbanPhase> = {
  "Get Project Draft": "get-project-draft",
  "Get project draft": "get-project-draft",
  "Pending to Validate": "pending-to-validate",
  "Pending to validate": "pending-to-validate",
  "Pending to Reserve / Arras": "pending-to-reserve-arras",
  "Pending to Reserve Arras": "pending-to-reserve-arras",
  "Pending to reserve arras": "pending-to-reserve-arras",
  "Pending to reserve (arras)": "pending-to-reserve-arras",
  "Technical Project in Progress": "technical-project-in-progress",
  "Technical project in progress": "technical-project-in-progress",
  "ECUV First Validation": "ecuv-first-validation",
  "Ecu first validation": "ecuv-first-validation",
  "ECU First Validation": "ecuv-first-validation",
  "Technical Project Fine Tuning": "technical-project-fine-tuning",
  "Technical project fine-tuning": "technical-project-fine-tuning",
  "Technical Project Fine-Tuning": "technical-project-fine-tuning",
  "ECUV Final Validation": "ecuv-final-validation",
  "Ecu final validation": "ecuv-final-validation",
  "ECU Final Validation": "ecuv-final-validation",
  "Pending to Budget from Renovator": "pending-budget-from-renovator",
  "Pending to budget from renovator": "pending-budget-from-renovator",
  "Pending to budget (from renovator)": "pending-budget-from-renovator",
  "Reno to start": "obra-a-empezar",
  "Reno To Start": "obra-a-empezar",
  "Pending to start reno": "obra-a-empezar",
  "Reno in progress": "obra-en-progreso",
  "Reno In Progress": "obra-en-progreso",
};

/** Columnas visibles del Kanban de Maduración */
export const visibleRenoKanbanColumnsMaturation: RenoKanbanColumn[] = PHASES_KANBAN_MATURATION.map(
  (key) => ({
    key,
    stage: key,
    translationKey: "renoInProgress" as const,
    label: MATURATION_PHASE_LABELS[key] ?? key,
  })
);

// ─── Architect Kanban ────────────────────────────────────────────────────────

export const PHASES_KANBAN_ARCHITECT: RenoKanbanPhase[] = [
  "arch-pending-measurement",
  "arch-preliminary-project",
  "arch-pending-validation",
  "arch-technical-project",
  "arch-ecu-first-validation",
  "arch-technical-adjustments",
  "arch-ecu-final-validation",
  "arch-obra-empezar",
  "arch-completed",
];

export const ARCHITECT_PHASE_LABELS: Record<string, string> = {
  "arch-pending-measurement": "Pendiente de Medición",
  "arch-preliminary-project": "Anteproyecto en Curso",
  "arch-pending-validation": "Pendiente de Validación de PropHero",
  "arch-technical-project": "Proyecto Técnico en Progreso",
  "arch-ecu-first-validation": "ECU Primera Validación",
  "arch-technical-adjustments": "Ajustes Técnicos del Proyecto",
  "arch-ecu-final-validation": "ECU Validación Final",
  "arch-obra-empezar": "Obra a Empezar",
  "arch-completed": "Finalizados",
};

/** Maps maturation reno_phase to architect kanban phase */
export const MATURATION_TO_ARCHITECT_PHASE: Record<string, RenoKanbanPhase> = {
  "get-project-draft": "arch-pending-measurement",
  "pending-to-validate": "arch-pending-validation",
  "pending-to-reserve-arras": "arch-pending-validation",
  "technical-project-in-progress": "arch-technical-project",
  "ecuv-first-validation": "arch-ecu-first-validation",
  "technical-project-fine-tuning": "arch-technical-adjustments",
  "ecuv-final-validation": "arch-ecu-final-validation",
  "pending-budget-from-renovator": "arch-completed",
  "obra-a-empezar": "arch-obra-empezar",
  "obra-en-progreso": "arch-completed",
};

export const visibleRenoKanbanColumnsArchitect: RenoKanbanColumn[] = PHASES_KANBAN_ARCHITECT.map(
  (key) => ({
    key,
    stage: key,
    translationKey: "renoInProgress" as const,
    label: ARCHITECT_PHASE_LABELS[key] ?? key,
  })
);








