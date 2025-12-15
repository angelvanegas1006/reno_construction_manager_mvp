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
  | "cleaning"
  | "furnishing-cleaning" // Legacy - kept for compatibility
  | "reno-fixes"
  | "done"
  | "orphaned"; // Fase para propiedades que no están en ninguna vista de Airtable (no visible)

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
    cleaning: string;
    furnishingCleaning: string; // Legacy
    renoFixes: string;
    done: string;
  };
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
  { key: "cleaning", stage: "cleaning", translationKey: "cleaning" },
  { key: "furnishing-cleaning", stage: "furnishing-cleaning", translationKey: "furnishingCleaning" }, // Legacy - hidden
  { key: "reno-fixes", stage: "reno-fixes", translationKey: "renoFixes" },
  { key: "done", stage: "done", translationKey: "done" },
];

// Visible columns (excluding hidden phases)
export const visibleRenoKanbanColumns: RenoKanbanColumn[] = renoKanbanColumns.filter(
  (column) => column.key !== "reno-fixes" && column.key !== "done" && column.key !== "orphaned" && column.key !== "reno-budget" && column.key !== "upcoming" && column.key !== "furnishing-cleaning" // Hide legacy phases
);








