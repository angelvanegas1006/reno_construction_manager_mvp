"use client";

import React, { forwardRef, useCallback, useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import { ChecklistSection, ChecklistDynamicItem, ChecklistCarpentryItem, ChecklistClimatizationUnit, ChecklistStatus, ChecklistQuestion, ChecklistUploadZone, FileUpload } from "@/lib/checklist-storage";
import { ChecklistQuestion as ChecklistQuestionComponent } from "../checklist-question";
import { ChecklistUploadZone as ChecklistUploadZoneComponent } from "../checklist-upload-zone";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ThumbsUp, Wrench, ThumbsDown, XCircle } from "lucide-react";

interface BanosSectionProps {
  section: ChecklistSection;
  onUpdate: (updates: Partial<ChecklistSection>) => void;
  onContinue?: () => void;
  banoIndex?: number; // Index of the specific bathroom (0-based), undefined for main section
  onPropertyUpdate?: (updates: { banos: number }) => void; // To update property.data.banos
  onNavigateToBano?: (index: number) => void; // To navigate to a specific bathroom
}

const CARPENTRY_ITEMS = [
  { id: "ventanas", translationKey: "ventanas" },
  { id: "persianas", translationKey: "persianas" },
] as const;

const MAX_QUANTITY = 20;

export const BanosSection = forwardRef<HTMLDivElement, BanosSectionProps>(
  ({ section, onUpdate, onContinue, banoIndex, onPropertyUpdate, onNavigateToBano }, ref) => {
    const { t } = useI18n();

    // Get dynamic count from section or default to dynamicItems length or 0
    const dynamicCount: number = section.dynamicCount ?? (section.dynamicItems?.length ?? 0);
    const dynamicItems = section.dynamicItems || [];

    // Get current bano if index is provided
    const bano = (() => {
      if (banoIndex !== undefined) {
        return dynamicItems[banoIndex] || {
          id: `bano-${banoIndex + 1}`,
          questions: [],
          uploadZone: { id: "fotos-video", photos: [], videos: [] },
        };
      }
      return null;
    })();

    // Initialize default questions
    const defaultQuestions = useMemo(() => [
      { id: "acabados" },
      { id: "agua-drenaje" },
      { id: "sanitarios" },
      { id: "griferia-ducha" },
      { id: "puerta-entrada" },
      { id: "mobiliario" },
      { id: "ventilacion" },
    ], []);

    const questions = bano?.questions || defaultQuestions;

    // Initialize carpentry items
    const carpentryItems: ChecklistCarpentryItem[] = (() => {
      if (banoIndex !== undefined) {
        const currentBano = dynamicItems[banoIndex];
        if (currentBano?.carpentryItems && currentBano.carpentryItems.length > 0) {
          return currentBano.carpentryItems;
        }
      }
      return CARPENTRY_ITEMS.map(item => ({
        id: item.id,
        cantidad: 0,
      } as ChecklistCarpentryItem));
    })();

    // Initialize upload zone
    const uploadZone = bano?.uploadZone || { id: "fotos-video", photos: [], videos: [] };

    // Handlers
    const handleUploadZoneUpdate = useCallback((updates: ChecklistUploadZone) => {
      if (banoIndex === undefined || !bano) return;
      const updatedItems = [...dynamicItems];
      updatedItems[banoIndex] = {
        ...bano,
        uploadZone: updates,
      };
      onUpdate({ dynamicItems: updatedItems });
    }, [bano, dynamicItems, banoIndex, onUpdate]);

    const handleQuestionUpdate = useCallback((questionId: string, updates: Partial<ChecklistQuestion>) => {
      if (banoIndex === undefined || !bano) return;
      const currentQuestions = bano.questions || defaultQuestions;
      const updatedQuestions = currentQuestions.map(q =>
        q.id === questionId ? { ...q, ...updates } : q
      );
      
      if (!currentQuestions.find(q => q.id === questionId)) {
        updatedQuestions.push({ id: questionId, ...updates });
      }
      
      const updatedItems = [...dynamicItems];
      updatedItems[banoIndex] = {
        ...bano,
        questions: updatedQuestions,
      };
      onUpdate({ dynamicItems: updatedItems });
    }, [bano, dynamicItems, banoIndex, defaultQuestions, onUpdate]);

    const handleCarpentryQuantityChange = useCallback((itemId: string, delta: number) => {
      if (banoIndex === undefined || !bano) return;
      const currentDynamicItems = section.dynamicItems || [];
      const currentBano = currentDynamicItems[banoIndex] || bano;
      const currentItems: ChecklistCarpentryItem[] = (currentBano.carpentryItems || carpentryItems) as ChecklistCarpentryItem[];
      
      const updatedItems = currentItems.map((item: ChecklistCarpentryItem) => {
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
      
      const updatedDynamicItems = [...currentDynamicItems];
      updatedDynamicItems[banoIndex] = {
        ...currentBano,
        carpentryItems: updatedItems,
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [section.dynamicItems, banoIndex, bano, carpentryItems, onUpdate]);

    const handleCarpentryStatusChange = useCallback((itemId: string, unitIndex: number | null, status: ChecklistStatus) => {
      if (banoIndex === undefined || !bano) return;
      const currentItems = bano?.carpentryItems || carpentryItems;
      const updatedItems = currentItems.map((item: ChecklistCarpentryItem) => {
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
      const updatedDynamicItems = [...dynamicItems];
      updatedDynamicItems[banoIndex] = {
        ...bano,
        carpentryItems: updatedItems,
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [bano, carpentryItems, dynamicItems, banoIndex, onUpdate]);

    const handleCarpentryNotesChange = useCallback((itemId: string, unitIndex: number | null, notes: string) => {
      if (banoIndex === undefined || !bano) return;
      const currentItems = bano?.carpentryItems || carpentryItems;
      const updatedItems = currentItems.map((item: ChecklistCarpentryItem) => {
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
      const updatedDynamicItems = [...dynamicItems];
      updatedDynamicItems[banoIndex] = {
        ...bano,
        carpentryItems: updatedItems,
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [bano, carpentryItems, dynamicItems, banoIndex, onUpdate]);

    const handleCarpentryPhotosChange = useCallback((itemId: string, unitIndex: number | null, photos: FileUpload[]) => {
      if (banoIndex === undefined || !bano) return;
      const currentItems = bano?.carpentryItems || carpentryItems;
      const updatedItems = currentItems.map((item: ChecklistCarpentryItem) => {
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
      const updatedDynamicItems = [...dynamicItems];
      updatedDynamicItems[banoIndex] = {
        ...bano,
        carpentryItems: updatedItems,
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [bano, carpentryItems, dynamicItems, banoIndex, onUpdate]);

    const handleCarpentryBadElementsChange = useCallback((itemId: string, unitIndex: number | null, badElements: string[]) => {
      if (banoIndex === undefined || !bano) return;
      const currentItems = bano?.carpentryItems || carpentryItems;
      const updatedItems = currentItems.map((item: ChecklistCarpentryItem) => {
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
      const updatedDynamicItems = [...dynamicItems];
      updatedDynamicItems[banoIndex] = {
        ...bano,
        carpentryItems: updatedItems,
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [bano, carpentryItems, dynamicItems, banoIndex, onUpdate]);

    const handleCountChange = useCallback((delta: number) => {
      const newCount = Math.max(0, Math.min(20, dynamicCount + delta));
      
      let updatedItems = [...dynamicItems];
      
      if (newCount > dynamicCount) {
        while (updatedItems.length < newCount) {
          updatedItems.push({
            id: `bano-${updatedItems.length + 1}`,
            questions: [
              { id: "acabados" },
              { id: "agua-drenaje" },
              { id: "sanitarios" },
              { id: "griferia-ducha" },
              { id: "puerta-entrada" },
              { id: "mobiliario" },
              { id: "ventilacion" },
            ],
            uploadZone: { id: "fotos-video", photos: [], videos: [] },
            carpentryItems: CARPENTRY_ITEMS.map(item => ({ id: item.id, cantidad: 0 })),
          });
        }
      } else if (newCount < dynamicCount) {
        updatedItems = updatedItems.slice(0, newCount);
      }
      
      onUpdate({ dynamicCount: newCount, dynamicItems: updatedItems });
      
      if (onPropertyUpdate) {
        onPropertyUpdate({ banos: newCount });
      }
    }, [dynamicCount, dynamicItems, onUpdate, onPropertyUpdate]);

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

    // If dynamicCount === 1 and banoIndex is undefined, show the form directly
    if (dynamicCount === 1 && banoIndex === undefined) {
      const singleBano = dynamicItems[0] || {
        id: "bano-1",
        questions: defaultQuestions,
        uploadZone: { id: "fotos-video", photos: [], videos: [] },
        carpentryItems: CARPENTRY_ITEMS.map(item => ({ id: item.id, cantidad: 0 })),
      };
      
      const effectiveBano = singleBano;
      const effectiveQuestions = effectiveBano.questions || defaultQuestions;
      const effectiveCarpentryItems = effectiveBano.carpentryItems || CARPENTRY_ITEMS.map(item => ({ id: item.id, cantidad: 0 }));

      // Handlers for single bathroom
      const handleSingleCarpentryQuantityChange = (itemId: string, delta: number) => {
        const currentDynamicItems = section.dynamicItems || [];
        const currentBano = currentDynamicItems[0] || effectiveBano;
        const currentItems = currentBano.carpentryItems || effectiveCarpentryItems;
        
        const updatedItems = currentItems.map((item: ChecklistCarpentryItem) => {
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
        
        const updatedDynamicItems = [...currentDynamicItems];
        updatedDynamicItems[0] = {
          ...currentBano,
          carpentryItems: updatedItems,
        };
        onUpdate({ dynamicItems: updatedDynamicItems });
      };

      const handleSingleCarpentryStatusChange = (itemId: string, unitIndex: number | null, status: ChecklistStatus) => {
        const currentDynamicItems = section.dynamicItems || [];
        const currentBano = currentDynamicItems[0] || effectiveBano;
        const currentItems = currentBano.carpentryItems || effectiveCarpentryItems;
        const updatedItems = currentItems.map((item: ChecklistCarpentryItem) => {
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
        const updatedDynamicItems = [...currentDynamicItems];
        updatedDynamicItems[0] = {
          ...currentBano,
          carpentryItems: updatedItems,
        };
        onUpdate({ dynamicItems: updatedDynamicItems });
      };

      const handleSingleCarpentryBadElementsChange = (itemId: string, unitIndex: number | null, badElements: string[]) => {
        const currentDynamicItems = section.dynamicItems || [];
        const currentBano = currentDynamicItems[0] || effectiveBano;
        const currentItems = currentBano.carpentryItems || effectiveCarpentryItems;
        const updatedItems = currentItems.map((item: ChecklistCarpentryItem) => {
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
        const updatedDynamicItems = [...currentDynamicItems];
        updatedDynamicItems[0] = {
          ...currentBano,
          carpentryItems: updatedItems,
        };
        onUpdate({ dynamicItems: updatedDynamicItems });
      };

      const handleSingleCarpentryNotesChange = (itemId: string, unitIndex: number | null, notes: string) => {
        const currentDynamicItems = section.dynamicItems || [];
        const currentBano = currentDynamicItems[0] || effectiveBano;
        const currentItems = currentBano.carpentryItems || effectiveCarpentryItems;
        const updatedItems = currentItems.map((item: ChecklistCarpentryItem) => {
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
        const updatedDynamicItems = [...currentDynamicItems];
        updatedDynamicItems[0] = {
          ...currentBano,
          carpentryItems: updatedItems,
        };
        onUpdate({ dynamicItems: updatedDynamicItems });
      };

      const handleSingleCarpentryPhotosChange = (itemId: string, unitIndex: number | null, photos: FileUpload[]) => {
        const currentDynamicItems = section.dynamicItems || [];
        const currentBano = currentDynamicItems[0] || effectiveBano;
        const currentItems = currentBano.carpentryItems || effectiveCarpentryItems;
        const updatedItems = currentItems.map((item: ChecklistCarpentryItem) => {
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
        const updatedDynamicItems = [...currentDynamicItems];
        updatedDynamicItems[0] = {
          ...currentBano,
          carpentryItems: updatedItems,
        };
        onUpdate({ dynamicItems: updatedDynamicItems });
      };

      const handleSingleUploadZoneUpdate = (updates: ChecklistUploadZone) => {
        const currentDynamicItems = section.dynamicItems || [];
        const currentBano = currentDynamicItems[0] || effectiveBano;
        const updatedDynamicItems = [...currentDynamicItems];
        updatedDynamicItems[0] = {
          ...currentBano,
          uploadZone: updates,
        };
        onUpdate({ dynamicItems: updatedDynamicItems });
      };

      const handleSingleQuestionUpdate = (questionId: string, updates: Partial<ChecklistQuestion>) => {
        const currentDynamicItems = section.dynamicItems || [];
        const currentBano = currentDynamicItems[0] || effectiveBano;
        const currentQuestions = currentBano.questions || defaultQuestions;
        const updatedQuestions = currentQuestions.map(q =>
          q.id === questionId ? { ...q, ...updates } : q
        );
        
        if (!currentQuestions.find(q => q.id === questionId)) {
          updatedQuestions.push({ id: questionId, ...updates });
        }
        
        const updatedDynamicItems = [...currentDynamicItems];
        updatedDynamicItems[0] = {
          ...currentBano,
          questions: updatedQuestions,
        };
        onUpdate({ dynamicItems: updatedDynamicItems });
      };

      const currentDynamicItems = section.dynamicItems || [];
      const currentBano = currentDynamicItems[0] || effectiveBano;
      const currentQuestions = currentBano.questions || effectiveQuestions;
      const currentCarpentryItems = currentBano.carpentryItems || effectiveCarpentryItems;
      const currentUploadZone = currentBano.uploadZone || { id: "fotos-video", photos: [], videos: [] };

      return (
        <div ref={ref} className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">

          {/* Room Counter */}
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                {t.checklist.sections.banos.title}
              </Label>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleCountChange(-1)}
                  disabled={Number(dynamicCount) === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[var(--prophero-gray-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  aria-label="Decrementar cantidad"
                >
                  <Minus className="h-4 w-4 text-foreground" />
                </button>
                <span className="text-base font-semibold text-foreground min-w-[24px] text-center">
                  {dynamicCount}
                </span>
                <button
                  type="button"
                  onClick={() => handleCountChange(1)}
                  disabled={Number(dynamicCount) >= 20}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)] hover:bg-[var(--prophero-blue-200)] dark:hover:bg-[var(--prophero-blue-800)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  aria-label="Incrementar cantidad"
                >
                  <Plus className="h-4 w-4 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
                </button>
              </div>
            </div>
          </Card>

          {/* Fotos y vídeo del baño */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistUploadZoneComponent
              title={t.checklist.sections.banos.fotosVideoBano.title}
              description={t.checklist.sections.banos.fotosVideoBano.description}
              uploadZone={currentUploadZone}
              onUpdate={handleSingleUploadZoneUpdate}
              isRequired={true}
              maxFiles={10}
              maxSizeMB={5}
            />
          </Card>

          {/* Acabados */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={currentQuestions.find(q => q.id === "acabados") || { id: "acabados" }}
              questionId="acabados"
              label={t.checklist.sections.banos.acabados.title}
              description={t.checklist.sections.banos.acabados.description}
              onUpdate={(updates) => handleSingleQuestionUpdate("acabados", updates)}
              elements={[
                { id: "paredes", label: t.checklist.sections.banos.acabados.elements.paredes },
                { id: "techos", label: t.checklist.sections.banos.acabados.elements.techos },
                { id: "suelo", label: t.checklist.sections.banos.acabados.elements.suelo },
                { id: "rodapies", label: t.checklist.sections.banos.acabados.elements.rodapies },
              ]}
            />
          </Card>

          {/* Agua y drenaje */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={currentQuestions.find(q => q.id === "agua-drenaje") || { id: "agua-drenaje" }}
              questionId="agua-drenaje"
              label={t.checklist.sections.banos.aguaDrenaje.title}
              description={t.checklist.sections.banos.aguaDrenaje.description}
              onUpdate={(updates) => handleSingleQuestionUpdate("agua-drenaje", updates)}
              elements={[
                { id: "puntos-agua", label: t.checklist.sections.banos.aguaDrenaje.elements.puntosAgua },
                { id: "desagues", label: t.checklist.sections.banos.aguaDrenaje.elements.desagues },
              ]}
            />
          </Card>

          {/* Sanitarios */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={currentQuestions.find(q => q.id === "sanitarios") || { id: "sanitarios" }}
              questionId="sanitarios"
              label={t.checklist.sections.banos.sanitarios.title}
              description={t.checklist.sections.banos.sanitarios.description}
              onUpdate={(updates) => handleSingleQuestionUpdate("sanitarios", updates)}
              elements={[
                { id: "plato-ducha-banera", label: t.checklist.sections.banos.sanitarios.elements.platoDuchaBanera },
                { id: "inodoro", label: t.checklist.sections.banos.sanitarios.elements.inodoro },
                { id: "lavabo", label: t.checklist.sections.banos.sanitarios.elements.lavabo },
              ]}
            />
          </Card>

          {/* Grifería y ducha o bañera */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={currentQuestions.find(q => q.id === "griferia-ducha") || { id: "griferia-ducha" }}
              questionId="griferia-ducha"
              label={t.checklist.sections.banos.griferiaDucha.title}
              description={t.checklist.sections.banos.griferiaDucha.description}
              onUpdate={(updates) => handleSingleQuestionUpdate("griferia-ducha", updates)}
              elements={[
                { id: "grifos", label: t.checklist.sections.banos.griferiaDucha.elements.grifos },
                { id: "mampara-cortina", label: t.checklist.sections.banos.griferiaDucha.elements.mamparaCortina },
              ]}
            />
          </Card>

          {/* Carpintería */}
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                {t.checklist.sections.banos.carpinteria.title}
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
                {t.checklist.sections.banos.carpinteria.description}
              </p>
            </div>

            {/* Quantity Steppers for Ventanas, Persianas */}
            <div className="space-y-4">
              {CARPENTRY_ITEMS.map((itemConfig) => {
                const latestDynamicItems = section.dynamicItems || [];
                const latestBano = latestDynamicItems[0] || currentBano;
                const latestCarpentryItems = latestBano.carpentryItems || currentCarpentryItems;
                const item: ChecklistCarpentryItem = latestCarpentryItems.find((i: ChecklistCarpentryItem) => i.id === itemConfig.id) || {
                  id: itemConfig.id,
                  cantidad: 0,
                } as ChecklistCarpentryItem;
                const cantidad = item.cantidad || 0;
                const needsValidation = cantidad > 0;
                const hasMultipleUnits = cantidad > 1;
                const units = (item as ChecklistCarpentryItem).units || [];

                return (
                  <div key={`${item.id}-${cantidad}-single`} className="space-y-4">
                    {/* Quantity Stepper */}
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                        {t.checklist.sections.banos.carpinteria.items[itemConfig.translationKey]}
                      </Label>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSingleCarpentryQuantityChange(item.id, -1)}
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
                          onClick={() => handleSingleCarpentryQuantityChange(item.id, 1)}
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
                                    {t.checklist.sections.banos.carpinteria.items[itemConfig.translationKey]} {index + 1}
                                  </Label>
                                  
                                  {/* Status Options for this unit */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                                    {STATUS_OPTIONS.map((option) => {
                                      const isSelected = unit.estado === option.value;
                                      return (
                                        <button
                                          key={option.value}
                                          type="button"
                                          onClick={() => handleSingleCarpentryStatusChange(item.id, index, option.value)}
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
                                          {t.checklist.sections.banos.acabados.whatElementsBadCondition}
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
                                                    handleSingleCarpentryBadElementsChange(item.id, index, updatedBadElements);
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
                                          onChange={(e) => handleSingleCarpentryNotesChange(item.id, index, e.target.value)}
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
                                            handleSingleCarpentryPhotosChange(item.id, index, updates.photos);
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
                                    onClick={() => handleSingleCarpentryStatusChange(item.id, null, option.value)}
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
                                    {t.checklist.sections.banos.acabados.whatElementsBadCondition}
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
                                              handleSingleCarpentryBadElementsChange(item.id, null, updatedBadElements);
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
                                    onChange={(e) => handleSingleCarpentryNotesChange(item.id, null, e.target.value)}
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
                                      handleSingleCarpentryPhotosChange(item.id, null, updates.photos);
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

            {/* Puerta de entrada */}
            <div className="pt-4 border-t">
              <ChecklistQuestionComponent
                question={currentQuestions.find(q => q.id === "puerta-entrada") || { id: "puerta-entrada" }}
                questionId="puerta-entrada"
                label={t.checklist.sections.banos.carpinteria.puertaEntrada}
                description=""
                onUpdate={(updates) => handleSingleQuestionUpdate("puerta-entrada", updates)}
                elements={[]}
              />
            </div>
          </Card>

          {/* Mobiliario */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={currentQuestions.find(q => q.id === "mobiliario") || { id: "mobiliario" }}
              questionId="mobiliario"
              label={t.checklist.sections.banos.mobiliario.title}
              description={t.checklist.sections.banos.mobiliario.description}
              onUpdate={(updates) => handleSingleQuestionUpdate("mobiliario", updates)}
              elements={[
                { id: "mueble-lavabo", label: t.checklist.sections.banos.mobiliario.elements.muebleLavabo },
                { id: "espejo", label: t.checklist.sections.banos.mobiliario.elements.espejo },
                { id: "toallero-portapapeles", label: t.checklist.sections.banos.mobiliario.elements.toalleroPortapapeles },
              ]}
            />
          </Card>

          {/* Ventilación */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={currentQuestions.find(q => q.id === "ventilacion") || { id: "ventilacion" }}
              questionId="ventilacion"
              label={t.checklist.sections.banos.ventilacion.title}
              description={t.checklist.sections.banos.ventilacion.description}
              onUpdate={(updates) => handleSingleQuestionUpdate("ventilacion", updates)}
              elements={[]}
            />
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

    // If banoIndex is provided, we're showing a specific bathroom
    if (banoIndex !== undefined && bano) {
      const hasNextBano = banoIndex < dynamicCount - 1;
      
      return (
        <div ref={ref} className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {t.checklist.sections.banos.bathroom} {banoIndex + 1}
            </h1>
          </div>

          {/* Fotos y vídeo del baño */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistUploadZoneComponent
              title={t.checklist.sections.banos.fotosVideoBano.title}
              description={t.checklist.sections.banos.fotosVideoBano.description}
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
              question={(bano.questions || questions).find(q => q.id === "acabados") || { id: "acabados" }}
              questionId="acabados"
              label={t.checklist.sections.banos.acabados.title}
              description={t.checklist.sections.banos.acabados.description}
              onUpdate={(updates) => handleQuestionUpdate("acabados", updates)}
              elements={[
                { id: "paredes", label: t.checklist.sections.banos.acabados.elements.paredes },
                { id: "techos", label: t.checklist.sections.banos.acabados.elements.techos },
                { id: "suelo", label: t.checklist.sections.banos.acabados.elements.suelo },
                { id: "rodapies", label: t.checklist.sections.banos.acabados.elements.rodapies },
              ]}
            />
          </Card>

          {/* Agua y drenaje */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={(bano.questions || questions).find(q => q.id === "agua-drenaje") || { id: "agua-drenaje" }}
              questionId="agua-drenaje"
              label={t.checklist.sections.banos.aguaDrenaje.title}
              description={t.checklist.sections.banos.aguaDrenaje.description}
              onUpdate={(updates) => handleQuestionUpdate("agua-drenaje", updates)}
              elements={[
                { id: "puntos-agua", label: t.checklist.sections.banos.aguaDrenaje.elements.puntosAgua },
                { id: "desagues", label: t.checklist.sections.banos.aguaDrenaje.elements.desagues },
              ]}
            />
          </Card>

          {/* Sanitarios */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={(bano.questions || questions).find(q => q.id === "sanitarios") || { id: "sanitarios" }}
              questionId="sanitarios"
              label={t.checklist.sections.banos.sanitarios.title}
              description={t.checklist.sections.banos.sanitarios.description}
              onUpdate={(updates) => handleQuestionUpdate("sanitarios", updates)}
              elements={[
                { id: "plato-ducha-banera", label: t.checklist.sections.banos.sanitarios.elements.platoDuchaBanera },
                { id: "inodoro", label: t.checklist.sections.banos.sanitarios.elements.inodoro },
                { id: "lavabo", label: t.checklist.sections.banos.sanitarios.elements.lavabo },
              ]}
            />
          </Card>

          {/* Grifería y ducha o bañera */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={(bano.questions || questions).find(q => q.id === "griferia-ducha") || { id: "griferia-ducha" }}
              questionId="griferia-ducha"
              label={t.checklist.sections.banos.griferiaDucha.title}
              description={t.checklist.sections.banos.griferiaDucha.description}
              onUpdate={(updates) => handleQuestionUpdate("griferia-ducha", updates)}
              elements={[
                { id: "grifos", label: t.checklist.sections.banos.griferiaDucha.elements.grifos },
                { id: "mampara-cortina", label: t.checklist.sections.banos.griferiaDucha.elements.mamparaCortina },
              ]}
            />
          </Card>

          {/* Carpintería */}
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                {t.checklist.sections.banos.carpinteria.title}
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
                {t.checklist.sections.banos.carpinteria.description}
              </p>
            </div>

            {/* Quantity Steppers for Ventanas, Persianas */}
            <div className="space-y-4">
              {CARPENTRY_ITEMS.map((itemConfig) => {
                const currentDynamicItems = section.dynamicItems || [];
                const currentBano = currentDynamicItems[banoIndex] || bano;
                const currentCarpentryItems = currentBano?.carpentryItems || carpentryItems;
                const item = currentCarpentryItems.find(i => i.id === itemConfig.id) || {
                  id: itemConfig.id,
                  cantidad: 0,
                };
                const cantidad = item.cantidad || 0;
                const needsValidation = cantidad > 0;
                const hasMultipleUnits = cantidad > 1;
                const units = (item as ChecklistCarpentryItem).units || [];

                return (
                  <div key={`${item.id}-${cantidad}-${banoIndex}`} className="space-y-4">
                    {/* Quantity Stepper */}
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                        {t.checklist.sections.banos.carpinteria.items[itemConfig.translationKey]}
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
                                    {t.checklist.sections.banos.carpinteria.items[itemConfig.translationKey]} {index + 1}
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
                                          {t.checklist.sections.banos.acabados.whatElementsBadCondition}
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
                          <div className="space-y-4">
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
                                    {t.checklist.sections.banos.acabados.whatElementsBadCondition}
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
                          </div>
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
                question={(bano.questions || questions).find(q => q.id === "puerta-entrada") || { id: "puerta-entrada" }}
                questionId="puerta-entrada"
                label={t.checklist.sections.banos.carpinteria.puertaEntrada}
                description=""
                onUpdate={(updates) => handleQuestionUpdate("puerta-entrada", updates)}
                elements={[]}
              />
            </div>
          </Card>

          {/* Mobiliario */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={(bano.questions || questions).find(q => q.id === "mobiliario") || { id: "mobiliario" }}
              questionId="mobiliario"
              label={t.checklist.sections.banos.mobiliario.title}
              description={t.checklist.sections.banos.mobiliario.description}
              onUpdate={(updates) => handleQuestionUpdate("mobiliario", updates)}
              elements={[
                { id: "mueble-lavabo", label: t.checklist.sections.banos.mobiliario.elements.muebleLavabo },
                { id: "espejo", label: t.checklist.sections.banos.mobiliario.elements.espejo },
                { id: "toallero-portapapeles", label: t.checklist.sections.banos.mobiliario.elements.toalleroPortapapeles },
              ]}
            />
          </Card>

          {/* Ventilación */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={(bano.questions || questions).find(q => q.id === "ventilacion") || { id: "ventilacion" }}
              questionId="ventilacion"
              label={t.checklist.sections.banos.ventilacion.title}
              description={t.checklist.sections.banos.ventilacion.description}
              onUpdate={(updates) => handleQuestionUpdate("ventilacion", updates)}
              elements={[]}
            />
          </Card>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                if (onNavigateToBano && banoIndex > 0) {
                  onNavigateToBano(banoIndex - 1);
                } else {
                  window.history.back();
                }
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← {banoIndex > 0 ? `${t.checklist.sections.banos.bathroom} ${banoIndex}` : t.common.back}
            </button>
            {hasNextBano ? (
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToBano) {
                    onNavigateToBano(banoIndex + 1);
                  }
                }}
                className="px-4 py-2 bg-[var(--prophero-blue-500)] text-white rounded-lg hover:bg-[var(--prophero-blue-600)] transition-colors"
              >
                {t.common.continue} → {t.checklist.sections.banos.bathroom} {banoIndex + 2}
              </button>
            ) : (
              onContinue && (
                <button
                  type="button"
                  onClick={onContinue}
                  className="px-4 py-2 bg-[var(--prophero-blue-500)] text-white rounded-lg hover:bg-[var(--prophero-blue-600)] transition-colors"
                >
                  {t.common.continue}
                </button>
              )
            )}
          </div>
        </div>
      );
    }

    // Main section: Show counter and list of bathrooms (when dynamicCount > 1)
    return (
      <div ref={ref} className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            {t.checklist.sections.banos.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
            {t.checklist.sections.banos.description}
          </p>
        </div>

        {/* Room Counter */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
              {t.checklist.sections.banos.title}
            </Label>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleCountChange(-1)}
                disabled={dynamicCount === 0}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[var(--prophero-gray-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                aria-label="Decrementar cantidad"
              >
                <Minus className="h-4 w-4 text-foreground" />
              </button>
              <span className="text-base font-semibold text-foreground min-w-[24px] text-center">
                {dynamicCount}
              </span>
              <button
                type="button"
                onClick={() => handleCountChange(1)}
                disabled={Number(dynamicCount) >= 20}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)] hover:bg-[var(--prophero-blue-200)] dark:hover:bg-[var(--prophero-blue-800)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                aria-label="Incrementar cantidad"
              >
                <Plus className="h-4 w-4 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
              </button>
            </div>
          </div>
        </Card>

        {/* List of Bathrooms */}
        {dynamicCount > 0 && (
          <div className="space-y-3">
            {dynamicItems.map((banoItem, index) => {
              const progress = 0; // TODO: Calculate progress
              return (
                <Card key={banoItem.id} className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground">
                        {t.checklist.sections.banos.bathroom} {index + 1}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {progress}% completado
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToBano) {
                          onNavigateToBano(index);
                        }
                      }}
                      className="px-4 py-2 bg-[var(--prophero-blue-500)] text-white rounded-lg hover:bg-[var(--prophero-blue-600)] transition-colors text-sm"
                    >
                      {t.common.continue}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

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

BanosSection.displayName = "BanosSection";
