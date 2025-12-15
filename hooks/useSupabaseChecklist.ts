"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChecklistData,
  ChecklistSection,
  ChecklistType,
  createChecklist,
} from "@/lib/checklist-storage";
import { useSupabaseInspection, type InspectionType } from "@/hooks/useSupabaseInspection";
import { useSupabaseProperty } from "@/hooks/useSupabaseProperty";
import { createClient } from "@/lib/supabase/client";
import {
  convertSectionToZones,
  convertSectionToElements,
  convertDynamicItemToElements,
  convertSupabaseToChecklist,
} from "@/lib/supabase/checklist-converter";
import { uploadFilesToStorage } from "@/lib/supabase/storage-upload";
import type { FileUpload } from "@/lib/checklist-storage";
import { toast } from "sonner";
import { finalizeInitialCheckInAirtable } from "@/lib/airtable/initial-check-sync";

interface UseSupabaseChecklistProps {
  propertyId: string;
  checklistType: ChecklistType;
}

interface UseSupabaseChecklistReturn {
  checklist: ChecklistData | null;
  isLoading: boolean;
  updateSection: (sectionId: string, sectionData: Partial<ChecklistSection>) => Promise<void>;
  save: () => Promise<void>;
  saveCurrentSection: () => Promise<void>; // Guardar sección actual
  finalizeChecklist: (data?: { estimatedVisitDate?: string; autoVisitDate?: string; nextRenoSteps?: string }) => Promise<boolean>; // Finalizar checklist
}

export function useSupabaseChecklist({
  propertyId,
  checklistType,
}: UseSupabaseChecklistProps): UseSupabaseChecklistReturn {
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentSectionRef = useRef<string | null>(null);
  const pendingSaveRef = useRef<{ sectionId: string; sectionData: Partial<ChecklistSection> } | null>(null);
  const initializationRef = useRef<string | null>(null); // Key para evitar múltiples inicializaciones
  const initializationInProgressRef = useRef<boolean>(false); // Flag para evitar ejecuciones simultáneas
  const lastZonesCountRef = useRef<number>(0); // Para detectar cambios reales en zones
  const zonesCreationTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Para debounce durante creación de zonas
  const inspectionCreationInProgressRef = useRef<boolean>(false); // Flag para evitar crear múltiples inspecciones
  const functionsRef = useRef<{
    createInspection: (propertyId: string, type: InspectionType) => Promise<any>;
    refetchInspection: () => Promise<void>;
    createInitialZones: (inspectionId: string) => Promise<void>;
  } | null>(null);

  // Determinar inspection_type basado en checklistType
  const inspectionType: InspectionType = checklistType === "reno_final" ? "final" : "initial";

  // Hook de Supabase para inspecciones
  const {
    inspection,
    zones,
    elements,
    loading: inspectionLoading,
    createInspection,
    createZone,
    upsertElement,
    refetch: refetchInspection,
  } = useSupabaseInspection(propertyId, inspectionType);

  // Hook para obtener datos de la propiedad (bedrooms, bathrooms)
  const { property: supabaseProperty } = useSupabaseProperty(propertyId);

  // Crear zonas iniciales automáticamente
  const createInitialZones = useCallback(async (inspectionId: string) => {
    if (!supabaseProperty || !createZone) return;

    const bedrooms = supabaseProperty.bedrooms || 0;
    const bathrooms = supabaseProperty.bathrooms || 0;

    // Crear checklist temporal para generar zonas
    const tempChecklist = createChecklist(propertyId, checklistType, {
      "entorno-zonas-comunes": {
        id: "entorno-zonas-comunes",
        uploadZones: [
          { id: "portal", photos: [], videos: [] },
          { id: "fachada", photos: [], videos: [] },
          { id: "entorno", photos: [], videos: [] },
        ],
        questions: [
          { id: "acceso-principal" },
          { id: "acabados" },
          { id: "comunicaciones" },
          { id: "electricidad" },
          { id: "carpinteria" },
        ],
      },
      "estado-general": {
        id: "estado-general",
        uploadZones: [{ id: "perspectiva-general", photos: [], videos: [] }],
        questions: [{ id: "acabados" }, { id: "electricidad" }],
        climatizationItems: [
          { id: "radiadores", cantidad: 0 },
          { id: "split-ac", cantidad: 0 },
          { id: "calentador-agua", cantidad: 0 },
          { id: "calefaccion-conductos", cantidad: 0 },
        ],
      },
      "entrada-pasillos": {
        id: "entrada-pasillos",
        uploadZones: [
          { id: "cuadro-general-electrico", photos: [], videos: [] },
          { id: "entrada-vivienda-pasillos", photos: [], videos: [] },
        ],
        questions: [{ id: "acabados" }, { id: "electricidad" }],
        carpentryItems: [
          { id: "ventanas", cantidad: 0 },
          { id: "persianas", cantidad: 0 },
          { id: "armarios", cantidad: 0 },
        ],
        climatizationItems: [
          { id: "radiadores", cantidad: 0 },
          { id: "split-ac", cantidad: 0 },
        ],
        mobiliario: { existeMobiliario: false },
      },
      "habitaciones": {
        id: "habitaciones",
        dynamicItems: [],
        dynamicCount: bedrooms,
      },
      "salon": {
        id: "salon",
        questions: [],
      },
      "banos": {
        id: "banos",
        dynamicItems: [],
        dynamicCount: bathrooms,
      },
      "cocina": {
        id: "cocina",
        questions: [],
      },
      "exteriores": {
        id: "exteriores",
        questions: [],
      },
    });

    // Crear zonas para cada sección
    for (const [sectionId, section] of Object.entries(tempChecklist.sections)) {
      const zonesToCreate = convertSectionToZones(sectionId, section, inspectionId);
      
      for (const zoneData of zonesToCreate) {
        await createZone(zoneData);
      }
    }
  }, [supabaseProperty, propertyId, checklistType, createZone]);

  // Guardar referencias a funciones para evitar re-ejecuciones por cambios en referencias
  useEffect(() => {
    functionsRef.current = {
      createInspection,
      refetchInspection,
      createInitialZones,
    };
  }, [createInspection, refetchInspection, createInitialZones]);

  // Inicializar inspección y checklist
  useEffect(() => {
    console.log('[useSupabaseChecklist] 🔄 Effect triggered:', {
      propertyId,
      inspectionLoading,
      hasSupabaseProperty: !!supabaseProperty,
      hasInspection: !!inspection,
      inspectionId: inspection?.id,
      zonesCount: zones.length,
      elementsCount: elements.length,
      checklistType,
      initializationInProgress: initializationInProgressRef.current,
      inspectionCreationInProgress: inspectionCreationInProgressRef.current,
      lastZonesCount: lastZonesCountRef.current,
      currentKey: initializationRef.current,
      timestamp: new Date().toISOString(),
    });

    // Evitar ejecuciones múltiples simultáneas
    if (initializationInProgressRef.current) {
      console.log('[useSupabaseChecklist] ⏸️ Initialization already in progress, skipping...');
      return;
    }

    if (!propertyId || inspectionLoading || !supabaseProperty) {
      console.log('[useSupabaseChecklist] ⏳ Waiting for required data...', {
        hasPropertyId: !!propertyId,
        inspectionLoading,
        hasSupabaseProperty: !!supabaseProperty,
      });
      setIsLoading(true);
      return;
    }

    // Si estamos esperando que se cree una inspección y ahora tenemos una, resetear el flag y continuar
    if (inspectionCreationInProgressRef.current && inspection?.id) {
      console.log('[useSupabaseChecklist] ✅ Inspection is now available, resetting creation flag...');
      inspectionCreationInProgressRef.current = false;
      // Continuar con la inicialización ahora que tenemos la inspección
    } else if (inspectionCreationInProgressRef.current && !inspection?.id) {
      // Si estamos esperando pero aún no tenemos la inspección
      if (inspectionLoading) {
        // Si aún está cargando, esperar
        console.log('[useSupabaseChecklist] ⏳ Waiting for inspection creation to complete...');
        setIsLoading(true);
        return;
      } else {
        // Si ya no está cargando pero no hay inspección, algo salió mal - resetear y continuar
        console.warn('[useSupabaseChecklist] ⚠️ Inspection creation flag is set but no inspection found after loading completed, resetting flag...');
        inspectionCreationInProgressRef.current = false;
        // Continuar con la inicialización - puede que la inspección se haya creado pero el estado no se haya actualizado aún
        // El siguiente ciclo del efecto debería detectarla
      }
    }

    // Si ya tenemos checklist y no hay cambios significativos, no reinicializar
    const inspectionId = inspection?.id;
    const key = `${propertyId}-${checklistType}-${inspectionId || 'no-inspection'}`;
    if (initializationRef.current === key && checklist && zones.length > 0 && !inspectionLoading && inspectionId) {
      console.log('[useSupabaseChecklist] ✅ Already initialized with same data, skipping...', { key });
      // Si ya está inicializado completamente, asegurar que el flag esté en false
      if (initializationInProgressRef.current) {
        initializationInProgressRef.current = false;
      }
      setIsLoading(false);
      return;
    }
    
    // Si zones.length está aumentando durante la creación inicial, esperar a que termine el loading
    if (zones.length > 0 && inspectionLoading) {
      console.log('[useSupabaseChecklist] ⏳ Zones are being created, waiting for loading to finish...', {
        current: zones.length,
        inspectionLoading,
      });
      return;
    }

    // Actualizar el contador de zones
    lastZonesCountRef.current = zones.length;

    const initializeChecklist = async () => {
      // Marcar que la inicialización está en progreso
      initializationInProgressRef.current = true;
      
      try {
        console.log('[useSupabaseChecklist] 🚀 Starting initialization...');
        setIsLoading(true);
        
        // Si el flag de creación está activo pero no hay inspección y ya no está cargando,
        // intentar un refetch adicional para asegurarnos de que tenemos la inspección más reciente
        if (inspectionCreationInProgressRef.current && !inspection?.id && !inspectionLoading && functionsRef.current) {
          console.log('[useSupabaseChecklist] 🔄 Attempting additional refetch to find created inspection...');
          await functionsRef.current.refetchInspection();
          // Esperar un momento para que el estado se actualice
          await new Promise(resolve => setTimeout(resolve, 500));
          // Si después del refetch adicional aún no hay inspección, crear un checklist vacío
          // para que el usuario pueda ver algo mientras tanto
          if (!inspection?.id) {
            console.warn('[useSupabaseChecklist] ⚠️ Inspection still not found after additional refetch, creating empty checklist...');
            const emptyChecklist = createChecklist(propertyId, checklistType, {});
            setChecklist(emptyChecklist);
            inspectionCreationInProgressRef.current = false;
            initializationInProgressRef.current = false;
            setIsLoading(false);
            return;
          }
          // Si ahora tenemos la inspección, resetear el flag y continuar
          console.log('[useSupabaseChecklist] ✅ Inspection found after additional refetch');
          inspectionCreationInProgressRef.current = false;
          // Continuar con la inicialización normal (no retornar aquí)
        }
        
        // Si no hay inspección, crear una nueva
        if (!inspection && !inspectionCreationInProgressRef.current && functionsRef.current) {
          inspectionCreationInProgressRef.current = true;
          console.log('[useSupabaseChecklist] 📝 Creating new inspection...');
          const newInspection = await functionsRef.current.createInspection(propertyId, inspectionType);
          if (!newInspection) {
            console.error('[useSupabaseChecklist] ❌ Failed to create inspection');
            setIsLoading(false);
            initializationInProgressRef.current = false;
            inspectionCreationInProgressRef.current = false;
            return;
          }
          console.log('[useSupabaseChecklist] ✅ Inspection created, refetching...');
          // Refetch para obtener zonas y elementos
          await functionsRef.current.refetchInspection();
          // Esperar un momento para que el estado se actualice después del refetch
          // El estado de React puede tardar un momento en actualizarse después del refetch
          await new Promise(resolve => setTimeout(resolve, 500));
          // Después del refetch, crear un checklist vacío para que el usuario pueda ver algo
          // El siguiente ciclo del efecto continuará cuando la inspección esté disponible
          // Nota: Estamos dentro de un bloque donde !inspection era true, así que inspection puede ser null
          // El refetch puede no haber actualizado el estado aún, así que creamos un checklist vacío
          console.log('[useSupabaseChecklist] ⏳ Inspection not yet available after refetch, creating empty checklist...');
          const emptyChecklist = createChecklist(propertyId, checklistType, {});
          setChecklist(emptyChecklist);
          const stableKey = `${propertyId}-${checklistType}-no-inspection-yet`;
          initializationRef.current = stableKey;
          // Resetear flags para permitir que el siguiente ciclo del efecto continúe
          initializationInProgressRef.current = false;
          inspectionCreationInProgressRef.current = false;
          setIsLoading(false);
          return;
        }

        // Si hay inspección pero no hay zonas, crear zonas iniciales
        if (zones.length === 0 && supabaseProperty && inspection?.id && functionsRef.current) {
          console.log('[useSupabaseChecklist] 📝 Creating initial zones...');
          await functionsRef.current.createInitialZones(inspection.id);
          await functionsRef.current.refetchInspection();
          // Esperar a que las zonas se carguen antes de continuar
          // El efecto se ejecutará de nuevo cuando zones.length > 0
          // Establecer loading en false temporalmente mientras esperamos las zonas
          setIsLoading(false);
          initializationInProgressRef.current = false;
          return; // El flag se mantiene en true hasta que tengamos las zonas
        }
        
        // Si no hay inspección pero tenemos zonas, algo está mal - esperar
        if (zones.length > 0 && !inspection?.id) {
          console.log('[useSupabaseChecklist] ⚠️ Zones exist but no inspection, waiting...');
          setIsLoading(false);
          initializationInProgressRef.current = false;
          return;
        }

        // Cargar checklist desde Supabase
        if (zones.length > 0) {
          // Log detallado de todos los elementos
          const allElementsDetails = elements.map(e => ({
            id: e.id,
            element_name: e.element_name,
            zone_id: e.zone_id,
            has_image_urls: !!e.image_urls,
            image_urls_count: e.image_urls?.length || 0,
            image_urls: e.image_urls, // Incluir las URLs para debugging
          }));
          
          const photoElementsDetails = elements.filter(e => e.element_name?.startsWith('fotos-')).map(e => ({
            id: e.id,
            element_name: e.element_name,
            zone_id: e.zone_id,
            image_urls_count: e.image_urls?.length || 0,
            image_urls: e.image_urls,
          }));
          
          console.log('[useSupabaseChecklist] 📥 Loading checklist from Supabase...', {
            zonesCount: zones.length,
            elementsCount: elements.length,
            bedrooms: supabaseProperty.bedrooms,
            bathrooms: supabaseProperty.bathrooms,
            photoElementsCount: photoElementsDetails.length,
            photoElements: photoElementsDetails,
            allElementsCount: allElementsDetails.length,
            allElements: allElementsDetails,
          });
          
          const supabaseData = convertSupabaseToChecklist(
            zones,
            elements,
            supabaseProperty.bedrooms || null,
            supabaseProperty.bathrooms || null
          );
          
          console.log('[useSupabaseChecklist] ✅ Converted Supabase data:', {
            sectionsCount: Object.keys(supabaseData.sections || {}).length,
          });
          
          // Crear checklist con datos de Supabase
          const loadedChecklist = createChecklist(propertyId, checklistType, supabaseData.sections || {});
          setChecklist(loadedChecklist);
          if (inspection?.id) {
            const stableKey = `${propertyId}-${checklistType}-${inspection.id}`;
            initializationRef.current = stableKey; // Marcar como inicializado (sin zones.length)
            lastZonesCountRef.current = zones.length; // Actualizar contador
          }
          console.log('[useSupabaseChecklist] ✅ Checklist loaded and set');
        } else {
          console.log('[useSupabaseChecklist] 📝 Creating empty checklist...');
          // Si no hay datos, crear checklist vacío
          // Esto puede pasar si no hay zonas todavía o si la inspección aún no está disponible
          const newChecklist = createChecklist(propertyId, checklistType, {});
          setChecklist(newChecklist);
          // Marcar como inicializado incluso si no hay inspección todavía
          // Esto permite que el usuario vea el checklist vacío mientras se carga
          const stableKey = inspection?.id 
            ? `${propertyId}-${checklistType}-${inspection.id}`
            : `${propertyId}-${checklistType}-no-inspection`;
          initializationRef.current = stableKey;
          lastZonesCountRef.current = zones.length; // Actualizar contador
          console.log('[useSupabaseChecklist] ✅ Empty checklist created and set');
        }
      } catch (error) {
        console.error('[useSupabaseChecklist] ❌ Error initializing checklist:', error);
        toast.error("Error al inicializar checklist");
      } finally {
        setIsLoading(false);
        initializationInProgressRef.current = false;
        console.log('[useSupabaseChecklist] ✅ Initialization completed');
      }
    };

    initializeChecklist();
    
    // Cleanup timeout al desmontar
    return () => {
      if (zonesCreationTimeoutRef.current) {
        clearTimeout(zonesCreationTimeoutRef.current);
      }
    };
    // Solo dependencias esenciales - las funciones están en functionsRef para evitar re-ejecuciones
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, inspection?.id, inspectionLoading, checklistType, supabaseProperty?.bedrooms, supabaseProperty?.bathrooms]);
  
  // Memoizar valores estables para el array de dependencias (siempre el mismo tamaño)
  const bedroomsCount = supabaseProperty?.bedrooms ?? null;
  const bathroomsCount = supabaseProperty?.bathrooms ?? null;
  const inspectionId = inspection?.id ?? null;
  const hasSupabaseProperty = !!supabaseProperty;
  const hasInspection = !!inspection;
  
  // Efecto separado para manejar cambios en zones y elements cuando están completamente cargadas
  // Usar un ref para rastrear el último zones.length y elements.length procesados
  const lastProcessedZonesLengthRef = useRef(0);
  const lastProcessedElementsLengthRef = useRef(0);
  
  useEffect(() => {
    // Solo procesar si no hay inicialización en progreso, tenemos datos básicos, y no estamos cargando
    if (initializationInProgressRef.current || !propertyId || !hasSupabaseProperty || !hasInspection || inspectionLoading) {
      return;
    }

    // Solo procesar si zones.length es estable (no está cambiando)
    if (zones.length === 0) {
      return;
    }

    // Verificar si zones o elements cambiaron
    const zonesCountChanged = zones.length > 0 && zones.length !== lastProcessedZonesLengthRef.current;
    const elementsCountChanged = elements.length !== lastProcessedElementsLengthRef.current;
    const shouldReload = (zonesCountChanged || elementsCountChanged) && !initializationInProgressRef.current;
    
    if (shouldReload) {
      console.log('[useSupabaseChecklist] 🔄 Zones/Elements changed, reloading checklist...', {
        oldZonesCount: lastProcessedZonesLengthRef.current,
        newZonesCount: zones.length,
        oldElementsCount: lastProcessedElementsLengthRef.current,
        newElementsCount: elements.length,
        photoElementsCount: elements.filter(e => e.element_name?.startsWith('fotos-')).length,
      });
      
      // Marcar que estamos recargando para evitar loops
      initializationInProgressRef.current = true;
      
      lastProcessedZonesLengthRef.current = zones.length;
      lastProcessedElementsLengthRef.current = elements.length;
      
      // Recargar checklist con zonas y elementos actualizados
      const supabaseData = convertSupabaseToChecklist(
        zones,
        elements,
        bedroomsCount,
        bathroomsCount
      );
      
      const loadedChecklist = createChecklist(propertyId, checklistType, supabaseData.sections || {});
      setChecklist(loadedChecklist);
      if (inspectionId) {
        const stableKey = `${propertyId}-${checklistType}-${inspectionId}`;
        initializationRef.current = stableKey;
      }
      
      console.log('[useSupabaseChecklist] ✅ Checklist reloaded with updated zones/elements');
      
      // Resetear flag después de un breve delay para permitir que el estado se estabilice
      setTimeout(() => {
        initializationInProgressRef.current = false;
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones.length, elements.length, propertyId, checklistType, bedroomsCount, bathroomsCount, inspectionId, inspectionLoading, hasSupabaseProperty, hasInspection]); // Fixed: Use stable boolean values to ensure consistent array size

  // Guardar sección actual en Supabase
  // Flag para prevenir múltiples ejecuciones simultáneas
  const savingRef = useRef(false);

  const saveCurrentSection = useCallback(async () => {
    // Prevenir múltiples ejecuciones simultáneas
    if (savingRef.current) {
      console.log('[useSupabaseChecklist] ⏸️ Save already in progress, skipping...');
      return;
    }

    savingRef.current = true;
    
    try {
      if (!inspection?.id || !checklist || !currentSectionRef.current) {
        return;
      }

      const sectionId = currentSectionRef.current;
      const section = checklist.sections[sectionId];
      if (!section) {
        return;
      }
      // Encontrar zona correspondiente
      const expectedZoneType = sectionId === "habitaciones" ? "dormitorio" :
                              sectionId === "banos" ? "bano" :
                              sectionId === "entorno-zonas-comunes" ? "entorno" :
                              sectionId === "estado-general" ? "distribucion" :
                              sectionId === "entrada-pasillos" ? "entrada" :
                              sectionId === "salon" ? "salon" :
                              sectionId === "cocina" ? "cocina" :
                              sectionId === "exteriores" ? "exterior" : null;
      
      const zone = zones.find(z => z.zone_type === expectedZoneType);

      console.log(`[useSupabaseChecklist] 🔍 Finding zone for section "${sectionId}":`, {
        sectionId,
        expectedZoneType,
        availableZones: zones.map(z => ({ id: z.id, zone_type: z.zone_type, zone_name: z.zone_name })),
        foundZone: zone ? { id: zone.id, zone_type: zone.zone_type, zone_name: zone.zone_name } : null,
      });

      if (!zone) {
        console.error(`[useSupabaseChecklist] ❌ No se encontró zona para sección ${sectionId} con zone_type ${expectedZoneType}`);
        console.error(`[useSupabaseChecklist] Available zones:`, zones.map(z => ({ id: z.id, zone_type: z.zone_type, zone_name: z.zone_name })));
        return;
      }

      // Subir imágenes y videos primero
      const allFiles: FileUpload[] = [];
      
      // Recopilar todos los archivos de la sección
      if (section.uploadZones) {
        section.uploadZones.forEach(uploadZone => {
          allFiles.push(...(uploadZone.photos || []), ...(uploadZone.videos || []));
        });
      }
      
      if (section.questions) {
        section.questions.forEach(question => {
          if (question.photos) {
            allFiles.push(...question.photos);
          }
        });
      }
      
      if (section.dynamicItems) {
        section.dynamicItems.forEach(item => {
          if (item.uploadZone) {
            allFiles.push(...(item.uploadZone.photos || []), ...(item.uploadZone.videos || []));
          }
          if (item.questions) {
            item.questions.forEach(q => {
              if (q.photos) {
                allFiles.push(...q.photos);
              }
            });
          }
        });
      }

      // Subir archivos y actualizar URLs
      if (!inspection?.id) {
        console.error('[useSupabaseChecklist] ❌ Cannot upload files: inspection.id is null');
        return;
      }
      
      // Filtrar solo archivos que necesitan ser subidos (base64 o sin URL)
      const filesToUpload = allFiles.filter(file => 
        file.data && 
        !file.data.startsWith('http') && 
        (file.data.startsWith('data:') || file.data.length > 0)
      );
      
      let uploadedUrls: string[] = [];
      if (filesToUpload.length > 0) {
        console.log(`[useSupabaseChecklist] 📤 Uploading ${filesToUpload.length} files to storage...`);
        try {
          uploadedUrls = await uploadFilesToStorage(
            filesToUpload,
            propertyId,
            inspection.id,
            zone.id
          );
          console.log(`[useSupabaseChecklist] ✅ Uploaded ${uploadedUrls.length} files successfully`);
        } catch (error: any) {
          // Si el bucket no existe, continuar con base64 en lugar de fallar
          if (error?.message?.includes('Bucket not found') || error?.message?.includes('bucket')) {
            console.warn(`[useSupabaseChecklist] ⚠️ Bucket no encontrado. Las fotos se guardarán como base64 hasta que crees el bucket.`);
            // Usar los datos base64 como URLs temporales
            uploadedUrls = filesToUpload.map(f => f.data || '').filter(Boolean);
          } else {
            throw error;
          }
        }
      }

      // Crear mapa de archivos originales a URLs subidas
      const fileUrlMap = new Map<string, string>();
      let uploadedIndex = 0;
      allFiles.forEach((file) => {
        // Si el archivo ya tiene URL (ya subido), mantenerla
        if (file.data && file.data.startsWith('http')) {
          fileUrlMap.set(file.id, file.data);
        }
        // Si el archivo fue subido ahora, usar la nueva URL
        else if (filesToUpload.includes(file) && uploadedUrls[uploadedIndex]) {
          fileUrlMap.set(file.id, uploadedUrls[uploadedIndex]);
          uploadedIndex++;
        }
      });

      // Actualizar URLs en la sección antes de convertir
      const updatedSection = { ...section };
      if (updatedSection.uploadZones) {
        updatedSection.uploadZones = updatedSection.uploadZones.map(uploadZone => ({
          ...uploadZone,
          photos: uploadZone.photos.map(photo => {
            const updatedUrl = fileUrlMap.get(photo.id) || photo.data;
            console.log(`[useSupabaseChecklist] 📸 Updating photo URL for ${uploadZone.id}:`, {
              photoId: photo.id,
              oldData: photo.data?.substring(0, 50),
              newUrl: updatedUrl?.substring(0, 50),
              hasHttp: updatedUrl?.startsWith('http'),
            });
            return {
              ...photo,
              data: updatedUrl,
            };
          }),
          videos: uploadZone.videos.map(video => {
            const updatedUrl = fileUrlMap.get(video.id) || video.data;
            return {
              ...video,
              data: updatedUrl,
            };
          }),
        }));
      }

      // Log de la sección antes de convertir
      console.log(`[useSupabaseChecklist] 📋 Section data before conversion:`, {
        sectionId,
        uploadZonesCount: updatedSection.uploadZones?.length || 0,
        uploadZones: updatedSection.uploadZones?.map(uz => ({
          id: uz.id,
          photosCount: uz.photos?.length || 0,
          videosCount: uz.videos?.length || 0,
          photos: uz.photos?.map(p => ({
            id: p.id,
            hasData: !!p.data,
            dataType: p.data?.substring(0, 20) || 'no data',
            startsWithHttp: p.data?.startsWith('http') || false,
          })) || [],
        })) || [],
        zoneId: zone.id,
        zoneType: zone.zone_type,
      });

      // Convertir sección a elementos (con URLs actualizadas)
      const elementsToSave = convertSectionToElements(sectionId, updatedSection, zone.id);
      
      // Log elementos que se van a guardar
      const photoElements = elementsToSave.filter(e => e.element_name?.startsWith('fotos-'));
      console.log(`[useSupabaseChecklist] 💾 Saving ${photoElements.length} photo elements out of ${elementsToSave.length} total elements:`, 
        photoElements.map(e => ({
          element_name: e.element_name,
          zone_id: e.zone_id,
          image_urls_count: e.image_urls?.length || 0,
          image_urls: e.image_urls,
        }))
      );
      
      // Log todos los elementos para debugging
      console.log(`[useSupabaseChecklist] 📦 All elements to save (${elementsToSave.length}):`, 
        elementsToSave.map(e => ({
          element_name: e.element_name,
          zone_id: e.zone_id,
          has_image_urls: !!e.image_urls,
          image_urls_count: e.image_urls?.length || 0,
        }))
      );

      // Guardar elementos
      for (const elementData of elementsToSave) {
        console.log(`[useSupabaseChecklist] 💾 Upserting element:`, {
          element_name: elementData.element_name,
          zone_id: elementData.zone_id,
          image_urls: elementData.image_urls,
          image_urls_count: elementData.image_urls?.length || 0,
          video_urls: elementData.video_urls,
          video_urls_count: elementData.video_urls?.length || 0,
        });
        const result = await upsertElement(elementData);
        console.log(`[useSupabaseChecklist] ✅ Upserted element result:`, {
          element_name: elementData.element_name,
          result_id: result?.id,
          result_image_urls: result?.image_urls,
          result_image_urls_count: result?.image_urls?.length || 0,
        });
      }

      // NOTA: La sincronización con Airtable ahora solo ocurre al finalizar el checklist
      // Esto evita múltiples llamadas innecesarias y errores si el Record ID no existe

      // Recargar elementos desde Supabase para asegurar que los elementos con fotos- se carguen
      console.log('[useSupabaseChecklist] 🔄 Refetching inspection after save to reload elements...');
      await refetchInspection();
      
      // Recargar checklist con los nuevos elementos
      // Esperar un momento para que el estado se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Recargar checklist manualmente con los elementos actualizados
      if (inspection?.id && zones.length > 0) {
        console.log('[useSupabaseChecklist] 🔄 Reloading checklist with updated elements...');
        const supabaseData = convertSupabaseToChecklist(
          zones,
          elements,
          supabaseProperty?.bedrooms ?? null,
          supabaseProperty?.bathrooms ?? null
        );
        
        const loadedChecklist = createChecklist(propertyId, checklistType, supabaseData.sections || {});
        setChecklist(loadedChecklist);
        console.log('[useSupabaseChecklist] ✅ Checklist reloaded with updated elements');
      }

      toast.success("Sección guardada correctamente");
    } catch (error) {
      console.error("Error saving section:", error);
      toast.error("Error al guardar sección");
    } finally {
      savingRef.current = false;
    }
    }, [inspection, checklist, zones, upsertElement, propertyId]);

  // Actualizar sección (solo actualiza estado local, NO guarda automáticamente)
  const updateSection = useCallback(
    async (sectionId: string, sectionData: Partial<ChecklistSection>) => {
      // NO guardar automáticamente aquí - solo actualizar estado local
      // El guardado se hará al cambiar de sección o al finalizar

      console.log('[useSupabaseChecklist] 🔄 updateSection called:', {
        sectionId,
        sectionData,
        sectionDataKeys: Object.keys(sectionData),
        uploadZones: sectionData.uploadZones?.map(z => ({ id: z.id, photosCount: z.photos.length, videosCount: z.videos.length })),
        uploadZonesLength: sectionData.uploadZones?.length || 0,
        uploadZonesRaw: sectionData.uploadZones
      });

      // Actualizar estado local
      setChecklist((prevChecklist) => {
        if (!prevChecklist) {
          console.warn('[useSupabaseChecklist] ⚠️ prevChecklist is null');
          return null;
        }

        const currentSection = prevChecklist.sections[sectionId] || {};
        console.log('[useSupabaseChecklist] 📋 Merging sections:', {
          sectionId,
          currentSectionUploadZones: currentSection.uploadZones?.map(z => ({ id: z.id, photosCount: z.photos.length, videosCount: z.videos.length })),
          currentSectionUploadZonesLength: currentSection.uploadZones?.length || 0,
          sectionDataUploadZones: sectionData.uploadZones?.map(z => ({ id: z.id, photosCount: z.photos.length, videosCount: z.videos.length })),
          sectionDataUploadZonesLength: sectionData.uploadZones?.length || 0,
          sectionDataKeys: Object.keys(sectionData)
        });
        const updatedSection: ChecklistSection = {
          ...currentSection,
          ...sectionData,
        };
        console.log('[useSupabaseChecklist] ✅ Merged section:', {
          sectionId,
          updatedSectionUploadZones: updatedSection.uploadZones?.map(z => ({ id: z.id, photosCount: z.photos.length, videosCount: z.videos.length })),
          updatedSectionUploadZonesLength: updatedSection.uploadZones?.length || 0
        });

        const updatedSections = {
          ...prevChecklist.sections,
          [sectionId]: updatedSection,
        };

        const updatedChecklist = {
          ...prevChecklist,
          sections: updatedSections,
          lastUpdated: new Date().toISOString(),
        };

        console.log('[useSupabaseChecklist] ✅ Checklist updated:', {
          sectionId,
          updatedSectionUploadZones: updatedSection.uploadZones?.map(z => ({ id: z.id, photosCount: z.photos.length, videosCount: z.videos.length })),
          allSections: Object.keys(updatedSections)
        });

        return updatedChecklist;
      });

      // Actualizar referencia de sección actual
      currentSectionRef.current = sectionId;
      pendingSaveRef.current = { sectionId, sectionData };
    },
    []
  );

  // Guardar todo
  const save = useCallback(async () => {
    await saveCurrentSection();
  }, [saveCurrentSection]);

  // Finalizar checklist
  const finalizeChecklist = useCallback(async (data?: { estimatedVisitDate?: string; autoVisitDate?: string; nextRenoSteps?: string }) => {
    if (!propertyId || !checklist) return false;

    try {
      // Guardar sección actual antes de finalizar
      await saveCurrentSection();

      // Calcular progreso final del checklist
      const totalSections = Object.keys(checklist.sections || {}).length;
      let completedSections = 0;
      for (const sid in checklist.sections) {
        const section = checklist.sections[sid];
        if (!section) continue;
        // Consider completed if it has questions with notes, uploadZones with files, or dynamicItems
        const hasQuestions = section.questions && section.questions.some((q: any) => q.notes);
        const hasUploads = section.uploadZones && section.uploadZones.some((u: any) => 
          (u.photos && u.photos.length > 0) || (u.videos && u.videos.length > 0)
        );
        const hasDynamicItems = section.dynamicItems && section.dynamicItems.length > 0;
        if (hasQuestions || hasUploads || hasDynamicItems) {
          completedSections++;
        }
      }
      const progress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 100;

      // Obtener datos de la propiedad para completar los campos
      const supabase = createClient();
      const { data: prop } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();
      
      const propData = prop as any;
      const estimatedVisitDate = data?.estimatedVisitDate || propData?.['Estimated Visit Date'];
      const autoVisitDate = data?.autoVisitDate || new Date().toISOString().split('T')[0];
      const nextRenoSteps = data?.nextRenoSteps || propData?.next_reno_steps;

      // Finalizar en Airtable (solo para reno checklists)
      if (checklistType !== 'reno_initial' && checklistType !== 'reno_final') {
        console.warn('[useSupabaseChecklist] Cannot finalize non-reno checklist');
        return false;
      }
      
      const success = await finalizeInitialCheckInAirtable(propertyId, checklistType as 'reno_initial' | 'reno_final', {
        estimatedVisitDate,
        autoVisitDate,
        nextRenoSteps,
        progress, // Incluir progreso al finalizar
      });

      if (success) {
        toast.success("Checklist finalizado correctamente");
      } else {
        toast.error("Error al finalizar checklist en Airtable");
      }

      return success;
    } catch (error) {
      console.error('[useSupabaseChecklist] Error finalizing checklist:', error);
      toast.error("Error al finalizar checklist");
      return false;
    }
  }, [propertyId, checklistType, checklist, saveCurrentSection]);

  // Si no tenemos checklist pero estamos inicializando, mantener isLoading en true
  const finalIsLoading = isLoading || inspectionLoading || (!checklist && (initializationInProgressRef.current || inspectionCreationInProgressRef.current));

  return {
    checklist,
    isLoading: finalIsLoading,
    updateSection,
    save,
    saveCurrentSection,
    finalizeChecklist,
  };
}

