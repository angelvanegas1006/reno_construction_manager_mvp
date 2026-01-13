"use client";

import { useSupabaseChecklistBase } from "./useSupabaseChecklistBase";
import type { ChecklistType } from "@/lib/checklist-storage";

interface UseSupabaseFinalChecklistProps {
  propertyId: string;
  enabled?: boolean; // Si es false, el hook no hará fetch ni ejecutará lógica
}

/**
 * Hook específico para el checklist final
 * Mantiene su estado completamente separado del checklist inicial
 */
export function useSupabaseFinalChecklist({
  propertyId,
  enabled = true,
}: UseSupabaseFinalChecklistProps) {
  return useSupabaseChecklistBase({
    propertyId,
    checklistType: "reno_final" as ChecklistType,
    inspectionType: "final",
    enabled,
  });
}

