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
  saveCurrentSection: () => Promise<void>;
  finalizeChecklist: (data?: {
    estimatedVisitDate?: string;
    autoVisitDate?: string;
    nextRenoSteps?: string;
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
  const functionsRef = useRef<{
    createInspection: (propertyId: string, type: InspectionType) => Promise<any>;
    refetchInspection: () => Promise<void>;
    createInitialZones: (inspectionId: string) => Promise<void>;
  } | null>(null);
  
  // Keep checklistRef in sync with checklist state
  useEffect(() => {
    checklistRef.current = checklist;
  }, [checklist]);

  // Log initialization only once per mount (using ref to track)
  const hasLoggedRef = useRef(false);
  if (!hasLoggedRef.current) {
    console.log(`[useSupabaseChecklistBase:${inspectionType}] 🔍 Initialized:`, {
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
            // Ya intentamos crear las zonas pero aún no se han cargado
            // Esperar un poco más y hacer refetch
            console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏳ Zones were created but not loaded yet, refetching...`);
            lastInspectionLoadingRef.current = true;
            await functionsRef.current.refetchInspection();
            await new Promise(resolve => setTimeout(resolve, 500));
            lastInspectionLoadingRef.current = false;
            // Si aún no hay zonas después del refetch, crear un checklist vacío para evitar bucle infinito
            if (zones.length === 0) {
              console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Zones still not loaded after refetch, creating empty checklist to prevent infinite loop`);
              const emptyChecklist = createChecklist(propertyId, checklistType, {});
              setChecklist(emptyChecklist);
              setIsLoading(false);
              initializationInProgressRef.current = false;
              return;
            }
            // Si ahora hay zonas, continuar con la carga normal del checklist
            // El efecto se ejecutará de nuevo cuando zones.length cambie
            return;
          }
          
          console.log(`[useSupabaseChecklistBase:${inspectionType}] 📝 Creating initial zones...`);
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
          
          console.log(`[useSupabaseChecklistBase:${inspectionType}] 📥 Loading checklist from Supabase...`, {
            zonesCount: zones.length,
            elementsCount: elements.length,
            bedrooms: supabaseProperty.bedrooms,
            bathrooms: supabaseProperty.bathrooms,
            photoElementsCount: photoElementsDetails.length,
            photoElements: photoElementsDetails,
          });
          
          const supabaseData = convertSupabaseToChecklist(
            zones,
            elements,
            supabaseProperty.bedrooms || null,
            supabaseProperty.bathrooms || null
          );
          
          const loadedChecklist = createChecklist(propertyId, checklistType, supabaseData.sections || {});
          setChecklist(loadedChecklist);
          if (inspection?.id) {
            const stableKey = `${propertyId}-${checklistType}-${inspection.id}`;
            initializationRef.current = stableKey;
            lastZonesCountRef.current = zones.length;
          }
          console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Checklist loaded and set`, {
            inspectionId: inspection?.id,
            zonesCount: zones.length,
            elementsCount: elements.length,
            photoElementsCount: photoElementsDetails.length,
          });
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
      
      // Si es la primera inspección y tenemos datos, SIEMPRE recargar el checklist
      if (zones.length > 0) {
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
  const saveCurrentSection = useCallback(async () => {
    if (savingRef.current) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Save already in progress, skipping...`);
      return;
    }

    if (!checklist || !inspection?.id || !supabaseProperty) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Cannot save - missing data:`, {
        hasChecklist: !!checklist,
        hasInspection: !!inspection?.id,
        hasProperty: !!supabaseProperty,
      });
      return;
    }

    const sectionId = currentSectionRef.current;
    if (!sectionId) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ No current section to save`);
      return;
    }

    savingRef.current = true;

    try {
      const section = checklist.sections[sectionId];
      if (!section) {
        console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Section not found:`, sectionId);
        savingRef.current = false;
        return;
      }

      console.log(`[useSupabaseChecklistBase:${inspectionType}] 💾 Saving section:`, sectionId);

      // Encontrar zona correspondiente a la sección primero (necesaria para subir archivos)
      const expectedZoneType = sectionId === "habitaciones" ? "dormitorio" :
                              sectionId === "banos" ? "bano" :
                              sectionId === "entorno-zonas-comunes" ? "entorno" :
                              sectionId === "estado-general" ? "distribucion" :
                              sectionId === "entrada-pasillos" ? "entrada" :
                              sectionId === "salon" ? "salon" :
                              sectionId === "cocina" ? "cocina" :
                              sectionId === "exteriores" ? "exterior" : null;
      
      const zone = zones.find(z => z.zone_type === expectedZoneType);
      
      if (!zone) {
        console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Zone not found for section:`, sectionId);
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
                });
              }
            });
          }
          // Fotos de climatizationItems dentro de dynamic items
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
          // Fotos cuando cantidad = 1
          if (item.photos) {
            const base64Photos = item.photos.filter(photo => 
              photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
            );
            filesToUpload.push(...base64Photos);
          }
          // Fotos de units cuando cantidad > 1
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

      // Archivos de climatizationItems que están en base64
      if (section.climatizationItems) {
        section.climatizationItems.forEach(item => {
          // Fotos cuando cantidad = 1
          if (item.photos) {
            const base64Photos = item.photos.filter(photo => 
              photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))
            );
            filesToUpload.push(...base64Photos);
          }
          // Fotos de units cuando cantidad > 1
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

      // Subir archivos a Supabase Storage antes de guardar
      if (filesToUpload.length > 0) {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] 📤 Uploading ${filesToUpload.length} files to Supabase Storage...`);
        try {
          const uploadedUrls = await uploadFilesToStorage(
            filesToUpload,
            propertyId,
            inspection.id,
            zone.id
          );
          
          console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Uploaded ${uploadedUrls.length} files successfully`);
          
          // Actualizar las fotos en la copia de la sección con las URLs subidas
          let urlIndex = 0;
          
          // Actualizar uploadZones
          if (sectionToSave.uploadZones) {
            sectionToSave.uploadZones.forEach(uploadZone => {
              if (uploadZone.photos) {
                uploadZone.photos.forEach(photo => {
                  if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                    if (urlIndex < uploadedUrls.length) {
                      photo.data = uploadedUrls[urlIndex];
                      urlIndex++;
                    }
                  }
                });
              }
            });
          }
          
          // Actualizar dynamicItems
          if (sectionToSave.dynamicItems) {
            sectionToSave.dynamicItems.forEach(item => {
              if (item.uploadZone?.photos) {
                item.uploadZone.photos.forEach(photo => {
                  if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                    if (urlIndex < uploadedUrls.length) {
                      photo.data = uploadedUrls[urlIndex];
                      urlIndex++;
                    }
                  }
                });
              }
              if (item.uploadZone?.videos) {
                item.uploadZone.videos.forEach(video => {
                  if (video.data && (video.data.startsWith('data:') || (!video.data.startsWith('http') && video.data.length > 100))) {
                    if (urlIndex < uploadedUrls.length) {
                      video.data = uploadedUrls[urlIndex];
                      urlIndex++;
                    }
                  }
                });
              }
              // Actualizar carpentryItems dentro de dynamic items
              if (item.carpentryItems) {
                item.carpentryItems.forEach(carpentryItem => {
                  if (carpentryItem.photos) {
                    carpentryItem.photos.forEach(photo => {
                      if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                        if (urlIndex < uploadedUrls.length) {
                          photo.data = uploadedUrls[urlIndex];
                          urlIndex++;
                        }
                      }
                    });
                  }
                  if (carpentryItem.units) {
                    carpentryItem.units.forEach(unit => {
                      if (unit.photos) {
                        unit.photos.forEach(photo => {
                          if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                            if (urlIndex < uploadedUrls.length) {
                              photo.data = uploadedUrls[urlIndex];
                              urlIndex++;
                            }
                          }
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
                      if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                        if (urlIndex < uploadedUrls.length) {
                          photo.data = uploadedUrls[urlIndex];
                          urlIndex++;
                        }
                      }
                    });
                  }
                  if (climatizationItem.units) {
                    climatizationItem.units.forEach(unit => {
                      if (unit.photos) {
                        unit.photos.forEach(photo => {
                          if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                            if (urlIndex < uploadedUrls.length) {
                              photo.data = uploadedUrls[urlIndex];
                              urlIndex++;
                            }
                          }
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
                      if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                        if (urlIndex < uploadedUrls.length) {
                          photo.data = uploadedUrls[urlIndex];
                          urlIndex++;
                        }
                      }
                    });
                  }
                });
              }
            });
          }
          
          // Actualizar questions
          if (sectionToSave.questions) {
            sectionToSave.questions.forEach(question => {
              if (question.photos) {
                question.photos.forEach(photo => {
                  if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                    if (urlIndex < uploadedUrls.length) {
                      photo.data = uploadedUrls[urlIndex];
                      urlIndex++;
                    }
                  }
                });
              }
            });
          }

          // Actualizar carpentryItems
          if (sectionToSave.carpentryItems) {
            sectionToSave.carpentryItems.forEach(item => {
              // Fotos cuando cantidad = 1
              if (item.photos) {
                item.photos.forEach(photo => {
                  if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                    if (urlIndex < uploadedUrls.length) {
                      photo.data = uploadedUrls[urlIndex];
                      urlIndex++;
                    }
                  }
                });
              }
              // Fotos de units cuando cantidad > 1
              if (item.units) {
                item.units.forEach(unit => {
                  if (unit.photos) {
                    unit.photos.forEach(photo => {
                      if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                        if (urlIndex < uploadedUrls.length) {
                          photo.data = uploadedUrls[urlIndex];
                          urlIndex++;
                        }
                      }
                    });
                  }
                });
              }
            });
          }

          // Actualizar climatizationItems
          if (sectionToSave.climatizationItems) {
            sectionToSave.climatizationItems.forEach(item => {
              // Fotos cuando cantidad = 1
              if (item.photos) {
                item.photos.forEach(photo => {
                  if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                    if (urlIndex < uploadedUrls.length) {
                      photo.data = uploadedUrls[urlIndex];
                      urlIndex++;
                    }
                  }
                });
              }
              // Fotos de units cuando cantidad > 1
              if (item.units) {
                item.units.forEach(unit => {
                  if (unit.photos) {
                    unit.photos.forEach(photo => {
                      if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                        if (urlIndex < uploadedUrls.length) {
                          photo.data = uploadedUrls[urlIndex];
                          urlIndex++;
                        }
                      }
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
                  if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                    if (urlIndex < uploadedUrls.length) {
                      photo.data = uploadedUrls[urlIndex];
                      urlIndex++;
                    }
                  }
                });
              }
              if (item.units) {
                item.units.forEach(unit => {
                  if (unit.photos) {
                    unit.photos.forEach(photo => {
                      if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                        if (urlIndex < uploadedUrls.length) {
                          photo.data = uploadedUrls[urlIndex];
                          urlIndex++;
                        }
                      }
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
                  if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                    if (urlIndex < uploadedUrls.length) {
                      photo.data = uploadedUrls[urlIndex];
                      urlIndex++;
                    }
                  }
                });
              }
              if (item.units) {
                item.units.forEach(unit => {
                  if (unit.photos) {
                    unit.photos.forEach(photo => {
                      if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                        if (urlIndex < uploadedUrls.length) {
                          photo.data = uploadedUrls[urlIndex];
                          urlIndex++;
                        }
                      }
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
                  if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                    if (urlIndex < uploadedUrls.length) {
                      photo.data = uploadedUrls[urlIndex];
                      urlIndex++;
                    }
                  }
                });
              }
              if (item.units) {
                item.units.forEach(unit => {
                  if (unit.photos) {
                    unit.photos.forEach(photo => {
                      if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                        if (urlIndex < uploadedUrls.length) {
                          photo.data = uploadedUrls[urlIndex];
                          urlIndex++;
                        }
                      }
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
                  if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                    if (urlIndex < uploadedUrls.length) {
                      photo.data = uploadedUrls[urlIndex];
                      urlIndex++;
                    }
                  }
                });
              }
              if (item.units) {
                item.units.forEach(unit => {
                  if (unit.photos) {
                    unit.photos.forEach(photo => {
                      if (photo.data && (photo.data.startsWith('data:') || (!photo.data.startsWith('http') && photo.data.length > 100))) {
                        if (urlIndex < uploadedUrls.length) {
                          photo.data = uploadedUrls[urlIndex];
                          urlIndex++;
                        }
                      }
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
          toast.error("Error al subir archivos. Intenta guardar nuevamente.");
          savingRef.current = false;
          return;
        }
      }

      // Convertir sección a elementos de Supabase (usar sectionToSave que tiene las URLs actualizadas)
      let elementsToSave: any[] = [];
      
      // Si es una sección dinámica (habitaciones, banos), procesar cada dynamic item con su zona correspondiente
      if ((sectionId === "habitaciones" || sectionId === "banos") && sectionToSave.dynamicItems && sectionToSave.dynamicItems.length > 0) {
        // Encontrar todas las zonas del tipo correcto para esta sección
        const zonesOfType = zones.filter(z => z.zone_type === expectedZoneType);
        
        console.log(`[useSupabaseChecklistBase:${inspectionType}] Processing ${sectionToSave.dynamicItems.length} dynamic items with ${zonesOfType.length} zones`);
        
        // Procesar cada dynamic item con su zona correspondiente
        sectionToSave.dynamicItems.forEach((dynamicItem, index) => {
          const correspondingZone = zonesOfType[index];
          if (correspondingZone) {
            const dynamicElements = convertDynamicItemToElements(dynamicItem, correspondingZone.id);
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
      
      // Guardar elementos en Supabase
      const supabase = createClient();
      for (const element of elementsToSave) {
        // Usar onConflict con la constraint única (zone_id, element_name) en lugar de 'id'
        // porque los elementos nuevos no tienen 'id' (se genera automáticamente)
        const { error: upsertError } = await supabase.from('inspection_elements').upsert(element, {
          onConflict: 'zone_id,element_name',
        });
        
        if (upsertError) {
          console.error(`[useSupabaseChecklistBase:${inspectionType}] ❌ Error upserting element ${element.element_name}:`, {
            error: upsertError,
            element_name: element.element_name,
            zone_id: element.zone_id,
            hasImageUrls: !!element.image_urls,
            imageUrlsCount: element.image_urls?.length || 0,
            condition: element.condition,
            hasNotes: !!element.notes,
            errorCode: (upsertError as any)?.code,
            errorMessage: (upsertError as any)?.message,
            errorDetails: (upsertError as any)?.details,
            errorHint: (upsertError as any)?.hint,
          });
          toast.error(`Error al guardar elemento ${element.element_name}`);
        } else {
          console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Saved element:`, {
            element_name: element.element_name,
            zone_id: element.zone_id,
            condition: element.condition,
            hasNotes: !!element.notes,
            notesPreview: element.notes?.substring(0, 50),
            photosCount: element.image_urls?.length || 0,
          });
        }
      }

      // Refetch para obtener los datos actualizados
      await refetchInspection();

      console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Section saved successfully`);
      toast.success("Sección guardada correctamente");
    } catch (error) {
      console.error(`[useSupabaseChecklistBase:${inspectionType}] ❌ Error saving section:`, error);
      toast.error("Error al guardar sección");
    } finally {
      savingRef.current = false;
    }
  }, [checklist, inspection, supabaseProperty, checklistType, refetchInspection, inspectionType]);

  // Actualizar sección en el estado local
  const updateSection = useCallback(async (sectionId: string, sectionData: Partial<ChecklistSection>) => {
    console.log(`🔄 [useSupabaseChecklistBase:${inspectionType}] updateSection CALLED:`, {
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

      return finalChecklist;
    });

    currentSectionRef.current = sectionId;
    pendingSaveRef.current = { sectionId, sectionData };
    console.log(`✅ [useSupabaseChecklistBase:${inspectionType}] updateSection COMPLETED`);
  }, [inspectionType]);

  // Finalizar checklist
  const finalizeChecklist = useCallback(async (data?: {
    estimatedVisitDate?: string;
    autoVisitDate?: string;
    nextRenoSteps?: string;
  }) => {
    if (!checklist || !inspection?.id) {
      toast.error("No hay checklist para finalizar");
      return false;
    }

    try {
      // Guardar sección actual antes de finalizar
      await saveCurrentSection();

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
      
      const success = await finalizeInitialCheckInAirtable(propertyId, checklistType as 'reno_initial' | 'reno_final', {
        estimatedVisitDate,
        autoVisitDate,
        nextRenoSteps,
        progress,
      });

      if (success) {
        toast.success("Checklist finalizado correctamente");
      } else {
        toast.error("Error al finalizar checklist en Airtable");
      }

      return success;
    } catch (error) {
      console.error(`[useSupabaseChecklistBase:${inspectionType}] Error finalizing checklist:`, error);
      toast.error("Error al finalizar checklist");
      return false;
    }
  }, [propertyId, checklistType, checklist, inspection, saveCurrentSection, inspectionType]);

  return {
    checklist,
    isLoading,
    updateSection,
    saveCurrentSection,
    finalizeChecklist,
  };
}

