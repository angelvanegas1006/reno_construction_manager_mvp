/**
 * Configuration for Supply Kanban phases
 */
export type SupplyKanbanPhase = 
  | "draft" // Borrador
  | "in-review" // En revisión
  | "needs-correction" // Necesita corrección
  | "in-negotiation" // En negociación
  | "arras" // Arras
  | "pending-to-settlement" // Pending to settlement
  | "settlement" // Settlement
  | "rejected"; // Rejected

export interface SupplyKanbanColumn {
  key: SupplyKanbanPhase;
  stage: SupplyKanbanPhase;
  translationKey: keyof {
    draft: string;
    inReview: string;
    needsCorrection: string;
    inNegotiation: string;
    arras: string;
    pendingToSettlement: string;
    settlement: string;
    rejected: string;
  };
}

export const supplyKanbanColumns: SupplyKanbanColumn[] = [
  { key: "draft", stage: "draft", translationKey: "draft" },
  { key: "in-review", stage: "in-review", translationKey: "inReview" },
  { key: "needs-correction", stage: "needs-correction", translationKey: "needsCorrection" },
  { key: "in-negotiation", stage: "in-negotiation", translationKey: "inNegotiation" },
  { key: "arras", stage: "arras", translationKey: "arras" },
  { key: "pending-to-settlement", stage: "pending-to-settlement", translationKey: "pendingToSettlement" },
  { key: "settlement", stage: "settlement", translationKey: "settlement" },
  { key: "rejected", stage: "rejected", translationKey: "rejected" },
];

// All columns are visible
export const visibleSupplyKanbanColumns: SupplyKanbanColumn[] = supplyKanbanColumns;
