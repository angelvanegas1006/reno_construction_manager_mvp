"use client";

import React, { forwardRef, useCallback, useMemo, useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { ChecklistSection, ChecklistDynamicItem, ChecklistCarpentryItem, ChecklistClimatizationItem, ChecklistClimatizationUnit, ChecklistStatus, ChecklistQuestion, ChecklistUploadZone, FileUpload } from "@/lib/checklist-storage";
import { ChecklistQuestion as ChecklistQuestionComponent } from "../checklist-question";
import { ChecklistUploadZone as ChecklistUploadZoneComponent } from "../checklist-upload-zone";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ThumbsUp, Wrench, ThumbsDown, XCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface HabitacionesSectionProps {
  section: ChecklistSection;
  onUpdate: (updates: Partial<ChecklistSection>) => void;
  onContinue?: () => void;
  habitacionIndex?: number; // Index of the specific bedroom (0-based), undefined for main section
  onPropertyUpdate?: (updates: { habitaciones: number }) => void; // To update property.data.habitaciones
  onNavigateToHabitacion?: (index: number) => void; // To navigate to a specific bedroom
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

export const HabitacionesSection = forwardRef<HTMLDivElement, HabitacionesSectionProps>(
  ({ section, onUpdate, onContinue, habitacionIndex, onPropertyUpdate, onNavigateToHabitacion }, ref) => {
    const { t } = useI18n();

    console.log("HabitacionesSection render - section:", section);
    console.log("HabitacionesSection render - section.dynamicItems:", section.dynamicItems);
    if (section.dynamicItems && section.dynamicItems.length > 0) {
      const ventanasInSection = section.dynamicItems[0]?.carpentryItems?.find(i => i.id === "ventanas");
      console.log("HabitacionesSection render - ventanas in section.dynamicItems[0]:", ventanasInSection);
    }

    // Get dynamic count from section or default to dynamicItems length or 0
    // Use dynamicItems.length as fallback to ensure we always have the correct count
    const dynamicCount = section.dynamicCount ?? (section.dynamicItems?.length ?? 0);
    // Use section.dynamicItems directly instead of useMemo to ensure we always get the latest data
    const dynamicItems = section.dynamicItems || [];
    console.log("HabitacionesSection - dynamicItems (direct):", dynamicItems);

    // Get current habitacion if index is provided - use dynamicItems directly to ensure we get the latest data
    const habitacion = (() => {
      if (habitacionIndex !== undefined) {
        return dynamicItems[habitacionIndex] || {
          id: `habitacion-${habitacionIndex + 1}`,
          questions: [],
          uploadZone: { id: "fotos-video", photos: [], videos: [] },
        };
      }
      return null;
    })();

    // Initialize questions (always call hooks)
    const defaultQuestions = useMemo(() => [
      { id: "acabados" },
      { id: "electricidad" },
      { id: "puerta-entrada" },
    ], []);

    const questions = habitacion?.questions || defaultQuestions;

    // Initialize carpentry items - use dynamicItems directly to ensure we get the latest data
    const carpentryItems = (() => {
      if (habitacionIndex !== undefined) {
        const currentHabitacion = dynamicItems[habitacionIndex];
        if (currentHabitacion?.carpentryItems && currentHabitacion.carpentryItems.length > 0) {
          return currentHabitacion.carpentryItems;
        }
      }
      return CARPENTRY_ITEMS.map(item => ({
        id: item.id,
        cantidad: 0,
      }));
    })();

    // Initialize climatization items - use dynamicItems directly to ensure we get the latest data
    const climatizationItems = (() => {
      if (habitacionIndex !== undefined) {
        const currentHabitacion = dynamicItems[habitacionIndex];
        if (currentHabitacion?.climatizationItems && currentHabitacion.climatizationItems.length > 0) {
          return currentHabitacion.climatizationItems;
        }
      }
      return CLIMATIZATION_ITEMS.map(item => ({
        id: item.id,
        cantidad: 0,
      }));
    })();

    // Initialize mobiliario
    const mobiliario = habitacion?.mobiliario || { existeMobiliario: false };

    // Initialize upload zone
    const uploadZone = habitacion?.uploadZone || { id: "fotos-video", photos: [], videos: [] };

    // All callbacks must be defined always (hooks rules)
    const handleUploadZoneUpdate = useCallback((updates: ChecklistUploadZone) => {
      if (habitacionIndex === undefined || !habitacion) return;
      const updatedItems = [...dynamicItems];
      updatedItems[habitacionIndex] = {
        ...habitacion,
        uploadZone: updates,
      };
      onUpdate({ dynamicItems: updatedItems });
    }, [dynamicItems, habitacion, habitacionIndex, onUpdate]);

    const handleQuestionUpdate = useCallback((questionId: string, updates: Partial<ChecklistQuestion>) => {
      if (habitacionIndex === undefined || !habitacion) return;
      const currentQuestions = habitacion?.questions || defaultQuestions;
      const updatedQuestions = currentQuestions.map(q =>
        q.id === questionId ? { ...q, ...updates } : q
      );
      const updatedItems = [...dynamicItems];
      updatedItems[habitacionIndex] = {
        ...habitacion,
        questions: updatedQuestions,
      };
      onUpdate({ dynamicItems: updatedItems });
    }, [habitacion, defaultQuestions, dynamicItems, habitacionIndex, onUpdate]);

    const handleCarpentryQuantityChange = useCallback((itemId: string, delta: number) => {
      if (habitacionIndex === undefined) {
        return;
      }
      
      // Always get the latest habitacion from section.dynamicItems
      const currentDynamicItems = section.dynamicItems || [];
      const currentHabitacion = currentDynamicItems[habitacionIndex] || {
        id: `habitacion-${habitacionIndex + 1}`,
        questions: [],
        uploadZone: { id: "fotos-video", photos: [], videos: [] },
        carpentryItems: CARPENTRY_ITEMS.map(item => ({ id: item.id, cantidad: 0 })),
      };
      const currentItems = currentHabitacion.carpentryItems || CARPENTRY_ITEMS.map(item => ({ id: item.id, cantidad: 0 }));
      
      const updatedItems = currentItems.map(item => {
        if (item.id === itemId) {
          const currentCantidad = item.cantidad || 0;
          const newCantidad = Math.max(0, Math.min(MAX_QUANTITY, currentCantidad + delta));
          
          let units = (item as ChecklistCarpentryItem).units || [];
          
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
      updatedDynamicItems[habitacionIndex] = {
        ...currentHabitacion,
        carpentryItems: updatedItems,
      };
      
      console.log("handleCarpentryQuantityChange - updatedDynamicItems before onUpdate:", updatedDynamicItems);
      const habitacion = updatedDynamicItems[habitacionIndex];
      if (habitacion) {
        console.log("handleCarpentryQuantityChange - updatedDynamicItems[habitacionIndex].carpentryItems:", habitacion.carpentryItems);
        const ventanasInUpdated = habitacion.carpentryItems?.find(i => i.id === "ventanas");
        console.log("handleCarpentryQuantityChange - ventanas in updatedDynamicItems:", ventanasInUpdated);
      }
      
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [section.dynamicItems, habitacionIndex, onUpdate]);

    const handleCarpentryStatusChange = useCallback((itemId: string, unitIndex: number | null, status: ChecklistStatus) => {
      if (habitacionIndex === undefined || !habitacion) return;
      const currentItems = habitacion?.carpentryItems || carpentryItems;
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
      const updatedDynamicItems = [...dynamicItems];
      updatedDynamicItems[habitacionIndex] = {
        ...habitacion,
        carpentryItems: updatedItems,
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [habitacion, carpentryItems, dynamicItems, habitacionIndex, onUpdate]);

    const handleCarpentryNotesChange = useCallback((itemId: string, unitIndex: number | null, notes: string) => {
      if (habitacionIndex === undefined || !habitacion) return;
      const currentItems = habitacion?.carpentryItems || carpentryItems;
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
      const updatedDynamicItems = [...dynamicItems];
      updatedDynamicItems[habitacionIndex] = {
        ...habitacion,
        carpentryItems: updatedItems,
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [habitacion, carpentryItems, dynamicItems, habitacionIndex, onUpdate]);

    const handleCarpentryPhotosChange = useCallback((itemId: string, unitIndex: number | null, photos: FileUpload[]) => {
      if (habitacionIndex === undefined || !habitacion) return;
      const currentItems = habitacion?.carpentryItems || carpentryItems;
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
      const updatedDynamicItems = [...dynamicItems];
      updatedDynamicItems[habitacionIndex] = {
        ...habitacion,
        carpentryItems: updatedItems,
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [habitacion, carpentryItems, dynamicItems, habitacionIndex, onUpdate]);

    const handleCarpentryBadElementsChange = useCallback((itemId: string, unitIndex: number | null, badElements: string[]) => {
      if (habitacionIndex === undefined || !habitacion) return;
      const currentItems = habitacion?.carpentryItems || carpentryItems;
      const updatedItems = currentItems.map(item => {
        if (item.id === itemId) {
          const carpentryItem = item as ChecklistCarpentryItem;
          if (unitIndex !== null && carpentryItem.units && carpentryItem.units.length > unitIndex) {
            const updatedUnits = carpentryItem.units.map((unit, idx) =>
              idx === unitIndex ? { ...unit, badElements } : unit
            );
            return { ...carpentryItem, units: updatedUnits };
          } else {
            return { ...carpentryItem, badElements };
          }
        }
        return item;
      });
      const updatedDynamicItems = [...dynamicItems];
      updatedDynamicItems[habitacionIndex] = {
        ...habitacion,
        carpentryItems: updatedItems,
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [habitacion, carpentryItems, dynamicItems, habitacionIndex, onUpdate]);

    const handleClimatizationQuantityChange = useCallback((itemId: string, delta: number) => {
      if (habitacionIndex === undefined) return;
      // Always get the latest habitacion from section.dynamicItems
      const currentDynamicItems = section.dynamicItems || [];
      const currentHabitacion = currentDynamicItems[habitacionIndex] || {
        id: `habitacion-${habitacionIndex + 1}`,
        questions: [],
        uploadZone: { id: "fotos-video", photos: [], videos: [] },
        climatizationItems: CLIMATIZATION_ITEMS.map(item => ({ id: item.id, cantidad: 0 })),
      };
      const currentItems = currentHabitacion.climatizationItems || CLIMATIZATION_ITEMS.map(item => ({ id: item.id, cantidad: 0 }));
      const updatedItems = currentItems.map(item => {
        if (item.id === itemId) {
          const currentCantidad = item.cantidad || 0;
          const newCantidad = Math.max(0, Math.min(MAX_QUANTITY, currentCantidad + delta));
          
          let units = (item as ChecklistClimatizationItem).units || [];
          
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
      updatedDynamicItems[habitacionIndex] = {
        ...currentHabitacion,
        climatizationItems: updatedItems,
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [section.dynamicItems, habitacionIndex, onUpdate]);

    const handleClimatizationStatusChange = useCallback((itemId: string, unitIndex: number | null, status: ChecklistStatus) => {
      if (habitacionIndex === undefined || !habitacion) return;
      const currentItems = habitacion?.climatizationItems || climatizationItems;
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
      const updatedDynamicItems = [...dynamicItems];
      updatedDynamicItems[habitacionIndex] = {
        ...habitacion,
        climatizationItems: updatedItems,
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [habitacion, climatizationItems, dynamicItems, habitacionIndex, onUpdate]);

    const handleClimatizationNotesChange = useCallback((itemId: string, unitIndex: number | null, notes: string) => {
      if (habitacionIndex === undefined || !habitacion) return;
      const currentItems = habitacion?.climatizationItems || climatizationItems;
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
      const updatedDynamicItems = [...dynamicItems];
      updatedDynamicItems[habitacionIndex] = {
        ...habitacion,
        climatizationItems: updatedItems,
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [habitacion, climatizationItems, dynamicItems, habitacionIndex, onUpdate]);

    const handleClimatizationPhotosChange = useCallback((itemId: string, unitIndex: number | null, photos: FileUpload[]) => {
      if (habitacionIndex === undefined || !habitacion) return;
      const currentItems = habitacion?.climatizationItems || climatizationItems;
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
      const updatedDynamicItems = [...dynamicItems];
      updatedDynamicItems[habitacionIndex] = {
        ...habitacion,
        climatizationItems: updatedItems,
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [habitacion, climatizationItems, dynamicItems, habitacionIndex, onUpdate]);

    const handleMobiliarioToggle = useCallback((existeMobiliario: boolean) => {
      if (habitacionIndex === undefined || !habitacion) return;
      const updatedDynamicItems = [...dynamicItems];
      updatedDynamicItems[habitacionIndex] = {
        ...habitacion,
        mobiliario: {
          existeMobiliario,
          question: existeMobiliario ? (habitacion?.mobiliario?.question || { id: "mobiliario" }) : undefined,
        },
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [habitacion, dynamicItems, habitacionIndex, onUpdate]);

    const handleMobiliarioQuestionUpdate = useCallback((updates: Partial<ChecklistQuestion>) => {
      if (habitacionIndex === undefined || !habitacion) return;
      const updatedDynamicItems = [...dynamicItems];
      updatedDynamicItems[habitacionIndex] = {
        ...habitacion,
        mobiliario: {
          ...mobiliario,
          question: { ...(mobiliario.question || { id: "mobiliario" }), ...updates },
        },
      };
      onUpdate({ dynamicItems: updatedDynamicItems });
    }, [habitacion, mobiliario, dynamicItems, habitacionIndex, onUpdate]);

    const handleCountChange = useCallback((delta: number) => {
      const newCount = Math.max(0, Math.min(20, dynamicCount + delta));
      
      // Update dynamic items array
      let updatedItems = [...dynamicItems];
      
      if (newCount > dynamicCount) {
        // Add new bedrooms
        while (updatedItems.length < newCount) {
          updatedItems.push({
            id: `habitacion-${updatedItems.length + 1}`,
            questions: [
              { id: "acabados" },
              { id: "electricidad" },
              { id: "puerta-entrada" },
            ],
            uploadZone: { id: "fotos-video", photos: [], videos: [] },
            carpentryItems: CARPENTRY_ITEMS.map(item => ({ id: item.id, cantidad: 0 })),
            climatizationItems: CLIMATIZATION_ITEMS.map(item => ({ id: item.id, cantidad: 0 })),
            mobiliario: { existeMobiliario: false },
          });
        }
      } else if (newCount < dynamicCount) {
        // Remove bedrooms
        updatedItems = updatedItems.slice(0, newCount);
      }
      
      // Update checklist
      onUpdate({ dynamicCount: newCount, dynamicItems: updatedItems });
      
      // Update property.data.habitaciones
      if (onPropertyUpdate) {
        onPropertyUpdate({ habitaciones: newCount });
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

    // Function to calculate progress for a bedroom
    const calculateHabitacionProgress = useCallback((habitacionItem: ChecklistDynamicItem) => {
      const totalSections = 6; // Fotos, Acabados, Carpintería, Electricidad, Climatización, Mobiliario
      let completedSections = 0;

      // 1. Fotos/video (required)
      if (habitacionItem.uploadZone && 
          (habitacionItem.uploadZone.photos?.length > 0 || habitacionItem.uploadZone.videos?.length > 0)) {
        completedSections++;
      }

      // 2. Acabados (must have status)
      const acabadosQuestion = habitacionItem.questions?.find(q => q.id === "acabados");
      if (acabadosQuestion?.status) {
        completedSections++;
      }

      // 3. Carpintería - Puerta de entrada (must have status if exists)
      const puertaQuestion = habitacionItem.questions?.find(q => q.id === "puerta-entrada");
      if (puertaQuestion?.status) {
        completedSections++;
      }

      // 4. Electricidad (must have status)
      const electricidadQuestion = habitacionItem.questions?.find(q => q.id === "electricidad");
      if (electricidadQuestion?.status) {
        completedSections++;
      }

      // 5. Climatización - all items with cantidad > 0 must have estado
      let climatizacionComplete = true;
      if (habitacionItem.climatizationItems && habitacionItem.climatizationItems.length > 0) {
        for (const item of habitacionItem.climatizationItems) {
          if (item.cantidad > 0) {
            if (item.cantidad === 1) {
              // Single unit - check estado directly on item
              if (!(item as ChecklistClimatizationItem).estado) {
                climatizacionComplete = false;
                break;
              }
            } else if (item.cantidad > 1) {
              // Multiple units - check that we have exactly cantidad units and all have estado
              if (!item.units || item.units.length !== item.cantidad) {
                climatizacionComplete = false;
                break;
              }
              const allUnitsHaveEstado = item.units.every(unit => unit.estado);
              if (!allUnitsHaveEstado) {
                climatizacionComplete = false;
                break;
              }
            }
          }
        }
      }
      if (climatizacionComplete) {
        completedSections++;
      }

      // 6. Mobiliario - if existeMobiliario is true, question must have status
      if (habitacionItem.mobiliario) {
        if (!habitacionItem.mobiliario.existeMobiliario || habitacionItem.mobiliario.question?.status) {
          completedSections++;
        }
      } else {
        completedSections++;
      }

      return { completed: completedSections, total: totalSections };
    }, []);

    // If dynamicCount === 1 and habitacionIndex is undefined, show the form directly (as if habitacionIndex === 0)
    if (dynamicCount === 1 && habitacionIndex === undefined) {
      const singleHabitacion = dynamicItems[0] || {
        id: "habitacion-1",
        questions: [
          { id: "acabados" },
          { id: "electricidad" },
          { id: "puerta-entrada" },
        ],
        uploadZone: { id: "fotos-video", photos: [], videos: [] },
        carpentryItems: CARPENTRY_ITEMS.map(item => ({ id: item.id, cantidad: 0 })),
        climatizationItems: CLIMATIZATION_ITEMS.map(item => ({ id: item.id, cantidad: 0 })),
        mobiliario: { existeMobiliario: false },
      };
      
      // Use the single habitacion as if habitacionIndex === 0
      const effectiveHabitacion = singleHabitacion;
      const effectiveQuestions = effectiveHabitacion.questions || defaultQuestions;
      const effectiveCarpentryItems = effectiveHabitacion.carpentryItems || CARPENTRY_ITEMS.map(item => ({ id: item.id, cantidad: 0 }));
      const effectiveClimatizationItems = effectiveHabitacion.climatizationItems || CLIMATIZATION_ITEMS.map(item => ({ id: item.id, cantidad: 0 }));
      const effectiveMobiliario = effectiveHabitacion.mobiliario || { existeMobiliario: false };
      const effectiveUploadZone = effectiveHabitacion.uploadZone || { id: "fotos-video", photos: [], videos: [] };

      // Handlers for single bedroom (when dynamicCount === 1)
      const handleSingleCarpentryQuantityChange = (itemId: string, delta: number) => {
        const currentHabitacion = dynamicItems[0] || singleHabitacion;
        const currentItems = currentHabitacion.carpentryItems || effectiveCarpentryItems;
        const updatedItems = currentItems.map(item => {
          if (item.id === itemId) {
            const currentCantidad = item.cantidad || 0;
            const newCantidad = Math.max(0, Math.min(MAX_QUANTITY, currentCantidad + delta));
            
            let units = (item as ChecklistCarpentryItem).units || [];
            
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
          ...currentHabitacion,
          carpentryItems: updatedItems,
        };
        
        onUpdate({ dynamicItems: updatedDynamicItems });
      };

      const handleSingleClimatizationQuantityChange = (itemId: string, delta: number) => {
        // Always get the latest from section.dynamicItems
        const currentDynamicItems = section.dynamicItems || [];
        const currentHabitacion = currentDynamicItems[0] || singleHabitacion;
        const currentItems = currentHabitacion.climatizationItems || effectiveClimatizationItems;
        const updatedItems = currentItems.map(item => {
          if (item.id === itemId) {
            const currentCantidad = item.cantidad || 0;
            const newCantidad = Math.max(0, Math.min(MAX_QUANTITY, currentCantidad + delta));
            
            let units = (item as ChecklistCarpentryItem).units || [];
            
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
          ...currentHabitacion,
          climatizationItems: updatedItems,
        };
        onUpdate({ dynamicItems: updatedDynamicItems });
      };

      // Handlers for single bedroom carpentry items (when dynamicCount === 1)
      const handleSingleCarpentryStatusChange = (itemId: string, unitIndex: number | null, status: ChecklistStatus) => {
        const currentDynamicItems = section.dynamicItems || [];
        const currentHabitacion = currentDynamicItems[0] || singleHabitacion;
        const currentItems = currentHabitacion.carpentryItems || effectiveCarpentryItems;
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
        const updatedDynamicItems = [...currentDynamicItems];
        updatedDynamicItems[0] = {
          ...currentHabitacion,
          carpentryItems: updatedItems,
        };
        onUpdate({ dynamicItems: updatedDynamicItems });
      };

      const handleSingleCarpentryBadElementsChange = (itemId: string, unitIndex: number | null, badElements: string[]) => {
        const currentDynamicItems = section.dynamicItems || [];
        const currentHabitacion = currentDynamicItems[0] || singleHabitacion;
        const currentItems = currentHabitacion.carpentryItems || effectiveCarpentryItems;
        const updatedItems = currentItems.map(item => {
          if (item.id === itemId) {
            const carpentryItem = item as ChecklistCarpentryItem;
            if (unitIndex !== null && carpentryItem.units && carpentryItem.units.length > unitIndex) {
              const updatedUnits = carpentryItem.units.map((unit, idx) =>
                idx === unitIndex ? { ...unit, badElements } : unit
              );
              return { ...carpentryItem, units: updatedUnits };
            } else {
              return { ...carpentryItem, badElements };
            }
          }
          return item;
        });
        const updatedDynamicItems = [...currentDynamicItems];
        updatedDynamicItems[0] = {
          ...currentHabitacion,
          carpentryItems: updatedItems,
        };
        onUpdate({ dynamicItems: updatedDynamicItems });
      };

      const handleSingleCarpentryNotesChange = (itemId: string, unitIndex: number | null, notes: string) => {
        const currentDynamicItems = section.dynamicItems || [];
        const currentHabitacion = currentDynamicItems[0] || singleHabitacion;
        const currentItems = currentHabitacion.carpentryItems || effectiveCarpentryItems;
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
        const updatedDynamicItems = [...currentDynamicItems];
        updatedDynamicItems[0] = {
          ...currentHabitacion,
          carpentryItems: updatedItems,
        };
        onUpdate({ dynamicItems: updatedDynamicItems });
      };

      const handleSingleCarpentryPhotosChange = (itemId: string, unitIndex: number | null, photos: FileUpload[]) => {
        const currentDynamicItems = section.dynamicItems || [];
        const currentHabitacion = currentDynamicItems[0] || singleHabitacion;
        const currentItems = currentHabitacion.carpentryItems || effectiveCarpentryItems;
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
        const updatedDynamicItems = [...currentDynamicItems];
        updatedDynamicItems[0] = {
          ...currentHabitacion,
          carpentryItems: updatedItems,
        };
        onUpdate({ dynamicItems: updatedDynamicItems });
      };

      // Render the form directly (same as when habitacionIndex === 0)
      // Get current habitacion from section.dynamicItems to ensure we have the latest data
      const currentDynamicItems = section.dynamicItems || [];
      const currentHabitacion = currentDynamicItems[0] || singleHabitacion;
      const currentEffectiveCarpentryItems = currentHabitacion.carpentryItems || effectiveCarpentryItems;
      const currentEffectiveClimatizationItems = currentHabitacion.climatizationItems || effectiveClimatizationItems;
      
      return (
        <div ref={ref} className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {t.checklist.sections.habitaciones.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t.checklist.sections.habitaciones.description}
            </p>
          </div>

          {/* Número de habitaciones */}
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-semibold text-foreground leading-tight">
                {t.checklist.sections.habitaciones.numeroHabitaciones}
              </Label>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleCountChange(-1)}
                  disabled={(dynamicCount as number) === 0}
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
                  disabled={dynamicCount >= 20}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)] hover:bg-[var(--prophero-blue-200)] dark:hover:bg-[var(--prophero-blue-800)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  aria-label="Incrementar cantidad"
                >
                  <Plus className="h-4 w-4 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
                </button>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">
              {t.checklist.sections.habitaciones.bedroom} 1
            </h2>
          </div>

          {/* Fotos y video de la habitación */}
          <Card className="p-4 sm:p-6 space-y-4">
              <ChecklistUploadZoneComponent
              title={t.checklist.sections.habitaciones.fotosVideoHabitacion.title}
              description={t.checklist.sections.habitaciones.fotosVideoHabitacion.description}
              uploadZone={currentHabitacion.uploadZone || effectiveUploadZone}
              onUpdate={(updates) => {
                const updatedItems = [...dynamicItems];
                updatedItems[0] = {
                  ...currentHabitacion,
                  uploadZone: updates,
                };
                onUpdate({ dynamicItems: updatedItems });
              }}
              isRequired={true}
              maxFiles={10}
              maxSizeMB={5}
            />
          </Card>

          {/* Acabados */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={(currentHabitacion.questions || effectiveQuestions).find(q => q.id === "acabados") || { id: "acabados" }}
              questionId="acabados"
              label={t.checklist.sections.habitaciones.acabados.title}
              description={t.checklist.sections.habitaciones.acabados.description}
              onUpdate={(updates) => {
                const currentQuestions = currentHabitacion.questions || effectiveQuestions;
                const updatedQuestions = currentQuestions.map(q =>
                  q.id === "acabados" ? { ...q, ...updates } : q
                );
                const updatedItems = [...dynamicItems];
                updatedItems[0] = {
                  ...currentHabitacion,
                  questions: updatedQuestions,
                };
                onUpdate({ dynamicItems: updatedItems });
              }}
              elements={[
                { id: "paredes", label: t.checklist.sections.habitaciones.acabados.elements.paredes },
                { id: "techos", label: t.checklist.sections.habitaciones.acabados.elements.techos },
                { id: "suelo", label: t.checklist.sections.habitaciones.acabados.elements.suelo },
                { id: "rodapies", label: t.checklist.sections.habitaciones.acabados.elements.rodapies },
              ]}
            />
          </Card>

          {/* Carpintería */}
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground leading-tight">
                {t.checklist.sections.habitaciones.carpinteria.title}
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t.checklist.sections.habitaciones.carpinteria.description}
              </p>
            </div>

            {/* Quantity Steppers for Ventanas, Persianas, Armarios */}
            <div className="space-y-4">
              {CARPENTRY_ITEMS.map((itemConfig) => {
                // Always get the latest items from section.dynamicItems to ensure we have the most recent data
                const latestDynamicItems = section.dynamicItems || [];
                const latestHabitacion = latestDynamicItems[0] || currentHabitacion;
                const latestCarpentryItems = latestHabitacion.carpentryItems || currentEffectiveCarpentryItems;
                const item = latestCarpentryItems.find(i => i.id === itemConfig.id) || {
                  id: itemConfig.id,
                  cantidad: 0,
                };
                const cantidad = item.cantidad || 0;
                
                console.log(`Rendering (single) ${itemConfig.id}:`, {
                  itemId: itemConfig.id,
                  cantidad,
                  latestHabitacion,
                  latestCarpentryItems,
                  latestDynamicItems,
                  currentHabitacion,
                });

                const needsValidation = cantidad > 0;
                const hasMultipleUnits = cantidad > 1;
                const units = (item as ChecklistCarpentryItem).units || [];

                return (
                  <div key={`${item.id}-${cantidad}-single`} className="space-y-4">
                    {/* Quantity Stepper */}
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                        {t.checklist.sections.habitaciones.carpinteria.items[itemConfig.translationKey]}
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
                                    {t.checklist.sections.habitaciones.carpinteria.items[itemConfig.translationKey]} {index + 1}
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
                                          Elementos en mal estado:
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
                                                      : currentBadElements.filter((id: string) => id !== badElement.id);
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
                                        <Label className="text-xs sm:text-sm font-medium text-foreground">
                                          Notas:
                                        </Label>
                                        <Textarea
                                          value={unit.notes || ""}
                                          onChange={(e) => handleSingleCarpentryNotesChange(item.id, index, e.target.value)}
                                          placeholder="Describe el estado del elemento..."
                                          className="min-h-[80px] text-xs sm:text-sm"
                                        />
                                      </div>

                                      {/* Photos */}
                                      <div className="space-y-2">
                                        <Label className="text-xs sm:text-sm font-medium text-foreground">
                                          Fotos:
                                        </Label>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          onChange={async (e) => {
                                            const files = Array.from(e.target.files || []);
                                            const newPhotos: FileUpload[] = await Promise.all(files.map(async (file) => {
                                              const reader = new FileReader();
                                              const data = await new Promise<string>((resolve) => {
                                                reader.onload = () => resolve(reader.result as string);
                                                reader.readAsDataURL(file);
                                              });
                                              return {
                                                id: `${Date.now()}-${Math.random()}`,
                                                name: file.name,
                                                size: file.size,
                                                type: file.type,
                                                data: data.split(',')[1], // Remove data:image/...;base64, prefix
                                                uploadedAt: new Date().toISOString(),
                                              };
                                            }));
                                            handleSingleCarpentryPhotosChange(item.id, index, [...(unit.photos || []), ...newPhotos]);
                                          }}
                                          className="w-full text-xs sm:text-sm"
                                        />
                                        {unit.photos && unit.photos.length > 0 && (
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {unit.photos.map((photo: FileUpload) => (
                                              <div key={photo.id} className="relative">
                                                <img
                                                  src={`data:${photo.type};base64,${photo.data}`}
                                                  alt="Preview"
                                                  className="w-full h-20 object-cover rounded"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const updatedPhotos = unit.photos?.filter((p: FileUpload) => p.id !== photo.id) || [];
                                                    handleSingleCarpentryPhotosChange(item.id, index, updatedPhotos);
                                                  }}
                                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
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
                                const carpentryItem = item as ChecklistCarpentryItem;
                                const isSelected = carpentryItem.estado === option.value;
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
                            {(() => {
                              const carpentryItem = item as ChecklistCarpentryItem;
                              return (carpentryItem.estado === "necesita_reparacion" || carpentryItem.estado === "necesita_reemplazo");
                            })() && (
                              <div className="space-y-4 pt-2">
                                {/* Bad Elements Checkboxes */}
                                <div className="space-y-2">
                                  <Label className="text-xs sm:text-sm font-medium text-foreground">
                                    Elementos en mal estado:
                                  </Label>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                      { id: "rotura", label: "Rotura" },
                                      { id: "desgaste", label: "Desgaste" },
                                      { id: "oxidacion", label: "Oxidación" },
                                      { id: "otros", label: "Otros" },
                                    ].map((badElement) => {
                                      const carpentryItem = item as ChecklistCarpentryItem;
                                      const isChecked = carpentryItem.badElements?.includes(badElement.id) || false;
                                      return (
                                        <label
                                          key={badElement.id}
                                          className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              const carpentryItem = item as ChecklistCarpentryItem;
                                              const currentBadElements = carpentryItem.badElements || [];
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
                                  <Label className="text-xs sm:text-sm font-medium text-foreground">
                                    Notas:
                                  </Label>
                                  <Textarea
                                    value={(item as ChecklistCarpentryItem).notes || ""}
                                    onChange={(e) => handleSingleCarpentryNotesChange(item.id, null, e.target.value)}
                                    placeholder="Describe el estado del elemento..."
                                    className="min-h-[80px] text-xs sm:text-sm"
                                  />
                                </div>

                                {/* Photos */}
                                <div className="space-y-2">
                                  <Label className="text-xs sm:text-sm font-medium text-foreground">
                                    Fotos:
                                  </Label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={async (e) => {
                                      const files = Array.from(e.target.files || []);
                                      const newPhotos: FileUpload[] = await Promise.all(files.map(async (file) => {
                                        const reader = new FileReader();
                                        const data = await new Promise<string>((resolve) => {
                                          reader.onload = () => resolve(reader.result as string);
                                          reader.readAsDataURL(file);
                                        });
                                        return {
                                          id: `${Date.now()}-${Math.random()}`,
                                          name: file.name,
                                          size: file.size,
                                          type: file.type,
                                          data: data.split(',')[1], // Remove data:image/...;base64, prefix
                                          uploadedAt: new Date().toISOString(),
                                        };
                                      }));
                                      handleSingleCarpentryPhotosChange(item.id, null, [...((item as ChecklistCarpentryItem).photos || []), ...newPhotos]);
                                    }}
                                    className="w-full text-xs sm:text-sm"
                                  />
                                  {(() => {
                                    const carpentryItem = item as ChecklistCarpentryItem;
                                    return carpentryItem.photos && carpentryItem.photos.length > 0;
                                  })() && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      {((item as ChecklistCarpentryItem).photos || []).map((photo: FileUpload) => (
                                        <div key={photo.id} className="relative">
                                          <img
                                            src={`data:${photo.type};base64,${photo.data}`}
                                            alt="Preview"
                                            className="w-full h-20 object-cover rounded"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updatedPhotos = (item as ChecklistCarpentryItem).photos?.filter((p: FileUpload) => p.id !== photo.id) || [];
                                              handleSingleCarpentryPhotosChange(item.id, null, updatedPhotos);
                                            }}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
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
                question={(currentHabitacion.questions || effectiveQuestions).find(q => q.id === "puerta-entrada") || { id: "puerta-entrada" }}
                questionId="puerta-entrada"
                label={t.checklist.sections.habitaciones.carpinteria.puertaEntrada}
                description=""
                onUpdate={(updates) => {
                  const currentQuestions = currentHabitacion.questions || effectiveQuestions;
                  const updatedQuestions = currentQuestions.map(q =>
                    q.id === "puerta-entrada" ? { ...q, ...updates } : q
                  );
                  const updatedItems = [...dynamicItems];
                  updatedItems[0] = {
                    ...currentHabitacion,
                    questions: updatedQuestions,
                  };
                  onUpdate({ dynamicItems: updatedItems });
                }}
                elements={[]}
              />
            </div>
          </Card>

          {/* Electricidad */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={(currentHabitacion.questions || effectiveQuestions).find(q => q.id === "electricidad") || { id: "electricidad" }}
              questionId="electricidad"
              label={t.checklist.sections.habitaciones.electricidad.title}
              description={t.checklist.sections.habitaciones.electricidad.description}
              onUpdate={(updates) => {
                const currentQuestions = currentHabitacion.questions || effectiveQuestions;
                const updatedQuestions = currentQuestions.map(q =>
                  q.id === "electricidad" ? { ...q, ...updates } : q
                );
                const updatedItems = [...dynamicItems];
                updatedItems[0] = {
                  ...currentHabitacion,
                  questions: updatedQuestions,
                };
                onUpdate({ dynamicItems: updatedItems });
              }}
              elements={[
                { id: "luces", label: t.checklist.sections.habitaciones.electricidad.elements.luces },
                { id: "interruptores", label: t.checklist.sections.habitaciones.electricidad.elements.interruptores },
                { id: "tomas-corriente", label: t.checklist.sections.habitaciones.electricidad.elements.tomasCorriente },
                { id: "toma-television", label: t.checklist.sections.habitaciones.electricidad.elements.tomaTelevision },
              ]}
            />
          </Card>

          {/* Climatización */}
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground leading-tight">
                {t.checklist.sections.habitaciones.climatizacion.title}
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t.checklist.sections.habitaciones.climatizacion.description}
              </p>
            </div>

            <div className="space-y-4">
              {CLIMATIZATION_ITEMS.map((itemConfig) => {
                // Always get the latest items from section.dynamicItems to ensure we have the most recent data
                const latestDynamicItems = section.dynamicItems || [];
                const latestHabitacion = latestDynamicItems[0] || currentHabitacion;
                const latestClimatizationItems = latestHabitacion.climatizationItems || currentEffectiveClimatizationItems;
                const item = latestClimatizationItems.find(i => i.id === itemConfig.id) || {
                  id: itemConfig.id,
                  cantidad: 0,
                };
                const cantidad = item.cantidad || 0;

                return (
                  <div key={`${item.id}-${cantidad}-single-clim`} className="flex items-center justify-between gap-2">
                    <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                      {t.checklist.sections.habitaciones.climatizacion.items[itemConfig.translationKey]}
                    </Label>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSingleClimatizationQuantityChange(item.id, -1)}
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
                        onClick={() => handleSingleClimatizationQuantityChange(item.id, 1)}
                        disabled={cantidad >= MAX_QUANTITY}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)] hover:bg-[var(--prophero-blue-200)] dark:hover:bg-[var(--prophero-blue-800)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        aria-label="Incrementar cantidad"
                      >
                        <Plus className="h-4 w-4 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
                      </button>
                    </div>
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
                  {t.checklist.sections.habitaciones.mobiliario.existeMobiliario}
                </Label>
                <Switch
                  checked={(currentHabitacion.mobiliario || effectiveMobiliario).existeMobiliario || false}
                  onCheckedChange={(existeMobiliario) => {
                    const currentMobiliario = currentHabitacion.mobiliario || effectiveMobiliario;
                    const updatedItems = [...dynamicItems];
                    updatedItems[0] = {
                      ...currentHabitacion,
                      mobiliario: {
                        existeMobiliario,
                        question: existeMobiliario ? (currentMobiliario.question || { id: "mobiliario" }) : undefined,
                      },
                    };
                    onUpdate({ dynamicItems: updatedItems });
                  }}
                />
              </div>

              {(currentHabitacion.mobiliario || effectiveMobiliario).existeMobiliario && (
                <div className="space-y-4 pt-4 border-t">
                  <ChecklistQuestionComponent
                    question={(currentHabitacion.mobiliario || effectiveMobiliario).question || { id: "mobiliario" }}
                    questionId="mobiliario"
                    label=""
                    onUpdate={(updates) => {
                      const currentMobiliario = currentHabitacion.mobiliario || effectiveMobiliario;
                      const updatedItems = [...dynamicItems];
                      updatedItems[0] = {
                        ...currentHabitacion,
                        mobiliario: {
                          ...currentMobiliario,
                          question: { ...(currentMobiliario.question || { id: "mobiliario" }), ...updates },
                        },
                      };
                      onUpdate({ dynamicItems: updatedItems });
                    }}
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

    // If habitacionIndex is provided, we're showing a specific bedroom
    if (habitacionIndex !== undefined && habitacion) {
      // Check if there's a next bedroom to navigate to
      const hasNextHabitacion = habitacionIndex < dynamicCount - 1;
      
      return (
        <div ref={ref} className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {t.checklist.sections.habitaciones.bedroom} {habitacionIndex + 1}
            </h1>
          </div>

          {/* Fotos y video de la habitación */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistUploadZoneComponent
              title={t.checklist.sections.habitaciones.fotosVideoHabitacion.title}
              description={t.checklist.sections.habitaciones.fotosVideoHabitacion.description}
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
              question={(habitacion.questions || questions).find(q => q.id === "acabados") || { id: "acabados" }}
              questionId="acabados"
              label={t.checklist.sections.habitaciones.acabados.title}
              description={t.checklist.sections.habitaciones.acabados.description}
              onUpdate={(updates) => handleQuestionUpdate("acabados", updates)}
              elements={[
                { id: "paredes", label: t.checklist.sections.habitaciones.acabados.elements.paredes },
                { id: "techos", label: t.checklist.sections.habitaciones.acabados.elements.techos },
                { id: "suelo", label: t.checklist.sections.habitaciones.acabados.elements.suelo },
                { id: "rodapies", label: t.checklist.sections.habitaciones.acabados.elements.rodapies },
              ]}
            />
          </Card>

          {/* Carpintería */}
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground leading-tight">
                {t.checklist.sections.habitaciones.carpinteria.title}
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t.checklist.sections.habitaciones.carpinteria.description}
              </p>
            </div>

            {/* Quantity Steppers for Ventanas, Persianas, Armarios */}
            <div className="space-y-4">
              {CARPENTRY_ITEMS.map((itemConfig) => {
                // Always get the latest items from section.dynamicItems to ensure we have the most recent data
                const currentDynamicItems = section.dynamicItems || [];
                const currentHabitacion = currentDynamicItems[habitacionIndex] || habitacion;
                const currentCarpentryItems = currentHabitacion?.carpentryItems || carpentryItems;
                const item = currentCarpentryItems.find(i => i.id === itemConfig.id) || {
                  id: itemConfig.id,
                  cantidad: 0,
                };
                const cantidad = item.cantidad || 0;
                const needsValidation = cantidad > 0;
                const hasMultipleUnits = cantidad > 1;
                const units = (item as ChecklistCarpentryItem).units || [];
                
                if (itemConfig.id === "ventanas") {
                  console.log(`Rendering ${itemConfig.id}:`, {
                    cantidad,
                    item,
                    currentCarpentryItems,
                    currentHabitacion,
                    currentDynamicItemsLength: currentDynamicItems.length,
                    sectionDynamicItemsLength: section.dynamicItems?.length,
                  });
                }
                
                return (
                  <div key={`${item.id}-${cantidad}-${habitacionIndex}`} className="space-y-4">
                    {/* Quantity Stepper */}
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                        {t.checklist.sections.habitaciones.carpinteria.items[itemConfig.translationKey]}
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
                                    {t.checklist.sections.habitaciones.carpinteria.items[itemConfig.translationKey]} {index + 1}
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
                                          Elementos en mal estado:
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
                                                      : currentBadElements.filter((id: string) => id !== badElement.id);
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
                                        <Label className="text-xs sm:text-sm font-medium text-foreground">
                                          Notas:
                                        </Label>
                                        <Textarea
                                          value={unit.notes || ""}
                                          onChange={(e) => handleCarpentryNotesChange(item.id, index, e.target.value)}
                                          placeholder="Describe el estado del elemento..."
                                          className="min-h-[80px] text-xs sm:text-sm"
                                        />
                                      </div>

                                      {/* Photos */}
                                      <div className="space-y-2">
                                        <Label className="text-xs sm:text-sm font-medium text-foreground">
                                          Fotos:
                                        </Label>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          onChange={async (e) => {
                                            const files = Array.from(e.target.files || []);
                                            const newPhotos: FileUpload[] = await Promise.all(files.map(async (file) => {
                                              const reader = new FileReader();
                                              const data = await new Promise<string>((resolve) => {
                                                reader.onload = () => resolve(reader.result as string);
                                                reader.readAsDataURL(file);
                                              });
                                              return {
                                                id: `${Date.now()}-${Math.random()}`,
                                                name: file.name,
                                                size: file.size,
                                                type: file.type,
                                                data: data.split(',')[1], // Remove data:image/...;base64, prefix
                                                uploadedAt: new Date().toISOString(),
                                              };
                                            }));
                                            handleCarpentryPhotosChange(item.id, index, [...(unit.photos || []), ...newPhotos]);
                                          }}
                                          className="w-full text-xs sm:text-sm"
                                        />
                                        {unit.photos && unit.photos.length > 0 && (
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {unit.photos.map((photo: FileUpload) => (
                                              <div key={photo.id} className="relative">
                                                <img
                                                  src={`data:${photo.type};base64,${photo.data}`}
                                                  alt="Preview"
                                                  className="w-full h-20 object-cover rounded"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const updatedPhotos = unit.photos?.filter((p: FileUpload) => p.id !== photo.id) || [];
                                                    handleCarpentryPhotosChange(item.id, index, updatedPhotos);
                                                  }}
                                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
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
                                    <option.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap text-center text-muted-foreground">
                                      {option.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Details for single unit (if necesita reparación or necesita reemplazo) */}
                            {(() => {
                              const carpentryItem = item as ChecklistCarpentryItem;
                              return (carpentryItem.estado === "necesita_reparacion" || carpentryItem.estado === "necesita_reemplazo");
                            })() && (
                              <div className="space-y-4 pt-2">
                                {/* Bad Elements Checkboxes */}
                                <div className="space-y-2">
                                  <Label className="text-xs sm:text-sm font-medium text-foreground">
                                    Elementos en mal estado:
                                  </Label>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                      { id: "rotura", label: "Rotura" },
                                      { id: "desgaste", label: "Desgaste" },
                                      { id: "oxidacion", label: "Oxidación" },
                                      { id: "otros", label: "Otros" },
                                    ].map((badElement) => {
                                      const carpentryItem = item as ChecklistCarpentryItem;
                                      const isChecked = carpentryItem.badElements?.includes(badElement.id) || false;
                                      return (
                                        <label
                                          key={badElement.id}
                                          className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              const carpentryItem = item as ChecklistCarpentryItem;
                                              const currentBadElements = carpentryItem.badElements || [];
                                              const updatedBadElements = e.target.checked
                                                ? [...currentBadElements, badElement.id]
                                                : currentBadElements.filter((id: string) => id !== badElement.id);
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
                                  <Label className="text-xs sm:text-sm font-medium text-foreground">
                                    Notas:
                                  </Label>
                                  <Textarea
                                    value={(item as ChecklistCarpentryItem).notes || ""}
                                    onChange={(e) => handleCarpentryNotesChange(item.id, null, e.target.value)}
                                    placeholder="Describe el estado del elemento..."
                                    className="min-h-[80px] text-xs sm:text-sm"
                                  />
                                </div>

                                {/* Photos */}
                                <div className="space-y-2">
                                  <Label className="text-xs sm:text-sm font-medium text-foreground">
                                    Fotos:
                                  </Label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={async (e) => {
                                      const files = Array.from(e.target.files || []);
                                      const newPhotos: FileUpload[] = await Promise.all(files.map(async (file) => {
                                        const reader = new FileReader();
                                        const data = await new Promise<string>((resolve) => {
                                          reader.onload = () => resolve(reader.result as string);
                                          reader.readAsDataURL(file);
                                        });
                                        return {
                                          id: `${Date.now()}-${Math.random()}`,
                                          name: file.name,
                                          size: file.size,
                                          type: file.type,
                                          data: data.split(',')[1], // Remove data:image/...;base64, prefix
                                          uploadedAt: new Date().toISOString(),
                                        };
                                      }));
                                      handleCarpentryPhotosChange(item.id, null, [...((item as ChecklistCarpentryItem).photos || []), ...newPhotos]);
                                    }}
                                    className="w-full text-xs sm:text-sm"
                                  />
                                  {(() => {
                                    const carpentryItem = item as ChecklistCarpentryItem;
                                    return carpentryItem.photos && carpentryItem.photos.length > 0;
                                  })() && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      {((item as ChecklistCarpentryItem).photos || []).map((photo: FileUpload) => (
                                        <div key={photo.id} className="relative">
                                          <img
                                            src={`data:${photo.type};base64,${photo.data}`}
                                            alt="Preview"
                                            className="w-full h-20 object-cover rounded"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updatedPhotos = (item as ChecklistCarpentryItem).photos?.filter((p: FileUpload) => p.id !== photo.id) || [];
                                              handleCarpentryPhotosChange(item.id, null, updatedPhotos);
                                            }}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
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
                question={(habitacion.questions || questions).find(q => q.id === "puerta-entrada") || { id: "puerta-entrada" }}
                questionId="puerta-entrada"
                label={t.checklist.sections.habitaciones.carpinteria.puertaEntrada}
                description=""
                onUpdate={(updates) => handleQuestionUpdate("puerta-entrada", updates)}
                elements={[]}
              />
            </div>
          </Card>

          {/* Electricidad */}
          <Card className="p-4 sm:p-6 space-y-4">
            <ChecklistQuestionComponent
              question={(habitacion.questions || questions).find(q => q.id === "electricidad") || { id: "electricidad" }}
              questionId="electricidad"
              label={t.checklist.sections.habitaciones.electricidad.title}
              description={t.checklist.sections.habitaciones.electricidad.description}
              onUpdate={(updates) => handleQuestionUpdate("electricidad", updates)}
              elements={[
                { id: "luces", label: t.checklist.sections.habitaciones.electricidad.elements.luces },
                { id: "interruptores", label: t.checklist.sections.habitaciones.electricidad.elements.interruptores },
                { id: "tomas-corriente", label: t.checklist.sections.habitaciones.electricidad.elements.tomasCorriente },
                { id: "toma-television", label: t.checklist.sections.habitaciones.electricidad.elements.tomaTelevision },
              ]}
            />
          </Card>

          {/* Climatización */}
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground leading-tight">
                {t.checklist.sections.habitaciones.climatizacion.title}
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t.checklist.sections.habitaciones.climatizacion.description}
              </p>
            </div>

            <div className="space-y-4">
              {CLIMATIZATION_ITEMS.map((itemConfig) => {
                // Always get the latest items from section.dynamicItems to ensure we have the most recent data
                const currentDynamicItems = section.dynamicItems || [];
                const currentHabitacion = currentDynamicItems[habitacionIndex] || habitacion;
                const currentClimatizationItems = currentHabitacion?.climatizationItems || climatizationItems;
                const item = currentClimatizationItems.find(i => i.id === itemConfig.id) || {
                  id: itemConfig.id,
                  cantidad: 0,
                };
                const climatizationItem = item as ChecklistClimatizationItem;
                const cantidad = climatizationItem.cantidad || 0;
                const needsValidation = cantidad > 0;
                const hasMultipleUnits = cantidad > 1;
                const units = climatizationItem.units || [];

                return (
                  <div key={`${item.id}-${cantidad}-${habitacionIndex}-clim`} className="space-y-4">
                    {/* Quantity Stepper */}
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs sm:text-sm font-semibold text-foreground leading-tight break-words">
                        {t.checklist.sections.habitaciones.climatizacion.items[itemConfig.translationKey]}
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
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[var(--prophero-gray-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                          aria-label="Incrementar cantidad"
                        >
                          <Plus className="h-4 w-4 text-foreground" />
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
                                    {t.checklist.sections.habitaciones.climatizacion.items[itemConfig.translationKey]} {index + 1}
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
                                const isSelected = climatizationItem.estado === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleClimatizationStatusChange(climatizationItem.id, null, option.value)}
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

                            {/* Notes (required when status is "necesita_reparacion" or "necesita_reemplazo") */}
                            {(climatizationItem.estado === "necesita_reparacion" || climatizationItem.estado === "necesita_reemplazo") && (
                              <div className="space-y-4 pt-2">
                                {/* Notes */}
                                <div className="space-y-2">
                                  <Label className="text-xs sm:text-sm font-medium text-foreground leading-tight break-words">
                                    {t.checklist.notes} <span className="text-red-500">*</span>
                                  </Label>
                                  <Textarea
                                    value={climatizationItem.notes || ""}
                                    onChange={(e) => handleClimatizationNotesChange(climatizationItem.id, null, e.target.value)}
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
                                    uploadZone={{ id: `${climatizationItem.id}-photos`, photos: climatizationItem.photos || [], videos: [] }}
                                    onUpdate={(updates) => {
                                      handleClimatizationPhotosChange(climatizationItem.id, null, updates.photos);
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
                <Label className="text-sm font-semibold text-foreground leading-tight">
                  {t.checklist.sections.habitaciones.mobiliario.existeMobiliario}
                </Label>
                <Switch
                  checked={mobiliario.existeMobiliario || false}
                  onCheckedChange={handleMobiliarioToggle}
                />
              </div>

              {mobiliario.existeMobiliario && (
                <div className="space-y-4 pt-4 border-t">
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
          <div className="flex justify-between pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                if (onNavigateToHabitacion && habitacionIndex > 0) {
                  onNavigateToHabitacion(habitacionIndex - 1);
                } else {
                  window.history.back();
                }
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← {habitacionIndex > 0 ? `${t.checklist.sections.habitaciones.bedroom} ${habitacionIndex}` : t.common.back}
            </button>
            {hasNextHabitacion ? (
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToHabitacion) {
                    onNavigateToHabitacion(habitacionIndex + 1);
                  }
                }}
                className="px-4 py-2 bg-[var(--prophero-blue-500)] text-white rounded-lg hover:bg-[var(--prophero-blue-600)] transition-colors"
              >
                {t.common.continue} → {t.checklist.sections.habitaciones.bedroom} {habitacionIndex + 2}
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

    // Main section: Show counter and list of bedrooms (when dynamicCount > 1)
    return (
      <div ref={ref} className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">

        {/* Número de habitaciones */}
        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-semibold text-foreground leading-tight">
              {t.checklist.sections.habitaciones.numeroHabitaciones}
            </Label>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleCountChange(-1)}
                  disabled={(dynamicCount as number) === 0}
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
                disabled={dynamicCount >= 20}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)] hover:bg-[var(--prophero-blue-200)] dark:hover:bg-[var(--prophero-blue-800)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                aria-label="Incrementar cantidad"
              >
                <Plus className="h-4 w-4 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
              </button>
            </div>
          </div>
        </Card>

        {/* Lista de habitaciones */}
        {dynamicCount > 0 && (
          <Card className="p-4 sm:p-6 space-y-4">
            <Label className="text-sm font-semibold text-foreground leading-tight">
              {t.checklist.sections.habitaciones.habitaciones}
            </Label>
            <div className="space-y-3">
              {Array.from({ length: dynamicCount }, (_, index) => {
                const habitacionItem = dynamicItems[index] || {
                  id: `habitacion-${index + 1}`,
                  questions: [],
                  uploadZone: { id: "fotos-video", photos: [], videos: [] },
                };
                const progress = calculateHabitacionProgress(habitacionItem);
                const isComplete = progress.completed === progress.total;

                return (
                  <button
                    key={habitacionItem.id || index}
                    type="button"
                    onClick={() => {
                      if (onNavigateToHabitacion) {
                        onNavigateToHabitacion(index);
                      }
                    }}
                    className="w-full p-4 rounded-lg border-2 transition-colors text-left hover:border-[var(--prophero-blue-300)] dark:hover:border-[var(--prophero-blue-700)] bg-white dark:bg-[var(--prophero-gray-900)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">
                            {t.checklist.sections.habitaciones.bedroom} {index + 1}
                          </span>
                          {isComplete && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                              Completada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {progress.completed}/{progress.total} secciones completadas
                        </p>
                      </div>
                      <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
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

HabitacionesSection.displayName = "HabitacionesSection";
