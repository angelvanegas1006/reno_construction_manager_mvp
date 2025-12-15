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
    id: "pending-documents",
    label: "Documentos Pendientes",
    labelEn: "Pending Documents",
    color: "yellow",
    order: 1,
  },
  {
    id: "document-review",
    label: "Revisión de Documentos",
    labelEn: "Document Review",
    color: "blue",
    order: 2,
  },
  {
    id: "notary-appointment",
    label: "Cita Notaría",
    labelEn: "Notary Appointment",
    color: "purple",
    order: 3,
  },
  {
    id: "signing",
    label: "Firma",
    labelEn: "Signing",
    color: "orange",
    order: 4,
  },
  {
    id: "post-signing",
    label: "Post-Firma",
    labelEn: "Post-Signing",
    color: "green",
    order: 5,
  },
  {
    id: "completed",
    label: "Completado",
    labelEn: "Completed",
    color: "gray",
    order: 6,
  },
  {
    id: "on-hold",
    label: "En Pausa",
    labelEn: "On Hold",
    color: "red",
    order: 7,
  },
];

export function getSettlementPhaseLabel(phase: SettlementKanbanPhase, language: "es" | "en" = "es"): string {
  const column = SETTLEMENTS_KANBAN_COLUMNS.find(col => col.id === phase);
  if (!column) return phase;
  return language === "es" ? column.label : column.labelEn;
}

