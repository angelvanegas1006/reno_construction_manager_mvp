// Settlements Kanban configuration

import { SettlementStage } from "./settlements-storage";

export type SettlementKanbanPhase = SettlementStage;

export interface SettlementKanbanColumn {
  id: SettlementKanbanPhase;
  label: string;
  labelEn: string;
  color: string;
  order: number;
}

export const SETTLEMENTS_KANBAN_COLUMNS: SettlementKanbanColumn[] = [
  {
    id: "verificacion-documentacion",
    label: "Verificación de documentación",
    labelEn: "Document Verification",
    color: "yellow",
    order: 1,
  },
  {
    id: "aprobacion-hipoteca",
    label: "Aprobación de hipoteca",
    labelEn: "Mortgage Approval",
    color: "blue",
    order: 2,
  },
  {
    id: "coordinacion-firma-escritura",
    label: "Coordinación de firma de contrato de escritura",
    labelEn: "Deed Signing Coordination",
    color: "purple",
    order: 3,
  },
  {
    id: "aguardando-firma-compraventa",
    label: "Aguardando firma de compraventa",
    labelEn: "Awaiting Purchase-Sale Signing",
    color: "orange",
    order: 4,
  },
  {
    id: "finalizadas",
    label: "Finalizadas",
    labelEn: "Completed",
    color: "green",
    order: 5,
  },
  {
    id: "canceladas",
    label: "Canceladas",
    labelEn: "Cancelled",
    color: "red",
    order: 6,
  },
];

export function getSettlementPhaseLabel(phase: SettlementKanbanPhase, language: "es" | "en" = "es"): string {
  const column = SETTLEMENTS_KANBAN_COLUMNS.find(col => col.id === phase);
  if (!column) return phase;
  return language === "es" ? column.label : column.labelEn;
}

