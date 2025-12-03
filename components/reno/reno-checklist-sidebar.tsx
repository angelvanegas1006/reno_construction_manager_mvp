"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface RenoChecklistSidebarProps {
  address: string;
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
  // onSave, onSubmit, canSubmit, hasUnsavedChanges removidos - ahora están en NavbarL3
  habitacionesCount?: number;
  banosCount?: number;
  onCompleteInspection?: () => void;
  canCompleteInspection?: boolean;
  isCompleting?: boolean;
}

export function RenoChecklistSidebar({
  address,
  activeSection,
  onSectionClick,
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

  return (
    <div className="hidden md:flex flex-col h-screen w-80 border-r bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{address}</p>
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
                    
                    return (
                      <div key={section.sectionId}>
                        <button
                          onClick={() => onSectionClick(section.sectionId)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between",
                            activeSection === section.sectionId && !showSubItems
                              ? "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)] text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] font-medium"
                              : "text-muted-foreground hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[#1a1a1a] hover:text-foreground"
                          )}
                        >
                          <span>{section.name}</span>
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
                              
                              return (
                                <button
                                  key={subItemId}
                                  onClick={() => onSectionClick(subItemId)}
                                  className={cn(
                                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between",
                                    activeSection === subItemId
                                      ? "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)] text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] font-medium"
                                      : "text-muted-foreground hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[#1a1a1a] hover:text-foreground"
                                  )}
                                >
                                  <span>{subItemName}</span>
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


