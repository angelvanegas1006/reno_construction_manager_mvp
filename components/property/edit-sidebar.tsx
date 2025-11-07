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
      sections: sections.filter((s) =>
        ["entrada", "distribucion", "habitaciones", "salon", "banos", "cocina", "exterior"].includes(
          s.sectionId
        )
      ),
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
                  {grupo.sections.map((section) => (
                    <button
                      key={section.sectionId}
                      onClick={() => onSectionClick(section.sectionId)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between",
                        activeSection === section.sectionId
                          ? "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)] text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] font-medium"
                          : "text-muted-foreground hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)] hover:text-foreground"
                      )}
                    >
                      <span>{section.name}</span>
                      <span className="text-xs">{section.progress}%</span>
                    </button>
                  ))}
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

