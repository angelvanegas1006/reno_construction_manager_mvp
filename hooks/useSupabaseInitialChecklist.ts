"use client";

import { useSupabaseChecklistBase } from "./useSupabaseChecklistBase";
import type { ChecklistType } from "@/lib/checklist-storage";

interface UseSupabaseInitialChecklistProps {
  propertyId: string;
  enabled?: boolean; // Si es false, el hook no hará fetch ni ejecutará lógica
}

/**
 * Hook específico para el checklist inicial
 * Mantiene su estado completamente separado del checklist final
 */
export function useSupabaseInitialChecklist({
  propertyId,
  enabled = true,
}: UseSupabaseInitialChecklistProps) {
  return useSupabaseChecklistBase({
    propertyId,
    checklistType: "reno_initial" as ChecklistType,
    inspectionType: "initial",
    enabled,
  });
}

