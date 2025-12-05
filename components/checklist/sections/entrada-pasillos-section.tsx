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

interface EntradaPasillosSectionProps {
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

export const EntradaPasillosSection = forwardRef<HTMLDivElement, EntradaPasillosSectionProps>(
  ({ section, onUpdate, onContinue }, ref) => {
    const { t } = useI18n();

    // Initialize upload zones
    const uploadZones = section.uploadZones || [
      { id: "cuadro-general-electrico", photos: [], videos: [] },
      { id: "entrada-vivienda-pasillos", photos: [], videos: [] },
    ];

    // Default questions for initialization
    const defaultQuestions = [
      { id: "acabados" },
      { id: "electricidad" },
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

    const handleUploadZoneUpdate = useCallback((zoneId: string, updates: ChecklistUploadZone) => {
      const currentZones = section.uploadZones || uploadZones;
      const existingIndex = currentZones.findIndex(z => z.id === zoneId);
      
      let updatedZones: ChecklistUploadZone[];
      if (existingIndex >= 0) {
        updatedZones = currentZones.map((z, idx) => idx === existingIndex ? updates : z);
      } else {
        updatedZones = [...currentZones, updates];
      }
      
      onUpdate({ uploadZones: updatedZones });
    }, [section.uploadZones, uploadZones, onUpdate]);

    const handleQuestionUpdate = useCallback((questionId: string, updates: Partial<ChecklistQuestion>) => {
      // Always use the current section.questions, fallback to default if not present or empty
      const currentQuestions = (section.questions && section.questions.length > 0) ? section.questions : defaultQuestions;
      
      // Check if question exists, if not add it, otherwise update it
      const existingQuestionIndex = currentQuestions.findIndex(q => q.id === questionId);
      let updatedQuestions: ChecklistQuestion[];
      
      if (existingQuestionIndex >= 0) {
        // Update existing question
        updatedQuestions = currentQuestions.map(q =>
          q.id === questionId ? { ...q, ...updates } : q
        );
      } else {
        // Add new question if it doesn't exist
        updatedQuestions = [...currentQuestions, { id: questionId, ...updates }];
      }
      
      onUpdate({ questions: updatedQuestions });
    }, [section.questions, defaultQuestions, onUpdate]);

    const handleCarpentryQuantityChange = useCallback((itemId: string, delta: number) => {
      const currentItems: ChecklistCarpentryItem[] = (section.carpentryItems || carpentryItems) as ChecklistCarpentryItem[];
      const updatedItems = currentItems.map((item: ChecklistCarpentryItem) => {
        if (item.id === itemId) {
          const currentCantidad = item.cantidad || 0;
          const newCantidad = Math.max(0, Math.min(MAX_QUANTITY, currentCantidad + delta));
          
          // Initialize or update units array based on new cantidad
          let units = (item as ChecklistCarpentryItem).units || [];
          
          if (newCantidad > 1) {
            // Ensure we have exactly newCantidad units
            while (units.length < newCantidad) {
              units.push({
                id: `${itemId}-${units.length + 1}`,
              });
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
          const carpentryItem = item as ChecklistCarpentryItem;
          if (unitIndex !== null && carpentryItem.units && carpentryItem.units.length > unitIndex) {
            const updatedUnits = carpentryItem.units.map((unit, idx) =>
              idx === unitIndex ? { ...unit, estado: status } : unit
            );
            return { ...carpentryItem, units: updatedUnits };
          } else {
            return { ...carpentryItem, estado: status };
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
          const carpentryItem = item as ChecklistCarpentryItem;
          if (unitIndex !== null && carpentryItem.units && carpentryItem.units.length > unitIndex) {
            const updatedUnits = carpentryItem.units.map((unit, idx) =>
              idx === unitIndex ? { ...unit, notes } : unit
            );
            return { ...carpentryItem, units: updatedUnits };
          } else {
            return { ...carpentryItem, notes };
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
          const carpentryItem = item as ChecklistCarpentryItem;
          if (unitIndex !== null && carpentryItem.units && carpentryItem.units.length > unitIndex) {
            const updatedUnits = carpentryItem.units.map((unit, idx) =>
              idx === unitIndex ? { ...unit, photos } : unit
            );
            return { ...carpentryItem, units: updatedUnits };
          } else {
            return { ...carpentryItem, photos };
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
          
          let units = (item as ChecklistCarpentryItem).units || [];
          
          if (newCantidad > 1) {
            while (units.length < newCantidad) {
              units.push({
                id: `${itemId}-${units.length + 1}`,
              });
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
          const climatizationItem = item as ChecklistClimatizationItem;
          if (unitIndex !== null && climatizationItem.units && climatizationItem.units.length > unitIndex) {
            const updatedUnits = climatizationItem.units.map((unit, idx) =>
              idx === unitIndex ? { ...unit, estado: status } : unit
            );
            return { ...climatizationItem, units: updatedUnits };
          } else {
            return { ...climatizationItem, estado: status };
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
          const climatizationItem = item as ChecklistClimatizationItem;
          if (unitIndex !== null && climatizationItem.units && climatizationItem.units.length > unitIndex) {
            const updatedUnits = climatizationItem.units.map((unit, idx) =>
              idx === unitIndex ? { ...unit, notes } : unit
            );
            return { ...climatizationItem, units: updatedUnits };
          } else {
            return { ...climatizationItem, notes };
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
          const climatizationItem = item as ChecklistClimatizationItem;
          if (unitIndex !== null && climatizationItem.units && climatizationItem.units.length > unitIndex) {
            const updatedUnits = climatizationItem.units.map((unit, idx) =>
              idx === unitIndex ? { ...unit, photos } : unit
            );
            return { ...climatizationItem, units: updatedUnits };
          } else {
            return { ...climatizationItem, photos };
          }
        }
        return item;
      });
      onUpdate({ climatizationItems: updatedItems });
    }, [section.climatizationItems, climatizationItems, onUpdate]);

    const handleMobiliarioToggle = useCallback((existeMobiliario: boolean) => {
      onUpdate({
        mobiliario: {
          existeMobiliario,
          question: existeMobiliario ? (section.mobiliario?.question || { id: "mobiliario" }) : undefined,
        },
      });
    }, [section.mobiliario, onUpdate]);

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
    }> = [
      { value: "buen_estado", label: t.checklist.buenEstado, icon: ThumbsUp },
      { value: "necesita_reparacion", label: t.checklist.necesitaReparacion, icon: Wrench },
      { value: "necesita_reemplazo", label: t.checklist.necesitaReemplazo, icon: ThumbsDown },
      { value: "no_aplica", label: t.checklist.noAplica, icon: XCircle },
    ];

    return (
      <div ref={ref} className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">

        {/* Cuadro general eléctrico */}
        <Card className="p-4 sm:p-6 space-y-4">
          <ChecklistUploadZoneComponent
            title={t.checklist.sections.entradaPasillos.cuadroGeneralElectrico.title}
            description={t.checklist.sections.entradaPasillos.cuadroGeneralElectrico.description}
            uploadZone={uploadZones.find(z => z.id === "cuadro-general-electrico") || { id: "cuadro-general-electrico", photos: [], videos: [] }}
            onUpdate={(updates) => handleUploadZoneUpdate("cuadro-general-electrico", updates)}
            isRequired={true}
            maxFiles={10}
            maxSizeMB={5}
          />
        </Card>

        {/* Entrada a la vivienda y pasillos */}
        <Card className="p-4 sm:p-6 space-y-4">
          <ChecklistUploadZoneComponent
            title={t.checklist.sections.entradaPasillos.entradaViviendaPasillos.title}
            description={t.checklist.sections.entradaPasillos.entradaViviendaPasillos.description}
            uploadZone={uploadZones.find(z => z.id === "entrada-vivienda-pasillos") || { id: "entrada-vivienda-pasillos", photos: [], videos: [] }}
            onUpdate={(updates) => handleUploadZoneUpdate("entrada-vivienda-pasillos", updates)}
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
            label={t.checklist.sections.estadoGeneral.acabados.title}
            description={t.checklist.sections.estadoGeneral.acabados.description}
            onUpdate={(updates) => handleQuestionUpdate("acabados", updates)}
            elements={[
              { id: "paredes", label: t.checklist.sections.estadoGeneral.acabados.elements.paredes },
              { id: "techos", label: t.checklist.sections.estadoGeneral.acabados.elements.techos },
              { id: "suelo", label: t.checklist.sections.estadoGeneral.acabados.elements.suelo },
              { id: "rodapies", label: t.checklist.sections.estadoGeneral.acabados.elements.rodapies },
            ]}
          />
        </Card>

        {/* Carpintería */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground leading-tight">
              {t.checklist.sections.entradaPasillos.carpinteria.title}
            </Label>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.checklist.sections.entradaPasillos.carpinteria.description}
            </p>
          </div>

          <div className="space-y-6">
            {CARPENTRY_ITEMS.map((itemConfig) => {
              const item: ChecklistCarpentryItem = carpentryItems.find((i: ChecklistCarpentryItem) => i.id === itemConfig.id) || {
                id: itemConfig.id,
                cantidad: 0,
              } as ChecklistCarpentryItem;
              const cantidad = item.cantidad || 0;
              const needsValidation = cantidad > 0;
              const hasMultipleUnits = cantidad > 1;
              const units = (item as ChecklistCarpentryItem).units || [];

              return (
                <div key={item.id} className="space-y-4 border-b pb-6 last:border-b-0 last:pb-0">
                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                      {t.checklist.sections.entradaPasillos.carpinteria.items[itemConfig.translationKey]}
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
                                  {t.checklist.sections.entradaPasillos.carpinteria.items[itemConfig.translationKey]} {index + 1}
                                </Label>
                                
                                {/* Status Options for this unit */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                  {STATUS_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    const isSelected = unit.estado === option.value;

                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleCarpentryStatusChange(item.id, index, option.value)}
                                        className={cn(
                                          "flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg border-2 transition-colors w-full",
                                          isSelected
                                            ? "border-[var(--prophero-gray-400)] dark:border-[var(--prophero-gray-500)] bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)]"
                                            : "border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] hover:border-[var(--prophero-gray-400)] dark:hover:border-[var(--prophero-gray-500)] bg-white dark:bg-[var(--prophero-gray-900)]"
                                        )}
                                      >
                                        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0", isSelected ? "text-foreground" : "text-muted-foreground")} />
                                        <span className={cn("text-xs sm:text-sm font-medium whitespace-nowrap text-center", isSelected ? "text-foreground" : "text-muted-foreground")}>
                                          {option.label}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Notes for this unit */}
                                {unitRequiresDetails && (
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
                                )}

                                {/* Photos for this unit */}
                                {unitRequiresDetails && (
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
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Render single estado when cantidad = 1
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            {STATUS_OPTIONS.map((option) => {
                              const Icon = option.icon;
                              const carpentryItem = item as ChecklistCarpentryItem;
                              const isSelected = carpentryItem.estado === option.value;

                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleCarpentryStatusChange(item.id, null, option.value)}
                                  className={cn(
                                    "flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg border-2 transition-colors w-full",
                                    isSelected
                                      ? "border-[var(--prophero-gray-400)] dark:border-[var(--prophero-gray-500)] bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)]"
                                      : "border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] hover:border-[var(--prophero-gray-400)] dark:hover:border-[var(--prophero-gray-500)] bg-white dark:bg-[var(--prophero-gray-900)]"
                                  )}
                                >
                                  <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0", isSelected ? "text-foreground" : "text-muted-foreground")} />
                                  <span className={cn("text-xs sm:text-sm font-medium whitespace-nowrap text-center", isSelected ? "text-foreground" : "text-muted-foreground")}>
                                    {option.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Notes (required when status is "necesita_reparacion" or "necesita_reemplazo") */}
                          {(() => {
                            const carpentryItem = item as ChecklistCarpentryItem;
                            return (carpentryItem.estado === "necesita_reparacion" || carpentryItem.estado === "necesita_reemplazo");
                          })() && (
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium text-foreground leading-tight break-words">
                                {t.checklist.notes} <span className="text-red-500">*</span>
                              </Label>
                              <Textarea
                                value={(item as ChecklistCarpentryItem).notes || ""}
                                onChange={(e) => handleCarpentryNotesChange(item.id, null, e.target.value)}
                                placeholder={t.checklist.observationsPlaceholder}
                                className="min-h-[80px] text-xs sm:text-sm leading-relaxed w-full"
                                required={true}
                              />
                            </div>
                          )}

                          {/* Photos (required when status is "necesita_reparacion" or "necesita_reemplazo") */}
                          {(item.estado === "necesita_reparacion" || item.estado === "necesita_reemplazo") && (
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

        {/* Electricidad */}
        <Card className="p-4 sm:p-6 space-y-4">
          <ChecklistQuestionComponent
            question={electricidadQuestion}
            questionId="electricidad"
            label={t.checklist.sections.estadoGeneral.electricidad.title}
            description={t.checklist.sections.estadoGeneral.electricidad.description}
            onUpdate={(updates) => handleQuestionUpdate("electricidad", updates)}
            elements={[
              { id: "luces", label: t.checklist.sections.estadoGeneral.electricidad.elements.luces },
              { id: "interruptores", label: t.checklist.sections.estadoGeneral.electricidad.elements.interruptores },
              { id: "tomas-corriente", label: t.checklist.sections.estadoGeneral.electricidad.elements.tomasCorriente },
            ]}
          />
        </Card>

        {/* Climatización */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground leading-tight">
              {t.checklist.sections.entradaPasillos.climatizacion.title}
            </Label>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.checklist.sections.entradaPasillos.climatizacion.description}
            </p>
          </div>

          <div className="space-y-6">
            {CLIMATIZATION_ITEMS.map((itemConfig) => {
              const item = climatizationItems.find(i => i.id === itemConfig.id) || {
                id: itemConfig.id,
                cantidad: 0,
              };
              const cantidad = item.cantidad || 0;
              const needsValidation = cantidad > 0;
              const hasMultipleUnits = cantidad > 1;
              const units = (item as ChecklistCarpentryItem).units || [];

              return (
                <div key={item.id} className="space-y-4 border-b pb-6 last:border-b-0 last:pb-0">
                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                      {t.checklist.sections.entradaPasillos.climatizacion.items[itemConfig.translationKey]}
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
                                  {t.checklist.sections.entradaPasillos.climatizacion.items[itemConfig.translationKey]} {index + 1}
                                </Label>
                                
                                {/* Status Options for this unit */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                  {STATUS_OPTIONS.map((option) => {
                                    const Icon = option.icon;
                                    const isSelected = unit.estado === option.value;

                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleClimatizationStatusChange(item.id, index, option.value)}
                                        className={cn(
                                          "flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg border-2 transition-colors w-full",
                                          isSelected
                                            ? "border-[var(--prophero-gray-400)] dark:border-[var(--prophero-gray-500)] bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)]"
                                            : "border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] hover:border-[var(--prophero-gray-400)] dark:hover:border-[var(--prophero-gray-500)] bg-white dark:bg-[var(--prophero-gray-900)]"
                                        )}
                                      >
                                        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0", isSelected ? "text-foreground" : "text-muted-foreground")} />
                                        <span className={cn("text-xs sm:text-sm font-medium whitespace-nowrap text-center", isSelected ? "text-foreground" : "text-muted-foreground")}>
                                          {option.label}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Notes for this unit */}
                                {unitRequiresDetails && (
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
                                )}

                                {/* Photos for this unit */}
                                {unitRequiresDetails && (
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
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Render single estado when cantidad = 1
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            {STATUS_OPTIONS.map((option) => {
                              const Icon = option.icon;
                              const climatizationItem = item as ChecklistClimatizationItem;
                              const isSelected = climatizationItem.estado === option.value;

                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleClimatizationStatusChange(item.id, null, option.value)}
                                  className={cn(
                                    "flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg border-2 transition-colors w-full",
                                    isSelected
                                      ? "border-[var(--prophero-gray-400)] dark:border-[var(--prophero-gray-500)] bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)]"
                                      : "border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] hover:border-[var(--prophero-gray-400)] dark:hover:border-[var(--prophero-gray-500)] bg-white dark:bg-[var(--prophero-gray-900)]"
                                  )}
                                >
                                  <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0", isSelected ? "text-foreground" : "text-muted-foreground")} />
                                  <span className={cn("text-xs sm:text-sm font-medium whitespace-nowrap text-center", isSelected ? "text-foreground" : "text-muted-foreground")}>
                                    {option.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Notes (required when status is "necesita_reparacion" or "necesita_reemplazo") */}
                          {(() => {
                            const climatizationItem = item as ChecklistClimatizationItem;
                            return (climatizationItem.estado === "necesita_reparacion" || climatizationItem.estado === "necesita_reemplazo");
                          })() && (
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm font-medium text-foreground leading-tight break-words">
                                {t.checklist.notes} <span className="text-red-500">*</span>
                              </Label>
                              <Textarea
                                value={(item as ChecklistClimatizationItem).notes || ""}
                                onChange={(e) => handleClimatizationNotesChange(item.id, null, e.target.value)}
                                placeholder={t.checklist.observationsPlaceholder}
                                className="min-h-[80px] text-xs sm:text-sm leading-relaxed w-full"
                                required={true}
                              />
                            </div>
                          )}

                          {/* Photos (required when status is "necesita_reparacion" or "necesita_reemplazo") */}
                          {(() => {
                            const climatizationItem = item as ChecklistClimatizationItem;
                            return (climatizationItem.estado === "necesita_reparacion" || climatizationItem.estado === "necesita_reemplazo");
                          })() && (
                            <div className="space-y-2">
                              <ChecklistUploadZoneComponent
                                title="Fotos"
                                description="Añade fotos del problema o elemento que necesita reparación/reemplazo"
                                uploadZone={{ id: `${item.id}-photos`, photos: (item as ChecklistClimatizationItem).photos || [], videos: [] }}
                                onUpdate={(updates) => {
                                  handleClimatizationPhotosChange(item.id, null, updates.photos);
                                }}
                                isRequired={true}
                                maxFiles={10}
                                maxSizeMB={5}
                              />
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
              <Label className="text-sm font-semibold text-foreground leading-tight">
                {t.checklist.sections.entradaPasillos.mobiliario.existeMobiliario}
              </Label>
              <Switch
                checked={mobiliario.existeMobiliario || false}
                onCheckedChange={handleMobiliarioToggle}
              />
            </div>

            {mobiliario.existeMobiliario && (
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-sm font-semibold text-foreground leading-tight">
                  {t.checklist.sections.entradaPasillos.mobiliario.elementoPuntuar}
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

EntradaPasillosSection.displayName = "EntradaPasillosSection";
