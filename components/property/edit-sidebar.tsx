"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionProgress } from "@/lib/property-validation";
import { useI18n } from "@/lib/i18n";

interface EditSidebarProps {
  address: string;
  overallProgress: number;
  sections: SectionProgress[];
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
  onSave: () => void;
  onSubmit: () => void;
  onDelete: () => void;
  canSubmit: boolean;
  hasUnsavedChanges: boolean;
  showInquilino?: boolean;
  habitacionesCount?: number;
  banosCount?: number;
  checklist?: any;
}

export function EditSidebar({
  address,
  overallProgress,
  sections,
  activeSection,
  onSectionClick,
  onSave,
  onSubmit,
  onDelete,
  canSubmit,
  hasUnsavedChanges,
  showInquilino = false,
  habitacionesCount = 0,
  banosCount = 0,
  checklist,
}: EditSidebarProps) {
  const { t } = useI18n();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "datos-basicos",
    "propietario-ocupacion",
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
      id: "datos-basicos",
      name: t.sidebar.basicData,
      sections: sections.filter((s) =>
        ["info-propiedad", "info-economica", "estado-legal", "documentacion"].includes(s.sectionId)
      ),
    },
    {
      id: "propietario-ocupacion",
      name: t.sidebar.ownerOccupation,
      sections: [
        ...(showInquilino
          ? sections.filter((s) => s.sectionId === "datos-inquilino")
          : []),
        ...sections.filter((s) => s.sectionId === "datos-vendedor"),
      ].sort((a, b) => {
        // Show inquilino first if visible, then vendedor
        if (showInquilino) {
          if (a.sectionId === "datos-inquilino") return -1;
          if (b.sectionId === "datos-inquilino") return 1;
        }
        return 0;
      }),
    },
    {
    id: "estado-caracteristicas",
      name: t.sidebar.statusCharacteristics,
      sections: [
        // Checklist sections in correct order (no duplicates)
        {
          sectionId: "checklist-entorno-zonas-comunes",
          name: t.checklist.sections.entornoZonasComunes.title,
          progress: 0,
          requiredFieldsCount: 0,
          completedRequiredFieldsCount: 0,
          optionalFieldsCount: 0,
          completedOptionalFieldsCount: 0,
        },
        {
          sectionId: "checklist-estado-general",
          name: t.checklist.sections.estadoGeneral.title,
          progress: 0,
          requiredFieldsCount: 0,
          completedRequiredFieldsCount: 0,
          optionalFieldsCount: 0,
          completedOptionalFieldsCount: 0,
        },
        {
          sectionId: "checklist-entrada-pasillos",
          name: t.checklist.sections.entradaPasillos.title,
          progress: 0,
          requiredFieldsCount: 0,
          completedRequiredFieldsCount: 0,
          optionalFieldsCount: 0,
          completedOptionalFieldsCount: 0,
        },
        {
          sectionId: "checklist-habitaciones",
          name: t.checklist.sections.habitaciones.title,
          progress: 0,
          requiredFieldsCount: 0,
          completedRequiredFieldsCount: 0,
          optionalFieldsCount: 0,
          completedOptionalFieldsCount: 0,
        },
        {
          sectionId: "checklist-salon",
          name: t.checklist.sections.salon.title,
          progress: 0,
          requiredFieldsCount: 0,
          completedRequiredFieldsCount: 0,
          optionalFieldsCount: 0,
          completedOptionalFieldsCount: 0,
        },
        {
          sectionId: "checklist-banos",
          name: t.checklist.sections.banos.title,
          progress: 0,
          requiredFieldsCount: 0,
          completedRequiredFieldsCount: 0,
          optionalFieldsCount: 0,
          completedOptionalFieldsCount: 0,
        },
        {
          sectionId: "checklist-cocina",
          name: t.checklist.sections.cocina.title,
          progress: 0,
          requiredFieldsCount: 0,
          completedRequiredFieldsCount: 0,
          optionalFieldsCount: 0,
          completedOptionalFieldsCount: 0,
        },
        {
          sectionId: "checklist-exteriores",
          name: t.checklist.sections.exteriores.title,
          progress: 0,
          requiredFieldsCount: 0,
          completedRequiredFieldsCount: 0,
          optionalFieldsCount: 0,
          completedOptionalFieldsCount: 0,
        },
      ],
    },
  ];

  return (
    <div className="hidden md:flex flex-col h-screen w-80 border-r bg-card dark:bg-[var(--prophero-gray-900)]">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{address}</p>
          </div>
          <button
            onClick={onDelete}
            className="flex-shrink-0 p-1.5 rounded-md hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)] transition-colors"
            aria-label={t.property.delete}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        </div>
        
        {/* Overall Progress */}
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12">
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
          <div>
            <p className="text-xs text-muted-foreground">{t.labels.completed}</p>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
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
                              : "text-muted-foreground hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)] hover:text-foreground"
                          )}
                        >
                          <span>{section.name}</span>
                          <span className="text-xs">{section.progress}%</span>
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
                                      : "text-muted-foreground hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)] hover:text-foreground"
                                  )}
                                >
                                  <span>{subItemName}</span>
                                  <span className="text-xs">0%</span>
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

      {/* Action Buttons */}
      <div className="p-4 border-t space-y-2">
        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="w-full"
          size="lg"
        >
          {t.property.submitReview}
        </Button>
        <Button
          onClick={onSave}
          variant="outline"
          className="w-full"
          disabled={!hasUnsavedChanges}
        >
          {t.property.save}
        </Button>
      </div>
    </div>
  );
}

