"use client";

import { forwardRef, useCallback, useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import { ChecklistSection, ChecklistCarpentryItem, ChecklistStorageItem, ChecklistApplianceItem, ChecklistStatus, ChecklistQuestion, ChecklistUploadZone, FileUpload } from "@/lib/checklist-storage";
import { ChecklistQuestion as ChecklistQuestionComponent } from "../checklist-question";
import { ChecklistUploadZone as ChecklistUploadZoneComponent } from "../checklist-upload-zone";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ThumbsUp, Wrench, ThumbsDown, XCircle } from "lucide-react";

interface CocinaSectionProps {
  section: ChecklistSection;
  onUpdate: (updates: Partial<ChecklistSection>) => void;
  onContinue?: () => void;
}

const CARPENTRY_ITEMS = [
  { id: "ventanas", translationKey: "ventanas" },
  { id: "persianas", translationKey: "persianas" },
  { id: "puerta-entrada", translationKey: "puertaEntrada" },
] as const;

const STORAGE_ITEMS = [
  { id: "armarios-despensa", translationKey: "armariosDespensa" },
  { id: "cuarto-lavado", translationKey: "cuartoLavado" },
] as const;

const APPLIANCES_ITEMS = [
  { id: "placa-gas", translationKey: "placaGas" },
  { id: "placa-vitro-induccion", translationKey: "placaVitroInduccion" },
  { id: "campana-extractora", translationKey: "campanaExtractora" },
  { id: "horno", translationKey: "horno" },
  { id: "nevera", translationKey: "nevera" },
  { id: "lavadora", translationKey: "lavadora" },
  { id: "lavavajillas", translationKey: "lavavajillas" },
  { id: "microondas", translationKey: "microondas" },
] as const;

const MAX_QUANTITY = 20;

export const CocinaSection = forwardRef<HTMLDivElement, CocinaSectionProps>(
  ({ section, onUpdate, onContinue }, ref) => {
    const { t } = useI18n();

    // Initialize upload zone for kitchen photos/video
    const uploadZone = section.uploadZones?.[0] || { id: "fotos-video-cocina", photos: [], videos: [] };

    // Default questions for initialization
    const defaultQuestions = [
      { id: "acabados" },
      { id: "mobiliario-fijo" },
      { id: "agua-drenaje" },
    ];

    // Always use section.questions if available and not empty, otherwise use defaults
    const questions = (section.questions && section.questions.length > 0) ? section.questions : defaultQuestions;

    // Initialize carpentry items
    const carpentryItems = useMemo(() => {
      if (section.carpentryItems && section.carpentryItems.length > 0) {
        return section.carpentryItems;
      }
      return CARPENTRY_ITEMS.map(item => ({
        id: item.id,
        cantidad: 0,
      }));
    }, [section.carpentryItems]);

    // Initialize storage items
    const storageItems = useMemo(() => {
      if (section.storageItems && section.storageItems.length > 0) {
        return section.storageItems;
      }
      return STORAGE_ITEMS.map(item => ({
        id: item.id,
        cantidad: 0,
      }));
    }, [section.storageItems]);

    // Initialize appliances items
    const appliancesItems = useMemo(() => {
      if (section.appliancesItems && section.appliancesItems.length > 0) {
        return section.appliancesItems;
      }
      return APPLIANCES_ITEMS.map(item => ({
        id: item.id,
        cantidad: 0,
      }));
    }, [section.appliancesItems]);

    const STATUS_OPTIONS: Array<{
      value: ChecklistStatus;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
    }> = useMemo(() => [
      { value: "buen_estado", label: t.checklist.buenEstado, icon: ThumbsUp },
      { value: "necesita_reparacion", label: t.checklist.necesitaReparacion, icon: Wrench },
      { value: "necesita_reemplazo", label: t.checklist.necesitaReemplazo, icon: ThumbsDown },
      { value: "no_aplica", label: t.checklist.noAplica, icon: XCircle },
    ], [t]);

    // Handlers
    const handleUploadZoneUpdate = useCallback((updates: ChecklistUploadZone) => {
      const updatedZones = [updates];
      onUpdate({ uploadZones: updatedZones });
    }, [onUpdate]);

    const handleQuestionUpdate = useCallback((questionId: string, updates: Partial<ChecklistQuestion>) => {
      const currentQuestions = (section.questions && section.questions.length > 0) ? section.questions : defaultQuestions;
      const updatedQuestions = currentQuestions.map(q =>
        q.id === questionId ? { ...q, ...updates } : q
      );
      if (!currentQuestions.find(q => q.id === questionId)) {
        updatedQuestions.push({ id: questionId, ...updates });
      }
      onUpdate({ questions: updatedQuestions });
    }, [section.questions, defaultQuestions, onUpdate]);

    // Generic handler for quantity changes (works for carpentry, storage, appliances)
    const handleQuantityChange = useCallback((
      itemId: string,
      delta: number,
      items: (ChecklistCarpentryItem | ChecklistStorageItem | ChecklistApplianceItem)[],
      itemsKey: "carpentryItems" | "storageItems" | "appliancesItems"
    ) => {
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          const currentCantidad = item.cantidad || 0;
          const newCantidad = Math.max(0, Math.min(MAX_QUANTITY, currentCantidad + delta));
          
          let units = item.units || [];
          
          if (newCantidad > 1) {
            while (units.length < newCantidad) {
              units.push({ id: `${itemId}-${units.length + 1}` });
            }
            while (units.length > newCantidad) {
              units.pop();
            }
            return { ...item, cantidad: newCantidad, units, estado: undefined, notes: undefined, photos: undefined };
          } else if (newCantidad === 1) {
            const singleEstado = units.length > 0 ? units[0].estado : undefined;
            const singleNotes = units.length > 0 ? units[0].notes : undefined;
            const singlePhotos = units.length > 0 ? units[0].photos : undefined;
            return { ...item, cantidad: newCantidad, units: undefined, estado: singleEstado, notes: singleNotes, photos: singlePhotos };
          } else {
            return { ...item, cantidad: newCantidad, units: undefined, estado: undefined, notes: undefined, photos: undefined };
          }
        }
        return item;
      });
      onUpdate({ [itemsKey]: updatedItems });
    }, [onUpdate]);

    // Generic handler for status changes
    const handleStatusChange = useCallback((
      itemId: string,
      unitIndex: number | null,
      status: ChecklistStatus,
      items: (ChecklistCarpentryItem | ChecklistStorageItem | ChecklistApplianceItem)[],
      itemsKey: "carpentryItems" | "storageItems" | "appliancesItems"
    ) => {
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          if (unitIndex !== null && item.units && item.units.length > unitIndex) {
            const updatedUnits = item.units.map((unit, idx) =>
              idx === unitIndex ? { ...unit, estado: status } : unit
            );
            return { ...item, units: updatedUnits };
          } else {
            return { ...item, estado: status };
          }
        }
        return item;
      });
      onUpdate({ [itemsKey]: updatedItems });
    }, [onUpdate]);

    // Generic handler for bad elements changes
    const handleBadElementsChange = useCallback((
      itemId: string,
      unitIndex: number | null,
      badElements: string[],
      items: (ChecklistCarpentryItem | ChecklistStorageItem | ChecklistApplianceItem)[],
      itemsKey: "carpentryItems" | "storageItems" | "appliancesItems"
    ) => {
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          if (unitIndex !== null && item.units && item.units.length > unitIndex) {
            const updatedUnits = item.units.map((unit, idx) =>
              idx === unitIndex ? { ...unit, badElements } : unit
            );
            return { ...item, units: updatedUnits };
          } else {
            return { ...item, badElements };
          }
        }
        return item;
      });
      onUpdate({ [itemsKey]: updatedItems });
    }, [onUpdate]);

    // Generic handler for notes changes
    const handleNotesChange = useCallback((
      itemId: string,
      unitIndex: number | null,
      notes: string,
      items: (ChecklistCarpentryItem | ChecklistStorageItem | ChecklistApplianceItem)[],
      itemsKey: "carpentryItems" | "storageItems" | "appliancesItems"
    ) => {
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          if (unitIndex !== null && item.units && item.units.length > unitIndex) {
            const updatedUnits = item.units.map((unit, idx) =>
              idx === unitIndex ? { ...unit, notes } : unit
            );
            return { ...item, units: updatedUnits };
          } else {
            return { ...item, notes };
          }
        }
        return item;
      });
      onUpdate({ [itemsKey]: updatedItems });
    }, [onUpdate]);

    // Generic handler for photos changes
    const handlePhotosChange = useCallback((
      itemId: string,
      unitIndex: number | null,
      photos: FileUpload[],
      items: (ChecklistCarpentryItem | ChecklistStorageItem | ChecklistApplianceItem)[],
      itemsKey: "carpentryItems" | "storageItems" | "appliancesItems"
    ) => {
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          if (unitIndex !== null && item.units && item.units.length > unitIndex) {
            const updatedUnits = item.units.map((unit, idx) =>
              idx === unitIndex ? { ...unit, photos } : unit
            );
            return { ...item, units: updatedUnits };
          } else {
            return { ...item, photos };
          }
        }
        return item;
      });
      onUpdate({ [itemsKey]: updatedItems });
    }, [onUpdate]);

    // Render function for items with quantity (carpentry, storage, appliances)
    const renderQuantityItems = (
      items: (ChecklistCarpentryItem | ChecklistStorageItem | ChecklistApplianceItem)[],
      itemsConfig: readonly { id: string; translationKey: string }[],
      itemsKey: "carpentryItems" | "storageItems" | "appliancesItems",
      translationPath: string
    ) => {
      return (
        <div className="space-y-4">
          {itemsConfig.map((itemConfig) => {
            const item = items.find(i => i.id === itemConfig.id) || {
              id: itemConfig.id,
              cantidad: 0,
            };
            const cantidad = item.cantidad || 0;
            const needsValidation = cantidad > 0;
            const hasMultipleUnits = cantidad > 1;
            const units = item.units || [];

            return (
              <div key={`${item.id}-${cantidad}`} className="space-y-4">
                {/* Quantity Stepper */}
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                    {(() => {
                      if (translationPath === "carpinteria") {
                        return t.checklist.sections.cocina.carpinteria.items[itemConfig.translationKey as keyof typeof t.checklist.sections.cocina.carpinteria.items] || itemConfig.id;
                      } else if (translationPath === "almacenamiento") {
                        return t.checklist.sections.cocina.almacenamiento.items[itemConfig.translationKey as keyof typeof t.checklist.sections.cocina.almacenamiento.items] || itemConfig.id;
                      } else if (translationPath === "electrodomesticos") {
                        return t.checklist.sections.cocina.electrodomesticos.items[itemConfig.translationKey as keyof typeof t.checklist.sections.cocina.electrodomesticos.items] || itemConfig.id;
                      }
                      return itemConfig.id;
                    })()}
                  </Label>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(item.id, -1, items, itemsKey)}
                      disabled={cantidad === 0}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[var(--prophero-gray-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      aria-label="Decrementar cantidad"
                    >
                      <Minus className="h-4 w-4 text-foreground" />
                    </button>
                    <span className="text-base font-semibold text-foreground min-w-[24px] text-center">
                      {cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(item.id, 1, items, itemsKey)}
                      disabled={cantidad >= MAX_QUANTITY}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)] hover:bg-[var(--prophero-blue-200)] dark:hover:bg-[var(--prophero-blue-800)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      aria-label="Incrementar cantidad"
                    >
                      <Plus className="h-4 w-4 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
                    </button>
                  </div>
                </div>

                {/* Status Options (only if cantidad > 0) */}
                {needsValidation && (
                  <>
                    {hasMultipleUnits ? (
                      // Render individual units when cantidad > 1
                      <div className="space-y-6">
                        {Array.from({ length: cantidad }, (_, index) => {
                          const unit = units[index] || { id: `${item.id}-${index + 1}` };
                          const unitRequiresDetails = unit.estado === "necesita_reparacion" || unit.estado === "necesita_reemplazo";

                          return (
                            <div key={unit.id || index} className="space-y-4 border-l-2 pl-2 sm:pl-4 border-[var(--prophero-gray-200)] dark:border-[var(--prophero-gray-700)]">
                              <Label className="text-xs sm:text-sm font-medium text-foreground leading-tight break-words">
                                {(() => {
                                  if (translationPath === "carpinteria") {
                                    return `${t.checklist.sections.cocina.carpinteria.items[itemConfig.translationKey as keyof typeof t.checklist.sections.cocina.carpinteria.items] || itemConfig.id} ${index + 1}`;
                                  } else if (translationPath === "almacenamiento") {
                                    return `${t.checklist.sections.cocina.almacenamiento.items[itemConfig.translationKey as keyof typeof t.checklist.sections.cocina.almacenamiento.items] || itemConfig.id} ${index + 1}`;
                                  } else if (translationPath === "electrodomesticos") {
                                    return `${t.checklist.sections.cocina.electrodomesticos.items[itemConfig.translationKey as keyof typeof t.checklist.sections.cocina.electrodomesticos.items] || itemConfig.id} ${index + 1}`;
                                  }
                                  return `${itemConfig.id} ${index + 1}`;
                                })()}
                              </Label>
                              
                              {/* Status Options for this unit */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                                {STATUS_OPTIONS.map((option) => {
                                  const isSelected = unit.estado === option.value;
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => handleStatusChange(item.id, index, option.value, items, itemsKey)}
                                      className={cn(
                                        "flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg border-2 transition-colors w-full",
                                        isSelected
                                          ? "border-[var(--prophero-gray-400)] dark:border-[var(--prophero-gray-500)] bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)]"
                                          : "border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] hover:border-[var(--prophero-gray-400)] dark:hover:border-[var(--prophero-gray-500)] bg-white dark:bg-[var(--prophero-gray-900)]"
                                      )}
                                    >
                                      <option.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                                      <span className="text-xs sm:text-sm font-medium whitespace-nowrap text-center text-muted-foreground">
                                        {option.label}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Details for this unit (if necesita reparación or necesita reemplazo) */}
                              {unitRequiresDetails && (
                                <div className="space-y-4 pt-2">
                                  {/* Bad Elements Checkboxes */}
                                  <div className="space-y-2">
                                    <Label className="text-xs sm:text-sm font-medium text-foreground">
                                      {t.checklist.sections.cocina.acabados.whatElementsBadCondition}
                                    </Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      {[
                                        { id: "rotura", label: "Rotura" },
                                        { id: "desgaste", label: "Desgaste" },
                                        { id: "oxidacion", label: "Oxidación" },
                                        { id: "otros", label: "Otros" },
                                      ].map((badElement) => {
                                        const isChecked = unit.badElements?.includes(badElement.id) || false;
                                        return (
                                          <label
                                            key={badElement.id}
                                            className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={(e) => {
                                                const currentBadElements = unit.badElements || [];
                                                const updatedBadElements = e.target.checked
                                                  ? [...currentBadElements, badElement.id]
                                                  : currentBadElements.filter((id) => id !== badElement.id);
                                                handleBadElementsChange(item.id, index, updatedBadElements, items, itemsKey);
                                              }}
                                              className="h-4 w-4 rounded border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)]"
                                            />
                                            <span className="text-muted-foreground">{badElement.label}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Notes */}
                                  <div className="space-y-2">
                                    <Label className="text-xs sm:text-sm font-medium text-foreground leading-tight break-words">
                                      {t.checklist.notes} <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea
                                      value={unit.notes || ""}
                                      onChange={(e) => handleNotesChange(item.id, index, e.target.value, items, itemsKey)}
                                      placeholder={t.checklist.observationsPlaceholder}
                                      className="min-h-[80px] text-xs sm:text-sm leading-relaxed w-full"
                                      required={unitRequiresDetails}
                                    />
                                  </div>

                                  {/* Photos */}
                                  <div className="space-y-2">
                                    <ChecklistUploadZoneComponent
                                      title="Fotos"
                                      description="Añade fotos del problema o elemento que necesita reparación/reemplazo"
                                      uploadZone={{ id: `${item.id}-${index + 1}-photos`, photos: unit.photos || [], videos: [] }}
                                      onUpdate={(updates) => {
                                        handlePhotosChange(item.id, index, updates.photos, items, itemsKey);
                                      }}
                                      isRequired={unitRequiresDetails}
                                      maxFiles={10}
                                      maxSizeMB={5}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Render single status selector when cantidad === 1
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                          {STATUS_OPTIONS.map((option) => {
                            const isSelected = item.estado === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleStatusChange(item.id, null, option.value, items, itemsKey)}
                                className={cn(
                                  "flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg border-2 transition-colors w-full",
                                  isSelected
                                    ? "border-[var(--prophero-gray-400)] dark:border-[var(--prophero-gray-500)] bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)]"
                                    : "border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] hover:border-[var(--prophero-gray-400)] dark:hover:border-[var(--prophero-gray-500)] bg-white dark:bg-[var(--prophero-gray-900)]"
                                )}
                              >
                                <option.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                                <span className="text-xs sm:text-sm font-medium whitespace-nowrap text-center text-muted-foreground">
                                  {option.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Details for single unit (if necesita reparación or necesita reemplazo) */}
                        {(item.estado === "necesita_reparacion" || item.estado === "necesita_reemplazo") && (
                          <div className="space-y-4 pt-2">
                            {/* Bad Elements Checkboxes */}
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium text-foreground">
                                {t.checklist.sections.cocina.acabados.whatElementsBadCondition}
                              </Label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { id: "rotura", label: "Rotura" },
                                  { id: "desgaste", label: "Desgaste" },
                                  { id: "oxidacion", label: "Oxidación" },
                                  { id: "otros", label: "Otros" },
                                ].map((badElement) => {
                                  const isChecked = item.badElements?.includes(badElement.id) || false;
                                  return (
                                    <label
                                      key={badElement.id}
                                      className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const currentBadElements = item.badElements || [];
                                          const updatedBadElements = e.target.checked
                                            ? [...currentBadElements, badElement.id]
                                            : currentBadElements.filter((id) => id !== badElement.id);
                                          handleBadElementsChange(item.id, null, updatedBadElements, items, itemsKey);
                                        }}
                                        className="h-4 w-4 rounded border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)]"
                                      />
                                      <span className="text-muted-foreground">{badElement.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium text-foreground leading-tight break-words">
                                {t.checklist.notes} <span className="text-red-500">*</span>
                              </Label>
                              <Textarea
                                value={item.notes || ""}
                                onChange={(e) => handleNotesChange(item.id, null, e.target.value, items, itemsKey)}
                                placeholder={t.checklist.observationsPlaceholder}
                                className="min-h-[80px] text-xs sm:text-sm leading-relaxed w-full"
                                required={true}
                              />
                            </div>

                            {/* Photos */}
                            <div className="space-y-2">
                              <ChecklistUploadZoneComponent
                                title="Fotos"
                                description="Añade fotos del problema o elemento que necesita reparación/reemplazo"
                                uploadZone={{ id: `${item.id}-photos`, photos: item.photos || [], videos: [] }}
                                onUpdate={(updates) => {
                                  handlePhotosChange(item.id, null, updates.photos, items, itemsKey);
                                }}
                                isRequired={true}
                                maxFiles={10}
                                maxSizeMB={5}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div ref={ref} className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">

        {/* Fotos y vídeo de la cocina */}
        <Card className="p-4 sm:p-6 space-y-4">
          <ChecklistUploadZoneComponent
            title={t.checklist.sections.cocina.fotosVideoCocina.title}
            description={t.checklist.sections.cocina.fotosVideoCocina.description}
            uploadZone={uploadZone}
            onUpdate={handleUploadZoneUpdate}
            isRequired={true}
            maxFiles={10}
            maxSizeMB={5}
          />
        </Card>

        {/* Acabados */}
        <Card className="p-4 sm:p-6 space-y-4">
          <ChecklistQuestionComponent
            question={questions.find(q => q.id === "acabados") || { id: "acabados" }}
            questionId="acabados"
            label={t.checklist.sections.cocina.acabados.title}
            description={t.checklist.sections.cocina.acabados.description}
            onUpdate={(updates) => handleQuestionUpdate("acabados", updates)}
            elements={[
              { id: "paredes", label: t.checklist.sections.cocina.acabados.elements.paredes },
              { id: "techos", label: t.checklist.sections.cocina.acabados.elements.techos },
              { id: "suelo", label: t.checklist.sections.cocina.acabados.elements.suelo },
              { id: "rodapies", label: t.checklist.sections.cocina.acabados.elements.rodapies },
            ]}
          />
        </Card>

        {/* Mobiliario Fijo */}
        <Card className="p-4 sm:p-6 space-y-4">
          <ChecklistQuestionComponent
            question={questions.find(q => q.id === "mobiliario-fijo") || { id: "mobiliario-fijo" }}
            questionId="mobiliario-fijo"
            label={t.checklist.sections.cocina.mobiliarioFijo.title}
            description={t.checklist.sections.cocina.mobiliarioFijo.description}
            onUpdate={(updates) => handleQuestionUpdate("mobiliario-fijo", updates)}
            elements={[
              { id: "modulos-bajos", label: t.checklist.sections.cocina.mobiliarioFijo.elements.modulosBajos },
              { id: "modulos-altos", label: t.checklist.sections.cocina.mobiliarioFijo.elements.modulosAltos },
              { id: "encimera", label: t.checklist.sections.cocina.mobiliarioFijo.elements.encimera },
              { id: "zocalo", label: t.checklist.sections.cocina.mobiliarioFijo.elements.zocalo },
            ]}
          />
        </Card>

        {/* Agua y drenaje */}
        <Card className="p-4 sm:p-6 space-y-4">
          <ChecklistQuestionComponent
            question={questions.find(q => q.id === "agua-drenaje") || { id: "agua-drenaje" }}
            questionId="agua-drenaje"
            label={t.checklist.sections.cocina.aguaDrenaje.title}
            description={t.checklist.sections.cocina.aguaDrenaje.description}
            onUpdate={(updates) => handleQuestionUpdate("agua-drenaje", updates)}
            elements={[
              { id: "grifo", label: t.checklist.sections.cocina.aguaDrenaje.elements.grifo },
              { id: "fregadero", label: t.checklist.sections.cocina.aguaDrenaje.elements.fregadero },
            ]}
          />
        </Card>

        {/* Carpintería */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
              {t.checklist.sections.cocina.carpinteria.title}
            </Label>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
              {t.checklist.sections.cocina.carpinteria.description}
            </p>
          </div>

          {renderQuantityItems(carpentryItems, CARPENTRY_ITEMS, "carpentryItems", "carpinteria")}
        </Card>

        {/* Almacenamiento */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
              {t.checklist.sections.cocina.almacenamiento.title}
            </Label>
          </div>

          {renderQuantityItems(storageItems, STORAGE_ITEMS, "storageItems", "almacenamiento")}
        </Card>

        {/* Electrodomésticos */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
              {t.checklist.sections.cocina.electrodomesticos.title}
            </Label>
          </div>

          {renderQuantityItems(appliancesItems, APPLIANCES_ITEMS, "appliancesItems", "electrodomesticos")}
        </Card>

        {/* Navigation */}
        {onContinue && (
          <div className="flex justify-between pt-4 border-t">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← {t.common.back}
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="px-4 py-2 bg-[var(--prophero-blue-500)] text-white rounded-lg hover:bg-[var(--prophero-blue-600)] transition-colors"
            >
              {t.common.continue}
            </button>
          </div>
        )}
      </div>
    );
  }
);

CocinaSection.displayName = "CocinaSection";
