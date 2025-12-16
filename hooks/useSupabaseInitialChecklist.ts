"use client";

import { useSupabaseChecklistBase } from "./useSupabaseChecklistBase";
import type { ChecklistType } from "@/lib/checklist-storage";

interface UseSupabaseInitialChecklistProps {
  propertyId: string;
}

/**
 * Hook específico para el checklist inicial
 * Mantiene su estado completamente separado del checklist final
 */
export function useSupabaseInitialChecklist({
  propertyId,
}: UseSupabaseInitialChecklistProps) {
  return useSupabaseChecklistBase({
    propertyId,
    checklistType: "reno_initial" as ChecklistType,
    inspectionType: "initial",
  });
}

