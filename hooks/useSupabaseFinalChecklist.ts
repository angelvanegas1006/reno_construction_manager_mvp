"use client";

import { useSupabaseChecklistBase } from "./useSupabaseChecklistBase";
import type { ChecklistType, ChecklistSection, FileUpload } from "@/lib/checklist-storage";

interface UseSupabaseFinalChecklistProps {
  propertyId: string;
  onSyncToInitial?: (sectionId: string, sectionData: Partial<ChecklistSection>, allFiles: FileUpload[]) => Promise<void>;
}

/**
 * Hook específico para el checklist final
 * Mantiene su estado completamente separado del checklist inicial
 */
export function useSupabaseFinalChecklist({
  propertyId,
  onSyncToInitial,
}: UseSupabaseFinalChecklistProps) {
  return useSupabaseChecklistBase({
    propertyId,
    checklistType: "reno_final" as ChecklistType,
    inspectionType: "final",
    onSyncToOther: onSyncToInitial,
  });
}

