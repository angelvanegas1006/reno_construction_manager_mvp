"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionProgress } from "@/lib/property-validation";
import { useI18n } from "@/lib/i18n";

interface MobileSidebarMenuProps {
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
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  habitacionesCount?: number;
  banosCount?: number;
  checklist?: any;
}

export function MobileSidebarMenu({
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
  isOpen: controlledIsOpen,
  onOpenChange,
  habitacionesCount = 0,
  banosCount = 0,
  checklist,
}: MobileSidebarMenuProps) {
  const { t } = useI18n();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "datos-basicos",
    "estado-caracteristicas", // Expand checklist sections by default
  ]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
      ],
    },
    {
      id: "estado-caracteristicas",
      name: t.sidebar.statusCharacteristics,
      sections: sections.filter((s) => 
        s.sectionId.startsWith("checklist-") || s.sectionId === "property-info"
      ),
    },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-200"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Mobile Sidebar */}
          <div 
            className="fixed left-0 top-0 h-full w-80 bg-card dark:bg-[var(--prophero-gray-900)] z-[60] shadow-xl md:hidden overflow-y-auto transition-transform duration-300 ease-out"
          >
            {/* Header */}
            <div className="p-4 border-b sticky top-0 bg-card dark:bg-[var(--prophero-gray-900)] z-10">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-md hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <h2 className="text-sm font-semibold truncate">{t.nav.properties}</h2>
                </div>
                <button
                  onClick={onDelete}
                  className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20"
                  aria-label={t.property.delete}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>

              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{address}</p>
                </div>
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
            <div className="p-4 space-y-1">
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
                                onClick={() => {
                                  onSectionClick(section.sectionId);
                                  setIsOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                                  activeSection === section.sectionId && !showSubItems
                                    ? "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)] text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] font-medium"
                                    : "text-muted-foreground hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)] hover:text-foreground"
                                )}
                              >
                                <span className="flex-1">{section.name}</span>
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
                                        onClick={() => {
                                          onSectionClick(subItemId);
                                          setIsOpen(false);
                                        }}
                                        className={cn(
                                          "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2",
                                          activeSection === subItemId
                                            ? "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)] text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] font-medium"
                                            : "text-muted-foreground hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)] hover:text-foreground"
                                        )}
                                      >
                                        <span className="flex-1">{subItemName}</span>
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

            {/* Action Buttons - Removed: ahora están en Navbar según diseño L3 */}
            {/* Los botones de acción están en la NavbarL3, no en el sidebar móvil */}
          </div>
        </>
      )}
    </>
  );
}

