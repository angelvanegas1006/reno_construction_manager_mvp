"use client";

import { useMemo } from "react";
import { PropertyData } from "@/lib/property-storage";
import { 
  calculateOverallProgress, 
  getAllSectionsProgress, 
  validateForSubmission,
  SectionProgress 
} from "@/lib/property-validation";
import { useI18n } from "@/lib/i18n";

interface UsePropertyValidationReturn {
  overallProgress: number;
  sectionsProgress: SectionProgress[];
  canSubmit: boolean;
  validationErrors: Record<string, string[]>;
}

export function usePropertyValidation(propertyData?: PropertyData, showInquilino?: boolean): UsePropertyValidationReturn {
  const { t } = useI18n();
  
  // Memoized validation calculations
  const overallProgress = useMemo(() => {
    return propertyData ? calculateOverallProgress(propertyData, showInquilino) : 0;
  }, [propertyData, showInquilino]);

  const sectionsProgress = useMemo(() => {
    return propertyData ? getAllSectionsProgress(propertyData, showInquilino, undefined, {
      property: {
        sections: {
          basicInfo: t.property.sections.basicInfo,
          economicInfo: t.property.sections.economicInfo,
          legalStatus: t.property.sections.legalStatus,
          documentation: t.property.sections.documentation,
          sellerData: t.property.sections.sellerData,
          tenantData: t.property.sections.tenantData,
        }
      },
      sidebar: {
        entrance: t.sidebar.entrance,
        distribution: t.sidebar.distribution,
        rooms: t.sidebar.rooms,
        livingRoom: t.sidebar.livingRoom,
        bathrooms: t.sidebar.bathrooms,
        kitchen: t.sidebar.kitchen,
        exterior: t.sidebar.exterior,
      }
    }) : [];
  }, [propertyData, showInquilino, t]);

  const canSubmit = useMemo(() => {
    return propertyData ? validateForSubmission(propertyData, showInquilino).isValid : false;
  }, [propertyData, showInquilino]);

  const validationErrors = useMemo(() => {
    // This could be expanded to include specific field validation errors
    // For now, we rely on the existing validation logic
    return {};
  }, [propertyData]);

  return {
    overallProgress,
    sectionsProgress,
    canSubmit,
    validationErrors,
  };
}
