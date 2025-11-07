/**
 * Configuration for Reno Construction Manager Kanban phases
 */
export type RenoKanbanPhase = 
  | "initial-check"
  | "upcoming"
  | "reno-in-progress"
  | "furnishing-cleaning"
  | "final-check"
  | "reno-fixes"
  | "done";

export interface RenoKanbanColumn {
  key: RenoKanbanPhase;
  stage: RenoKanbanPhase;
  translationKey: keyof {
    initialCheck: string;
    upcoming: string;
    renoInProgress: string;
    furnishingCleaning: string;
    finalCheck: string;
    renoFixes: string;
    done: string;
  };
}

export const renoKanbanColumns: RenoKanbanColumn[] = [
  { key: "initial-check", stage: "initial-check", translationKey: "initialCheck" },
  { key: "upcoming", stage: "upcoming", translationKey: "upcoming" },
  { key: "reno-in-progress", stage: "reno-in-progress", translationKey: "renoInProgress" },
  { key: "furnishing-cleaning", stage: "furnishing-cleaning", translationKey: "furnishingCleaning" },
  { key: "final-check", stage: "final-check", translationKey: "finalCheck" },
  { key: "reno-fixes", stage: "reno-fixes", translationKey: "renoFixes" },
  { key: "done", stage: "done", translationKey: "done" },
];




