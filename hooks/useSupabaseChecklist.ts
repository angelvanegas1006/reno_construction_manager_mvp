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
import {
  convertSectionToZones,
  convertSectionToElements,
  convertDynamicItemToElements,
  convertSupabaseToChecklist,
} from "@/lib/supabase/checklist-converter";
import { uploadFilesToStorage } from "@/lib/supabase/storage-upload";
import type { FileUpload } from "@/lib/checklist-storage";
import { toast } from "sonner";

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

  // Inicializar inspección y checklist
  useEffect(() => {
    console.log('[useSupabaseChecklist] 🔄 Effect triggered:', {
      propertyId,
      inspectionLoading,
      hasSupabaseProperty: !!supabaseProperty,
      hasInspection: !!inspection,
      zonesCount: zones.length,
      elementsCount: elements.length,
      checklistType,
      initializationInProgress: initializationInProgressRef.current,
      lastZonesCount: lastZonesCountRef.current,
      timestamp: new Date().toISOString(),
    });

    // Evitar ejecuciones múltiples simultáneas
    if (initializationInProgressRef.current) {
      console.log('[useSupabaseChecklist] ⏸️ Initialization already in progress, skipping...');
      return;
    }

    if (!propertyId || inspectionLoading || !supabaseProperty) {
      console.log('[useSupabaseChecklist] ⏳ Waiting for required data...');
      setIsLoading(true);
      return;
    }

    // Si ya tenemos checklist y no hay cambios significativos, no reinicializar
    const inspectionId = inspection?.id;
    const key = `${propertyId}-${checklistType}-${inspectionId}`;
    if (initializationRef.current === key && checklist && zones.length > 0 && !inspectionLoading) {
      console.log('[useSupabaseChecklist] ✅ Already initialized with same data, skipping...', { key });
      // Si ya está inicializado completamente, asegurar que el flag esté en false
      if (initializationInProgressRef.current) {
        initializationInProgressRef.current = false;
      }
      return;
    }
    
    // Si estamos esperando que se cree una inspección y ya tenemos una, continuar
    if (initializationInProgressRef.current && inspection && !inspectionLoading) {
      console.log('[useSupabaseChecklist] ✅ Inspection is now available, continuing initialization...');
      // Continuar con la inicialización (no retornar aquí)
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
        
        // Si no hay inspección, crear una nueva
        if (!inspection && !inspectionCreationInProgressRef.current) {
          inspectionCreationInProgressRef.current = true;
          console.log('[useSupabaseChecklist] 📝 Creating new inspection...');
          const newInspection = await createInspection(propertyId, inspectionType);
          if (!newInspection) {
            console.error('[useSupabaseChecklist] ❌ Failed to create inspection');
            setIsLoading(false);
            initializationInProgressRef.current = false;
            inspectionCreationInProgressRef.current = false;
            return;
          }
          console.log('[useSupabaseChecklist] ✅ Inspection created, refetching...');
          // Refetch para obtener zonas y elementos
          await refetchInspection();
          // El createInspection ya actualiza el estado internamente (línea 255 de useSupabaseInspection)
          // y llama a fetchInspection, así que el estado debería actualizarse pronto
          // El flag inspectionCreationInProgressRef se reseteará cuando inspection esté disponible
          // (ver la verificación al inicio del efecto)
          // El efecto se ejecutará de nuevo cuando inspection esté disponible
          // NO marcar initializationInProgressRef.current = false aquí todavía
          return; // El flag se mantiene en true hasta que realmente tengamos la inspección
        }

        // Si hay inspección pero no hay zonas, crear zonas iniciales
        if (zones.length === 0 && supabaseProperty && inspection?.id) {
          console.log('[useSupabaseChecklist] 📝 Creating initial zones...');
          await createInitialZones(inspection.id);
          await refetchInspection();
          // Esperar a que las zonas se carguen antes de continuar
          // El efecto se ejecutará de nuevo cuando zones.length > 0
          return; // El flag se mantiene en true hasta que tengamos las zonas
        }
        
        // Si no hay inspección pero tenemos zonas, algo está mal - esperar
        if (zones.length > 0 && !inspection?.id) {
          console.log('[useSupabaseChecklist] ⚠️ Zones exist but no inspection, waiting...');
          return;
        }

        // Cargar checklist desde Supabase
        if (zones.length > 0) {
          console.log('[useSupabaseChecklist] 📥 Loading checklist from Supabase...', {
            zonesCount: zones.length,
            elementsCount: elements.length,
            bedrooms: supabaseProperty.bedrooms,
            bathrooms: supabaseProperty.bathrooms,
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
          const newChecklist = createChecklist(propertyId, checklistType, {});
          setChecklist(newChecklist);
          if (inspection?.id) {
            const stableKey = `${propertyId}-${checklistType}-${inspection.id}`;
            initializationRef.current = stableKey; // Marcar como inicializado (sin zones.length)
            lastZonesCountRef.current = zones.length; // Actualizar contador
          }
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
  }, [propertyId, inspection?.id, inspectionLoading, inspectionType, checklistType, supabaseProperty?.bedrooms, supabaseProperty?.bathrooms, createInspection, refetchInspection, createInitialZones]);
  
  // Efecto separado para manejar cambios en zones cuando están completamente cargadas
  useEffect(() => {
    // Solo procesar si no hay inicialización en progreso, tenemos datos básicos, y no estamos cargando
    if (initializationInProgressRef.current || !propertyId || !supabaseProperty || !inspection || inspectionLoading) {
      return;
    }

    // Solo procesar si zones.length es estable (no está cambiando)
    if (zones.length === 0) {
      return;
    }

    // Si ya tenemos checklist con el mismo número de zones, no recargar
    const inspectionId = inspection?.id;
    const key = `${propertyId}-${checklistType}-${inspectionId}`;
    if (initializationRef.current === key && checklist && zones.length === lastZonesCountRef.current) {
      return;
    }

    // Si zones.length cambió y ya tenemos zonas cargadas, recargar checklist
    if (zones.length > 0 && zones.length !== lastZonesCountRef.current && !initializationInProgressRef.current) {
      console.log('[useSupabaseChecklist] 🔄 Zones stabilized, loading checklist...', {
        oldCount: lastZonesCountRef.current,
        newCount: zones.length,
      });
      
      lastZonesCountRef.current = zones.length;
      
      // Recargar checklist con nuevas zonas
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
      }
    }
  }, [zones.length, elements.length, propertyId, checklistType, supabaseProperty, inspection, inspectionLoading, checklist]);

  // Guardar sección actual en Supabase
  const saveCurrentSection = useCallback(async () => {
    if (!inspection?.id || !checklist || !currentSectionRef.current) return;

    const sectionId = currentSectionRef.current;
    const section = checklist.sections[sectionId];
    if (!section) return;

    try {
      // Encontrar zona correspondiente
      const zone = zones.find(z => {
        const zoneType = sectionId === "habitaciones" ? "dormitorio" :
                        sectionId === "banos" ? "bano" :
                        sectionId === "entorno-zonas-comunes" ? "entorno" :
                        sectionId === "estado-general" ? "distribucion" :
                        sectionId === "entrada-pasillos" ? "entrada" :
                        sectionId === "salon" ? "salon" :
                        sectionId === "cocina" ? "cocina" :
                        sectionId === "exteriores" ? "exterior" : null;
        return z.zone_type === zoneType;
      });

      if (!zone) {
        console.warn(`No se encontró zona para sección ${sectionId}`);
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
      
      const uploadedUrls = await uploadFilesToStorage(
        allFiles,
        propertyId,
        inspection.id,
        zone.id
      );

      // Crear mapa de archivos originales a URLs subidas
      const fileUrlMap = new Map<string, string>();
      allFiles.forEach((file, index) => {
        if (uploadedUrls[index]) {
          fileUrlMap.set(file.id, uploadedUrls[index]);
        }
      });

      // Actualizar URLs en la sección antes de convertir
      const updatedSection = { ...section };
      if (updatedSection.uploadZones) {
        updatedSection.uploadZones = updatedSection.uploadZones.map(uploadZone => ({
          ...uploadZone,
          photos: uploadZone.photos.map(photo => ({
            ...photo,
            data: fileUrlMap.get(photo.id) || photo.data,
          })),
          videos: uploadZone.videos.map(video => ({
            ...video,
            data: fileUrlMap.get(video.id) || video.data,
          })),
        }));
      }

      // Convertir sección a elementos (con URLs actualizadas)
      const elementsToSave = convertSectionToElements(sectionId, updatedSection, zone.id);

      // Guardar elementos
      for (const elementData of elementsToSave) {
        await upsertElement(elementData);
      }

      toast.success("Sección guardada correctamente");
    } catch (error) {
      console.error("Error saving section:", error);
      toast.error("Error al guardar sección");
    }
  }, [inspection, checklist, zones, upsertElement]);

  // Actualizar sección (guardar automáticamente al cambiar)
  const updateSection = useCallback(
    async (sectionId: string, sectionData: Partial<ChecklistSection>) => {
      // Guardar sección anterior si existe
      if (currentSectionRef.current && currentSectionRef.current !== sectionId) {
        await saveCurrentSection();
      }

      // Actualizar estado local
      setChecklist((prevChecklist) => {
        if (!prevChecklist) return null;

        const currentSection = prevChecklist.sections[sectionId] || {};
        const updatedSection: ChecklistSection = {
          ...currentSection,
          ...sectionData,
        };

        const updatedSections = {
          ...prevChecklist.sections,
          [sectionId]: updatedSection,
        };

        return {
          ...prevChecklist,
          sections: updatedSections,
          lastUpdated: new Date().toISOString(),
        };
      });

      // Actualizar referencia de sección actual
      currentSectionRef.current = sectionId;
      pendingSaveRef.current = { sectionId, sectionData };
    },
    [saveCurrentSection]
  );

  // Guardar todo
  const save = useCallback(async () => {
    await saveCurrentSection();
  }, [saveCurrentSection]);

  return {
    checklist,
    isLoading: isLoading || inspectionLoading,
    updateSection,
    save,
    saveCurrentSection,
  };
}

