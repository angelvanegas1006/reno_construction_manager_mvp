"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Trash2, Calendar, Clock, Edit2, Download, ChevronDown, ChevronUp, Wrench, Image as ImageIcon, Video as VideoIcon, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { DateTimePicker } from '@/components/property/datetime-picker';
import { Textarea } from '@/components/ui/textarea';
import { useDynamicCategories } from '@/hooks/useDynamicCategories';
import { useCategoryUpdates } from '@/hooks/useCategoryUpdates';
import { SendUpdateImageSelector } from './send-update-image-selector';
import { SendUpdateEmailPreview } from './send-update-email-preview';
import { CategoryPhotoUpload } from './category-photo-upload';
import { PartidaItem } from './partida-item';
import { ChecklistUploadZone as ChecklistUploadZoneType, FileUpload } from '@/lib/checklist-storage';
import { uploadFilesToStorage } from '@/lib/supabase/storage-upload';
import { parseActivitiesText } from '@/lib/parsers/parse-activities-text';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';
import { callN8nCategoriesWebhook, prepareWebhookPayload } from '@/lib/n8n/webhook-caller';
import { calculateNextUpdateDate } from '@/lib/reno/update-calculator';
import { RenoInProgressPhotoUpload } from './reno-in-progress-photo-upload';
import { updatePropertyPhaseConsistent } from '@/lib/supabase/phase-update-helper';
import { syncPhaseToAirtable } from '@/lib/airtable/phase-sync';
import { useI18n } from '@/lib/i18n';

type SupabaseProperty = Database['public']['Tables']['properties']['Row'];

interface DynamicCategoriesProgressProps {
  property: SupabaseProperty;
  onSaveRef?: (saveFn: () => Promise<void>) => void;
  onSendRef?: (sendFn: () => void) => void;
  onHasUnsavedChangesChange?: (hasChanges: boolean) => void;
  onCanFinalizeChange?: (can: boolean) => void;
  onFinalizeRef?: (openModal: () => void) => void;
  onPhaseChanged?: () => void;
}

// Componente para mostrar los updates de una categoría
function CategoryUpdatesList({ categoryId }: { categoryId: string }) {
  const { updates, loading } = useCategoryUpdates(categoryId);

  if (loading || updates.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t space-y-3">
      <Label className="text-sm font-semibold">Updates recientes</Label>
      {updates.slice(0, 3).map((update) => (
        <div key={update.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>{new Date(update.created_at).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
            <span className="font-medium">
              {update.previous_percentage}% → {update.new_percentage}%
            </span>
          </div>
          
          {update.notes && (
            <p className="text-sm text-muted-foreground">{update.notes}</p>
          )}
          
          {/* Mostrar fotos */}
          {update.photos && update.photos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {update.photos.map((photoUrl, index) => (
                <a
                  key={index}
                  href={photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group"
                >
                  <div className="w-16 h-16 rounded border overflow-hidden bg-muted">
                    <img
                      src={photoUrl}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          )}
          
          {/* Mostrar videos */}
          {update.videos && update.videos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {update.videos.map((videoUrl, index) => (
                <a
                  key={index}
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative group"
                >
                  <div className="w-16 h-16 rounded border overflow-hidden bg-muted flex items-center justify-center">
                    <VideoIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded flex items-center justify-center">
                    <VideoIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Format activities text to add line breaks for lists
/**
 * Formatea el texto de actividades dividiendo solo por números de actividad (ej: "8.1", "8.2")
 * El resto del texto se mantiene junto sin saltos de línea innecesarios
 */
function formatActivitiesText(text: string): string {
  if (!text) return '';
  
  // Primero, eliminar todos los saltos de línea existentes y normalizar espacios
  let formatted = text
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Dividir solo por patrones de números de actividad seguidos de guión
  // Patrón: número.número seguido de espacios opcionales y guión (— o -)
  // Ejemplos: "8.1 —", "8.2 —", "1.1 — UD"
  // Buscar el patrón que aparece después de un espacio o al inicio del texto
  formatted = formatted.replace(/(^|\s)(\d+\.\d+\s*[—\-])/g, '\n$2');
  
  // Limpiar y formatear cada línea
  const lines = formatted
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  return lines.join('\n');
}

/**
 * Extrae el número de orden de una categoría desde su nombre
 * Ejemplos: "8.1 — UD — SUSTITUCIÓN..." -> 8.1, "1. Fontanería" -> 1
 * Retorna un número para ordenar (ej: 8.1 -> 8.1, 1 -> 1)
 */
function extractCategoryOrderNumber(categoryName: string): number {
  if (!categoryName) return 9999; // Sin número, va al final
  
  // Buscar patrón: número al inicio, opcionalmente seguido de punto y otro número
  const match = categoryName.match(/^(\d+)(?:\.(\d+))?/);
  if (match) {
    const major = parseInt(match[1], 10);
    const minor = match[2] ? parseInt(match[2], 10) : 0;
    return major + (minor / 100); // Ej: 8.1 -> 8.01, 8.2 -> 8.02
  }
  
  return 9999; // Sin número, va al final
}

export function DynamicCategoriesProgress({ property, onSaveRef, onSendRef, onHasUnsavedChangesChange, onCanFinalizeChange, onFinalizeRef, onPhaseChanged }: DynamicCategoriesProgressProps) {
  const { t } = useI18n();
  const { categories, loading, saveAllProgress, deleteCategory, refetch } = useDynamicCategories(property.id);
  const supabase = createClient();
  const [localPercentages, setLocalPercentages] = useState<Record<string, number>>({});
  const [savedPercentages, setSavedPercentages] = useState<Record<string, number>>({}); // Valores guardados (mínimos permitidos)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sendUpdateImageSelectorOpen, setSendUpdateImageSelectorOpen] = useState(false);
  const [sendUpdateEmailPreviewOpen, setSendUpdateEmailPreviewOpen] = useState(false);
  const [selectedImagesForEmail, setSelectedImagesForEmail] = useState<Record<string, string[]>>({});
  const [editingInput, setEditingInput] = useState<Record<string, boolean>>({}); // Control de inputs manuales
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({}); // Control de acordeones
  // Estado para rastrear qué PDFs necesitan extracción de actividades (corner cases)
  const [pdfsNeedingExtraction, setPdfsNeedingExtraction] = useState<Set<number>>(new Set());
  const [extractingPdfs, setExtractingPdfs] = useState<Set<number>>(new Set()); // PDFs que se están procesando actualmente
  const [isScheduleVisitOpen, setIsScheduleVisitOpen] = useState(false);
  const [visitDate, setVisitDate] = useState<string | undefined>(undefined);
  const [visitNotes, setVisitNotes] = useState("");
  const [isSchedulingVisit, setIsSchedulingVisit] = useState(false);
  const justSavedRef = useRef<Record<string, number> | null>(null); // Track values we just saved
  
  // Estado para fotos/videos/notas de cada categoría (mientras se edita)
  // Almacena los FileUpload del ChecklistUploadZone para poder subirlos después
  const [categoryUpdateData, setCategoryUpdateData] = useState<Record<string, {
    uploadZone?: ChecklistUploadZoneType;
    notes: string;
  }>>({});
  
  // Estado para controlar qué categoría está mostrando el modal de fotos
  const [photoDialogOpen, setPhotoDialogOpen] = useState<Record<string, boolean>>({});

  // Dar obra por finalizada: modal, checkboxes por grupo y por partida (dentro de cada categoría)
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizeCheckboxes, setFinalizeCheckboxes] = useState<Record<string, boolean>>({});
  const [finalizeItemCheckboxes, setFinalizeItemCheckboxes] = useState<Record<string, boolean>>({});
  const [finalizeComments, setFinalizeComments] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Verificar si hay categorías sin actividades
  const hasCategoriesWithoutActivities = categories.length > 0 && categories.every(cat => !cat.activities_text || cat.activities_text.trim().length === 0);
  
  // Verificar si hay múltiples PDFs (corner case)
  const budgetUrls = property.budget_pdf_url
    ? property.budget_pdf_url.split(',').map(url => url.trim()).filter(url => url.length > 0 && url.startsWith('http'))
    : [];
  const hasMultiplePdfs = budgetUrls.length >= 2;
  
  // Corner case: múltiples PDFs (2+) Y categorías sin actividades
  const isCornerCase = hasMultiplePdfs && hasCategoriesWithoutActivities && categories.length > 0;
  
  // Show extract button SOLO cuando NO hay categorías (caso inicial)
  // NO mostrar si ya hay categorías (incluso sin actividades) - eso se maneja con los botones por PDF
  const showExtractButton = property.budget_pdf_url && categories.length === 0;
  
  // Debug logs
  useEffect(() => {
    console.log('[DynamicCategoriesProgress] Debug:', {
      hasBudgetPdfUrl: !!property.budget_pdf_url,
      categoriesCount: categories.length,
      hasCategoriesWithoutActivities,
      hasMultiplePdfs,
      isCornerCase,
      pdfsNeedingExtraction: Array.from(pdfsNeedingExtraction),
      showExtractButton,
      loading,
      categories: categories.map(c => ({ id: c.id, name: c.category_name, hasActivities: !!c.activities_text && c.activities_text.trim().length > 0, budgetIndex: c.budget_index }))
    });
  }, [property.budget_pdf_url, categories.length, hasCategoriesWithoutActivities, hasMultiplePdfs, isCornerCase, pdfsNeedingExtraction, showExtractButton, loading, categories]);

  // Detectar corner cases: SOLO cuando hay múltiples PDFs (2+) Y categorías sin actividades
  useEffect(() => {
    // Solo verificar si es un corner case real: múltiples PDFs Y categorías sin actividades
    if (!property.budget_pdf_url || categories.length === 0 || loading || !hasMultiplePdfs || !hasCategoriesWithoutActivities) {
      setPdfsNeedingExtraction(new Set());
      return;
    }

    // Verificar inmediatamente si hay categorías sin actividades (no esperar 90 segundos)
    // Agrupar categorías por budget_index y verificar cuáles no tienen actividades
    const pdfsNeedingExtractionSet = new Set<number>();
    
    // Obtener todos los budget_index únicos
    const budgetIndexes = new Set(
      categories.map(cat => cat.budget_index || 1)
    );

    budgetIndexes.forEach(budgetIndex => {
      // Obtener categorías para este budget_index
      const categoriesForBudget = categories.filter(
        cat => (cat.budget_index || 1) === budgetIndex
      );

      // Verificar si todas las categorías de este budget_index no tienen actividades
      const allWithoutActivities = categoriesForBudget.every(
        cat => !cat.activities_text || cat.activities_text.trim().length === 0
      );

      if (allWithoutActivities && categoriesForBudget.length > 0) {
        pdfsNeedingExtractionSet.add(budgetIndex);
        console.log(`[DynamicCategoriesProgress] Corner case detected: budget_index ${budgetIndex} has ${categoriesForBudget.length} categories without activities`);
      }
    });

    setPdfsNeedingExtraction(pdfsNeedingExtractionSet);
    
    if (pdfsNeedingExtractionSet.size > 0) {
      console.log(`[DynamicCategoriesProgress] Found ${pdfsNeedingExtractionSet.size} PDF(s) needing activity extraction (corner case: multiple PDFs without activities)`);
    }
  }, [property.budget_pdf_url, categories, loading, hasMultiplePdfs, hasCategoriesWithoutActivities]);

  // Función para extraer actividades de un PDF específico (corner case)
  const handleExtractActivitiesForPdf = useCallback(async (budgetIndex: number) => {
    if (extractingPdfs.has(budgetIndex)) {
      return; // Ya se está procesando
    }

    setExtractingPdfs(prev => new Set(prev).add(budgetIndex));
    
    try {
      console.log(`[Extract Activities] Starting extraction for budgetIndex ${budgetIndex}`);
      console.log(`[Extract Activities] Property ID: ${property.id}`);
      toast.info(`Extrayendo actividades del Presupuesto ${budgetIndex}...`);

      const response = await fetch('/api/extract-pdf-activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: property.id,
          budgetIndex,
        }),
      });

      console.log(`[Extract Activities] Response status: ${response.status} ${response.statusText}`);

      // Leer el texto de la respuesta primero para debugging
      const responseText = await response.text();
      console.log(`[Extract Activities] Response text:`, responseText.substring(0, 500));

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[Extract Activities] Failed to parse JSON response:`, parseError);
        throw new Error(`Error en la respuesta del servidor: ${responseText.substring(0, 200)}`);
      }

      console.log(`[Extract Activities] Parsed result:`, result);

      if (!response.ok) {
        const errorMessage = result.error || result.message || `Error ${response.status}: ${response.statusText}`;
        console.error(`[Extract Activities] API error:`, errorMessage);
        throw new Error(errorMessage);
      }

      if (result.success) {
        if (result.totalUpdated > 0) {
          toast.success(`Actividades extraídas del Presupuesto ${budgetIndex}`, {
            description: `Se actualizaron ${result.totalUpdated} categoría(s)`,
          });
          
          // Remover este PDF del conjunto de PDFs que necesitan extracción
          setPdfsNeedingExtraction(prev => {
            const newSet = new Set(prev);
            newSet.delete(budgetIndex);
            return newSet;
          });

          // Refrescar categorías
          await refetch();
        } else {
          // Mostrar detalles de los errores si los hay
          const errorDetails = result.results?.[0]?.errors || [];
          
          if (errorDetails.length === 0) {
            // No hay errores pero tampoco se actualizó nada - probablemente no hay categorías en ese PDF
            console.log(`[Extract Activities] No activities updated for Presupuesto ${budgetIndex}, but no errors. Categories may not exist in this PDF.`);
            toast.info(`Presupuesto ${budgetIndex} procesado`, {
              description: 'No se encontraron categorías en este PDF para extraer actividades',
              duration: 5000,
            });
          } else {
            const errorMessage = errorDetails.slice(0, 3).join('; ') + (errorDetails.length > 3 ? '...' : '');
            console.warn(`[Extract Activities] No activities updated. Errors:`, errorDetails);
            toast.warning(`No se encontraron actividades en el Presupuesto ${budgetIndex}`, {
              description: errorMessage,
              duration: 8000,
            });
          }
        }
      } else {
        throw new Error(result.error || 'La extracción no fue exitosa');
      }
    } catch (err) {
      console.error(`[Extract Activities] Error for budgetIndex ${budgetIndex}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error(`[Extract Activities] Full error:`, err);
      toast.error(`Error al extraer actividades del Presupuesto ${budgetIndex}`, {
        description: errorMessage,
        duration: 10000,
      });
    } finally {
      setExtractingPdfs(prev => {
        const newSet = new Set(prev);
        newSet.delete(budgetIndex);
        return newSet;
      });
    }
  }, [property.id, extractingPdfs, refetch]);

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

  // Agrupar categorías por nombre y ordenar
  // IMPORTANTE: Solo mostrar categorías que tienen actividades_text (que realmente existen en algún PDF)
  const groupedCategories = useMemo(() => {
    // Filtrar categorías que tienen actividades_text
    const categoriesWithActivities = categories.filter(
      cat => cat.activities_text && cat.activities_text.trim().length > 0
    );
    
    // Agrupar por nombre de categoría
    const grouped = new Map<string, typeof categories>();
    
    categoriesWithActivities.forEach(cat => {
      const key = cat.category_name;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(cat);
    });

    // Convertir a array y ordenar por número de orden
    const groupedArray = Array.from(grouped.entries()).map(([categoryName, cats]) => ({
      categoryName,
      categories: cats.sort((a, b) => {
        // Ordenar por budget_index primero, luego por created_at
        const budgetDiff = (a.budget_index || 1) - (b.budget_index || 1);
        if (budgetDiff !== 0) return budgetDiff;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }),
      orderNumber: extractCategoryOrderNumber(categoryName),
    }));

    return groupedArray.sort((a, b) => a.orderNumber - b.orderNumber);
  }, [categories]);

  // Sort categories by their order number (extracted from category_name) - mantener para compatibilidad
  // IMPORTANTE: Solo incluir categorías que tienen actividades_text
  const sortedCategories = useMemo(() => {
    return [...categories]
      .filter(cat => cat.activities_text && cat.activities_text.trim().length > 0)
      .sort((a, b) => {
        const orderA = extractCategoryOrderNumber(a.category_name);
        const orderB = extractCategoryOrderNumber(b.category_name);
        return orderA - orderB;
      });
  }, [categories]);

  // Calculate global progress (average of all categories)
  const globalProgress = useMemo(() => {
    if (sortedCategories.length === 0) return 0;
    const total = sortedCategories.reduce((sum, cat) => {
      const percentage = localPercentages[cat.id] ?? cat.percentage ?? 0;
      return sum + percentage;
    }, 0);
    return Math.round(total / sortedCategories.length);
  }, [sortedCategories, localPercentages]);

  // Todas las categorías al 100% para mostrar "Dar obra por finalizada"
  const allCategoriesAt100 = useMemo(() => {
    if (categories.length === 0) return false;
    return categories.every(
      (cat) => (localPercentages[cat.id] ?? cat.percentage ?? 0) >= 100
    );
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
    const updatesToSave: Record<string, {
      photos: string[];
      videos: string[];
      notes?: string;
    }> = {};

    // Primero, subir archivos base64 a Supabase Storage para cada categoría
    for (const cat of categories) {
      const currentValue = localPercentages[cat.id];
      const savedValue = savedPercentages[cat.id] ?? 0;
      if (currentValue !== undefined && currentValue !== savedValue) {
        changesToSave[cat.id] = currentValue;
        
        // Incluir fotos/videos/notas si existen para esta categoría
        const updateData = categoryUpdateData[cat.id];
        if (updateData && updateData.uploadZone) {
          const uploadZone = updateData.uploadZone;
          
          // Recopilar archivos que necesitan ser subidos (base64)
          const filesToUpload: FileUpload[] = [
            ...uploadZone.photos.filter(p => p.data && !p.data.startsWith('http')),
            ...uploadZone.videos.filter(v => v.data && !v.data.startsWith('http')),
          ];

          let uploadedUrls: string[] = [];
          
              // Subir archivos base64 a Supabase Storage
          if (filesToUpload.length > 0) {
            try {
              // Usar uploadFilesToStorage pero necesitamos adaptarlo para category-updates bucket
              // Por ahora, subir manualmente cada archivo
              const supabase = createClient();
              
              const uploadPromises = filesToUpload.map(async (file) => {
                // Si ya tiene URL, retornarla
                if (file.data && file.data.startsWith('http')) {
                  return file.data;
                }

                // Convertir base64 a File
                const base64Data = file.data.includes(',') ? file.data.split(',')[1] : file.data;
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: file.type });
                const fileObj = new File([blob], file.name, { type: file.type });

                // Generar nombre único
                const timestamp = Date.now();
                const randomString = Math.random().toString(36).substring(2, 8);
                const fileExtension = file.name.split('.').pop() || (file.type.startsWith('image/') ? 'jpg' : 'mp4');
                const fileName = `${timestamp}_${randomString}.${fileExtension}`;
                const path = `${property.id}/${cat.id}/${fileName}`;

                // Subir a Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('category-updates')
                  .upload(path, fileObj, {
                    contentType: file.type,
                    upsert: false,
                  });

                if (uploadError) {
                  console.error(`Error uploading file ${file.name}:`, uploadError);
                  const errorMessage = uploadError.message || String(uploadError);
                  
                  // Detectar diferentes tipos de errores
                  const isBucketNotFound = 
                    errorMessage.includes('Bucket not found') || 
                    errorMessage.includes('bucket') ||
                    errorMessage.toLowerCase().includes('not found') ||
                    errorMessage.includes('does not exist') ||
                    errorMessage.includes('404') ||
                    (uploadError as any)?.statusCode === 404;
                  
                  const isRLSError = 
                    errorMessage.includes('row-level security') || 
                    errorMessage.includes('RLS') || 
                    errorMessage.includes('policy') ||
                    errorMessage.includes('violates row-level security');
                  
                  if (isBucketNotFound) {
                    toast.error(
                      `Bucket 'category-updates' no encontrado. Por favor créalo en Supabase Dashboard → Storage → New bucket → Nombre: "category-updates" → Público`,
                      { duration: 10000 }
                    );
                  } else if (isRLSError) {
                    toast.error(
                      `Error de Row Level Security. Por favor ejecuta las políticas SQL en Supabase Dashboard → SQL Editor. Ver EJECUTAR_POLITICAS_CATEGORY_UPDATES.md`,
                      { duration: 10000 }
                    );
                  } else {
                    toast.error(`Error al subir ${file.name}: ${errorMessage}`);
                  }
                  return null;
                }

                // Obtener URL pública
                const { data: { publicUrl } } = supabase.storage
                  .from('category-updates')
                  .getPublicUrl(path);

                return publicUrl;
              });

              uploadedUrls = (await Promise.all(uploadPromises)).filter((url): url is string => url !== null);
              
              if (uploadedUrls.length === 0 && filesToUpload.length > 0) {
                toast.error('No se pudieron subir las fotos. Verifica que el bucket "category-updates" existe y es público.');
              } else if (uploadedUrls.length < filesToUpload.length) {
                toast.warning(`Solo se subieron ${uploadedUrls.length} de ${filesToUpload.length} archivos`);
              }
            } catch (error) {
              console.error('Error uploading files:', error);
              const errorMessage = error instanceof Error ? error.message : String(error);
              // Solo mostrar error si no es sobre el bucket (ya se mostró arriba)
              if (!errorMessage.includes('Bucket') && !errorMessage.includes('bucket')) {
                toast.error(`Error al subir algunos archivos: ${errorMessage}`);
              }
            }
          }

          // Combinar URLs ya subidas con las nuevas
          const existingPhotos = uploadZone.photos
            .filter(p => p.data && p.data.startsWith('http'))
            .map(p => p.data);
          const existingVideos = uploadZone.videos
            .filter(v => v.data && v.data.startsWith('http'))
            .map(v => v.data);

          // Separar nuevas URLs por tipo (foto vs video)
          const newPhotos: string[] = [];
          const newVideos: string[] = [];
          let urlIndex = 0;
          
          uploadZone.photos.forEach(p => {
            if (p.data && !p.data.startsWith('http') && urlIndex < uploadedUrls.length) {
              newPhotos.push(uploadedUrls[urlIndex]);
              urlIndex++;
            }
          });
          
          uploadZone.videos.forEach(v => {
            if (v.data && !v.data.startsWith('http') && urlIndex < uploadedUrls.length) {
              newVideos.push(uploadedUrls[urlIndex]);
              urlIndex++;
            }
          });

          updatesToSave[cat.id] = {
            photos: [...existingPhotos, ...newPhotos],
            videos: [...existingVideos, ...newVideos],
            notes: updateData.notes.trim() || undefined,
          };
        } else if (updateData && updateData.notes.trim()) {
          // Solo notas, sin archivos
          updatesToSave[cat.id] = {
            photos: [],
            videos: [],
            notes: updateData.notes.trim() || undefined,
          };
        }
      }
    }

    // Si no hay cambios, no hacer nada
    if (Object.keys(changesToSave).length === 0) {
      toast.info('No hay cambios para guardar');
      return;
    }

    // Guardar todo junto
    const success = await saveAllProgress(property.id, changesToSave, updatesToSave);
    
    if (success) {
      // Guardar los valores que acabamos de guardar en el ref
      justSavedRef.current = { ...changesToSave };
      
      // Actualizar los valores guardados (nuevos mínimos permitidos)
      setSavedPercentages(prev => {
        const updated = { ...prev };
        Object.entries(changesToSave).forEach(([catId, value]) => {
          updated[catId] = value;
        });
        return updated;
      });
      
      // Actualizar localPercentages con los valores guardados
      setLocalPercentages(prev => {
        const updated = { ...prev };
        Object.entries(changesToSave).forEach(([catId, value]) => {
          updated[catId] = value;
        });
        return updated;
      });
      
      setHasUnsavedChanges(false);
      setEditingInput({});
      // Limpiar datos de updates
      setCategoryUpdateData({});
      setPhotoDialogOpen({});
    }
  }, [property.id, localPercentages, savedPercentages, categories, categoryUpdateData, saveAllProgress]);

  // Exponer funciones a través de refs
  useEffect(() => {
    if (onSaveRef) {
      onSaveRef(handleSave);
    }
  }, [onSaveRef, handleSave]);

  useEffect(() => {
    if (onSendRef) {
      onSendRef(async () => {
        // Primero guardar todos los cambios pendientes (incluyendo subir fotos)
        if (hasUnsavedChanges) {
          toast.info('Guardando cambios antes de enviar update...');
          await handleSave();
          toast.success('Cambios guardados correctamente');
        }
        // Luego abrir el selector de imágenes
        setSendUpdateImageSelectorOpen(true);
      });
    }
  }, [onSendRef, hasUnsavedChanges, handleSave]);

  // Notificar cambios en hasUnsavedChanges
  useEffect(() => {
    if (onHasUnsavedChangesChange) {
      onHasUnsavedChangesChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onHasUnsavedChangesChange]);

  useEffect(() => {
    onCanFinalizeChange?.(allCategoriesAt100);
  }, [allCategoriesAt100, onCanFinalizeChange]);

  useEffect(() => {
    if (onFinalizeRef) {
      onFinalizeRef(() => setFinalizeModalOpen(true));
    }
  }, [onFinalizeRef]);

  // Lista de keys de partidas para inicializar checkboxes y comprobar "todos marcados"
  const finalizeItemKeys = useMemo(() => {
    const keys: string[] = [];
    groupedCategories.forEach((g) => {
      g.categories.forEach((cat) => {
        const partidas = parseActivitiesText(cat.activities_text);
        partidas.forEach((_, i) => keys.push(`${cat.id}-partida-${i}`));
      });
    });
    return keys;
  }, [groupedCategories]);

  const prevFinalizeModalOpen = useRef(false);
  useEffect(() => {
    const justOpened = finalizeModalOpen && !prevFinalizeModalOpen.current;
    prevFinalizeModalOpen.current = finalizeModalOpen;
    if (justOpened && groupedCategories.length > 0) {
      const defaultsCat = Object.fromEntries(groupedCategories.map((g) => [g.categoryName, false]));
      const defaultsItem = Object.fromEntries(finalizeItemKeys.map((k) => [k, false]));
      (async () => {
        try {
          const { data } = await supabase
            .from('properties')
            .select('reno_precheck_comments, reno_precheck_checks')
            .eq('id', property.id)
            .single();
          const saved = data as { reno_precheck_comments?: string | null; reno_precheck_checks?: { categoryChecks?: Record<string, boolean>; itemChecks?: Record<string, boolean> } | null } | null;
          setFinalizeComments(saved?.reno_precheck_comments ?? '');
          setFinalizeCheckboxes(saved?.reno_precheck_checks?.categoryChecks ? { ...defaultsCat, ...saved.reno_precheck_checks.categoryChecks } : defaultsCat);
          setFinalizeItemCheckboxes(saved?.reno_precheck_checks?.itemChecks ? { ...defaultsItem, ...saved.reno_precheck_checks.itemChecks } : defaultsItem);
        } catch {
          setFinalizeCheckboxes(Object.fromEntries(groupedCategories.map((g) => [g.categoryName, false])));
          setFinalizeItemCheckboxes(Object.fromEntries(finalizeItemKeys.map((k) => [k, false])));
        }
      })();
    }
  }, [finalizeModalOpen, groupedCategories, finalizeItemKeys, property.id]);

  const savePrecheck = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          reno_precheck_comments: finalizeComments.trim() || null,
          reno_precheck_checks: { categoryChecks: finalizeCheckboxes, itemChecks: finalizeItemCheckboxes },
        })
        .eq('id', property.id);
      if (error) throw error;
      toast.success('Precheck guardado');
    } catch (e) {
      console.error('Error saving precheck:', e);
      toast.error('Error al guardar el precheck');
    }
  }, [property.id, finalizeComments, finalizeCheckboxes, finalizeItemCheckboxes]);

  const allFinalizeCheckboxesChecked =
    groupedCategories.length > 0 &&
    groupedCategories.every((g) => finalizeCheckboxes[g.categoryName] === true) &&
    (finalizeItemKeys.length === 0 ||
      finalizeItemKeys.every((key) => finalizeItemCheckboxes[key] === true));

  const handleConfirmFinalize = useCallback(async () => {
    if (!allFinalizeCheckboxesChecked || isFinalizing) return;
    setIsFinalizing(true);
    try {
      const result = await updatePropertyPhaseConsistent(property.id, {
        setUpStatus: 'Furnishing',
        renoPhase: 'furnishing',
      });
      if (!result.success) {
        toast.error(result.error ?? 'Error al actualizar la fase');
        return;
      }
      await syncPhaseToAirtable(property.id, 'furnishing');
      setFinalizeModalOpen(false);
      toast.success('Obra dada por finalizada. La propiedad ha pasado a Amoblamiento.');
      refetch();
      onPhaseChanged?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al finalizar la obra');
    } finally {
      setIsFinalizing(false);
    }
  }, [property.id, allFinalizeCheckboxesChecked, isFinalizing, refetch, onPhaseChanged]);

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

  // Handle PDF extraction - Llama al webhook de n8n para múltiples presupuestos
  const handleExtractPdfInfo = useCallback(async () => {
    // Validación: verificar que existe budget_pdf_url
    if (!property?.budget_pdf_url) {
      toast.error("No hay URL de presupuesto disponible");
      return;
    }

    // Si ya tiene categorías con actividades, no re-extraer
    const hasCategoriesWithActivities = categories.some(cat => cat.activities_text && cat.activities_text.trim().length > 0);
    if (hasCategoriesWithActivities) {
      toast.info("Esta propiedad ya tiene categorías con actividades definidas");
      return;
    }
    
    // Si tiene categorías sin actividades, eliminarlas primero para re-extraer
    if (categories.length > 0) {
      toast.info("Eliminando categorías sin actividades para re-extraer...");
      try {
        const deletePromises = categories.map(cat => deleteCategory(cat.id));
        await Promise.all(deletePromises);
        // Esperar un momento para que se eliminen
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error('Error eliminando categorías:', err);
        toast.error("Error al eliminar categorías existentes");
        return;
      }
    }

    setIsExtracting(true);
    setError(null);

    try {
      // Separar múltiples URLs por comas
      const urls = property.budget_pdf_url
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0 && url.startsWith('http'));

      if (urls.length === 0) {
        throw new Error("No se encontraron URLs válidas de presupuesto");
      }

      // Procesar cada presupuesto SECUENCIALMENTE (uno después del otro)
      // Esto asegura que n8n procese correctamente cada PDF y guarde las categorías antes del siguiente
      let successCount = 0;
      const totalCount = urls.length;

      for (let index = 0; index < urls.length; index++) {
        const budgetIndex = index + 1; // 1-based index
        
        console.log(`[Extract PDF] Procesando presupuesto ${budgetIndex} de ${totalCount}...`);
        
        // Preparar payload del webhook para este presupuesto
        const payload = prepareWebhookPayload(property, budgetIndex);
        if (!payload) {
          console.warn(`[Extract PDF] No se pudo preparar el payload para el presupuesto ${budgetIndex}`);
          continue;
        }

        // Llamar al webhook de n8n
        const success = await callN8nCategoriesWebhook(payload);
        
        if (!success) {
          console.error(`[Extract PDF] Error al llamar al webhook para el presupuesto ${budgetIndex}`);
          continue;
        }

        successCount++;
        console.log(`[Extract PDF] ✅ Webhook del presupuesto ${budgetIndex} llamado correctamente`);

        // Si hay más PDFs, esperar un tiempo razonable para que n8n procese
        // Pero no bloqueamos - las categorías se mostrarán aunque no tengan actividades todavía
        if (index < urls.length - 1) {
          console.log(`[Extract PDF] Esperando 30 segundos antes de procesar el siguiente PDF...`);
          toast.info(`Presupuesto ${budgetIndex} procesado. Esperando antes de procesar el siguiente...`, {
            duration: 30000,
          });
          
          // Esperar 30 segundos para dar tiempo a n8n de procesar
          await new Promise(resolve => setTimeout(resolve, 30000));
          
          // Refrescar las categorías para mostrar las que ya se hayan guardado
          console.log(`[Extract PDF] Refrescando categorías antes de procesar el siguiente PDF...`);
          await refetch();
        }
      }

      if (successCount === 0) {
        throw new Error("Error al llamar a los webhooks de n8n");
      }

      // Si hay múltiples PDFs, esperar un poco más y luego actualizar budget_index
      // Solo si realmente hay múltiples URLs
      if (successCount > 0 && urls.length > 1) {
        console.log(`[Extract PDF] Esperando 10 segundos adicionales antes de actualizar budget_index...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        try {
          const response = await fetch('/api/update-budget-index', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ propertyId: property.id }),
          });
          const result = await response.json();
          if (result.success && result.updated > 0) {
            console.log(`[Budget Index Updater] Updated ${result.updated} categories with budget_index`);
          }
          // Refrescar las categorías después de actualizar budget_index
          await refetch();
        } catch (err) {
          console.error('[Budget Index Updater] Error:', err);
        }
      } else if (successCount > 0) {
        // Si solo hay un PDF, simplemente refrescar las categorías
        await refetch();
      }

      if (successCount < totalCount) {
        toast.warning("Extracción parcialmente completada", {
          description: `Se procesaron ${successCount} de ${totalCount} presupuesto(s). Las categorías aparecerán cuando se complete el procesamiento.`,
        });
      } else {
        toast.success("Extracción de información PDF completada", {
          description: `Se procesaron ${totalCount} presupuesto(s) secuencialmente. Las categorías aparecerán cuando n8n termine de procesarlas (puede tardar unos minutos).`,
        });
      }
    } catch (err) {
      console.error('Error al extraer información del PDF:', err);
      const errorMessage = err instanceof Error ? err.message : "Ha ocurrido un error inesperado.";
      setError(errorMessage);
      toast.error("Error al iniciar la extracción", {
        description: errorMessage,
      });
    } finally {
      setIsExtracting(false);
    }
  }, [property, categories.length, refetch]);

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

  // Manejar agendar visita desde próxima actualización
  const handleScheduleVisit = useCallback(async () => {
    if (!visitDate) {
      toast.error('Debes seleccionar una fecha y hora');
      return;
    }

    setIsSchedulingVisit(true);
    try {
      // Verificar si ya existe una visita para esta fecha
      const visitDateObj = new Date(visitDate);
      const { data: existingVisits } = await supabase
        .from('property_visits')
        .select('id')
        .eq('property_id', property.id)
        .eq('visit_type', 'obra-seguimiento')
        .gte('visit_date', new Date(visitDateObj.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .lte('visit_date', new Date(visitDateObj.getTime() + 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (existingVisits && existingVisits.length > 0) {
        toast.info('Ya existe una visita programada para esta fecha');
        setIsScheduleVisitOpen(false);
        return;
      }

      const { error: visitError } = await supabase
        .from('property_visits')
        .insert({
          property_id: property.id,
          visit_date: visitDate,
          visit_type: 'obra-seguimiento',
          notes: visitNotes.trim() || null,
        });

      if (visitError) {
        throw visitError;
      }

      toast.success('Visita de seguimiento agendada correctamente');
      setIsScheduleVisitOpen(false);
      setVisitDate(undefined);
      setVisitNotes("");
    } catch (error: any) {
      console.error('Error scheduling visit:', error);
      toast.error('Error al agendar la visita');
    } finally {
      setIsSchedulingVisit(false);
    }
  }, [visitDate, visitNotes, property.id, supabase]);

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <p className="text-muted-foreground">Cargando categorías...</p>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="bg-card rounded-lg border border-destructive/50 p-6 shadow-sm">
        <p className="text-destructive">Error al cargar categorías: {error}</p>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="mt-4"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-lg border p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Progreso de Obras</h2>
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Cambios sin guardar
            </span>
          )}
        </div>

        {/* Información General - Fechas y Tipo de Renovación */}
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
              <p className="text-sm font-medium">{formatDate(property.last_update) || "No definida"}</p>
            </div>
          </div>
          <Dialog open={isScheduleVisitOpen} onOpenChange={setIsScheduleVisitOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity text-left w-full">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Próxima actualización</p>
                  <p className="text-sm font-medium text-primary hover:underline">
                    {formatDate(
                      property.next_update || 
                      calculateNextUpdateDate(null, property.renovation_type, property.start_date || (property as any).inicio)
                    ) || "No definida"}
                  </p>
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Agendar Visita de Seguimiento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Fecha y Hora</Label>
                  <DateTimePicker
                    value={visitDate}
                    onChange={setVisitDate}
                    placeholder="Selecciona fecha y hora"
                    errorMessage="Debes seleccionar una fecha y hora válida"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    placeholder="Agrega notas sobre la visita..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsScheduleVisitOpen(false);
                      setVisitDate(undefined);
                      setVisitNotes("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleScheduleVisit}
                    disabled={isSchedulingVisit || !visitDate}
                  >
                    {isSchedulingVisit ? 'Agendando...' : 'Agendar Visita'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Tipo de renovación</p>
              <p className="text-sm font-medium">
                {(property as any).renovation_type || (property as any)['Required reno'] || 'No definido'}
              </p>
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
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Categorías</Label>
            {/* NO mostrar botón del header si hay categorías con actividades o si es corner case */}
            {/* Solo mostrar cuando no hay categorías (caso inicial) */}
            {showExtractButton && categories.length === 0 && (
              <Button
                onClick={handleExtractPdfInfo}
                disabled={isExtracting}
                variant="outline"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                {isExtracting ? "Extrayendo..." : "Extraer Información PDF"}
              </Button>
            )}
          </div>
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
                <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No hay categorías definidas para esta propiedad.
                  </p>
                  {property.budget_pdf_url ? (
                    <p className="text-xs text-muted-foreground">
                      {hasCategoriesWithoutActivities 
                        ? "Las categorías existentes no tienen actividades. Haz clic en 'Re-extraer Información PDF' para procesar los PDFs nuevamente."
                        : "Tienes un presupuesto PDF disponible. Haz clic en 'Extraer Información PDF' para crear las categorías automáticamente."}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Para crear categorías, necesitas tener un presupuesto PDF configurado en la propiedad (campo budget_pdf_url).
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Mostrar botones de extracción de actividades por PDF (corner cases) */}
              {pdfsNeedingExtraction.size > 0 && (
                <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 space-y-3 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-800 dark:text-yellow-200 text-lg">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                        Algunos presupuestos no tienen actividades extraídas
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                        Las categorías fueron creadas pero algunas actividades no se extrajeron del PDF. Selecciona el presupuesto específico que deseas procesar:
                      </p>
                      <div className="flex flex-col gap-2">
                        {Array.from(pdfsNeedingExtraction).sort().map(budgetIndex => (
                          <Button
                            key={budgetIndex}
                            onClick={() => handleExtractActivitiesForPdf(budgetIndex)}
                            disabled={extractingPdfs.has(budgetIndex)}
                            variant="outline"
                            className="w-full justify-start border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            {extractingPdfs.has(budgetIndex) 
                              ? `Extrayendo actividades del Presupuesto ${budgetIndex}...` 
                              : `📄 Presupuesto ${budgetIndex} - Extraer Actividades`}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* NO mostrar este mensaje si ya hay botones por PDF (corner case) */}
              {/* Solo mostrar si es un caso inicial sin categorías */}
              {groupedCategories.map((group) => {
              // Si hay múltiples presupuestos con la misma categoría, mostrar todas
              // Si solo hay una, mostrar como antes
              const hasMultipleBudgets = group.categories.length > 1;
              
              // Calcular porcentaje promedio si hay múltiples presupuestos
              const averagePercentage = hasMultipleBudgets
                ? Math.round(
                    group.categories.reduce((sum, cat) => {
                      const pct = localPercentages[cat.id] ?? cat.percentage ?? 0;
                      return sum + pct;
                    }, 0) / group.categories.length
                  )
                : (localPercentages[group.categories[0].id] ?? group.categories[0].percentage ?? 0);

              // Usar el primer ID para el estado de expansión si hay múltiples
              const firstCategoryId = group.categories[0].id;
              const isExpanded = expandedCategories[firstCategoryId] || false;

              return (
                <Collapsible
                  key={group.categoryName}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedCategories(prev => ({ ...prev, [firstCategoryId]: open }))}
                >
                  <div className="border rounded-lg bg-background overflow-hidden">
                    {/* Header del acordeón - siempre visible */}
                    <div className="p-4 flex items-center justify-between gap-4">
                      <CollapsibleTrigger className="flex items-center gap-3 flex-1 hover:bg-muted/50 transition-colors rounded-md p-2 -m-2">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">{group.categoryName}</h3>
                            {hasMultipleBudgets && (
                              <Badge variant="secondary" className="text-xs">
                                {group.categories.length} presupuestos
                              </Badge>
                            )}
                            {group.categories.some(cat => {
                              const pct = localPercentages[cat.id] ?? cat.percentage ?? 0;
                              const saved = savedPercentages[cat.id] ?? cat.percentage ?? 0;
                              return pct !== saved;
                            }) && (
                              <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700">
                                Sin guardar
                              </Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-semibold min-w-[3rem] text-right">{averagePercentage}%</span>
                      </CollapsibleTrigger>
                    </div>

                    {/* Barra de progreso - siempre visible */}
                    <div className="px-4 pb-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Progreso</Label>
                        <div className="flex items-center gap-2">
                          {/* Si hay múltiples presupuestos, mostrar controles para cada uno */}
                          {hasMultipleBudgets ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              Promedio de {group.categories.length} presupuestos
                            </div>
                          ) : (
                            <>
                              {/* Botón para agregar fotos/videos si hay cambios */}
                              {group.categories.some(cat => {
                                const pct = localPercentages[cat.id] ?? cat.percentage ?? 0;
                                const saved = savedPercentages[cat.id] ?? cat.percentage ?? 0;
                                return pct !== saved;
                              }) && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const isOpening = !photoDialogOpen[firstCategoryId];
                                    setPhotoDialogOpen(prev => ({ ...prev, [firstCategoryId]: isOpening }));
                                    if (isOpening) {
                                      setExpandedCategories(prev => ({ ...prev, [firstCategoryId]: true }));
                                    } else {
                                      setExpandedCategories(prev => ({ ...prev, [firstCategoryId]: false }));
                                    }
                                  }}
                                  className="h-7 text-xs"
                                >
                                  <Camera className="h-3 w-3 mr-1" />
                                  {photoDialogOpen[firstCategoryId] ? 'Ocultar' : 'Fotos'}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {/* Slider con promedio si hay múltiples presupuestos */}
                      <div className="relative h-3 overflow-visible rounded-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute inset-0 h-3 rounded-lg bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)]" />
                        <div 
                          className={`absolute inset-y-0 left-0 bg-primary transition-all duration-150 ease-out ${averagePercentage >= 100 ? 'rounded-lg' : 'rounded-l-lg'}`}
                          style={{
                            width: `${Math.min(100, averagePercentage)}%`,
                          }}
                        />
                        {/* Si solo hay un presupuesto, mostrar slider interactivo */}
                        {!hasMultipleBudgets && (
                          <>
                            <input
                              type="range"
                              min={getMinAllowedValue(firstCategoryId)}
                              max={100}
                              step={1}
                              value={Math.max(getMinAllowedValue(firstCategoryId), Math.min(100, averagePercentage))}
                              onInput={(e) => {
                                const newValue = parseInt((e.target as HTMLInputElement).value, 10);
                                handleSliderChange(firstCategoryId, newValue);
                              }}
                              onChange={(e) => {
                                const newValue = parseInt(e.target.value, 10);
                                handleSliderChange(firstCategoryId, newValue);
                              }}
                              className="absolute inset-0 w-full h-3 rounded-lg appearance-none cursor-pointer slider-blue z-30"
                              style={{ touchAction: 'pan-y' }}
                              title={`Mínimo permitido: ${getMinAllowedValue(firstCategoryId)}%`}
                            />
                            <div 
                              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white dark:bg-white border-2 border-primary shadow-md z-20 pointer-events-none transition-all duration-150 ease-out"
                              style={{
                                left: averagePercentage > 0 
                                  ? `calc(${Math.min(100, averagePercentage)}% - 10px)` 
                                  : '-10px',
                              }}
                            />
                          </>
                        )}
                      </div>
                      {!hasMultipleBudgets && getMinAllowedValue(firstCategoryId) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Mínimo permitido: {getMinAllowedValue(firstCategoryId)}% (último valor guardado)
                        </p>
                      )}
                    </div>

                    {/* Contenido colapsable - partidas por presupuesto */}
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-4 border-t pt-4">
                        {hasMultipleBudgets ? (
                          // Mostrar partidas agrupadas por presupuesto
                          group.categories.map((category) => {
                            const budgetIndex = category.budget_index || 1;
                            const partidas = category.activities_text 
                              ? parseActivitiesText(category.activities_text)
                              : [];
                            const categoryPercentage = localPercentages[category.id] ?? category.percentage ?? 0;
                            const categorySavedValue = savedPercentages[category.id] ?? category.percentage ?? 0;
                            const categoryHasChanged = categoryPercentage !== categorySavedValue;
                            const categoryMinAllowed = getMinAllowedValue(category.id);

                            return (
                              <div key={category.id} className="space-y-2 border rounded-lg p-3 bg-muted/20">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      Presupuesto {budgetIndex}
                                    </Badge>
                                    {categoryHasChanged && (
                                      <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400">
                                        Sin guardar
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-sm font-semibold">{categoryPercentage}%</span>
                                </div>
                                
                                {/* Slider individual para cada presupuesto */}
                                <div className="relative h-2 overflow-visible rounded-lg" onClick={(e) => e.stopPropagation()}>
                                  <div className="absolute inset-0 h-2 rounded-lg bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)]" />
                                  <div 
                                    className={`absolute inset-y-0 left-0 bg-primary transition-all duration-150 ease-out ${categoryPercentage >= 100 ? 'rounded-lg' : 'rounded-l-lg'}`}
                                    style={{
                                      width: `${Math.min(100, categoryPercentage)}%`,
                                    }}
                                  />
                                  <input
                                    type="range"
                                    min={categoryMinAllowed}
                                    max={100}
                                    step={1}
                                    value={Math.max(categoryMinAllowed, Math.min(100, categoryPercentage))}
                                    onInput={(e) => {
                                      const newValue = parseInt((e.target as HTMLInputElement).value, 10);
                                      handleSliderChange(category.id, newValue);
                                    }}
                                    onChange={(e) => {
                                      const newValue = parseInt(e.target.value, 10);
                                      handleSliderChange(category.id, newValue);
                                    }}
                                    className="absolute inset-0 w-full h-2 rounded-lg appearance-none cursor-pointer slider-blue z-30"
                                    style={{ touchAction: 'pan-y' }}
                                  />
                                </div>

                                {/* Partidas de este presupuesto */}
                                {partidas.length > 0 ? (
                                  <div className="space-y-2 mt-3">
                                    {partidas.map((partida, index) => (
                                      <PartidaItem key={`${category.id}-${partida.number}-${index}`} partida={partida} />
                                    ))}
                                  </div>
                                ) : category.activities_text ? (
                                  <div className="text-sm text-muted-foreground p-2 bg-muted/30 rounded-lg mt-2">
                                    {category.activities_text}
                                  </div>
                                ) : (
                                  // Si es corner case (múltiples PDFs sin actividades), no mostrar spinner
                                  // Los botones de extracción aparecerán arriba
                                  pdfsNeedingExtraction.size > 0 ? null : (
                                    <div className="text-sm text-muted-foreground p-2 bg-muted/30 rounded-lg mt-2">
                                      <div className="flex items-center gap-2">
                                        <div className="animate-spin h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full"></div>
                                        <span>Las actividades se están procesando desde el PDF...</span>
                                      </div>
                                    </div>
                                  )
                                )}

                                {/* Updates de esta categoría específica */}
                                <CategoryUpdatesList categoryId={category.id} />
                              </div>
                            );
                          })
                        ) : (
                          // Un solo presupuesto - mostrar como antes
                          (() => {
                            const category = group.categories[0];
                            const partidas = category.activities_text 
                              ? parseActivitiesText(category.activities_text)
                              : [];

                            return (
                              <>
                                {partidas.length > 0 ? (
                                  partidas.map((partida, index) => (
                                    <PartidaItem key={`${category.id}-${partida.number}-${index}`} partida={partida} />
                                  ))
                                ) : category.activities_text ? (
                                  <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                                    {category.activities_text}
                                  </div>
                                ) : (
                                  // Si es corner case (múltiples PDFs sin actividades), no mostrar spinner
                                  // Los botones de extracción aparecerán arriba
                                  pdfsNeedingExtraction.size > 0 ? null : (
                                    <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <div className="animate-spin h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full"></div>
                                        <span>Las actividades se están procesando desde el PDF...</span>
                                      </div>
                                    </div>
                                  )
                                )}
                                <CategoryUpdatesList categoryId={category.id} />
                              </>
                            );
                          })()
                        )}
                      </div>
                    </CollapsibleContent>
                    
                    {/* Componente de fotos/videos - solo para un solo presupuesto */}
                    {!hasMultipleBudgets && group.categories.some(cat => {
                      const pct = localPercentages[cat.id] ?? cat.percentage ?? 0;
                      const saved = savedPercentages[cat.id] ?? cat.percentage ?? 0;
                      return pct !== saved;
                    }) && photoDialogOpen[firstCategoryId] && (
                      <CategoryPhotoUpload
                        categoryId={firstCategoryId}
                        propertyId={property.id}
                        open={true}
                        onOpenChange={(open) => {
                          setPhotoDialogOpen(prev => ({ ...prev, [firstCategoryId]: open }));
                          if (!open) {
                            setExpandedCategories(prev => ({ ...prev, [firstCategoryId]: false }));
                          }
                        }}
                        onSave={(data) => {
                          // Guardar notas cuando cambian
                          setCategoryUpdateData(prev => ({
                            ...prev,
                            [firstCategoryId]: {
                              uploadZone: prev[firstCategoryId]?.uploadZone,
                              notes: data.notes || "",
                            },
                          }));
                        }}
                        onUploadZoneChange={(uploadZone) => {
                          // Guardar el uploadZone completo (incluye base64) para subirlo cuando se guarde el progreso
                          setCategoryUpdateData(prev => ({
                            ...prev,
                            [firstCategoryId]: {
                              uploadZone,
                              notes: prev[firstCategoryId]?.notes || "",
                            },
                          }));
                        }}
                        initialData={{
                          photos: categoryUpdateData[firstCategoryId]?.uploadZone?.photos
                            .filter(p => p.data && p.data.startsWith('http'))
                            .map(p => p.data) || [],
                          videos: categoryUpdateData[firstCategoryId]?.uploadZone?.videos
                            .filter(v => v.data && v.data.startsWith('http'))
                            .map(v => v.data) || [],
                          notes: categoryUpdateData[firstCategoryId]?.notes || "",
                        }}
                      />
                    )}
                  </div>
                </Collapsible>
              );
            })}
            </>
          )}
        </div>

        {/* Fotos de Avance de Obra - Entre categorías y botones */}
        <div className="pt-4 border-t">
          <RenoInProgressPhotoUpload propertyId={property.id} />
        </div>

        {/* Botones de Acción - Solo en desktop, en mobile van al footer */}
        <div className="hidden md:flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || loading}
          >
            Guardar Progreso
          </Button>
          {allCategoriesAt100 ? (
            <Button
              onClick={() => setFinalizeModalOpen(true)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white border-0"
            >
              {t.propertyPage.darObraPorFinalizada}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={async () => {
                if (hasUnsavedChanges) {
                  toast.info('Guardando cambios antes de enviar update...');
                  await handleSave();
                  toast.success('Cambios guardados correctamente');
                }
                setSendUpdateImageSelectorOpen(true);
              }}
              disabled={loading}
            >
              Enviar Update a Cliente
            </Button>
          )}
        </div>
      </div>

      {/* Modal Dar obra por finalizada */}
      <Dialog
        open={finalizeModalOpen}
        onOpenChange={async (open) => {
          if (!open) {
            await savePrecheck();
            setFinalizeModalOpen(false);
          } else {
            setFinalizeModalOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.propertyPage.finalizeModalTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t.propertyPage.finalizeModalDescription}
          </p>
          <div className="space-y-3 py-4">
            {groupedCategories.map((group) => {
              const partidasByCategory = group.categories.map((cat) => ({
                categoryId: cat.id,
                partidas: parseActivitiesText(cat.activities_text),
                budgetIndex: cat.budget_index ?? 1,
              }));
              const hasPartidas = partidasByCategory.some((p) => p.partidas.length > 0);
              const itemKeysForGroup = hasPartidas
                ? partidasByCategory.flatMap(({ categoryId, partidas }) =>
                    partidas.map((_, i) => `${categoryId}-partida-${i}`)
                  )
                : [];

              const handleCategoryCheck = (checked: boolean) => {
                setFinalizeCheckboxes((prev) => ({
                  ...prev,
                  [group.categoryName]: checked,
                }));
                if (itemKeysForGroup.length > 0) {
                  setFinalizeItemCheckboxes((prev) => {
                    const next = { ...prev };
                    itemKeysForGroup.forEach((k) => (next[k] = checked));
                    return next;
                  });
                }
              };

              const handlePartidaCheck = (itemKey: string, checked: boolean) => {
                setFinalizeItemCheckboxes((prev) => {
                  const next = { ...prev, [itemKey]: checked };
                  const allChecked =
                    itemKeysForGroup.length > 0 &&
                    itemKeysForGroup.every((k) => next[k] === true);
                  setFinalizeCheckboxes((prevCat) => ({
                    ...prevCat,
                    [group.categoryName]: allChecked,
                  }));
                  return next;
                });
              };

              return (
                <div
                  key={group.categoryName}
                  className="rounded-lg border overflow-hidden"
                >
                  {/* Checkbox de la categoría */}
                  <div className="flex items-center space-x-2 p-3 bg-muted/20">
                    <Checkbox
                      id={`finalize-${group.categoryName}`}
                      checked={finalizeCheckboxes[group.categoryName] === true}
                      onCheckedChange={(checked) =>
                        handleCategoryCheck(checked === true)
                      }
                    />
                    <label
                      htmlFor={`finalize-${group.categoryName}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {group.categoryName}
                    </label>
                  </div>
                  {/* Partidas dentro de la categoría */}
                  {hasPartidas && (
                    <div className="px-3 pb-3 pt-1 space-y-2 border-t">
                      {partidasByCategory.flatMap(({ categoryId, partidas, budgetIndex }) =>
                        partidas.map((partida, index) => {
                          const itemKey = `${categoryId}-partida-${index}`;
                          const label =
                            partidasByCategory.length > 1
                              ? `[P${budgetIndex}] ${partida.number} — ${partida.title}`
                              : `${partida.number} — ${partida.title}`;
                          return (
                            <div
                              key={itemKey}
                              className="flex items-start space-x-2 rounded-md pl-4"
                            >
                              <Checkbox
                                id={`finalize-item-${itemKey}`}
                                checked={finalizeItemCheckboxes[itemKey] === true}
                                onCheckedChange={(checked) =>
                                  handlePartidaCheck(itemKey, checked === true)
                                }
                              />
                              <label
                                htmlFor={`finalize-item-${itemKey}`}
                                className="text-sm leading-snug peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                              >
                                {label.length > 80 ? `${label.slice(0, 80)}…` : label}
                              </label>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-sm font-medium">Comentarios</Label>
            <Textarea
              placeholder="Comentarios del precheck (opcional)"
              value={finalizeComments}
              onChange={(e) => setFinalizeComments(e.target.value)}
              className="min-h-[80px] resize-y"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={async () => {
                await savePrecheck();
                setFinalizeModalOpen(false);
              }}
              disabled={isFinalizing}
            >
              {t.propertyPage.cancel}
            </Button>
            {allFinalizeCheckboxesChecked ? (
              <Button
                onClick={handleConfirmFinalize}
                disabled={isFinalizing}
              >
                {isFinalizing ? t.propertyPage.finalizing : t.propertyPage.avanzarAAmoblamiento}
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  await savePrecheck();
                }}
                disabled={isFinalizing}
              >
                Guardar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SendUpdateImageSelector
        open={sendUpdateImageSelectorOpen}
        onOpenChange={setSendUpdateImageSelectorOpen}
        property={property}
        categories={sortedCategories.map(cat => ({
          id: cat.id,
          name: cat.category_name,
          percentage: localPercentages[cat.id] ?? cat.percentage ?? 0,
        }))}
        onNext={(selectedImages) => {
          setSelectedImagesForEmail(selectedImages);
          setSendUpdateImageSelectorOpen(false);
          setSendUpdateEmailPreviewOpen(true);
        }}
      />

      <SendUpdateEmailPreview
        open={sendUpdateEmailPreviewOpen}
        onOpenChange={setSendUpdateEmailPreviewOpen}
        property={property}
        categories={sortedCategories.map(cat => ({
          id: cat.id,
          name: cat.category_name,
          percentage: localPercentages[cat.id] ?? cat.percentage ?? 0,
        }))}
        selectedImages={selectedImagesForEmail}
        onSend={async () => {
          // Guardar todos los cambios pendientes antes de enviar
          await handleSave();
        }}
      />

    </>
  );
}

