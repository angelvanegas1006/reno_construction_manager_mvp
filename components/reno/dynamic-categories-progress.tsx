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

type SupabaseProperty = Database['public']['Tables']['properties']['Row'];

interface DynamicCategoriesProgressProps {
  property: SupabaseProperty;
  onSaveRef?: (saveFn: () => Promise<void>) => void;
  onSendRef?: (sendFn: () => void) => void;
  onHasUnsavedChangesChange?: (hasChanges: boolean) => void;
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

export function DynamicCategoriesProgress({ property, onSaveRef, onSendRef, onHasUnsavedChangesChange }: DynamicCategoriesProgressProps) {
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

  // Sort categories by their order number (extracted from category_name)
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
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

  // Handle PDF extraction - Llama al webhook de n8n
  const handleExtractPdfInfo = useCallback(async () => {
    // Validación: verificar que existe budget_pdf_url
    if (!property?.budget_pdf_url) {
      toast.error("No hay URL de presupuesto disponible");
      return;
    }

    // Verificar si ya tiene categorías (evitar llamadas duplicadas)
    if (categories.length > 0) {
      toast.info("Esta propiedad ya tiene categorías definidas");
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      // Preparar payload del webhook
      const payload = prepareWebhookPayload(property);
      if (!payload) {
        throw new Error("No se pudo preparar el payload del webhook");
      }

      // Llamar al webhook de n8n
      const success = await callN8nCategoriesWebhook(payload);

      if (!success) {
        throw new Error("Error al llamar al webhook de n8n");
      }

      toast.success("Extracción de información PDF iniciada correctamente", {
        description: "El proceso de extracción se está ejecutando. Las categorías aparecerán cuando se complete el procesamiento.",
      });
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
  }, [property, categories.length]);

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
                <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No hay categorías definidas para esta propiedad.
                  </p>
                  {property.budget_pdf_url ? (
                    <p className="text-xs text-muted-foreground">
                      Tienes un presupuesto PDF disponible. Haz clic en "Extraer Información PDF" para crear las categorías automáticamente.
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
            sortedCategories.map((category) => {
              const percentage = localPercentages[category.id] ?? category.percentage ?? 0;
              const savedValue = savedPercentages[category.id] ?? category.percentage ?? 0;
              const minAllowedValue = getMinAllowedValue(category.id);
              const hasChanged = percentage !== savedValue;
              const isEditingInput = editingInput[category.id] || false;
              const isExpanded = expandedCategories[category.id] || false;
              
              // Parsear partidas del activities_text
              const partidas = category.activities_text 
                ? parseActivitiesText(category.activities_text)
                : [];

              return (
                <Collapsible
                  key={category.id}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedCategories(prev => ({ ...prev, [category.id]: open }))}
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
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{category.category_name}</h3>
                            {hasChanged && (
                              <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700">
                                Sin guardar
                              </Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-semibold min-w-[3rem] text-right">{percentage}%</span>
                      </CollapsibleTrigger>
                    </div>

                    {/* Barra de progreso - siempre visible */}
                    <div className="px-4 pb-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Progreso</Label>
                        <div className="flex items-center gap-2">
                          {/* Botón para agregar fotos/videos si hay cambios */}
                          {hasChanged && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const isOpening = !photoDialogOpen[category.id];
                                setPhotoDialogOpen(prev => ({ ...prev, [category.id]: isOpening }));
                                // Si se abre, expandir la categoría; si se cierra, colapsarla
                                if (isOpening) {
                                  setExpandedCategories(prev => ({ ...prev, [category.id]: true }));
                                } else {
                                  setExpandedCategories(prev => ({ ...prev, [category.id]: false }));
                                }
                              }}
                              className="h-7 text-xs"
                            >
                              <Camera className="h-3 w-3 mr-1" />
                              {photoDialogOpen[category.id] ? 'Ocultar' : 'Fotos'}
                            </Button>
                          )}
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
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingInput(prev => ({ ...prev, [category.id]: false }));
                                }}
                              >
                                ✓
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {/* Slider with blue background and visible thumb */}
                      <div className="relative h-3 overflow-visible rounded-lg" onClick={(e) => e.stopPropagation()}>
                        {/* Background track (full width, blue) */}
                        <div className="absolute inset-0 h-3 rounded-lg bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)]" />
                        {/* Progress fill (blue primary) */}
                        <div 
                          className={`absolute inset-y-0 left-0 bg-primary ${percentage >= 100 ? 'rounded-lg' : 'rounded-l-lg'}`}
                          style={{
                            width: `${Math.min(100, percentage)}%`,
                          }}
                        />
                        {/* Circle indicator at the end of progress - always visible, pero no bloquea interacción */}
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-white dark:border-[#000000] shadow-sm z-20 pointer-events-none"
                          style={{
                            left: percentage > 0 
                              ? `calc(${Math.min(100, percentage)}% - 6px)` 
                              : '-6px',
                          }}
                        />
                        {/* Slider input on top - transparent track, only thumb visible */}
                        <input
                          key={`slider-${category.id}-${percentage}`}
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.max(0, Math.min(100, percentage))}
                          onInput={(e) => {
                            const newValue = parseInt((e.target as HTMLInputElement).value, 10);
                            handleSliderChange(category.id, newValue);
                          }}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value, 10);
                            handleSliderChange(category.id, newValue);
                          }}
                          className="absolute inset-0 w-full h-3 rounded-lg appearance-none cursor-pointer slider-blue z-30"
                          style={{ touchAction: 'none' }}
                          title={`Mínimo permitido: ${minAllowedValue}%`}
                        />
                      </div>
                      {minAllowedValue > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Mínimo permitido: {minAllowedValue}% (último valor guardado)
                        </p>
                      )}
                    </div>

                    {/* Contenido colapsable - partidas */}
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-3 border-t pt-4">
                        {partidas.length > 0 ? (
                          partidas.map((partida, index) => (
                            <PartidaItem key={`${category.id}-${partida.number}-${index}`} partida={partida} />
                          ))
                        ) : category.activities_text ? (
                          <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                            {category.activities_text}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                            No hay actividades definidas para esta categoría.
                          </div>
                        )}
                      </div>
                      
                      {/* Mostrar updates recientes con fotos/videos */}
                      <CategoryUpdatesList categoryId={category.id} />
                    </CollapsibleContent>
                    
                    {/* Componente de fotos/videos - fuera del CollapsibleContent para que siempre sea visible cuando está abierto */}
                    {hasChanged && photoDialogOpen[category.id] && (
                      <CategoryPhotoUpload
                        categoryId={category.id}
                        propertyId={property.id}
                        open={true}
                        onOpenChange={(open) => {
                          setPhotoDialogOpen(prev => ({ ...prev, [category.id]: open }));
                          if (!open) {
                            setExpandedCategories(prev => ({ ...prev, [category.id]: false }));
                          }
                        }}
                        onSave={(data) => {
                          // Guardar notas cuando cambian
                          setCategoryUpdateData(prev => ({
                            ...prev,
                            [category.id]: {
                              uploadZone: prev[category.id]?.uploadZone,
                              notes: data.notes || "",
                            },
                          }));
                        }}
                        onUploadZoneChange={(uploadZone) => {
                          // Guardar el uploadZone completo (incluye base64) para subirlo cuando se guarde el progreso
                          setCategoryUpdateData(prev => ({
                            ...prev,
                            [category.id]: {
                              uploadZone,
                              notes: prev[category.id]?.notes || "",
                            },
                          }));
                        }}
                        initialData={{
                          photos: categoryUpdateData[category.id]?.uploadZone?.photos
                            .filter(p => p.data && p.data.startsWith('http'))
                            .map(p => p.data) || [],
                          videos: categoryUpdateData[category.id]?.uploadZone?.videos
                            .filter(v => v.data && v.data.startsWith('http'))
                            .map(v => v.data) || [],
                          notes: categoryUpdateData[category.id]?.notes || "",
                        }}
                      />
                    )}
                  </div>
                </Collapsible>
              );
            })
          )}
        </div>

        {/* Botones de Acción - Solo en desktop, en mobile van al footer */}
        <div className="hidden md:flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || loading}
          >
            Guardar Progreso
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              // Primero guardar todos los cambios pendientes (incluyendo subir fotos)
              if (hasUnsavedChanges) {
                toast.info('Guardando cambios antes de enviar update...');
                await handleSave();
                toast.success('Cambios guardados correctamente');
              }
              // Luego abrir el selector de imágenes
              setSendUpdateImageSelectorOpen(true);
            }}
            disabled={loading}
          >
            Enviar Update a Cliente
          </Button>
        </div>
      </div>

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

