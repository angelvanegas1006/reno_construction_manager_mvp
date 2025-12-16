"use client";

import { useSupabaseChecklistBase } from "./useSupabaseChecklistBase";
import type { ChecklistType } from "@/lib/checklist-storage";

interface UseSupabaseFinalChecklistProps {
  propertyId: string;
}

/**
 * Hook específico para el checklist final
 * Mantiene su estado completamente separado del checklist inicial
 */
export function useSupabaseFinalChecklist({
  propertyId,
}: UseSupabaseFinalChecklistProps) {
  return useSupabaseChecklistBase({
    propertyId,
    checklistType: "reno_final" as ChecklistType,
    inspectionType: "final",
  });
}

