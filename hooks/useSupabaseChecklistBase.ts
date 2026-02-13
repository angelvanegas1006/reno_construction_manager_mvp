"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// Helper para condicionar logs solo en desarrollo
const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = (...args: any[]) => {
  if (DEBUG) console.log(...args);
};
const debugWarn = (...args: any[]) => {
  if (DEBUG) console.warn(...args);
};
const debugError = (...args: any[]) => {
  // Los errores siempre se muestran, pero con menos detalle en producción
  if (DEBUG) {
    console.error(...args);
  } else {
    // En producción, solo mostrar mensaje básico
    const [message, ...rest] = args;
    if (typeof message === 'string') {
      console.error(message);
    }
  }
};
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
import { createDriveFolderForProperty, uploadPhotosToDrive } from "@/lib/n8n/webhook-caller";

interface UseSupabaseChecklistBaseProps {
  propertyId: string;
  checklistType: ChecklistType;
  inspectionType: InspectionType; // Tipo fijo de inspección
  enabled?: boolean; // Si es false, el hook no hará fetch ni ejecutará lógica
}

interface UseSupabaseChecklistBaseReturn {
  checklist: ChecklistData | null;
  isLoading: boolean;
  updateSection: (sectionId: string, sectionData: Partial<ChecklistSection>) => Promise<void>;
  saveCurrentSection: (sectionId?: string) => Promise<void>;
  saveAllSections: () => Promise<void>;
  finalizeChecklist: (data?: {
    estimatedVisitDate?: string;
    autoVisitDate?: string;
    nextRenoSteps?: string;
    readyForCommercialization?: boolean;
  }) => Promise<boolean>;
}

/**
 * Hook base para manejar checklists de Supabase
 * Este hook maneja un tipo específico de inspección (initial o final)
 * y mantiene su estado completamente separado
 */
export function useSupabaseChecklistBase({
  propertyId,
  checklistType,
  inspectionType, // Tipo fijo de inspección
  enabled = true, // Por defecto está habilitado
}: UseSupabaseChecklistBaseProps): UseSupabaseChecklistBaseReturn {
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentSectionRef = useRef<string | null>(null);
  const pendingSaveRef = useRef<{ sectionId: string; sectionData: Partial<ChecklistSection> } | null>(null);
  const initializationRef = useRef<string | null>(null);
  const initializationInProgressRef = useRef<boolean>(false);
  const lastZonesCountRef = useRef<number>(0);
  const zonesCreationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inspectionCreationInProgressRef = useRef<boolean>(false);
  const savingRef = useRef<boolean>(false);
  const checklistRef = useRef<ChecklistData | null>(null);
  const lastInspectionLoadingRef = useRef<boolean>(true);
  const lastInspectionIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastConversionRef = useRef<{ key: string; data: Partial<ChecklistData> } | null>(null);
  const functionsRef = useRef<{
    createInspection: (propertyId: string, type: InspectionType) => Promise<any>;
    refetchInspection: () => Promise<void>;
    createInitialZones: (inspectionId: string) => Promise<void>;
  } | null>(null);
  // Ref para acumular URLs de fotos del initial check para enviarlas todas juntas al final
  const accumulatedInitialCheckPhotosRef = useRef<Array<{ url: string; filename: string }>>([]);
  // Contador de reintentos de refetch cuando zones siguen en 0 (evitar mostrar checklist vacío antes de que existan zonas)
  const zonesRefetchRetryCountRef = useRef<number>(0);
  const maxZonesRefetchRetries = 5;
  /** Cuando es true, saveCurrentSection no hace refetch; evita que saveAllSections sobrescriba el checklist con datos parciales tras cada sección */
  const savingAllSectionsRef = useRef<boolean>(false);
  /** Checklist con URLs actualizadas tras cada save, para pasar a finalize si Supabase tiene 0 elementos */
  const checklistForFinalizeRef = useRef<ChecklistData | null>(null);
  
  // Keep checklistRef in sync with checklist state
  useEffect(() => {
    checklistRef.current = checklist;
  }, [checklist]);

  // Log initialization only once per mount (using ref to track)
  const hasLoggedRef = useRef(false);
  if (!hasLoggedRef.current) {
    debugLog(`[useSupabaseChecklistBase:${inspectionType}] 🔍 Initialized:`, {
      checklistType,
      inspectionType,
      propertyId,
      enabled,
    });
    hasLoggedRef.current = true;
  }

  // Hook de Supabase para inspecciones - solo hace fetch si está habilitado
  const {
    inspection,
    zones,
    elements,
    loading: inspectionLoading,
    createInspection,
    createZone,
    upsertElement,
    refetch: refetchInspection,
  } = useSupabaseInspection(propertyId, inspectionType, enabled);

  // Hook para obtener datos de la propiedad (bedrooms, bathrooms)
  const { property: supabaseProperty } = useSupabaseProperty(propertyId);

  // Crear zonas iniciales automáticamente
  const createInitialZones = useCallback(async (inspectionId: string) => {
    if (!supabaseProperty || !createZone) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Cannot create zones - missing data:`, {
        hasSupabaseProperty: !!supabaseProperty,
        hasCreateZone: !!createZone,
      });
      return;
    }
    
    const bedrooms = supabaseProperty.bedrooms || 0;
    const bathrooms = supabaseProperty.bathrooms || 0;

    console.log(`[useSupabaseChecklistBase:${inspectionType}] 📝 Creating initial zones for checklist...`, {
      inspectionId,
      checklistType,
      bedrooms,
      bathrooms,
    });

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
          { id: "ascensor" },
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
    let zonesCreated = 0;
    for (const [sectionId, section] of Object.entries(tempChecklist.sections)) {
      const zonesToCreate = convertSectionToZones(sectionId, section, inspectionId);
      
      for (const zoneData of zonesToCreate) {
        const createdZone = await createZone(zoneData);
        if (createdZone) {
          zonesCreated++;
          console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Created zone:`, {
            zoneId: createdZone.id,
            zoneType: createdZone.zone_type,
            zoneName: createdZone.zone_name,
            sectionId,
          });
        } else {
          console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Failed to create zone:`, zoneData);
        }
      }
    }
    
    console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Created ${zonesCreated} zones total`);
  }, [supabaseProperty, propertyId, checklistType, createZone, inspectionType]);

  // Guardar funciones en ref para acceso estable
  useEffect(() => {
    functionsRef.current = {
      createInspection,
      refetchInspection,
      createInitialZones,
    };
  }, [createInspection, refetchInspection, createInitialZones]);

  // Inicializar inspección y checklist
  useEffect(() => {
    // Si el hook está deshabilitado, no ejecutar ninguna lógica
    if (!enabled) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] 🚫 Hook disabled, skipping all logic`, {
        enabled,
        inspectionType,
        checklistType,
        propertyId,
      });
      setIsLoading(false);
      return;
    }
    
    const inspectionId = inspection?.id;
    
    // VERIFICACIÓN TEMPRANA: Si la inspección existe pero no corresponde al tipo correcto, NO hacer nada
    // Esto evita que el hook ejecute lógica innecesaria cuando está esperando la inspección correcta
    if (inspection && (inspection as any).inspection_type !== inspectionType) {
      // Si ya tenemos un checklist cargado para este tipo, mantenerlo
      const currentKey = `${propertyId}-${checklistType}-${inspectionId || 'no-inspection'}`;
      if (initializationRef.current === currentKey && checklistRef.current) {
        // Ya está inicializado correctamente, solo actualizar loading state si es necesario
        if (isLoading) {
          setIsLoading(false);
        }
        return;
      }
      // Si no está inicializado, esperar silenciosamente sin ejecutar lógica
      // NO establecer isLoading a true aquí porque causaría re-renders innecesarios
      // Simplemente retornar sin hacer nada
      return;
    }
    
    // VERIFICACIÓN ADICIONAL: Si inspectionLoading es true pero no tenemos inspección aún,
    // verificar si ya tenemos un checklist inicializado para evitar ejecuciones innecesarias
    if (inspectionLoading && !inspection) {
      // Si ya tenemos un checklist inicializado para este tipo, simplemente esperar
      if (checklistRef.current && initializationRef.current) {
        const currentKey = `${propertyId}-${checklistType}-no-inspection-yet`;
        if (initializationRef.current === currentKey || initializationRef.current.startsWith(`${propertyId}-${checklistType}-`)) {
          // Ya tenemos un checklist inicializado, solo esperar a que termine el loading
          setIsLoading(true);
          return;
        }
      }
      // Si no tenemos checklist inicializado, verificar si este hook realmente necesita ejecutarse
      // Si el otro hook (initial/final) ya está ejecutando su lógica, este hook puede esperar
      // Esto evita que ambos hooks ejecuten lógica simultáneamente
      if (initializationInProgressRef.current) {
        // Ya hay una inicialización en progreso, esperar sin ejecutar lógica
        setIsLoading(true);
        return;
      }
    }
    
    // Evitar ejecuciones innecesarias cuando inspectionLoading cambia pero no hay cambios significativos
    const isLoadingChanged = lastInspectionLoadingRef.current !== inspectionLoading;
    const inspectionIdChanged = lastInspectionIdRef.current !== inspectionId;
    
    // Actualizar refs ANTES de las verificaciones para tener el estado correcto
    lastInspectionLoadingRef.current = inspectionLoading;
    lastInspectionIdRef.current = inspectionId || null;
    
    // Si ya se inicializó exitosamente y no hay cambios significativos, evitar re-ejecutar
    const currentKey = `${propertyId}-${checklistType}-${inspectionId || 'no-inspection'}`;
    // Verificar si ya se inicializó completamente (tiene checklist y zonas)
    const isAlreadyInitialized = initializationRef.current === currentKey && checklistRef.current && inspectionId && zones.length > 0;
    
    // Verificar si estamos esperando que se carguen las zonas después de crearlas
    const waitingForZones = initializationRef.current === currentKey && zones.length === 0 && inspectionId && !inspectionLoading;
    
    // Si está inicializado y solo cambió inspectionLoading de true a false (sin otros cambios), no hacer nada
    if (isAlreadyInitialized && !isLoadingChanged && !inspectionIdChanged) {
      return;
    }
    
    // Si está inicializado pero inspectionLoading cambió de false a true, esperar sin ejecutar lógica
    // Esto puede pasar cuando se están cargando zonas después de crearlas
    if (isAlreadyInitialized && isLoadingChanged && inspectionLoading) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏳ Already initialized, waiting for loading to complete...`, {
        initializationRef: initializationRef.current,
        currentKey,
        zonesCount: zones.length,
      });
      setIsLoading(true);
      return;
    }
    
    // Si está inicializado y inspectionLoading cambió de true a false pero no hay cambios en zones/elements, no hacer nada
    if (isAlreadyInitialized && isLoadingChanged && !inspectionLoading && !inspectionIdChanged) {
      const zonesCountChanged = zones.length !== lastZonesCountRef.current;
      const elementsCountChanged = elements.length !== lastProcessedElementsLengthRef.current;
      if (!zonesCountChanged && !elementsCountChanged) {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Already initialized, no changes detected, skipping...`);
        setIsLoading(false);
        return;
      }
    }
    
    // VERIFICACIÓN CRÍTICA: Si ya marcamos que estamos esperando zonas y aún no hay zonas, esperar
    // Esto evita bucles infinitos cuando se crean zonas pero aún no se han cargado
    if (initializationRef.current === currentKey && zones.length === 0 && inspectionLoading && inspectionId) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏳ Waiting for zones to load after creation...`, {
        initializationRef: initializationRef.current,
        currentKey,
        inspectionId,
      });
      setIsLoading(true);
      return;
    }

    console.log(`[useSupabaseChecklistBase:${inspectionType}] 🔄 Effect triggered:`, {
      enabled,
      propertyId,
      inspectionLoading,
      hasSupabaseProperty: !!supabaseProperty,
      hasInspection: !!inspection,
      inspectionId,
      inspectionType: (inspection as any)?.inspection_type,
      expectedInspectionType: inspectionType,
      zonesCount: zones.length,
      elementsCount: elements.length,
      initializationInProgress: initializationInProgressRef.current,
      isLoadingChanged,
      inspectionIdChanged,
      isAlreadyInitialized,
      checklistRefCurrent: !!checklistRef.current,
      initializationRefCurrent: initializationRef.current,
    });

    // Evitar ejecuciones múltiples simultáneas
    // PERO permitir continuar si estamos esperando que se carguen las zonas después de crearlas
    if (initializationInProgressRef.current) {
      const currentKey = `${propertyId}-${checklistType}-${inspectionId || 'no-inspection'}`;
      // Si ya marcamos que estamos esperando zonas y ahora las zonas están disponibles, permitir continuar
      if (initializationRef.current === currentKey && zones.length > 0 && inspectionId && !inspectionLoading) {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Zones are now available, allowing continuation to load checklist...`);
        // Permitir continuar para cargar el checklist ahora que las zonas están disponibles
        initializationInProgressRef.current = false;
      } else {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Initialization already in progress, skipping...`);
        return;
      }
    }

    if (!propertyId || inspectionLoading || !supabaseProperty) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏳ Waiting for required data...`, {
        hasPropertyId: !!propertyId,
        inspectionLoading,
        hasSupabaseProperty: !!supabaseProperty,
      });
      setIsLoading(true);
      return;
    }

    // Si estamos esperando que se cree una inspección y ahora tenemos una, resetear el flag y continuar
    if (inspectionCreationInProgressRef.current && inspection?.id) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Inspection is now available, resetting creation flag...`);
      inspectionCreationInProgressRef.current = false;
    } else if (inspectionCreationInProgressRef.current && !inspection?.id) {
      if (inspectionLoading) {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏳ Waiting for inspection creation to complete...`);
        setIsLoading(true);
        return;
      } else {
        console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Inspection creation flag is set but no inspection found after loading completed, resetting flag...`);
        inspectionCreationInProgressRef.current = false;
      }
    }

    // Verificar si hay elementos de fotos que necesitan ser cargados
    const hasPhotoElements = elements.some(e => e.element_name?.startsWith('fotos-') && e.image_urls && e.image_urls.length > 0);
    const currentChecklist = checklistRef.current;
    const checklistHasPhotos = currentChecklist && Object.values(currentChecklist.sections).some(section => 
      section.uploadZones?.some(zone => zone.photos && zone.photos.length > 0)
    );
    
    // Si hay elementos de fotos en Supabase pero no en el checklist, forzar recarga
    if (hasPhotoElements && !checklistHasPhotos && zones.length > 0 && inspectionId) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] 🔄 Photo elements found in Supabase but not in checklist, forcing reload...`);
      // Continuar con la inicialización para cargar las fotos
    }
    
    if (zones.length > 0 && inspectionLoading) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏳ Zones are being created, waiting for loading to finish...`, {
        current: zones.length,
        inspectionLoading,
      });
      return;
    }

    lastZonesCountRef.current = zones.length;

    const initializeChecklist = async () => {
      initializationInProgressRef.current = true;
      
      try {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] 🚀 Starting initialization...`);
        setIsLoading(true);
        
        if (inspectionCreationInProgressRef.current && !inspection?.id && !inspectionLoading && functionsRef.current) {
          console.log(`[useSupabaseChecklistBase:${inspectionType}] 🔄 Attempting additional refetch to find created inspection...`);
          await functionsRef.current.refetchInspection();
          await new Promise(resolve => setTimeout(resolve, 500));
          if (!inspection?.id) {
            console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Inspection still not found after additional refetch, creating empty checklist...`);
            const emptyChecklist = createChecklist(propertyId, checklistType, {});
            setChecklist(emptyChecklist);
            inspectionCreationInProgressRef.current = false;
            initializationInProgressRef.current = false;
            setIsLoading(false);
            return;
          }
          console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Inspection found after additional refetch`);
          inspectionCreationInProgressRef.current = false;
        }
        
        // Si no hay inspección, esperar primero a que termine el loading antes de crear una nueva
        if (!inspection && !inspectionCreationInProgressRef.current) {
          if (inspectionLoading) {
            console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏳ Waiting for inspection to load before creating new one...`);
            initializationInProgressRef.current = false;
            setIsLoading(true);
            return;
          }
          
          if (functionsRef.current) {
            inspectionCreationInProgressRef.current = true;
            console.log(`[useSupabaseChecklistBase:${inspectionType}] 📝 Creating new inspection...`);
            const newInspection = await functionsRef.current.createInspection(propertyId, inspectionType);
            if (!newInspection) {
              console.error(`[useSupabaseChecklistBase:${inspectionType}] ❌ Failed to create inspection`);
              setIsLoading(false);
              initializationInProgressRef.current = false;
              inspectionCreationInProgressRef.current = false;
              return;
            }
            console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Inspection created, refetching...`);
            await functionsRef.current.refetchInspection();
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏳ Inspection not yet available after refetch, creating empty checklist...`);
            const emptyChecklist = createChecklist(propertyId, checklistType, {});
            setChecklist(emptyChecklist);
            const stableKey = `${propertyId}-${checklistType}-no-inspection-yet`;
            initializationRef.current = stableKey;
            initializationInProgressRef.current = false;
            inspectionCreationInProgressRef.current = false;
            setIsLoading(false);
            return;
          }
        }

        // Si hay inspección pero no hay zonas, crear zonas iniciales
        if (zones.length === 0 && supabaseProperty && inspection?.id && functionsRef.current) {
          // Verificar si ya intentamos crear las zonas para evitar bucles infinitos
          const currentKey = `${propertyId}-${checklistType}-${inspection.id}`;
          if (initializationRef.current === currentKey && lastZonesCountRef.current === 0) {
            // Ya intentamos crear las zonas pero aún no se han cargado en el estado (zones viene del closure)
            // Reintentar refetch; no mostrar checklist vacío hasta que zones existan (evita "Zone not found" al guardar)
            zonesRefetchRetryCountRef.current += 1;
            const retryCount = zonesRefetchRetryCountRef.current;
            console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏳ Zones were created but not loaded yet, refetching (attempt ${retryCount}/${maxZonesRefetchRetries})...`);
            lastInspectionLoadingRef.current = true;
            await functionsRef.current.refetchInspection();
            await new Promise(resolve => setTimeout(resolve, 600));
            lastInspectionLoadingRef.current = false;
            // No establecer checklist vacío aquí: el refetch actualizará zones en el otro hook y este efecto se re-ejecutará con zones.length > 0
            // Solo si superamos reintentos, mostrar checklist vacío para no bloquear al usuario
            if (zonesRefetchRetryCountRef.current >= maxZonesRefetchRetries) {
              console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Zones still not loaded after ${maxZonesRefetchRetries} refetches, showing empty checklist`);
              const emptyChecklist = createChecklist(propertyId, checklistType, {});
              setChecklist(emptyChecklist);
              setIsLoading(false);
              zonesRefetchRetryCountRef.current = 0;
              initializationInProgressRef.current = false;
              toast.error("No se pudieron cargar las zonas del checklist. Recarga la página o inténtalo de nuevo.");
              return;
            }
            initializationInProgressRef.current = false;
            return;
          }
          
          console.log(`[useSupabaseChecklistBase:${inspectionType}] 📝 Creating initial zones...`);
          zonesRefetchRetryCountRef.current = 0; // Reset antes de crear zonas
          await functionsRef.current.createInitialZones(inspection.id);
          // Marcar que intentamos crear las zonas
          const stableKey = `${propertyId}-${checklistType}-${inspection.id}`;
          initializationRef.current = stableKey;
          lastZonesCountRef.current = 0; // Marcar que intentamos crear pero aún no hay zonas
          // Hacer refetch para cargar las zonas recién creadas
          lastInspectionLoadingRef.current = true;
          await functionsRef.current.refetchInspection();
          await new Promise(resolve => setTimeout(resolve, 500));
          lastInspectionLoadingRef.current = false;
          console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Zones creation completed, refetched inspection`);
          // Si ahora hay zonas, el efecto continuará en la siguiente ejecución
          // Si no hay zonas, el efecto se ejecutará de nuevo pero detectará que ya intentamos crearlas
          setIsLoading(true);
          initializationInProgressRef.current = false;
          return;
        }
        
        // Si no hay inspección pero tenemos zonas, algo está mal - esperar
        if (zones.length > 0 && !inspection?.id) {
          console.log(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Zones exist but no inspection, waiting...`);
          setIsLoading(false);
          initializationInProgressRef.current = false;
          return;
        }

        // Cargar checklist desde Supabase
        if (zones.length > 0) {
          const allElementsDetails = elements.map(e => ({
            id: e.id,
            element_name: e.element_name,
            zone_id: e.zone_id,
            has_image_urls: !!e.image_urls,
            image_urls_count: e.image_urls?.length || 0,
            image_urls: e.image_urls,
          }));
          
          const photoElementsDetails = elements.filter(e => e.element_name?.startsWith('fotos-') && e.image_urls && e.image_urls.length > 0).map(e => ({
            id: e.id,
            element_name: e.element_name,
            zone_id: e.zone_id,
            image_urls_count: e.image_urls?.length || 0,
            image_urls: e.image_urls,
          }));
          
          debugLog(`[useSupabaseChecklistBase:${inspectionType}] 📥 Loading checklist from Supabase...`, {
            zonesCount: zones.length,
            elementsCount: elements.length,
            bedrooms: supabaseProperty.bedrooms,
            bathrooms: supabaseProperty.bathrooms,
            photoElementsCount: photoElementsDetails.length,
          });
          
          // Memoizar conversión usando cache key basada en los datos
          // Crear una key única basada en los datos de entrada para cachear
          const zonesKey = zones.map(z => `${z.id}-${z.zone_type}`).join(',');
          const elementsKey = elements.map(e => `${e.id}-${e.element_name}-${e.zone_id}`).join(',');
          const bedroomsKey = supabaseProperty.bedrooms || 'null';
          const bathroomsKey = supabaseProperty.bathrooms || 'null';
          const conversionCacheKey = `${zonesKey}|${elementsKey}|${bedroomsKey}|${bathroomsKey}`;
          
          // Usar ref para cachear la última conversión y evitar recalcular si los datos no cambiaron
          let supabaseData: Partial<ChecklistData>;
          if (lastConversionRef.current?.key === conversionCacheKey) {
            // Reutilizar datos cacheados si la key no cambió
            supabaseData = lastConversionRef.current.data;
            debugLog(`[useSupabaseChecklistBase:${inspectionType}] ♻️ Using cached conversion data`);
          } else {
            // Recalcular solo si los datos cambiaron
            supabaseData = convertSupabaseToChecklist(
              zones,
              elements,
              supabaseProperty.bedrooms || null,
              supabaseProperty.bathrooms || null
            );
            lastConversionRef.current = { key: conversionCacheKey, data: supabaseData };
            debugLog(`[useSupabaseChecklistBase:${inspectionType}] 🔄 Recalculated conversion data`);
          }
          
          const loadedChecklist = createChecklist(propertyId, checklistType, supabaseData.sections || {});
          // No sobrescribir si el usuario ya rellenó datos (evita perder fotos/estado al refetch)
          const current = checklistRef.current;
          const hasUserData = current && Object.values(current.sections || {}).some(section => {
            if (section.uploadZones?.some(z => (z.photos?.length ?? 0) > 0 || (z.videos?.length ?? 0) > 0)) return true;
            if (section.questions?.some(q => q.status || (q.notes && q.notes.trim()))) return true;
            if (section.dynamicItems?.some(item => item.questions?.some((q: any) => q.status || (q.notes && q.notes?.trim())))) return true;
            return false;
          });
          if (hasUserData && elements.length === 0) {
            console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏭️ Skipping overwrite - checklist has user data and Supabase has 0 elements`);
            zonesRefetchRetryCountRef.current = 0;
            if (inspection?.id) {
              const stableKey = `${propertyId}-${checklistType}-${inspection.id}`;
              initializationRef.current = stableKey;
              lastZonesCountRef.current = zones.length;
            }
          } else {
            setChecklist(loadedChecklist);
            zonesRefetchRetryCountRef.current = 0; // Reset para futuros intentos
            if (inspection?.id) {
              const stableKey = `${propertyId}-${checklistType}-${inspection.id}`;
              initializationRef.current = stableKey;
              lastZonesCountRef.current = zones.length;
            }
            debugLog(`[useSupabaseChecklistBase:${inspectionType}] ✅ Checklist loaded and set`, {
              inspectionId: inspection?.id,
              zonesCount: zones.length,
              elementsCount: elements.length,
              photoElementsCount: photoElementsDetails.length,
            });
          }
        } else {
          console.log(`[useSupabaseChecklistBase:${inspectionType}] 📝 Creating empty checklist...`);
          const newChecklist = createChecklist(propertyId, checklistType, {});
          setChecklist(newChecklist);
          const stableKey = inspection?.id 
            ? `${propertyId}-${checklistType}-${inspection.id}`
            : `${propertyId}-${checklistType}-no-inspection`;
          initializationRef.current = stableKey;
          lastZonesCountRef.current = zones.length;
          console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Empty checklist created and set`);
        }
      } catch (error) {
        console.error(`[useSupabaseChecklistBase:${inspectionType}] ❌ Error initializing checklist:`, error);
        toast.error("Error al inicializar checklist");
      } finally {
        setIsLoading(false);
        initializationInProgressRef.current = false;
        console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Initialization completed`);
      }
    };

    initializeChecklist();
    
    return () => {
      if (zonesCreationTimeoutRef.current) {
        clearTimeout(zonesCreationTimeoutRef.current);
      }
    };
  }, [
    propertyId,
    inspectionLoading,
    supabaseProperty,
    inspection?.id, // Solo usar el ID, no el objeto completo para evitar re-renders
    zones.length,
    elements.length,
    checklistType,
    inspectionType,
    enabled,
    // Note: checklist is intentionally NOT in dependencies as it's only used for reading
    // Adding it causes infinite loops since setChecklist triggers re-renders
    // inspectionLoading is needed to detect when loading completes
  ]);

  // Segundo useEffect para manejar cambios en zones/elements después de la inicialización
  const lastProcessedInspectionIdRef = useRef<string | null>(null);
  const lastProcessedZonesLengthRef = useRef<number>(0);
  const lastProcessedElementsLengthRef = useRef<number>(0);
  const bedroomsCount = supabaseProperty?.bedrooms || null;
  const bathroomsCount = supabaseProperty?.bathrooms || null;
  const hasSupabaseProperty = !!supabaseProperty;
  const hasInspection = !!inspection;
  const inspectionId = inspection?.id;

  useEffect(() => {
    // VERIFICACIÓN TEMPRANA: Si la inspección no corresponde al tipo correcto, NO hacer nada
    if (inspection && (inspection as any).inspection_type !== inspectionType) {
      // Resetear contadores para evitar procesar cambios cuando la inspección cambie
      if (lastProcessedInspectionIdRef.current !== null) {
        lastProcessedInspectionIdRef.current = null;
        lastProcessedZonesLengthRef.current = 0;
        lastProcessedElementsLengthRef.current = 0;
      }
      return;
    }
    
    if (initializationInProgressRef.current || !propertyId || !hasSupabaseProperty || !hasInspection || inspectionLoading) {
      return;
    }

    // Verificar que la inspección corresponde al tipo correcto ANTES de procesar cualquier cambio
    if (inspection && (inspection as any).inspection_type !== inspectionType) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Ignoring all changes - inspection type mismatch:`, {
        currentInspectionType: (inspection as any).inspection_type,
        expectedInspectionType: inspectionType,
        inspectionId: inspection.id,
      });
      lastProcessedInspectionIdRef.current = null;
      lastProcessedZonesLengthRef.current = 0;
      lastProcessedElementsLengthRef.current = 0;
      return;
    }

    // Si cambió la inspección, resetear contadores
    if (inspectionId !== lastProcessedInspectionIdRef.current) {
      if (lastProcessedInspectionIdRef.current !== null) {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] 🔄 Inspection changed, resetting counters...`, {
          oldInspectionId: lastProcessedInspectionIdRef.current,
          newInspectionId: inspectionId,
        });
      }
      
      if (inspection && (inspection as any).inspection_type !== inspectionType) {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Ignoring inspection change - wrong type:`, {
          currentInspectionType: (inspection as any).inspection_type,
          expectedInspectionType: inspectionType,
          inspectionId: inspection.id,
        });
        return;
      }
      
      lastProcessedInspectionIdRef.current = inspectionId || null;
      lastProcessedZonesLengthRef.current = zones.length;
      lastProcessedElementsLengthRef.current = elements.length;
      
      // Si es la primera inspección y tenemos datos, recargar el checklist solo si no hay datos del usuario (evita sobrescribir lo rellenado)
      if (zones.length > 0) {
        const current = checklistRef.current;
        const hasUserData = current && Object.values(current.sections || {}).some(section => {
          if (section.uploadZones?.some(z => (z.photos?.length ?? 0) > 0 || (z.videos?.length ?? 0) > 0)) return true;
          if (section.questions?.some(q => q.status || (q.notes && q.notes.trim()))) return true;
          if (section.dynamicItems?.some(item => item.questions?.some((q: any) => q.status || (q.notes && q.notes?.trim())))) return true;
          return false;
        });
        if (hasUserData && elements.length === 0) {
          console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏭️ Skipping reload - checklist has user data and Supabase has 0 elements`);
        } else {
          console.log(`[useSupabaseChecklistBase:${inspectionType}] 🔄 First inspection detected, reloading checklist immediately...`, {
            zonesCount: zones.length,
            elementsCount: elements.length,
          });
          initializationInProgressRef.current = true;
          
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
          
          console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Checklist reloaded for first inspection`, {
            inspectionId,
            zonesCount: zones.length,
            elementsCount: elements.length,
          });
          
          setTimeout(() => {
            initializationInProgressRef.current = false;
          }, 100);
        }
      }
      return;
    }

    // Verificar que la inspección corresponde al tipo correcto antes de procesar cambios
    if (!inspection || (inspection as any).inspection_type !== inspectionType) {
      if (inspection) {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Ignoring zones/elements changes - inspection type mismatch:`, {
          currentInspectionType: (inspection as any).inspection_type,
          expectedInspectionType: inspectionType,
          inspectionId: inspection.id,
        });
      } else {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Ignoring zones/elements changes - no inspection yet:`, {
          expectedInspectionType: inspectionType,
          inspectionLoading,
        });
      }
      lastProcessedInspectionIdRef.current = null;
      lastProcessedZonesLengthRef.current = 0;
      lastProcessedElementsLengthRef.current = 0;
      return;
    }

    // Verificar si zones o elements cambiaron
    const zonesCountChanged = zones.length > 0 && zones.length !== lastProcessedZonesLengthRef.current;
    const elementsCountChanged = elements.length !== lastProcessedElementsLengthRef.current;
    
    const hasPhotoElements = elements.some(e => e.element_name?.startsWith('fotos-') && e.image_urls && e.image_urls.length > 0);
    const checklistHasPhotos = checklist && Object.values(checklist.sections).some(section => 
      section.uploadZones?.some(zone => zone.photos && zone.photos.length > 0)
    );
    const photosMissing = hasPhotoElements && !checklistHasPhotos;
    
    const shouldReload = (zonesCountChanged || elementsCountChanged || photosMissing) && !initializationInProgressRef.current && inspectionId === lastProcessedInspectionIdRef.current;
    
    if (shouldReload) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] 🔄 Zones/Elements changed, reloading checklist...`, {
        inspectionId,
        oldZonesCount: lastProcessedZonesLengthRef.current,
        newZonesCount: zones.length,
        oldElementsCount: lastProcessedElementsLengthRef.current,
        newElementsCount: elements.length,
      });
      
      initializationInProgressRef.current = true;
      
      lastProcessedZonesLengthRef.current = zones.length;
      lastProcessedElementsLengthRef.current = elements.length;
      
      // Memoizar conversión para evitar recálculos innecesarios
      // Crear cache key basada en los datos de entrada (incl. has_elevator para ascensor en entorno-zonas-comunes)
      const zonesKey = zones.map(z => `${z.id}-${z.zone_type}`).join(',');
      const elementsKey = elements.map(e => `${e.id}-${e.element_name}-${e.zone_id}`).join(',');
      const inspectionHasElevator = (inspection as { has_elevator?: boolean } | null)?.has_elevator;
      const conversionCacheKey = `${zonesKey}|${elementsKey}|${bedroomsCount}|${bathroomsCount}|${inspectionHasElevator}`;
      
      // Usar ref para cachear la última conversión
      let supabaseData: Partial<ChecklistData>;
      if (lastConversionRef.current?.key === conversionCacheKey) {
        // Reutilizar datos cacheados si la key no cambió
        supabaseData = lastConversionRef.current.data;
        debugLog(`[useSupabaseChecklistBase:${inspectionType}] ♻️ Using cached conversion data in reload`);
      } else {
        // Recalcular solo si los datos cambiaron (pasamos inspection para ascensor en entorno-zonas-comunes)
        supabaseData = convertSupabaseToChecklist(
          zones,
          elements,
          bedroomsCount,
          bathroomsCount,
          inspection ? { has_elevator: inspection.has_elevator } : null
        );
        lastConversionRef.current = { key: conversionCacheKey, data: supabaseData };
        debugLog(`[useSupabaseChecklistBase:${inspectionType}] 🔄 Recalculated conversion data in reload`);
      }
      
      const loadedChecklist = createChecklist(propertyId, checklistType, supabaseData.sections || {});
      const currentForReload = checklistRef.current;
      const hasUserDataReload = currentForReload && Object.values(currentForReload.sections || {}).some(section => {
        if (section.uploadZones?.some(z => (z.photos?.length ?? 0) > 0 || (z.videos?.length ?? 0) > 0)) return true;
        if (section.questions?.some(q => q.status || (q.notes && q.notes.trim()))) return true;
        if (section.dynamicItems?.some(item => item.questions?.some((q: any) => q.status || (q.notes && q.notes?.trim())))) return true;
        return false;
      });
      if (!(hasUserDataReload && elements.length === 0)) {
        setChecklist(loadedChecklist);
      } else {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏭️ Skipping zones/elements reload - checklist has user data and Supabase has 0 elements`);
      }
      if (inspectionId) {
        const stableKey = `${propertyId}-${checklistType}-${inspectionId}`;
        initializationRef.current = stableKey;
        lastProcessedInspectionIdRef.current = inspectionId || null;
      }
      
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Checklist reloaded with updated zones/elements`, {
        inspectionId,
        zonesCount: zones.length,
        elementsCount: elements.length,
      });
      
      setTimeout(() => {
        initializationInProgressRef.current = false;
      }, 100);
    }
  }, [zones.length, elements.length, propertyId, checklistType, bedroomsCount, bathroomsCount, inspectionId, inspectionLoading, hasSupabaseProperty, hasInspection, inspectionType, inspection]);

  // Guardar sección actual en Supabase
  const saveCurrentSection = useCallback(async (sectionIdOverride?: string) => {
    // Log siempre visible para diagnosticar por qué no se guardan elementos (móvil/continuar)
    console.log(`[useSupabaseChecklistBase:${inspectionType}] 📌 saveCurrentSection CALLED`, { sectionIdOverride, currentSectionRef: currentSectionRef.current });

    if (savingRef.current) {
      console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Save already in progress, skipping`);
      return;
    }

    if (!checklist || !inspection?.id || !supabaseProperty) {
      console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Cannot save - missing data`, { hasChecklist: !!checklist, hasInspection: !!inspection?.id, hasProperty: !!supabaseProperty });
      return;
    }

    // Usar sectionIdOverride si se proporciona, sino usar currentSectionRef
    const sectionId = sectionIdOverride || currentSectionRef.current;
    if (!sectionId) {
      console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ No current section to save (sectionIdOverride y currentSectionRef vacíos)`);
      return;
    }

    // Si se proporciona sectionIdOverride, establecer currentSectionRef para futuras operaciones
    if (sectionIdOverride) {
      currentSectionRef.current = sectionIdOverride;
    }

    savingRef.current = true;

    try {
      // Usar ref para leer la sección más reciente (evita estado desactualizado al pulsar Continuar justo después de editar)
      const checklistToUse = checklistRef.current ?? checklist;
      const section = checklistToUse.sections?.[sectionId];
      if (!section) {
        console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Section not found:`, sectionId, "available:", Object.keys(checklist.sections || {}));
        savingRef.current = false;
        return;
      }

      console.log(`[useSupabaseChecklistBase:${inspectionType}] 💾 Saving section:`, sectionId);

      // Encontrar zona(s) correspondiente(s) a la sección
      const expectedZoneType = sectionId === "habitaciones" ? "dormitorio" :
                              sectionId === "banos" ? "bano" :
                              sectionId === "entorno-zonas-comunes" ? "entorno" :
                              sectionId === "estado-general" ? "distribucion" :
                              sectionId === "entrada-pasillos" ? "entrada" :
                              sectionId === "salon" ? "salon" :
                              sectionId === "cocina" ? "cocina" :
                              sectionId === "exteriores" ? "exterior" : null;

      let zone: typeof zones[0] | null = null;
      let zonesOfTypeForSave: typeof zones = [];

      if (sectionId === "habitaciones" || sectionId === "banos") {
        // Secciones dinámicas: ordenar por nombre y crear zonas faltantes si hay más habitaciones/baños que zonas
        const initialZonesOfType = zones
          .filter(z => z.zone_type === expectedZoneType)
          .sort((a, b) => (a.zone_name || '').localeCompare(b.zone_name || ''));
        zonesOfTypeForSave = [...initialZonesOfType];
        const needed = section.dynamicItems?.length ?? 0;
        while (zonesOfTypeForSave.length < needed) {
          const displayName = expectedZoneType === "dormitorio" ? "Habitación" : expectedZoneType === "bano" ? "Baño" : "Zona";
          const created = await createZone({
            inspection_id: inspection.id,
            zone_type: expectedZoneType ?? undefined,
            zone_name: `${displayName} ${zonesOfTypeForSave.length + 1}`,
          });
          if (!created) break;
          zonesOfTypeForSave.push(created);
          console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Created missing zone:`, created.zone_name);
        }
        // Refrescar inspección para que el estado zones incluya las nuevas zonas en el próximo guardado
        if (zonesOfTypeForSave.length > initialZonesOfType.length) {
          await refetchInspection();
        }
        zone = zonesOfTypeForSave[0] ?? null;
      } else {
        zone = zones.find(z => z.zone_type === expectedZoneType) ?? null;
      }

      if (!zone) {
        console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Zone not found for section:`, sectionId, "expectedZoneType:", expectedZoneType, "zones:", zones.map(z => z.zone_type));
        savingRef.current = false;
        return;
      }
      if ((sectionId === "habitaciones" || sectionId === "banos") && (section.dynamicItems?.length ?? 0) > 0 && zonesOfTypeForSave.length === 0) {
        console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ No zones for dynamic section:`, sectionId);
        savingRef.current = false;
        return;
      }

      // Recopilar todos los archivos (fotos y videos) que necesitan ser subidos (base64)
      const filesToUpload: FileUpload[] = [];
      
      // Archivos de uploadZones que están en base64
      if (section.uploadZones) {
        section.uploadZones.forEach(zone => {
          if (zone.photos) {
            const base64Photos = zone.photos.filter(photo => 
              photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
            );
            filesToUpload.push(...base64Photos);
          }
          if (zone.videos) {
            const base64Videos = zone.videos.filter(video => 
              video.data && (video.data.startsWith('data:') || (!video.data.startsWith('http') && video.data.length > 100))
            );
            filesToUpload.push(...base64Videos);
          }
        });
      }

      // Archivos de dynamicItems que están en base64
      if (section.dynamicItems) {
        section.dynamicItems.forEach(item => {
          if (item.uploadZone?.photos) {
            const base64Photos = item.uploadZone.photos.filter(photo => 
              photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
            );
            filesToUpload.push(...base64Photos);
          }
          if (item.uploadZone?.videos) {
            const base64Videos = item.uploadZone.videos.filter(video => 
              video.data && (video.data.startsWith('data:') || (!video.data.startsWith('http') && video.data.length > 100))
            );
            filesToUpload.push(...base64Videos);
          }
          // Fotos de carpentryItems dentro de dynamic items
          if (item.carpentryItems) {
            item.carpentryItems.forEach(carpentryItem => {
              if (carpentryItem.photos) {
                const base64Photos = carpentryItem.photos.filter(photo => 
                  photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
                );
                filesToUpload.push(...base64Photos);
              }
              if (carpentryItem.units) {
                carpentryItem.units.forEach(unit => {
                  if (unit.photos) {
                    const base64Photos = unit.photos.filter(photo => 
                      photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
                    );
                    filesToUpload.push(...base64Photos);
                  }
                  if (unit.videos) {
                    const base64Videos = unit.videos.filter(video => 
                      video.data && (video.data.startsWith('data:') || (!video.data.startsWith('http') && video.data.length > 100))
                    );
                    filesToUpload.push(...base64Videos);
                  }
                });
              }
            });
          }
          // Fotos y vídeos de climatizationItems dentro de dynamic items
          if (item.climatizationItems) {
            item.climatizationItems.forEach(climatizationItem => {
              if (climatizationItem.photos) {
                const base64Photos = climatizationItem.photos.filter(photo => 
                  photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
                );
                filesToUpload.push(...base64Photos);
              }
              if (climatizationItem.units) {
                climatizationItem.units.forEach(unit => {
                  if (unit.photos) {
                    const base64Photos = unit.photos.filter(photo => 
                      photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
                    );
                    filesToUpload.push(...base64Photos);
                  }
                  if (unit.videos) {
                    const base64Videos = unit.videos.filter(video => 
                      video.data && (video.data.startsWith('data:') || (!video.data.startsWith('http') && video.data.length > 100))
                    );
                    filesToUpload.push(...base64Videos);
                  }
                });
              }
            });
          }
          // Fotos de questions dentro de dynamic items
          if (item.questions) {
            item.questions.forEach(question => {
              if (question.photos) {
                const base64Photos = question.photos.filter(photo => 
                  photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
                );
                filesToUpload.push(...base64Photos);
              }
            });
          }
          // Fotos de mobiliario (detalle) dentro de dynamic items
          if (item.mobiliario?.question?.photos) {
            const base64Photos = item.mobiliario.question.photos.filter(photo => 
              photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
            );
            filesToUpload.push(...base64Photos);
          }
        });
      }

      // Archivos de questions que están en base64
      if (section.questions) {
        section.questions.forEach(question => {
          if (question.photos) {
            const base64Photos = question.photos.filter(photo => 
              photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
            );
            filesToUpload.push(...base64Photos);
          }
        });
      }

      // Archivos de carpentryItems que están en base64
      if (section.carpentryItems) {
        section.carpentryItems.forEach(item => {
          if (item.photos) {
            const base64Photos = item.photos.filter(photo => 
              photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
            );
            filesToUpload.push(...base64Photos);
          }
          if ((item as any).videos) {
            const base64Videos = (item as any).videos.filter((video: FileUpload) => 
              video.data && (video.data.startsWith('data:') || (!video.data.startsWith('http') && video.data.length > 100))
            );
            filesToUpload.push(...base64Videos);
          }
          if (item.units) {
            item.units.forEach(unit => {
              if (unit.photos) {
                const base64Photos = unit.photos.filter(photo => 
                  photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
                );
                filesToUpload.push(...base64Photos);
              }
              if (unit.videos) {
                const base64Videos = unit.videos.filter(video => 
                  video.data && (video.data.startsWith('data:') || (!video.data.startsWith('http') && video.data.length > 100))
                );
                filesToUpload.push(...base64Videos);
              }
            });
          }
        });
      }

      // Archivos de climatizationItems que están en base64
      if (section.climatizationItems) {
        section.climatizationItems.forEach(item => {
          if (item.photos) {
            const base64Photos = item.photos.filter(photo => 
              photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
            );
            filesToUpload.push(...base64Photos);
          }
          if (item.units) {
            item.units.forEach(unit => {
              if (unit.photos) {
                const base64Photos = unit.photos.filter(photo => 
                  photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
                );
                filesToUpload.push(...base64Photos);
              }
              if (unit.videos) {
                const base64Videos = unit.videos.filter(video => 
                  video.data && (video.data.startsWith('data:') || (!video.data.startsWith('http') && video.data.length > 100))
                );
                filesToUpload.push(...base64Videos);
              }
            });
          }
        });
      }

      // Archivos de storageItems que están en base64
      if (section.storageItems) {
        section.storageItems.forEach(item => {
          if (item.photos) {
            const base64Photos = item.photos.filter(photo => 
              photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
            );
            filesToUpload.push(...base64Photos);
          }
          if (item.units) {
            item.units.forEach(unit => {
              if (unit.photos) {
                const base64Photos = unit.photos.filter(photo => 
                  photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
                );
                filesToUpload.push(...base64Photos);
              }
            });
          }
        });
      }

      // Archivos de appliancesItems que están en base64
      if (section.appliancesItems) {
        section.appliancesItems.forEach(item => {
          if (item.photos) {
            const base64Photos = item.photos.filter(photo => 
              photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
            );
            filesToUpload.push(...base64Photos);
          }
          if (item.units) {
            item.units.forEach(unit => {
              if (unit.photos) {
                const base64Photos = unit.photos.filter(photo => 
                  photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
                );
                filesToUpload.push(...base64Photos);
              }
            });
          }
        });
      }

      // Archivos de securityItems que están en base64
      if (section.securityItems) {
        section.securityItems.forEach(item => {
          if (item.photos) {
            const base64Photos = item.photos.filter(photo => 
              photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
            );
            filesToUpload.push(...base64Photos);
          }
          if (item.units) {
            item.units.forEach(unit => {
              if (unit.photos) {
                const base64Photos = unit.photos.filter(photo => 
                  photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
                );
                filesToUpload.push(...base64Photos);
              }
            });
          }
        });
      }

      // Archivos de systemsItems que están en base64
      if (section.systemsItems) {
        section.systemsItems.forEach(item => {
          if (item.photos) {
            const base64Photos = item.photos.filter(photo => 
              photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
            );
            filesToUpload.push(...base64Photos);
          }
          if (item.units) {
            item.units.forEach(unit => {
              if (unit.photos) {
                const base64Photos = unit.photos.filter(photo => 
                  photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
                );
                filesToUpload.push(...base64Photos);
              }
            });
          }
        });
      }

      // Crear una copia profunda de la sección para actualizar con URLs
      const sectionToSave: ChecklistSection = JSON.parse(JSON.stringify(section));

      // Subir archivos a Supabase Storage antes de guardar (éxito parcial: no bloquea guardar elementos)
      if (filesToUpload.length > 0) {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] 📤 Uploading ${filesToUpload.length} files to Supabase Storage...`);
        let fileIdToUrlMap = new Map<string, string>();
        let uploadedUrls: (string | null)[] = [];
        try {
          uploadedUrls = await uploadFilesToStorage(
            filesToUpload,
            propertyId,
            inspection.id,
            zone.id
          );
          const successCount = uploadedUrls.filter((u): u is string => u != null && u.startsWith('http')).length;
          const failedCount = filesToUpload.length - successCount;
          console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Uploaded ${successCount}/${filesToUpload.length} files` + (failedCount > 0 ? ` (${failedCount} failed)` : ''));

          // Crear mapeo file.id -> URL (uploadedUrls tiene la misma longitud que filesToUpload)
          filesToUpload.forEach((file, index) => {
            const url = uploadedUrls[index];
            if (url && url.startsWith('http')) {
              fileIdToUrlMap.set(file.id, url);
            }
          });

          if (failedCount > 0) {
            toast.info("Checklist guardado. Algunas fotos no se pudieron subir por la conexión; puedes volver a esta sección y guardar de nuevo para reintentar.", { duration: 6000 });
          }

          console.log(`[useSupabaseChecklistBase:${inspectionType}] 📋 Created file ID to URL map:`, {
            totalFiles: filesToUpload.length,
            mapSize: fileIdToUrlMap.size,
            fileIds: Array.from(fileIdToUrlMap.keys()),
          });

          // Subir fotos a Drive después de subirlas a Supabase Storage
          const photosToUploadToDrive: Array<{ url: string; filename: string }> = [];
          filesToUpload.forEach((file, index) => {
            const wasNewFile = file.data && !file.data.startsWith('http');
            const isPhoto = file.type && file.type.startsWith('image/');
            const url = uploadedUrls[index];
            if (wasNewFile && isPhoto && url && url.startsWith('http')) {
                // Extraer nombre de archivo de la URL
                // Formato: https://...supabase.co/storage/v1/object/public/inspection-images/{path}/{filename}
                const urlParts = url.split('/');
                const filename = urlParts[urlParts.length - 1];
                
                photosToUploadToDrive.push({
                  url,
                  filename,
                });
            }
          });

          // Para initial check: acumular URLs en lugar de enviarlas inmediatamente
          // Para otros tipos: enviar inmediatamente como antes
          if (photosToUploadToDrive.length > 0) {
            // Mapear checklistType al tipo correcto para el webhook
            let driveChecklistType: 'reno_initial' | 'reno_intermediate' | 'reno_final' | undefined;
            if (checklistType === 'reno_initial') {
              driveChecklistType = 'reno_initial';
            } else if (checklistType === 'reno_intermediate') {
              driveChecklistType = 'reno_intermediate';
            } else if (checklistType === 'reno_final') {
              driveChecklistType = 'reno_final';
            } else {
              // Si es otro tipo (partner_initial), no subir a Drive
              console.log(`[useSupabaseChecklistBase:${inspectionType}] Skipping Drive upload for checklist type: ${checklistType}`);
              driveChecklistType = undefined;
            }
            
            if (driveChecklistType) {
              // Si es initial check, acumular las URLs en lugar de enviarlas
              if (checklistType === 'reno_initial') {
                console.log(`[useSupabaseChecklistBase:${inspectionType}] 📦 Accumulating ${photosToUploadToDrive.length} photos for initial check (will send all at once when finalizing)`);
                accumulatedInitialCheckPhotosRef.current.push(...photosToUploadToDrive);
                console.log(`[useSupabaseChecklistBase:${inspectionType}] 📦 Total accumulated photos: ${accumulatedInitialCheckPhotosRef.current.length}`);
              } else {
                // Para otros tipos (intermediate, final), enviar inmediatamente
              console.log(`[useSupabaseChecklistBase:${inspectionType}] 📤 Uploading ${photosToUploadToDrive.length} photos to Drive...`);
              try {
                const driveUploadSuccess = await uploadPhotosToDrive(
                  propertyId,
                  driveChecklistType,
                  photosToUploadToDrive
                );
                
                if (!driveUploadSuccess) {
                  toast.error("Error al subir fotos a Drive", {
                    description: "Las fotos se guardaron en Supabase pero no se pudieron subir a Drive. Contacta al administrador.",
                  });
                } else {
                  console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Successfully uploaded photos to Drive`);
                }
              } catch (driveError: any) {
                console.error(`[useSupabaseChecklistBase:${inspectionType}] ❌ Error uploading photos to Drive:`, driveError);
                toast.error("Error al subir fotos a Drive", {
                  description: driveError.message || "Las fotos se guardaron en Supabase pero no se pudieron subir a Drive.",
                });
                }
              }
            }
          }
          
          // Función helper para actualizar una foto/video usando el mapeo por ID
          const updateFileWithMap = (file: FileUpload, context: string) => {
            if (file.data && (file.data.startsWith('data:') || (!file.data.startsWith('http') && file.data.length > 100))) {
              const url = fileIdToUrlMap.get(file.id);
              if (url) {
                console.log(`[useSupabaseChecklistBase:${inspectionType}] 🔄 Updating ${context} file ${file.id} with URL:`, url.substring(0, 50) + '...');
                file.data = url;
                return true;
              }
            }
            return false;
          };
          
          // Actualizar las fotos en la copia de la sección con las URLs subidas usando el mapeo por ID
          // Actualizar uploadZones
          if (sectionToSave.uploadZones) {
            sectionToSave.uploadZones.forEach(uploadZone => {
              if (uploadZone.photos) {
                uploadZone.photos.forEach(photo => {
                  updateFileWithMap(photo, `uploadZone ${uploadZone.id}`);
                });
              }
              if (uploadZone.videos) {
                uploadZone.videos.forEach(video => {
                  updateFileWithMap(video, `uploadZone ${uploadZone.id}`);
                });
              }
            });
          }
          
          // Actualizar dynamicItems (CRÍTICO: aquí está el problema de mezcla de fotos)
          if (sectionToSave.dynamicItems) {
            sectionToSave.dynamicItems.forEach((item, itemIndex) => {
              if (item.uploadZone?.photos) {
                item.uploadZone.photos.forEach(photo => {
                  updateFileWithMap(photo, `dynamicItem ${item.id} (index ${itemIndex}) uploadZone`);
                });
              }
              if (item.uploadZone?.videos) {
                item.uploadZone.videos.forEach(video => {
                  updateFileWithMap(video, `dynamicItem ${item.id} (index ${itemIndex}) uploadZone`);
                });
              }
              // Actualizar carpentryItems dentro de dynamic items
              if (item.carpentryItems) {
                item.carpentryItems.forEach(carpentryItem => {
                  if (carpentryItem.photos) {
                    carpentryItem.photos.forEach(photo => {
                      updateFileWithMap(photo, `dynamicItem ${item.id} carpentryItem ${carpentryItem.id}`);
                    });
                  }
                  if ((carpentryItem as any).videos) {
                    (carpentryItem as any).videos.forEach((video: FileUpload) => {
                      updateFileWithMap(video, `dynamicItem ${item.id} carpentryItem ${carpentryItem.id} videos`);
                    });
                  }
                  if (carpentryItem.units) {
                    carpentryItem.units.forEach(unit => {
                      if (unit.photos) {
                        unit.photos.forEach(photo => {
                          updateFileWithMap(photo, `dynamicItem ${item.id} carpentryItem ${carpentryItem.id} unit ${unit.id}`);
                        });
                      }
                      if (unit.videos) {
                        unit.videos.forEach(video => {
                          updateFileWithMap(video, `dynamicItem ${item.id} carpentryItem ${carpentryItem.id} unit ${unit.id} videos`);
                        });
                      }
                    });
                  }
                });
              }
              // Actualizar climatizationItems dentro de dynamic items
              if (item.climatizationItems) {
                item.climatizationItems.forEach(climatizationItem => {
                  if (climatizationItem.photos) {
                    climatizationItem.photos.forEach(photo => {
                      updateFileWithMap(photo, `dynamicItem ${item.id} climatizationItem ${climatizationItem.id}`);
                    });
                  }
                  if (climatizationItem.units) {
                    climatizationItem.units.forEach(unit => {
                      if (unit.photos) {
                        unit.photos.forEach(photo => {
                          updateFileWithMap(photo, `dynamicItem ${item.id} climatizationItem ${climatizationItem.id} unit ${unit.id}`);
                        });
                      }
                      if (unit.videos) {
                        unit.videos.forEach(video => {
                          updateFileWithMap(video, `dynamicItem ${item.id} climatizationItem ${climatizationItem.id} unit ${unit.id} videos`);
                        });
                      }
                    });
                  }
                });
              }
              // Actualizar questions dentro de dynamic items
              if (item.questions) {
                item.questions.forEach(question => {
                  if (question.photos) {
                    question.photos.forEach(photo => {
                      updateFileWithMap(photo, `dynamicItem ${item.id} question ${question.id}`);
                    });
                  }
                });
              }
              // Actualizar fotos de mobiliario (detalle) dentro de dynamic items
              if (item.mobiliario?.question?.photos) {
                item.mobiliario.question.photos.forEach(photo => {
                  updateFileWithMap(photo, `dynamicItem ${item.id} mobiliario-detalle`);
                });
              }
            });
          }
          
          // Actualizar questions
          if (sectionToSave.questions) {
            sectionToSave.questions.forEach(question => {
              if (question.photos) {
                question.photos.forEach(photo => {
                  updateFileWithMap(photo, `question ${question.id}`);
                });
              }
            });
          }

          // Actualizar carpentryItems (sección: salón, cocina, etc.)
          if (sectionToSave.carpentryItems) {
            sectionToSave.carpentryItems.forEach(item => {
              if (item.photos) {
                item.photos.forEach(photo => {
                  updateFileWithMap(photo, `carpentryItem ${item.id}`);
                });
              }
              if ((item as any).videos) {
                (item as any).videos.forEach((video: FileUpload) => {
                  updateFileWithMap(video, `carpentryItem ${item.id} videos`);
                });
              }
              if (item.units) {
                item.units.forEach(unit => {
                  if (unit.photos) {
                    unit.photos.forEach(photo => {
                      updateFileWithMap(photo, `carpentryItem ${item.id} unit ${unit.id}`);
                    });
                  }
                  if (unit.videos) {
                    unit.videos.forEach(video => {
                      updateFileWithMap(video, `carpentryItem ${item.id} unit ${unit.id} videos`);
                    });
                  }
                });
              }
            });
          }

          // Actualizar climatizationItems (sección)
          if (sectionToSave.climatizationItems) {
            sectionToSave.climatizationItems.forEach(item => {
              if (item.photos) {
                item.photos.forEach(photo => {
                  updateFileWithMap(photo, `climatizationItem ${item.id}`);
                });
              }
              if (item.units) {
                item.units.forEach(unit => {
                  if (unit.photos) {
                    unit.photos.forEach(photo => {
                      updateFileWithMap(photo, `climatizationItem ${item.id} unit ${unit.id}`);
                    });
                  }
                  if (unit.videos) {
                    unit.videos.forEach(video => {
                      updateFileWithMap(video, `climatizationItem ${item.id} unit ${unit.id} videos`);
                    });
                  }
                });
              }
            });
          }

          // Actualizar storageItems
          if (sectionToSave.storageItems) {
            sectionToSave.storageItems.forEach(item => {
              if (item.photos) {
                item.photos.forEach(photo => {
                  updateFileWithMap(photo, `storageItem ${item.id}`);
                });
              }
              if (item.units) {
                item.units.forEach(unit => {
                  if (unit.photos) {
                    unit.photos.forEach(photo => {
                      updateFileWithMap(photo, `storageItem ${item.id} unit ${unit.id}`);
                    });
                  }
                });
              }
            });
          }

          // Actualizar appliancesItems
          if (sectionToSave.appliancesItems) {
            sectionToSave.appliancesItems.forEach(item => {
              if (item.photos) {
                item.photos.forEach(photo => {
                  updateFileWithMap(photo, `appliancesItem ${item.id}`);
                });
              }
              if (item.units) {
                item.units.forEach(unit => {
                  if (unit.photos) {
                    unit.photos.forEach(photo => {
                      updateFileWithMap(photo, `appliancesItem ${item.id} unit ${unit.id}`);
                    });
                  }
                });
              }
            });
          }

          // Actualizar securityItems
          if (sectionToSave.securityItems) {
            sectionToSave.securityItems.forEach(item => {
              if (item.photos) {
                item.photos.forEach(photo => {
                  updateFileWithMap(photo, `securityItem ${item.id}`);
                });
              }
              if (item.units) {
                item.units.forEach(unit => {
                  if (unit.photos) {
                    unit.photos.forEach(photo => {
                      updateFileWithMap(photo, `securityItem ${item.id} unit ${unit.id}`);
                    });
                  }
                });
              }
            });
          }

          // Actualizar systemsItems
          if (sectionToSave.systemsItems) {
            sectionToSave.systemsItems.forEach(item => {
              if (item.photos) {
                item.photos.forEach(photo => {
                  updateFileWithMap(photo, `systemsItem ${item.id}`);
                });
              }
              if (item.units) {
                item.units.forEach(unit => {
                  if (unit.photos) {
                    unit.photos.forEach(photo => {
                      updateFileWithMap(photo, `systemsItem ${item.id} unit ${unit.id}`);
                    });
                  }
                });
              }
            });
          }
          
          // Actualizar el estado del checklist con las URLs actualizadas
          setChecklist(prev => {
            if (!prev) return null;
            return {
              ...prev,
              sections: {
                ...prev.sections,
                [sectionId]: sectionToSave,
              },
            };
          });
        } catch (uploadError) {
          console.error(`[useSupabaseChecklistBase:${inspectionType}] ❌ Error uploading files:`, uploadError);
          toast.info("Se ha guardado el checklist. Algunas fotos no se pudieron subir; puedes volver a esta sección y guardar de nuevo para reintentar.", { duration: 6000 });
          // No hacer return: seguir con conversión y upsert para persistir preguntas/notas y elementos (fotos con image_urls vacío)
        }
      }

      if (savingAllSectionsRef.current && checklistForFinalizeRef.current?.sections) {
        checklistForFinalizeRef.current.sections[sectionId] = JSON.parse(JSON.stringify(sectionToSave));
      }

      // Convertir sección a elementos de Supabase (siempre ejecutar; sectionToSave tiene URLs si la subida fue ok, si no quedan base64 y el converter solo persiste HTTP)
      let elementsToSave: any[] = [];
      
      // Si es una sección dinámica (habitaciones, banos), procesar cada dynamic item con su zona correspondiente
      if ((sectionId === "habitaciones" || sectionId === "banos") && sectionToSave.dynamicItems && sectionToSave.dynamicItems.length > 0) {
        // Usar la lista de zonas ya obtenida/creada (zonesOfTypeForSave) para que habitación 2 y 3 tengan zona
        const zonesOfType = zonesOfTypeForSave.length > 0 ? zonesOfTypeForSave : zones.filter(z => z.zone_type === expectedZoneType).sort((a, b) => (a.zone_name || '').localeCompare(b.zone_name || ''));
        
        console.log(`[useSupabaseChecklistBase:${inspectionType}] Processing ${sectionToSave.dynamicItems.length} dynamic items with ${zonesOfType.length} zones`);
        
        // Procesar cada dynamic item con su zona correspondiente
        sectionToSave.dynamicItems.forEach((dynamicItem, index) => {
          const correspondingZone = zonesOfType[index];
          if (correspondingZone) {
            // Log mobiliario antes de convertir
            if (dynamicItem.mobiliario) {
              console.log(`[useSupabaseChecklistBase:${inspectionType}] 📦 Dynamic item ${index + 1} has mobiliario:`, {
                existeMobiliario: dynamicItem.mobiliario.existeMobiliario,
                hasQuestion: !!dynamicItem.mobiliario.question,
                questionStatus: dynamicItem.mobiliario.question?.status,
              });
            }
            const dynamicElements = convertDynamicItemToElements(dynamicItem, correspondingZone.id);
            // Verificar que se crearon elementos de mobiliario
            const mobiliarioElements = dynamicElements.filter(e => e.element_name === 'mobiliario' || e.element_name === 'mobiliario-detalle');
            if (mobiliarioElements.length > 0) {
              console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Created ${mobiliarioElements.length} mobiliario elements for dynamic item ${index + 1}:`, 
                mobiliarioElements.map(e => ({ element_name: e.element_name, exists: e.exists, condition: e.condition }))
              );
            }
            elementsToSave.push(...dynamicElements);
            console.log(`[useSupabaseChecklistBase:${inspectionType}] Processed dynamic item ${index + 1} (${dynamicItem.id}) with zone ${correspondingZone.id}: ${dynamicElements.length} elements`);
          } else {
            console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ No zone found for dynamic item ${index + 1} (${dynamicItem.id})`);
          }
        });
      } else {
        // Sección fija (no dinámica)
        elementsToSave = convertSectionToElements(sectionId, sectionToSave, zone.id);
      }
      
      console.log(`[useSupabaseChecklistBase:${inspectionType}] 💾 Saving ${elementsToSave.length} elements to Supabase:`, {
        sectionId,
        elementsCount: elementsToSave.length,
        elementNames: elementsToSave.map(e => e.element_name),
        elementsWithStatus: elementsToSave.filter(e => e.condition).map(e => ({ name: e.element_name, condition: e.condition, notes: e.notes?.substring(0, 50) })),
        elementsWithNotes: elementsToSave.filter(e => e.notes).map(e => ({ name: e.element_name, notes: e.notes?.substring(0, 50) })),
        elementsWithPhotos: elementsToSave.filter(e => e.image_urls && e.image_urls.length > 0).map(e => ({ name: e.element_name, photosCount: e.image_urls.length })),
      });
      
      // Guardar elementos en Supabase usando batch upsert (mucho más rápido)
      const supabase = createClient();

      // Log siempre visible para diagnosticar por qué no se guardan elementos
      console.log(`[useSupabaseChecklistBase:${inspectionType}] 📤 About to upsert elements:`, elementsToSave.length, "elementNames:", elementsToSave.map(e => e.element_name));
      if (elementsToSave.length === 0) {
        const hasSectionData = !!(sectionToSave.uploadZones?.length || sectionToSave.questions?.length ||
          sectionToSave.dynamicItems?.length || sectionToSave.carpentryItems?.length || sectionToSave.climatizationItems?.length);
        console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ elementsToSave is empty for section:`, sectionId, hasSectionData ? '(la sección tiene datos - posible bug)' : '');
        if (hasSectionData) {
          toast.warning(`Sección "${sectionId}" no generó elementos para guardar. Si añadiste fotos, intenta guardar de nuevo.`, { duration: 5000 });
        }
      }

      if (elementsToSave.length > 0) {
        // Quitar undefined para evitar problemas de serialización; mantener null explícito
        const sanitizedElements = elementsToSave.map((el) => {
          const clean: Record<string, unknown> = {
            zone_id: el.zone_id,
            element_name: el.element_name,
          };
          if (el.condition !== undefined) clean.condition = el.condition;
          if (el.notes !== undefined) clean.notes = el.notes;
          if (el.image_urls !== undefined) clean.image_urls = el.image_urls;
          if (el.video_urls !== undefined) clean.video_urls = el.video_urls;
          if (el.quantity !== undefined) clean.quantity = el.quantity;
          if (el.exists !== undefined) clean.exists = el.exists;
          return clean;
        });

        // Batch upsert: onConflict como array (formato para UNIQUE(zone_id, element_name))
        let batchUpsertError: any = null;
        let upsertedElements: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          const result = await supabase
            .from('inspection_elements')
            .upsert(sanitizedElements, {
              onConflict: ['zone_id', 'element_name'],
            })
            .select();
          batchUpsertError = result.error;
          upsertedElements = result.data;
          if (!batchUpsertError) break;
          if (attempt === 0) {
            console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Upsert retry (attempt 1 failed):`, batchUpsertError?.message);
            await new Promise(r => setTimeout(r, 500));
          }
        }

        if (batchUpsertError) {
          const err = batchUpsertError as { code?: string; message?: string; details?: string; hint?: string };
          const errorMessage = (err?.message ?? err?.details ?? String(batchUpsertError)) || 'Error desconocido';
          const errorDetails = {
            code: err?.code,
            message: err?.message,
            details: err?.details,
            hint: err?.hint,
            elementsCount: elementsToSave.length,
            elementNames: elementsToSave.map(e => e.element_name),
            zoneIds: [...new Set(elementsToSave.map(e => e.zone_id))],
            duplicateElements: elementsToSave.filter((e, idx, arr) => 
              arr.findIndex(ee => ee.zone_id === e.zone_id && ee.element_name === e.element_name) !== idx
            ).map(e => ({ zone_id: e.zone_id, element_name: e.element_name })),
          };
          debugError(`[useSupabaseChecklistBase:${inspectionType}] ❌ Error batch upserting elements:`, errorDetails);
          console.error(`[useSupabaseChecklistBase] Upsert error:`, errorMessage, errorDetails);
          toast.error(`Error al guardar: ${errorMessage}`);
        } else {
          debugLog(`[useSupabaseChecklistBase:${inspectionType}] ✅ Batch saved ${elementsToSave.length} elements successfully`);
          
          // Si es entorno-zonas-comunes, actualizar has_elevator en la inspección según pregunta ascensor
          if (sectionId === 'entorno-zonas-comunes') {
            const ascensorStatus = sectionToSave.questions?.find(q => q.id === 'ascensor')?.status;
            const hasElevator = ascensorStatus !== undefined && ascensorStatus !== 'no_aplica';
            const { error: updateInspectionError } = await supabase
              .from('property_inspections')
              .update({ has_elevator: hasElevator })
              .eq('id', inspection.id);
            if (updateInspectionError) {
              console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Failed to update has_elevator:`, updateInspectionError);
            } else {
              debugLog(`[useSupabaseChecklistBase:${inspectionType}] ✅ Updated has_elevator = ${hasElevator} for inspection ${inspection.id}`);
            }
          }
          
          // Optimización: Solo refetch si hay elementos con fotos que necesitan URLs actualizadas
          // Esto evita el refetch completo innecesario que puede tomar 1-3 segundos
          const hasPhotosToUpdate = elementsToSave.some(e => 
            e.image_urls && e.image_urls.length > 0 && 
            e.image_urls.some((url: string) => url.startsWith('data:') || !url.startsWith('http'))
          );
          
          // No refetch durante saveAllSections: cada refetch reemplaza el checklist con lo que hay en BD
          // (solo la sección guardada hasta ese momento), borrando el resto de secciones en memoria
          if (savingAllSectionsRef.current) {
            debugLog(`[useSupabaseChecklistBase:${inspectionType}] ⏭️ Skipping refetch during saveAllSections (evita perder otras secciones)`);
          } else if (hasPhotosToUpdate) {
            // Refetch solo si hay fotos que necesitan URLs actualizadas desde Storage
            debugLog(`[useSupabaseChecklistBase:${inspectionType}] 🔄 Refetching to update photo URLs...`);
            await refetchInspection();
          } else {
            // No refetch necesario - el estado local ya está actualizado
            debugLog(`[useSupabaseChecklistBase:${inspectionType}] ⏭️ Skipping refetch - no photos to update`);
          }
        }
      }

      console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Section saved successfully`);
      toast.success("Sección guardada correctamente");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[useSupabaseChecklistBase:${inspectionType}] ❌ Error saving section:`, error);
      try {
        sessionStorage.setItem('checklist-last-save-failed', JSON.stringify({
          propertyId,
          inspectionType,
          at: Date.now(),
        }));
      } catch (_) { /* sessionStorage puede fallar en privado */ }
      const userMessage = message.startsWith('Cuota de almacenamiento') ? message : `Error al guardar sección: ${message}`;
      toast.error(userMessage, {
        duration: 10000,
        action: {
          label: 'Reintentar',
          onClick: () => { saveCurrentSection(sectionId); },
        },
      });
    } finally {
      savingRef.current = false;
    }
  }, [checklist, inspection, supabaseProperty, checklistType, refetchInspection, inspectionType]);

  // Helper para debounce - agrupa múltiples guardados en uno solo
  // Se declara después de saveCurrentSection para evitar error de "used before declaration"
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      if (pendingSaveRef.current && !savingRef.current) {
        const { sectionId } = pendingSaveRef.current;
        currentSectionRef.current = sectionId;
        await saveCurrentSection();
        // No limpiar pendingSaveRef aquí porque saveCurrentSection lo maneja
      }
    }, 2000); // 2 segundos de debounce - agrupa cambios rápidos
  }, [saveCurrentSection]);

  // Actualizar sección en el estado local
  const updateSection = useCallback(async (sectionId: string, sectionData: Partial<ChecklistSection>) => {
    debugLog(`🔄 [useSupabaseChecklistBase:${inspectionType}] updateSection CALLED:`, {
      sectionId,
      sectionDataKeys: Object.keys(sectionData),
      dynamicItemsLength: sectionData.dynamicItems?.length || 0,
    });
    
    if (sectionData.dynamicItems) {
      console.log(`📦 [useSupabaseChecklistBase:${inspectionType}] dynamicItems received:`, sectionData.dynamicItems.map((item, idx) => ({
        index: idx,
        id: item.id,
        questions: item.questions?.map((q: any) => ({ id: q.id, status: q.status, notes: q.notes?.substring(0, 50) })),
        carpentryItems: item.carpentryItems?.map(ci => ({ id: ci.id, cantidad: ci.cantidad, estado: ci.estado, unitsCount: ci.units?.length })),
        climatizationItems: item.climatizationItems?.map(ci => ({ id: ci.id, cantidad: ci.cantidad, estado: ci.estado, unitsCount: ci.units?.length })),
      })));
    }

    // Actualizar estado local
    setChecklist(prev => {
      if (!prev) {
        console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ prevChecklist is null`);
        return null;
      }
      
      const currentSection = prev.sections[sectionId] || {};
      console.log(`📋 [useSupabaseChecklistBase:${inspectionType}] currentSection dynamicItems length:`, currentSection.dynamicItems?.length || 0);
      
      // Crear nueva sección con merge profundo para arrays
      const updatedSection: ChecklistSection = {
        ...currentSection,
        ...sectionData,
      };
      
      // Asegurar nuevas referencias para arrays para que React detecte cambios
      // Deep clone para dynamicItems para asegurar que los objetos anidados también sean nuevas referencias
      if (sectionData.dynamicItems !== undefined) {
        console.log(`🔄 [useSupabaseChecklistBase:${inspectionType}] Cloning dynamicItems...`);
        updatedSection.dynamicItems = sectionData.dynamicItems.map((item, itemIdx) => {
          const clonedItem: any = { ...item };
          // Deep clone nested arrays
          if (item.questions) {
            clonedItem.questions = item.questions.map((q: any) => ({ ...q }));
            if (itemIdx === 0) {
              console.log(`❓ [useSupabaseChecklistBase:${inspectionType}] Cloned questions for habitacion[0]:`, clonedItem.questions.map((q: any) => ({ id: q.id, status: q.status })));
            }
          } else if (itemIdx === 0) {
            console.log(`⚠️ [useSupabaseChecklistBase:${inspectionType}] No questions found in habitacion[0]`);
          }
          if (item.carpentryItems) {
            clonedItem.carpentryItems = item.carpentryItems.map((ci, ciIdx) => {
              const clonedCarpentryItem: any = { ...ci };
              // Clone units array if it exists
              if (ci.units) {
                clonedCarpentryItem.units = ci.units.map(unit => ({ ...unit }));
              }
              if (ciIdx === 0 && itemIdx === 0) {
                console.log(`🪵 [useSupabaseChecklistBase:${inspectionType}] Cloned carpentryItem[0]:`, {
                  id: clonedCarpentryItem.id,
                  cantidad: clonedCarpentryItem.cantidad,
                  estado: clonedCarpentryItem.estado,
                  unitsCount: clonedCarpentryItem.units?.length,
                  units: clonedCarpentryItem.units?.map((u: any) => ({ id: u.id, estado: u.estado })),
                });
              }
              return clonedCarpentryItem;
            });
          }
          if (item.climatizationItems) {
            clonedItem.climatizationItems = item.climatizationItems.map((ci, ciIdx) => {
              const clonedClimatizationItem: any = { ...ci };
              // Clone units array if it exists
              if (ci.units) {
                clonedClimatizationItem.units = ci.units.map(unit => ({ ...unit }));
              }
              if (ciIdx === 0 && itemIdx === 0) {
                console.log(`🌡️ [useSupabaseChecklistBase:${inspectionType}] Cloned climatizationItem[0]:`, {
                  id: clonedClimatizationItem.id,
                  cantidad: clonedClimatizationItem.cantidad,
                  estado: clonedClimatizationItem.estado,
                  unitsCount: clonedClimatizationItem.units?.length,
                  units: clonedClimatizationItem.units?.map((u: any) => ({ id: u.id, estado: u.estado })),
                });
              }
              return clonedClimatizationItem;
            });
          }
          if (item.uploadZone) {
            clonedItem.uploadZone = { ...item.uploadZone };
            if (item.uploadZone.photos) {
              clonedItem.uploadZone.photos = [...item.uploadZone.photos];
            }
            if (item.uploadZone.videos) {
              clonedItem.uploadZone.videos = [...item.uploadZone.videos];
            }
          }
          // Clonar mobiliario si existe
          if (item.mobiliario) {
            clonedItem.mobiliario = {
              ...item.mobiliario,
            };
            if (item.mobiliario.question) {
              clonedItem.mobiliario.question = {
                ...item.mobiliario.question,
              };
              if (item.mobiliario.question.photos) {
                clonedItem.mobiliario.question.photos = [...item.mobiliario.question.photos];
              }
              if (item.mobiliario.question.badElements) {
                clonedItem.mobiliario.question.badElements = [...item.mobiliario.question.badElements];
              }
            }
            if (itemIdx === 0) {
              console.log(`🪑 [useSupabaseChecklistBase:${inspectionType}] Cloned mobiliario for habitacion[0]:`, {
                existeMobiliario: clonedItem.mobiliario.existeMobiliario,
                hasQuestion: !!clonedItem.mobiliario.question,
                questionStatus: clonedItem.mobiliario.question?.status,
              });
            }
          }
          return clonedItem;
        });
        console.log(`✅ [useSupabaseChecklistBase:${inspectionType}] Cloned dynamicItems length:`, updatedSection.dynamicItems.length);
      }
      if (sectionData.uploadZones !== undefined) {
        updatedSection.uploadZones = sectionData.uploadZones.map(zone => ({ ...zone }));
      }
      if (sectionData.questions !== undefined) {
        updatedSection.questions = sectionData.questions.map((q: any) => ({ ...q }));
      }
      if (sectionData.carpentryItems !== undefined) {
        updatedSection.carpentryItems = sectionData.carpentryItems.map(item => {
          const clonedItem: any = { ...item };
          // Clone units array if it exists
          if (item.units) {
            clonedItem.units = item.units.map(unit => ({ ...unit }));
          }
          return clonedItem;
        });
      }
      if (sectionData.climatizationItems !== undefined) {
        updatedSection.climatizationItems = sectionData.climatizationItems.map(item => {
          const clonedItem: any = { ...item };
          // Clone units array if it exists
          if (item.units) {
            clonedItem.units = item.units.map(unit => ({ ...unit }));
          }
          return clonedItem;
        });
      }
      if (sectionData.storageItems !== undefined) {
        updatedSection.storageItems = sectionData.storageItems.map(item => {
          const clonedItem: any = { ...item };
          // Clone units array if it exists
          if (item.units) {
            clonedItem.units = item.units.map(unit => ({ ...unit }));
          }
          return clonedItem;
        });
      }
      if (sectionData.appliancesItems !== undefined) {
        updatedSection.appliancesItems = sectionData.appliancesItems.map(item => {
          const clonedItem: any = { ...item };
          // Clone units array if it exists
          if (item.units) {
            clonedItem.units = item.units.map(unit => ({ ...unit }));
          }
          return clonedItem;
        });
      }
      
      const updatedSections = {
        ...prev.sections,
        [sectionId]: updatedSection,
      };

      const finalChecklist = {
        ...prev,
        sections: updatedSections,
      };
      
      if (sectionId === "habitaciones" && updatedSection.dynamicItems) {
        const habitacion0 = updatedSection.dynamicItems[0];
        if (habitacion0) {
          const ventanas = habitacion0.carpentryItems?.find(ci => ci.id === "ventanas");
          const radiadores = habitacion0.climatizationItems?.find(ci => ci.id === "radiadores");
          const acabados = habitacion0.questions?.find(q => q.id === "acabados");
          const puertaEntrada = habitacion0.questions?.find(q => q.id === "puerta-entrada");
          const electricidad = habitacion0.questions?.find(q => q.id === "electricidad");
          console.log(`✅ [useSupabaseChecklistBase:${inspectionType}] Final checklist state:`, {
            ventanas: ventanas ? { id: ventanas.id, cantidad: ventanas.cantidad, estado: ventanas.estado, unitsCount: ventanas.units?.length } : null,
            radiadores: radiadores ? { id: radiadores.id, cantidad: radiadores.cantidad, estado: radiadores.estado, unitsCount: radiadores.units?.length } : null,
            acabados: acabados ? { id: acabados.id, status: acabados.status } : null,
            puertaEntrada: puertaEntrada ? { id: puertaEntrada.id, status: puertaEntrada.status } : null,
            electricidad: electricidad ? { id: electricidad.id, status: electricidad.status } : null,
            allQuestions: habitacion0.questions?.map((q: any) => ({ id: q.id, status: q.status })) || [],
          });
        }
      }

      // Actualizar ref de forma síncrona para que saveCurrentSection (p. ej. al pulsar Continuar) lea siempre el último estado
      checklistRef.current = finalChecklist;
      return finalChecklist;
    });

    currentSectionRef.current = sectionId;
    pendingSaveRef.current = { sectionId, sectionData };
    
    // NO guardar automáticamente - solo guardar cuando se cambia de página
    // El guardado se hará en handleContinue o handleSectionClick
    
    debugLog(`✅ [useSupabaseChecklistBase:${inspectionType}] updateSection COMPLETED (sin autoguardado)`);
  }, [inspectionType, debouncedSave]);

  // Guardar todas las secciones antes de finalizar
  // Esta función guarda todas las secciones del checklist, no solo la actual
  // IMPORTANTE: Esta función debe ejecutarse ANTES de finalizar para asegurar que todas las fotos y datos se guarden
  const saveAllSections = useCallback(async () => {
    if (!checklist || !inspection?.id || !supabaseProperty) {
      debugLog(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Cannot save all sections - missing data`);
      return;
    }

    // Si ya hay un guardado en progreso, esperar a que termine
    if (savingRef.current) {
      debugLog(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Save already in progress, waiting...`);
      while (savingRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    debugLog(`[useSupabaseChecklistBase:${inspectionType}] 💾 Saving ALL sections before finalizing...`);
    
    const sectionIds = Object.keys(checklist.sections);
    debugLog(`[useSupabaseChecklistBase:${inspectionType}] 📋 Found ${sectionIds.length} sections to save:`, sectionIds);
    
    const originalSectionRef = currentSectionRef.current;
    savingAllSectionsRef.current = true;
    checklistForFinalizeRef.current = JSON.parse(JSON.stringify(checklist));
    
    try {
      for (const sectionId of sectionIds) {
        const section = checklist.sections[sectionId];
        if (!section) {
          debugLog(`[useSupabaseChecklistBase:${inspectionType}] ⏭️ Skipping empty section: ${sectionId}`);
          continue;
        }

        currentSectionRef.current = sectionId;
        debugLog(`[useSupabaseChecklistBase:${inspectionType}] 💾 Saving section: ${sectionId}`);
        
        await saveCurrentSection();
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      currentSectionRef.current = originalSectionRef;
      
      // Un solo refetch al final: así el checklist se actualiza con TODAS las secciones ya guardadas
      // y no se sobrescribe con datos parciales tras cada sección (que borraba el resto en memoria)
      await refetchInspection();
      
      debugLog(`[useSupabaseChecklistBase:${inspectionType}] ✅ All sections saved successfully`);
    } catch (error) {
      currentSectionRef.current = originalSectionRef;
      debugError(`[useSupabaseChecklistBase:${inspectionType}] ❌ Error saving all sections:`, error);
      throw error;
    } finally {
      savingAllSectionsRef.current = false;
    }
  }, [checklist, inspection, supabaseProperty, saveCurrentSection, refetchInspection, inspectionType]);

  // Finalizar checklist
  const finalizeChecklist = useCallback(async (data?: {
    estimatedVisitDate?: string;
    autoVisitDate?: string;
    nextRenoSteps?: string;
    /** Solo reno_final: true = lista para comercialización (Airtable "OK"), false = no lista ("NO OK") */
    readyForCommercialization?: boolean;
  }) => {
    if (!checklist || !inspection?.id) {
      toast.error("No hay checklist para finalizar");
      return false;
    }

    try {
      // CRÍTICO: No guardar hasta que existan zonas (evita "Zone not found" y checklist vacío en HTML)
      if (zones.length === 0 && inspection?.id && functionsRef.current) {
        console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ No zones available at finalize - creating zones and refetching`);
        toast.info("Preparando zonas del checklist... Por favor, haz clic en Enviar de nuevo en unos segundos.");
        await functionsRef.current.createInitialZones(inspection.id);
        await functionsRef.current.refetchInspection();
        await new Promise(resolve => setTimeout(resolve, 800));
        // Tras refetch el estado se actualizará en el siguiente render; no podemos usar zones actualizado aquí
        toast.warning("Zonas creadas. Haz clic en Enviar de nuevo para guardar y finalizar.");
        return false;
      }

      // Guardar sección actual antes de finalizar
      await saveCurrentSection();
      
      // IMPORTANTE: Guardar TODAS las secciones antes de finalizar
      // Esto asegura que todas las fotos y datos se guarden, no solo la sección actual
      await saveAllSections();

      // Verificación: comprobar que los elementos se guardaron en Supabase
      const supabaseVerify = createClient();
      const { data: verifyZones } = await supabaseVerify
        .from('inspection_zones')
        .select('id')
        .eq('inspection_id', inspection.id);
      const zoneIds = verifyZones?.map(z => z.id) || [];
      const { count: elementsCount } = await supabaseVerify
        .from('inspection_elements')
        .select('*', { count: 'exact', head: true })
        .in('zone_id', zoneIds.length ? zoneIds : ['00000000-0000-0000-0000-000000000000']);

      const hasChecklistData = Object.values(checklist.sections || {}).some(sec => {
        const hasPhotos = (p: { data?: string }[]) => p?.some(x => x.data?.startsWith?.('http')) ?? false;
        if (sec.uploadZones?.some(z => hasPhotos(z.photos || []))) return true;
        if (sec.questions?.some(q => hasPhotos(q.photos || []))) return true;
        if (sec.dynamicItems?.some(di => hasPhotos(di.uploadZone?.photos || []) || di.questions?.some(q => hasPhotos(q.photos || [])))) return true;
        return false;
      });

      if (zoneIds.length > 0 && (elementsCount ?? 0) === 0 && hasChecklistData) {
        console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ 0 elementos en Supabase pero checklist tiene datos. Reintentando guardado...`);
        await saveAllSections();
        const { count: retryCount } = await supabaseVerify
          .from('inspection_elements')
          .select('*', { count: 'exact', head: true })
          .in('zone_id', zoneIds);
        if ((retryCount ?? 0) === 0) {
          toast.error(
            "No se pudieron guardar los datos del checklist. Guarda cada sección manualmente (botón Guardar en cada una) y vuelve a intentar.",
            { duration: 8000 }
          );
          return false;
        }
      }

      // Calcular progreso
      const sections = Object.values(checklist.sections);
      const totalSections = sections.length;
      const completedSections = sections.filter(section => {
        if (section.uploadZones && section.uploadZones.length > 0) {
          return section.uploadZones.every(zone => 
            (zone.photos && zone.photos.length > 0) || 
            (zone.videos && zone.videos.length > 0)
          );
        }
        return true;
      }).length;

      const progress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 100;

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

      if (checklistType !== 'reno_initial' && checklistType !== 'reno_final') {
        console.warn(`[useSupabaseChecklistBase:${inspectionType}] Cannot finalize non-reno checklist`);
        return false;
      }
      
      const success = await finalizeInitialCheckInAirtable(
        propertyId,
        checklistType as 'reno_initial' | 'reno_final',
        {
          estimatedVisitDate,
          autoVisitDate,
          nextRenoSteps,
          progress,
          readyForCommercialization: data?.readyForCommercialization,
        },
        checklistForFinalizeRef.current || undefined
      );

      if (success) {
        toast.success("Checklist finalizado correctamente");
        
        // Si es checklist inicial, llamar al webhook para crear carpeta Drive
        // Se ejecuta de forma asíncrona y silenciosa
        if (checklistType === 'reno_initial') {
          createDriveFolderForProperty(propertyId).catch((error) => {
            console.error('[useSupabaseChecklistBase] Error creating drive folder:', error);
            // No mostrar error al usuario (silencioso)
          });

          // Recopilar todas las URLs de fotos del checklist completo y enviarlas todas juntas a n8n
          const allPhotos: Array<{ url: string; filename: string }> = [];
          
          // Función helper para extraer fotos de una sección
          const extractPhotosFromSection = (section: ChecklistSection) => {
            // Fotos de uploadZones
            if (section.uploadZones) {
              section.uploadZones.forEach(zone => {
                if (zone.photos) {
                  zone.photos.forEach(photo => {
                    if (photo.data && photo.data.startsWith('http')) {
                      const urlParts = photo.data.split('/');
                      const filename = urlParts[urlParts.length - 1];
                      allPhotos.push({ url: photo.data, filename });
                    }
                  });
                }
              });
            }

            // Fotos de dynamicItems
            if (section.dynamicItems) {
              section.dynamicItems.forEach(item => {
                // Fotos del uploadZone del item
                if (item.uploadZone?.photos) {
                  item.uploadZone.photos.forEach(photo => {
                    if (photo.data && photo.data.startsWith('http')) {
                      const urlParts = photo.data.split('/');
                      const filename = urlParts[urlParts.length - 1];
                      allPhotos.push({ url: photo.data, filename });
                    }
                  });
                }
                // Fotos de questions dentro del item
                if (item.questions) {
                  item.questions.forEach(question => {
                    if (question.photos) {
                      question.photos.forEach(photo => {
                        if (photo.data && photo.data.startsWith('http')) {
                          const urlParts = photo.data.split('/');
                          const filename = urlParts[urlParts.length - 1];
                          allPhotos.push({ url: photo.data, filename });
                        }
                      });
                    }
                  });
                }
                // Fotos de carpentryItems
                if (item.carpentryItems) {
                  item.carpentryItems.forEach(carpentryItem => {
                    if (carpentryItem.photos) {
                      carpentryItem.photos.forEach(photo => {
                        if (photo.data && photo.data.startsWith('http')) {
                          const urlParts = photo.data.split('/');
                          const filename = urlParts[urlParts.length - 1];
                          allPhotos.push({ url: photo.data, filename });
                        }
                      });
                    }
                    if (carpentryItem.units) {
                      carpentryItem.units.forEach(unit => {
                        if (unit.photos) {
                          unit.photos.forEach(photo => {
                            if (photo.data && photo.data.startsWith('http')) {
                              const urlParts = photo.data.split('/');
                              const filename = urlParts[urlParts.length - 1];
                              allPhotos.push({ url: photo.data, filename });
                            }
                          });
                        }
                      });
                    }
                  });
                }
                // Fotos de climatizationItems
                if (item.climatizationItems) {
                  item.climatizationItems.forEach(climatizationItem => {
                    if (climatizationItem.photos) {
                      climatizationItem.photos.forEach(photo => {
                        if (photo.data && photo.data.startsWith('http')) {
                          const urlParts = photo.data.split('/');
                          const filename = urlParts[urlParts.length - 1];
                          allPhotos.push({ url: photo.data, filename });
                        }
                      });
                    }
                    if (climatizationItem.units) {
                      climatizationItem.units.forEach(unit => {
                        if (unit.photos) {
                          unit.photos.forEach(photo => {
                            if (photo.data && photo.data.startsWith('http')) {
                              const urlParts = photo.data.split('/');
                              const filename = urlParts[urlParts.length - 1];
                              allPhotos.push({ url: photo.data, filename });
                            }
                          });
                        }
                      });
                    }
                  });
                }
              });
            }

            // Fotos de questions directas de la sección
            if (section.questions) {
              section.questions.forEach(question => {
                if (question.photos) {
                  question.photos.forEach(photo => {
                    if (photo.data && photo.data.startsWith('http')) {
                      const urlParts = photo.data.split('/');
                      const filename = urlParts[urlParts.length - 1];
                      allPhotos.push({ url: photo.data, filename });
                    }
                  });
                }
              });
            }

            // Fotos de carpentryItems directos de la sección
            if (section.carpentryItems) {
              section.carpentryItems.forEach(item => {
                if (item.photos) {
                  item.photos.forEach(photo => {
                    if (photo.data && photo.data.startsWith('http')) {
                      const urlParts = photo.data.split('/');
                      const filename = urlParts[urlParts.length - 1];
                      allPhotos.push({ url: photo.data, filename });
                    }
                  });
                }
                if (item.units) {
                  item.units.forEach(unit => {
                    if (unit.photos) {
                      unit.photos.forEach(photo => {
                        if (photo.data && photo.data.startsWith('http')) {
                          const urlParts = photo.data.split('/');
                          const filename = urlParts[urlParts.length - 1];
                          allPhotos.push({ url: photo.data, filename });
                        }
                      });
                    }
                  });
                }
              });
            }

            // Fotos de climatizationItems directos de la sección
            if (section.climatizationItems) {
              section.climatizationItems.forEach(item => {
                if (item.photos) {
                  item.photos.forEach(photo => {
                    if (photo.data && photo.data.startsWith('http')) {
                      const urlParts = photo.data.split('/');
                      const filename = urlParts[urlParts.length - 1];
                      allPhotos.push({ url: photo.data, filename });
                    }
                  });
                }
                if (item.units) {
                  item.units.forEach(unit => {
                    if (unit.photos) {
                      unit.photos.forEach(photo => {
                        if (photo.data && photo.data.startsWith('http')) {
                          const urlParts = photo.data.split('/');
                          const filename = urlParts[urlParts.length - 1];
                          allPhotos.push({ url: photo.data, filename });
                        }
                      });
                    }
                  });
                }
              });
            }

            // Fotos de storageItems
            if (section.storageItems) {
              section.storageItems.forEach(item => {
                if (item.photos) {
                  item.photos.forEach(photo => {
                    if (photo.data && photo.data.startsWith('http')) {
                      const urlParts = photo.data.split('/');
                      const filename = urlParts[urlParts.length - 1];
                      allPhotos.push({ url: photo.data, filename });
                    }
                  });
                }
                if (item.units) {
                  item.units.forEach(unit => {
                    if (unit.photos) {
                      unit.photos.forEach(photo => {
                        if (photo.data && photo.data.startsWith('http')) {
                          const urlParts = photo.data.split('/');
                          const filename = urlParts[urlParts.length - 1];
                          allPhotos.push({ url: photo.data, filename });
                        }
                      });
                    }
                  });
                }
              });
            }

            // Fotos de appliancesItems
            if (section.appliancesItems) {
              section.appliancesItems.forEach(item => {
                if (item.photos) {
                  item.photos.forEach(photo => {
                    if (photo.data && photo.data.startsWith('http')) {
                      const urlParts = photo.data.split('/');
                      const filename = urlParts[urlParts.length - 1];
                      allPhotos.push({ url: photo.data, filename });
                    }
                  });
                }
                if (item.units) {
                  item.units.forEach(unit => {
                    if (unit.photos) {
                      unit.photos.forEach(photo => {
                        if (photo.data && photo.data.startsWith('http')) {
                          const urlParts = photo.data.split('/');
                          const filename = urlParts[urlParts.length - 1];
                          allPhotos.push({ url: photo.data, filename });
                        }
                      });
                    }
                  });
                }
              });
            }

            // Fotos de securityItems
            if (section.securityItems) {
              section.securityItems.forEach(item => {
                if (item.photos) {
                  item.photos.forEach(photo => {
                    if (photo.data && photo.data.startsWith('http')) {
                      const urlParts = photo.data.split('/');
                      const filename = urlParts[urlParts.length - 1];
                      allPhotos.push({ url: photo.data, filename });
                    }
                  });
                }
                if (item.units) {
                  item.units.forEach(unit => {
                    if (unit.photos) {
                      unit.photos.forEach(photo => {
                        if (photo.data && photo.data.startsWith('http')) {
                          const urlParts = photo.data.split('/');
                          const filename = urlParts[urlParts.length - 1];
                          allPhotos.push({ url: photo.data, filename });
                        }
                      });
                    }
                  });
                }
              });
            }

            // Fotos de systemsItems
            if (section.systemsItems) {
              section.systemsItems.forEach(item => {
                if (item.photos) {
                  item.photos.forEach(photo => {
                    if (photo.data && photo.data.startsWith('http')) {
                      const urlParts = photo.data.split('/');
                      const filename = urlParts[urlParts.length - 1];
                      allPhotos.push({ url: photo.data, filename });
                    }
                  });
                }
                if (item.units) {
                  item.units.forEach(unit => {
                    if (unit.photos) {
                      unit.photos.forEach(photo => {
                        if (photo.data && photo.data.startsWith('http')) {
                          const urlParts = photo.data.split('/');
                          const filename = urlParts[urlParts.length - 1];
                          allPhotos.push({ url: photo.data, filename });
                        }
                      });
                    }
                  });
                }
              });
            }
          };

          // Recopilar fotos de todas las secciones
          Object.values(checklist.sections).forEach(section => {
            extractPhotosFromSection(section);
          });

          // Combinar con las fotos acumuladas durante el guardado (por si alguna no se guardó aún)
          const allPhotosToSend = [...accumulatedInitialCheckPhotosRef.current, ...allPhotos];
          
          // Eliminar duplicados basándose en la URL
          const uniquePhotos = Array.from(
            new Map(allPhotosToSend.map(photo => [photo.url, photo])).values()
          );

          console.log(`[useSupabaseChecklistBase:${inspectionType}] 📤 Sending all ${uniquePhotos.length} photos to Drive in a single call...`);
          
          if (uniquePhotos.length > 0) {
            try {
              const driveUploadSuccess = await uploadPhotosToDrive(
                propertyId,
                'reno_initial',
                uniquePhotos
              );
              
              if (!driveUploadSuccess) {
                toast.error("Error al subir fotos a Drive", {
                  description: "El checklist se finalizó correctamente pero no se pudieron subir todas las fotos a Drive. Contacta al administrador.",
                });
              } else {
                console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Successfully uploaded all ${uniquePhotos.length} photos to Drive`);
              }
              
              // Limpiar el ref después de enviar
              accumulatedInitialCheckPhotosRef.current = [];
            } catch (driveError: any) {
              console.error(`[useSupabaseChecklistBase:${inspectionType}] ❌ Error uploading photos to Drive:`, driveError);
              toast.error("Error al subir fotos a Drive", {
                description: driveError.message || "El checklist se finalizó correctamente pero no se pudieron subir todas las fotos a Drive.",
              });
            }
          } else {
            console.log(`[useSupabaseChecklistBase:${inspectionType}] ℹ️ No photos to upload to Drive`);
          }
        }
      } else {
        toast.error("Error al finalizar checklist en Airtable");
      }

      return success;
    } catch (error) {
      console.error(`[useSupabaseChecklistBase:${inspectionType}] Error finalizing checklist:`, error);
      toast.error("Error al finalizar checklist");
      return false;
    }
  }, [propertyId, checklistType, checklist, inspection, zones, saveCurrentSection, saveAllSections, inspectionType]);

  return {
    checklist,
    isLoading,
    updateSection,
    saveCurrentSection,
    saveAllSections,
    finalizeChecklist,
  };
}

