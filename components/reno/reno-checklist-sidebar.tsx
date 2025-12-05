"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { ChecklistData } from "@/lib/checklist-storage";
import { calculateOverallChecklistProgress, getAllChecklistSectionsProgress } from "@/lib/checklist-progress";

interface RenoChecklistSidebarProps {
  address: string;
  addressDetails?: string; // Segunda línea de dirección (portal, escalera, etc.)
  uniqueId?: string;
  areaCluster?: string;
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
  checklist?: ChecklistData | null;
  // onSave, onSubmit, canSubmit, hasUnsavedChanges removidos - ahora están en NavbarL3
  habitacionesCount?: number;
  banosCount?: number;
  onCompleteInspection?: () => void;
  canCompleteInspection?: boolean;
  isCompleting?: boolean;
}

export function RenoChecklistSidebar({
  address,
  addressDetails,
  uniqueId,
  areaCluster,
  activeSection,
  onSectionClick,
  checklist,
  habitacionesCount = 0,
  banosCount = 0,
  onCompleteInspection,
  canCompleteInspection = false,
  isCompleting = false,
}: RenoChecklistSidebarProps) {
  const { t } = useI18n();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "estado-caracteristicas",
  ]);

  // Calculate overall progress
  const overallProgress = calculateOverallChecklistProgress(checklist || null);
  
  // Calculate section progress
  const sectionProgress = getAllChecklistSectionsProgress(checklist || null);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const grupos = [
    {
      id: "estado-caracteristicas",
      name: t.sidebar.statusCharacteristics,
      sections: [
        {
          sectionId: "checklist-entorno-zonas-comunes",
          name: t.checklist.sections.entornoZonasComunes.title,
        },
        {
          sectionId: "checklist-estado-general",
          name: t.checklist.sections.estadoGeneral.title,
        },
        {
          sectionId: "checklist-entrada-pasillos",
          name: t.checklist.sections.entradaPasillos.title,
        },
        {
          sectionId: "checklist-habitaciones",
          name: t.checklist.sections.habitaciones.title,
        },
        {
          sectionId: "checklist-salon",
          name: t.checklist.sections.salon.title,
        },
        {
          sectionId: "checklist-banos",
          name: t.checklist.sections.banos.title,
        },
        {
          sectionId: "checklist-cocina",
          name: t.checklist.sections.cocina.title,
        },
        {
          sectionId: "checklist-exteriores",
          name: t.checklist.sections.exteriores.title,
        },
      ],
    },
  ];

  // Map section IDs to progress keys
  const getSectionProgressKey = (sectionId: string): string => {
    const mapping: Record<string, string> = {
      "checklist-entorno-zonas-comunes": "entorno-zonas-comunes",
      "checklist-estado-general": "estado-general",
      "checklist-entrada-pasillos": "entrada-pasillos",
      "checklist-habitaciones": "habitaciones",
      "checklist-salon": "salon",
      "checklist-banos": "banos",
      "checklist-cocina": "cocina",
      "checklist-exteriores": "exteriores",
    };
    return mapping[sectionId] || "";
  };

  return (
    <div className="hidden md:flex flex-col h-screen w-80 border-r bg-card pt-16">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3 mb-4">
          {/* Progress Circle */}
          <div className="relative w-12 h-12 flex-shrink-0">
            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-[var(--prophero-gray-200)] dark:text-[var(--prophero-gray-700)]"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${overallProgress} ${100 - overallProgress}`}
                className="text-[var(--prophero-blue-500)] transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-foreground">{overallProgress}%</span>
            </div>
          </div>
          
          {/* Address Info */}
          <div className="flex-1 min-w-0">
            {uniqueId && (
              <p className="text-sm font-semibold text-foreground break-words mb-0.5">{uniqueId}</p>
            )}
            {areaCluster && (
              <p className="text-xs text-muted-foreground break-words mb-1">{areaCluster}</p>
            )}
            <p className="text-sm font-medium text-foreground break-words">{address}</p>
            {addressDetails && (
              <p className="text-xs text-muted-foreground break-words mt-0.5">{addressDetails}</p>
            )}
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {/* Property Info Section - Only for final-check (will be filtered by parent) */}
        {activeSection === "property-info" && (
          <button
            onClick={() => onSectionClick("property-info")}
            className={cn(
              "w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors",
              activeSection === "property-info"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {t.sidebar.propertyInformation}
          </button>
        )}
        
        {grupos.map((grupo) => {
          const isExpanded = expandedGroups.includes(grupo.id);
          
          return (
            <div key={grupo.id}>
              <button
                onClick={() => toggleGroup(grupo.id)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{grupo.name}</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              
              {isExpanded && (
                <div className="ml-2 mt-1 space-y-0.5">
                  {grupo.sections.map((section) => {
                    // Check if this is a dynamic section (habitaciones or banos) with multiple items
                    const isHabitaciones = section.sectionId === "checklist-habitaciones";
                    const isBanos = section.sectionId === "checklist-banos";
                    const dynamicCount = isHabitaciones ? habitacionesCount : isBanos ? banosCount : 0;
                    const showSubItems = dynamicCount > 1;
                    const progressKey = getSectionProgressKey(section.sectionId);
                    const progress = sectionProgress[progressKey] || 0;
                    
                    return (
                      <div key={section.sectionId}>
                        <button
                          onClick={() => onSectionClick(section.sectionId)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between",
                            activeSection === section.sectionId && !showSubItems
                              ? "bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] text-foreground font-medium"
                              : "text-muted-foreground hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[#1a1a1a] hover:text-foreground"
                          )}
                        >
                          <span>{section.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{progress}%</span>
                        </button>
                        {/* Show sub-items for habitaciones or banos when count > 1 */}
                        {showSubItems && (
                          <div className="ml-4 mt-0.5 space-y-0.5">
                            {Array.from({ length: dynamicCount }, (_, i) => {
                              const subItemId = isHabitaciones 
                                ? `checklist-habitaciones-${i + 1}`
                                : `checklist-banos-${i + 1}`;
                              const subItemName = isHabitaciones
                                ? `${t.checklist.sections.habitaciones.bedroom} ${i + 1}`
                                : `${t.checklist.sections.banos.bathroom} ${i + 1}`;
                              
                              // For sub-items, we use the parent section progress
                              const subItemProgress = progress;
                              
                              return (
                                <button
                                  key={subItemId}
                                  onClick={() => onSectionClick(subItemId)}
                                  className={cn(
                                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between",
                                    activeSection === subItemId
                                      ? "bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] text-foreground font-medium"
                                      : "text-muted-foreground hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[#1a1a1a] hover:text-foreground"
                                  )}
                                >
                                  <span>{subItemName}</span>
                                  {subItemProgress !== undefined && (
                                    <span className="text-xs text-muted-foreground ml-2">{subItemProgress}%</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons - Removed: ahora están en NavbarL3 según diseño L3 para initial-check */}
      {/* Para final-check, los botones están en el header */}
    </div>
  );
}


