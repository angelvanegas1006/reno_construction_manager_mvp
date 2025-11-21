"use client";

import { forwardRef, useCallback, useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import { ChecklistSection, ChecklistCarpentryItem, ChecklistClimatizationItem, ChecklistClimatizationUnit, ChecklistStatus, ChecklistQuestion, ChecklistUploadZone, FileUpload } from "@/lib/checklist-storage";
import { ChecklistQuestion as ChecklistQuestionComponent } from "../checklist-question";
import { ChecklistUploadZone as ChecklistUploadZoneComponent } from "../checklist-upload-zone";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ThumbsUp, Wrench, ThumbsDown, XCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SalonSectionProps {
  section: ChecklistSection;
  onUpdate: (updates: Partial<ChecklistSection>) => void;
  onContinue?: () => void;
}

const CARPENTRY_ITEMS = [
  { id: "ventanas", translationKey: "ventanas" },
  { id: "persianas", translationKey: "persianas" },
  { id: "armarios", translationKey: "armarios" },
] as const;

const CLIMATIZATION_ITEMS = [
  { id: "radiadores", translationKey: "radiadores" },
  { id: "split-ac", translationKey: "splitAc" },
] as const;

const MAX_QUANTITY = 20;

export const SalonSection = forwardRef<HTMLDivElement, SalonSectionProps>(
  ({ section, onUpdate, onContinue }, ref) => {
    const { t } = useI18n();

    // Initialize upload zone for salon photos/video
    const uploadZone = section.uploadZones?.[0] || { id: "fotos-video-salon", photos: [], videos: [] };

    // Default questions for initialization
    const defaultQuestions = [
      { id: "acabados" },
      { id: "electricidad" },
      { id: "puerta-entrada" },
    ];

    // Always use section.questions if available and not empty, otherwise use defaults
    const questions = (section.questions && section.questions.length > 0) ? section.questions : defaultQuestions;
    
    // Get individual questions directly from questions array to ensure they update
    const acabadosQuestion = questions.find(q => q.id === "acabados") || { id: "acabados" };
    const electricidadQuestion = questions.find(q => q.id === "electricidad") || { id: "electricidad" };

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

    // Initialize climatization items
    const climatizationItems = useMemo(() => {
      if (section.climatizationItems && section.climatizationItems.length > 0) {
        return section.climatizationItems;
      }
      return CLIMATIZATION_ITEMS.map(item => ({
        id: item.id,
        cantidad: 0,
      }));
    }, [section.climatizationItems]);

    // Initialize mobiliario
    const mobiliario = section.mobiliario || { existeMobiliario: false };

    const handleUploadZoneUpdate = useCallback((updates: ChecklistUploadZone) => {
      const updatedZones = [updates];
      onUpdate({ uploadZones: updatedZones });
    }, [onUpdate]);

    const handleQuestionUpdate = useCallback((questionId: string, updates: Partial<ChecklistQuestion>) => {
      // Always use the current section.questions, fallback to default if not present or empty
      const currentQuestions = (section.questions && section.questions.length > 0) ? section.questions : defaultQuestions;
      
      const updatedQuestions = currentQuestions.map(q =>
        q.id === questionId ? { ...q, ...updates } : q
      );
      
      // If question doesn't exist, add it
      if (!currentQuestions.find(q => q.id === questionId)) {
        updatedQuestions.push({ id: questionId, ...updates });
      }
      
      onUpdate({ questions: updatedQuestions });
    }, [section.questions, defaultQuestions, onUpdate]);

    const handleCarpentryQuantityChange = useCallback((itemId: string, delta: number) => {
      const currentItems = section.carpentryItems || carpentryItems;
      const updatedItems = currentItems.map(item => {
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
      onUpdate({ carpentryItems: updatedItems });
    }, [section.carpentryItems, carpentryItems, onUpdate]);

    const handleCarpentryStatusChange = useCallback((itemId: string, unitIndex: number | null, status: ChecklistStatus) => {
      const currentItems = section.carpentryItems || carpentryItems;
      const updatedItems = currentItems.map(item => {
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
      onUpdate({ carpentryItems: updatedItems });
    }, [section.carpentryItems, carpentryItems, onUpdate]);

    const handleCarpentryNotesChange = useCallback((itemId: string, unitIndex: number | null, notes: string) => {
      const currentItems = section.carpentryItems || carpentryItems;
      const updatedItems = currentItems.map(item => {
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
      onUpdate({ carpentryItems: updatedItems });
    }, [section.carpentryItems, carpentryItems, onUpdate]);

    const handleCarpentryPhotosChange = useCallback((itemId: string, unitIndex: number | null, photos: FileUpload[]) => {
      const currentItems = section.carpentryItems || carpentryItems;
      const updatedItems = currentItems.map(item => {
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
      onUpdate({ carpentryItems: updatedItems });
    }, [section.carpentryItems, carpentryItems, onUpdate]);

    const handleCarpentryBadElementsChange = useCallback((itemId: string, unitIndex: number | null, badElements: string[]) => {
      const currentItems = section.carpentryItems || carpentryItems;
      const updatedItems = currentItems.map(item => {
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
      onUpdate({ carpentryItems: updatedItems });
    }, [section.carpentryItems, carpentryItems, onUpdate]);

    const handleClimatizationQuantityChange = useCallback((itemId: string, delta: number) => {
      const currentItems = section.climatizationItems || climatizationItems;
      const updatedItems = currentItems.map(item => {
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
      onUpdate({ climatizationItems: updatedItems });
    }, [section.climatizationItems, climatizationItems, onUpdate]);

    const handleClimatizationStatusChange = useCallback((itemId: string, unitIndex: number | null, status: ChecklistStatus) => {
      const currentItems = section.climatizationItems || climatizationItems;
      const updatedItems = currentItems.map(item => {
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
      onUpdate({ climatizationItems: updatedItems });
    }, [section.climatizationItems, climatizationItems, onUpdate]);

    const handleClimatizationNotesChange = useCallback((itemId: string, unitIndex: number | null, notes: string) => {
      const currentItems = section.climatizationItems || climatizationItems;
      const updatedItems = currentItems.map(item => {
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
      onUpdate({ climatizationItems: updatedItems });
    }, [section.climatizationItems, climatizationItems, onUpdate]);

    const handleClimatizationPhotosChange = useCallback((itemId: string, unitIndex: number | null, photos: FileUpload[]) => {
      const currentItems = section.climatizationItems || climatizationItems;
      const updatedItems = currentItems.map(item => {
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
      onUpdate({ climatizationItems: updatedItems });
    }, [section.climatizationItems, climatizationItems, onUpdate]);

    const handleMobiliarioToggle = useCallback((checked: boolean) => {
      onUpdate({
        mobiliario: {
          existeMobiliario: checked,
          question: checked ? (mobiliario.question || { id: "mobiliario" }) : undefined,
        },
      });
    }, [mobiliario, onUpdate]);

    const handleMobiliarioQuestionUpdate = useCallback((updates: Partial<ChecklistQuestion>) => {
      onUpdate({
        mobiliario: {
          ...mobiliario,
          question: { ...(mobiliario.question || { id: "mobiliario" }), ...updates },
        },
      });
    }, [mobiliario, onUpdate]);

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

    return (
      <div ref={ref} className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {t.checklist.sections.salon.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
            {t.checklist.sections.salon.description}
          </p>
        </div>

        {/* Fotos y vídeo del salón */}
        <Card className="p-4 sm:p-6 space-y-4">
          <ChecklistUploadZoneComponent
            title={t.checklist.sections.salon.fotosVideoSalon.title}
            description={t.checklist.sections.salon.fotosVideoSalon.description}
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
            question={acabadosQuestion}
            questionId="acabados"
            label={t.checklist.sections.salon.acabados.title}
            description={t.checklist.sections.salon.acabados.description}
            onUpdate={(updates) => handleQuestionUpdate("acabados", updates)}
            elements={[
              { id: "paredes", label: t.checklist.sections.salon.acabados.elements.paredes },
              { id: "techos", label: t.checklist.sections.salon.acabados.elements.techos },
              { id: "suelo", label: t.checklist.sections.salon.acabados.elements.suelo },
              { id: "rodapies", label: t.checklist.sections.salon.acabados.elements.rodapies },
            ]}
          />
        </Card>

        {/* Carpintería */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
              {t.checklist.sections.salon.carpinteria.title}
            </Label>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
              {t.checklist.sections.salon.carpinteria.description}
            </p>
          </div>

          {/* Quantity Steppers for Ventanas, Persianas, Armarios */}
          <div className="space-y-4">
            {CARPENTRY_ITEMS.map((itemConfig) => {
              const item = carpentryItems.find(i => i.id === itemConfig.id) || {
                id: itemConfig.id,
                cantidad: 0,
              };
              const cantidad = item.cantidad || 0;
              const needsValidation = cantidad > 0;
              const hasMultipleUnits = cantidad > 1;
              const units = item.units || [];

              return (
                <div key={item.id} className="space-y-4">
                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                      {t.checklist.sections.salon.carpinteria.items[itemConfig.translationKey]}
                    </Label>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCarpentryQuantityChange(item.id, -1)}
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
                        onClick={() => handleCarpentryQuantityChange(item.id, 1)}
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
                                  {t.checklist.sections.salon.carpinteria.items[itemConfig.translationKey]} {index + 1}
                                </Label>
                                
                                {/* Status Options for this unit */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                                  {STATUS_OPTIONS.map((option) => {
                                    const isSelected = unit.estado === option.value;
                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleCarpentryStatusChange(item.id, index, option.value)}
                                        className={cn(
                                          "flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg border-2 transition-colors w-full",
                                          isSelected
                                            ? "border-[var(--prophero-blue-500)] dark:border-[var(--prophero-blue-400)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]"
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
                                        {t.checklist.sections.salon.acabados.whatElementsBadCondition}
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
                                                  handleCarpentryBadElementsChange(item.id, index, updatedBadElements);
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
                                        onChange={(e) => handleCarpentryNotesChange(item.id, index, e.target.value)}
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
                                          handleCarpentryPhotosChange(item.id, index, updates.photos);
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
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                            {STATUS_OPTIONS.map((option) => {
                              const isSelected = item.estado === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleCarpentryStatusChange(item.id, null, option.value)}
                                  className={cn(
                                    "flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg border-2 transition-colors w-full",
                                    isSelected
                                      ? "border-[var(--prophero-blue-500)] dark:border-[var(--prophero-blue-400)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]"
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
                                  {t.checklist.sections.salon.acabados.whatElementsBadCondition}
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
                                            handleCarpentryBadElementsChange(item.id, null, updatedBadElements);
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
                                  onChange={(e) => handleCarpentryNotesChange(item.id, null, e.target.value)}
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
                                    handleCarpentryPhotosChange(item.id, null, updates.photos);
                                  }}
                                  isRequired={true}
                                  maxFiles={10}
                                  maxSizeMB={5}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Puerta de entrada */}
          <div className="pt-4 border-t">
            <ChecklistQuestionComponent
              question={questions.find(q => q.id === "puerta-entrada") || { id: "puerta-entrada" }}
              questionId="puerta-entrada"
              label={t.checklist.sections.salon.carpinteria.puertaEntrada}
              description=""
              onUpdate={(updates) => handleQuestionUpdate("puerta-entrada", updates)}
              elements={[]}
            />
          </div>
        </Card>

        {/* Electricidad */}
        <Card className="p-4 sm:p-6 space-y-4">
          <ChecklistQuestionComponent
            question={electricidadQuestion}
            questionId="electricidad"
            label={t.checklist.sections.salon.electricidad.title}
            description={t.checklist.sections.salon.electricidad.description}
            onUpdate={(updates) => handleQuestionUpdate("electricidad", updates)}
            elements={[
              { id: "luces", label: t.checklist.sections.salon.electricidad.elements.luces },
              { id: "interruptores", label: t.checklist.sections.salon.electricidad.elements.interruptores },
              { id: "tomas-corriente", label: t.checklist.sections.salon.electricidad.elements.tomasCorriente },
              { id: "toma-television", label: t.checklist.sections.salon.electricidad.elements.tomaTelevision },
            ]}
          />
        </Card>

        {/* Climatización */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
              {t.checklist.sections.salon.climatizacion.title}
            </Label>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
              {t.checklist.sections.salon.climatizacion.description}
            </p>
          </div>

          <div className="space-y-4">
            {CLIMATIZATION_ITEMS.map((itemConfig) => {
              const item = climatizationItems.find(i => i.id === itemConfig.id) || {
                id: itemConfig.id,
                cantidad: 0,
              };
              const cantidad = item.cantidad || 0;
              const needsValidation = cantidad > 0;
              const hasMultipleUnits = cantidad > 1;
              const units = item.units || [];

              return (
                <div key={item.id} className="space-y-4">
                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                      {t.checklist.sections.salon.climatizacion.items[itemConfig.translationKey]}
                    </Label>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleClimatizationQuantityChange(item.id, -1)}
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
                        onClick={() => handleClimatizationQuantityChange(item.id, 1)}
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
                                  {t.checklist.sections.salon.climatizacion.items[itemConfig.translationKey]} {index + 1}
                                </Label>
                                
                                {/* Status Options for this unit */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                                  {STATUS_OPTIONS.map((option) => {
                                    const isSelected = unit.estado === option.value;
                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleClimatizationStatusChange(item.id, index, option.value)}
                                        className={cn(
                                          "flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg border-2 transition-colors w-full",
                                          isSelected
                                            ? "border-[var(--prophero-blue-500)] dark:border-[var(--prophero-blue-400)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]"
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
                                    {/* Notes */}
                                    <div className="space-y-2">
                                      <Label className="text-xs sm:text-sm font-medium text-foreground leading-tight break-words">
                                        {t.checklist.notes} <span className="text-red-500">*</span>
                                      </Label>
                                      <Textarea
                                        value={unit.notes || ""}
                                        onChange={(e) => handleClimatizationNotesChange(item.id, index, e.target.value)}
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
                                          handleClimatizationPhotosChange(item.id, index, updates.photos);
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
                        // Render single estado when cantidad = 1
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                            {STATUS_OPTIONS.map((option) => {
                              const isSelected = item.estado === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleClimatizationStatusChange(item.id, null, option.value)}
                                  className={cn(
                                    "flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg border-2 transition-colors w-full",
                                    isSelected
                                      ? "border-[var(--prophero-blue-500)] dark:border-[var(--prophero-blue-400)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]"
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

                          {/* Notes (required when status is "necesita_reparacion" or "necesita_reemplazo") */}
                          {(item.estado === "necesita_reparacion" || item.estado === "necesita_reemplazo") && (
                            <div className="space-y-4 pt-2">
                              {/* Notes */}
                              <div className="space-y-2">
                                <Label className="text-xs sm:text-sm font-medium text-foreground leading-tight break-words">
                                  {t.checklist.notes} <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                  value={item.notes || ""}
                                  onChange={(e) => handleClimatizationNotesChange(item.id, null, e.target.value)}
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
                                    handleClimatizationPhotosChange(item.id, null, updates.photos);
                                  }}
                                  isRequired={true}
                                  maxFiles={10}
                                  maxSizeMB={5}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Mobiliario */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                {t.checklist.sections.salon.mobiliario.existeMobiliario}
              </Label>
              <Switch
                checked={mobiliario.existeMobiliario || false}
                onCheckedChange={handleMobiliarioToggle}
              />
            </div>

            {mobiliario.existeMobiliario && (
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                  {t.checklist.sections.salon.mobiliario.elementoPuntuar}
                </Label>
                <ChecklistQuestionComponent
                  question={mobiliario.question || { id: "mobiliario" }}
                  questionId="mobiliario"
                  label=""
                  onUpdate={handleMobiliarioQuestionUpdate}
                  elements={[]}
                />
              </div>
            )}
          </div>
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

SalonSection.displayName = "SalonSection";
