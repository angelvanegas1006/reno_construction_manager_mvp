"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Trash2, Save, Send, Calendar, Clock, Edit2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDynamicCategories } from '@/hooks/useDynamicCategories';
import { SendUpdateDialog } from './send-update-dialog';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type SupabaseProperty = Database['public']['Tables']['properties']['Row'];

interface DynamicCategoriesProgressProps {
  property: SupabaseProperty;
}

// Format activities text to add line breaks for lists
function formatActivitiesText(text: string): string {
  if (!text) return '';
  
  // Pattern to detect list items: numbers followed by dot, dash, or parentheses
  // Examples: "2.1", "2.2", "-", "•", etc.
  let formatted = text;
  
  // Add line break before list items (numbered like "2.1", "2.2", etc.)
  // Match patterns like "2.1", "2.2", etc. that appear after text
  formatted = formatted.replace(/([^\n])(\n?)(\d+\.\d+\s)/g, (match, before, existingBreak, listItem) => {
    // If there's already a break, keep it; otherwise add one
    return existingBreak ? match : `${before}\n${listItem}`;
  });
  
  // Ensure double line breaks between major sections (e.g., "2.1" followed by "2.2")
  formatted = formatted.replace(/(\d+\.\d+[^\n]*)\n(\d+\.\d+)/g, '$1\n\n$2');
  
  return formatted;
}

export function DynamicCategoriesProgress({ property }: DynamicCategoriesProgressProps) {
  const { categories, loading, saveAllProgress, deleteCategory, refetch } = useDynamicCategories(property.id);
  const [localPercentages, setLocalPercentages] = useState<Record<string, number>>({});
  const [savedPercentages, setSavedPercentages] = useState<Record<string, number>>({}); // Valores guardados (mínimos permitidos)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sendUpdateOpen, setSendUpdateOpen] = useState(false);
  const [editingInput, setEditingInput] = useState<Record<string, boolean>>({}); // Control de inputs manuales
  const [isExtracting, setIsExtracting] = useState(false);
  const supabase = createClient();
  const justSavedRef = useRef<Record<string, number> | null>(null); // Track values we just saved

  // Show extract button only if: budget_pdf_url exists AND no categories created
  const showExtractButton = property.budget_pdf_url && categories.length === 0;

  // Initialize local and saved percentages from categories
  useEffect(() => {
    // If we just saved, preserve those values and clear the ref
    if (justSavedRef.current) {
      const savedValues = justSavedRef.current;
      setLocalPercentages(prev => {
        const updated = { ...prev };
        Object.entries(savedValues).forEach(([catId, value]) => {
          updated[catId] = value;
        });
        return updated;
      });
      justSavedRef.current = null;
    }
    
    // Only sync when categories change (new categories added/removed or initial load)
    // Don't reset localPercentages if they already exist (preserves unsaved changes)
    setLocalPercentages(prev => {
      const updated = { ...prev };
      let hasChanges = false;
      
      // Add missing categories
      categories.forEach(cat => {
        if (updated[cat.id] === undefined) {
          updated[cat.id] = cat.percentage ?? 0;
          hasChanges = true;
        }
      });
      
      // Remove categories that no longer exist
      const currentCategoryIds = new Set(categories.map(cat => cat.id));
      Object.keys(updated).forEach(catId => {
        if (!currentCategoryIds.has(catId)) {
          delete updated[catId];
          hasChanges = true;
        }
      });
      
      return hasChanges ? updated : prev;
    });
    
    // Always update savedPercentages to reflect current database state
    setSavedPercentages(prev => {
      const updated: Record<string, number> = {};
      categories.forEach(cat => {
        updated[cat.id] = cat.percentage ?? 0;
      });
      // Only update if there are actual changes
      const hasChanges = categories.length !== Object.keys(prev).length ||
        categories.some(cat => (prev[cat.id] ?? 0) !== (cat.percentage ?? 0));
      return hasChanges ? updated : prev;
    });
  }, [categories]);

  // Calculate global progress (average of all categories)
  const globalProgress = useMemo(() => {
    if (categories.length === 0) return 0;
    const total = categories.reduce((sum, cat) => {
      const percentage = localPercentages[cat.id] ?? cat.percentage ?? 0;
      return sum + percentage;
    }, 0);
    return Math.round(total / categories.length);
  }, [categories, localPercentages]);

  // Get minimum allowed value for a category (last saved value or 0)
  const getMinAllowedValue = useCallback((categoryId: string): number => {
    const savedValue = savedPercentages[categoryId] ?? 0;
    return Math.max(savedValue, 0);
  }, [savedPercentages]);

  // Handle slider change with NO RETROCESO logic
  const handleSliderChange = useCallback((categoryId: string, value: number) => {
    const minAllowedValue = getMinAllowedValue(categoryId);
    // Ajustar el valor si intenta bajar del mínimo permitido
    const adjustedValue = Math.max(value, minAllowedValue);
    
    // Solo actualizar si el valor es válido
    if (adjustedValue >= minAllowedValue && adjustedValue <= 100) {
      setLocalPercentages(prev => ({
        ...prev,
        [categoryId]: adjustedValue,
      }));
      
      // Verificar si hay cambios sin guardar
      const savedValue = savedPercentages[categoryId] ?? 0;
      if (adjustedValue !== savedValue) {
        setHasUnsavedChanges(true);
      }
    }
  }, [getMinAllowedValue, savedPercentages]);

  // Handle manual input change
  const handleInputChange = useCallback((categoryId: string, inputValue: string) => {
    const minAllowedValue = getMinAllowedValue(categoryId);
    const numValue = parseInt(inputValue, 10);
    
    // Validar: entre minAllowedValue y 100
    if (!isNaN(numValue)) {
      const clampedValue = Math.min(Math.max(numValue, minAllowedValue), 100);
      setLocalPercentages(prev => ({
        ...prev,
        [categoryId]: clampedValue,
      }));
      
      // Verificar si hay cambios sin guardar
      const savedValue = savedPercentages[categoryId] ?? 0;
      if (clampedValue !== savedValue) {
        setHasUnsavedChanges(true);
      }
    }
  }, [getMinAllowedValue, savedPercentages]);

  const handleSave = useCallback(async () => {
    // Solo guardar cambios reales (valores diferentes a los guardados)
    const changesToSave: Record<string, number> = {};
    categories.forEach(cat => {
      const currentValue = localPercentages[cat.id];
      const savedValue = savedPercentages[cat.id] ?? 0;
      if (currentValue !== undefined && currentValue !== savedValue) {
        changesToSave[cat.id] = currentValue;
      }
    });

    // Si no hay cambios, no hacer nada
    if (Object.keys(changesToSave).length === 0) {
      toast.info('No hay cambios para guardar');
      return;
    }

    const success = await saveAllProgress(property.id, changesToSave);
    if (success) {
      // Guardar los valores que acabamos de guardar en el ref
      // para que el useEffect no los resetee cuando categories se actualice
      justSavedRef.current = { ...changesToSave };
      
      // Actualizar los valores guardados (nuevos mínimos permitidos)
      setSavedPercentages(prev => {
        const updated = { ...prev };
        Object.entries(changesToSave).forEach(([catId, value]) => {
          updated[catId] = value;
        });
        return updated;
      });
      // IMPORTANTE: Actualizar localPercentages con los valores guardados
      // para que el slider se posicione correctamente después de guardar
      setLocalPercentages(prev => {
        const updated = { ...prev };
        Object.entries(changesToSave).forEach(([catId, value]) => {
          updated[catId] = value;
        });
        return updated;
      });
      setHasUnsavedChanges(false);
      setEditingInput({}); // Cerrar todos los inputs
    }
  }, [property.id, localPercentages, savedPercentages, categories, saveAllProgress]);

  const handleDelete = useCallback(async (categoryId: string) => {
    const confirmed = window.confirm('¿Estás seguro de que quieres eliminar esta categoría?');
    if (confirmed) {
      await deleteCategory(categoryId);
      // Remove from local state
      setLocalPercentages(prev => {
        const updated = { ...prev };
        delete updated[categoryId];
        return updated;
      });
    }
  }, [deleteCategory]);

  // Handle PDF extraction
  const handleExtractPdfInfo = useCallback(async () => {
    // Validación: verificar que existe budget_pdf_url
    if (!property?.budget_pdf_url) {
      toast.error("No hay URL de presupuesto disponible");
      return;
    }

    setIsExtracting(true);

    try {
      // Invocar el Edge Function extract-pdf-info
      const { data, error } = await supabase.functions.invoke('extract-pdf-info', {
        body: {
          budget_pdf_url: property.budget_pdf_url,
          property_id: property.id,
          unique_id: property["Unique ID From Engagements"],
          property_name: property.name,
          address: property.address,
          client_name: property["Client Name"],
          client_email: property["Client Email"],
          renovation_type: property.renovation_type,
          area_cluster: property.area_cluster,
        },
      });

      if (error) {
        throw error;
      }

      toast.success("Extracción de información PDF iniciada correctamente", {
        description: "El proceso de extracción se está ejecutando. Las categorías aparecerán cuando se complete el procesamiento.",
      });
    } catch (err) {
      console.error('Error al extraer información del PDF:', err);
      toast.error("Error al iniciar la extracción", {
        description: err instanceof Error ? err.message : "Ha ocurrido un error inesperado.",
      });
    } finally {
      setIsExtracting(false);
    }
  }, [property, supabase.functions]);

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'No definida';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  if (loading) {
    return (
      <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
        <p className="text-muted-foreground">Cargando categorías...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Progreso de Obras</h2>
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Cambios sin guardar
            </span>
          )}
        </div>

        {/* Información General - Fechas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Fecha de inicio</p>
              <p className="text-sm font-medium">{formatDate(property.start_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Fecha estimada de finalización</p>
              <p className="text-sm font-medium">{formatDate(property.estimated_end_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Última actualización</p>
              <p className="text-sm font-medium">{formatDate(property.last_update)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Próxima actualización</p>
              <p className="text-sm font-medium">{formatDate(property.next_update)}</p>
            </div>
          </div>
        </div>

        {/* Progreso Global */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Progreso General</Label>
            <span className="text-lg font-bold">{globalProgress}%</span>
          </div>
          <Progress value={globalProgress} className="h-3" />
        </div>

        {/* Lista de Categorías */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Categorías</Label>
          {categories.length === 0 ? (
            <div className="space-y-3">
              {showExtractButton ? (
                <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No hay categorías definidas. Puedes extraer las categorías automáticamente desde el PDF del presupuesto.
                  </p>
                  <Button
                    onClick={handleExtractPdfInfo}
                    disabled={isExtracting}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExtracting ? "Extrayendo..." : "Extraer Información PDF"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay categorías definidas</p>
              )}
            </div>
          ) : (
            categories.map((category) => {
              const percentage = localPercentages[category.id] ?? category.percentage ?? 0;
              const savedValue = savedPercentages[category.id] ?? category.percentage ?? 0;
              const minAllowedValue = getMinAllowedValue(category.id);
              const hasChanged = percentage !== savedValue;
              const isEditingInput = editingInput[category.id] || false;

              return (
                <div
                  key={category.id}
                  className="p-4 border rounded-lg space-y-3 bg-background"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{category.category_name}</h3>
                        {hasChanged && (
                          <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700">
                            Sin guardar
                          </Badge>
                        )}
                      </div>
                      {category.activities_text && (
                        <div className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                          {formatActivitiesText(category.activities_text)}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Progreso</Label>
                      <div className="flex items-center gap-2">
                        {isEditingInput ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={minAllowedValue}
                              max={100}
                              value={percentage}
                              onChange={(e) => handleInputChange(category.id, e.target.value)}
                              onBlur={() => setEditingInput(prev => ({ ...prev, [category.id]: false }))}
                              className="w-16 h-7 text-sm text-center"
                              autoFocus
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingInput(prev => ({ ...prev, [category.id]: false }))}
                            >
                              ✓
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-semibold">{percentage}%</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingInput(prev => ({ ...prev, [category.id]: true }))}
                              title="Editar manualmente"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Slider with blue background and visible thumb */}
                    <div className="relative h-3">
                      {/* Background track (full width, blue) */}
                      <div className="absolute inset-0 h-3 rounded-lg bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)]" />
                      {/* Progress fill (blue primary) */}
                      <div 
                        className="absolute inset-y-0 left-0 rounded-l-lg bg-primary"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                      {/* Slider input on top - transparent track, only thumb visible */}
                      {/* IMPORTANTE: Usar min={0} siempre para que el thumb se posicione correctamente en el porcentaje absoluto */}
                      {/* La lógica de "no retroceso" se maneja en handleSliderChange */}
                      <input
                        key={`slider-${category.id}-${percentage}`}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={Math.max(0, Math.min(100, percentage))}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value, 10);
                          handleSliderChange(category.id, newValue);
                        }}
                        className="absolute inset-0 w-full h-3 rounded-lg appearance-none cursor-pointer slider-blue z-10"
                        title={`Mínimo permitido: ${minAllowedValue}%`}
                      />
                    </div>
                    {minAllowedValue > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Mínimo permitido: {minAllowedValue}% (último valor guardado)
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || loading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Guardar Progreso
          </Button>
          <Button
            variant="outline"
            onClick={() => setSendUpdateOpen(true)}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Enviar Update a Cliente
          </Button>
        </div>
      </div>

      <SendUpdateDialog
        open={sendUpdateOpen}
        onOpenChange={setSendUpdateOpen}
        property={property}
        categories={categories.map(cat => ({
          id: cat.id,
          name: cat.category_name,
          percentage: localPercentages[cat.id] ?? cat.percentage ?? 0,
        }))}
      />
    </>
  );
}

