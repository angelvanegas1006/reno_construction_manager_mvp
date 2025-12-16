"use client";

import { useSupabaseChecklistBase } from "./useSupabaseChecklistBase";
import type { ChecklistType, ChecklistSection, FileUpload } from "@/lib/checklist-storage";

interface UseSupabaseInitialChecklistProps {
  propertyId: string;
  onSyncToFinal?: (sectionId: string, sectionData: Partial<ChecklistSection>, allFiles: FileUpload[]) => Promise<void>;
}

/**
 * Hook específico para el checklist inicial
 * Mantiene su estado completamente separado del checklist final
 */
export function useSupabaseInitialChecklist({
  propertyId,
  onSyncToFinal,
}: UseSupabaseInitialChecklistProps) {
  return useSupabaseChecklistBase({
    propertyId,
    checklistType: "reno_initial" as ChecklistType,
    inspectionType: "initial",
    onSyncToOther: onSyncToFinal,
  });
}

