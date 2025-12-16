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
  onSyncToOther?: (sectionId: string, sectionData: Partial<ChecklistSection>, allFiles: FileUpload[]) => Promise<void>; // Callback para sincronizar al otro checklist
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
  onSyncToOther, // Callback opcional para sincronizar al otro checklist
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
  const functionsRef = useRef<{
    createInspection: (propertyId: string, type: InspectionType) => Promise<any>;
    refetchInspection: () => Promise<void>;
    createInitialZones: (inspectionId: string) => Promise<void>;
  } | null>(null);

  console.log(`[useSupabaseChecklistBase:${inspectionType}] 🔍 Initialized:`, {
    checklistType,
    inspectionType,
    propertyId,
  });

  // Hook de Supabase para inspecciones - siempre usa el tipo fijo
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
    if (!supabaseProperty) return;
    
    const supabase = createClient();
    const bedrooms = supabaseProperty.bedrooms || null;
    const bathrooms = supabaseProperty.bathrooms || null;

    await convertSectionToZones(
      supabase,
      inspectionId,
      checklistType,
      bedrooms,
      bathrooms
    );
  }, [supabaseProperty, checklistType]);

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
    console.log(`[useSupabaseChecklistBase:${inspectionType}] 🔄 Effect triggered:`, {
      propertyId,
      inspectionLoading,
      hasSupabaseProperty: !!supabaseProperty,
      hasInspection: !!inspection,
      inspectionId: inspection?.id,
      inspectionType: inspection?.inspection_type,
      expectedInspectionType: inspectionType,
      zonesCount: zones.length,
      elementsCount: elements.length,
      initializationInProgress: initializationInProgressRef.current,
    });

    // Evitar ejecuciones múltiples simultáneas
    if (initializationInProgressRef.current) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Initialization already in progress, skipping...`);
      return;
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

    // Verificar que la inspección corresponde al tipo correcto
    if (inspection && inspection.inspection_type !== inspectionType) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏳ Waiting for correct inspection type...`, {
        currentInspectionType: inspection.inspection_type,
        expectedInspectionType: inspectionType,
        inspectionId: inspection.id,
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

    // Si ya tenemos checklist y no hay cambios significativos, no reinicializar
    const inspectionId = inspection?.id;
    const key = `${propertyId}-${checklistType}-${inspectionId || 'no-inspection'}`;
    const hasPhotoElements = elements.some(e => e.element_name?.startsWith('fotos-') && e.image_urls && e.image_urls.length > 0);
    const checklistHasPhotos = checklist && Object.values(checklist.sections).some(section => 
      section.uploadZones?.some(zone => zone.photos && zone.photos.length > 0)
    );
    
    if (initializationRef.current === key && checklist && zones.length > 0 && !inspectionLoading && inspectionId) {
      if (hasPhotoElements && !checklistHasPhotos) {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] 🔄 Photo elements found in Supabase but not in checklist, forcing reload...`);
      } else {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Already initialized with same data, skipping...`, { key });
        if (initializationInProgressRef.current) {
          initializationInProgressRef.current = false;
        }
        setIsLoading(false);
        return;
      }
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
          console.log(`[useSupabaseChecklistBase:${inspectionType}] 📝 Creating initial zones...`);
          await functionsRef.current.createInitialZones(inspection.id);
          await functionsRef.current.refetchInspection();
          setIsLoading(false);
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
    inspection,
    zones.length,
    elements.length,
    checklistType,
    inspectionType,
    checklist,
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
    if (initializationInProgressRef.current || !propertyId || !hasSupabaseProperty || !hasInspection || inspectionLoading) {
      return;
    }

    // Verificar que la inspección corresponde al tipo correcto ANTES de procesar cualquier cambio
    if (inspection && inspection.inspection_type !== inspectionType) {
      console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Ignoring all changes - inspection type mismatch:`, {
        currentInspectionType: inspection.inspection_type,
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
      
      if (inspection && inspection.inspection_type !== inspectionType) {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Ignoring inspection change - wrong type:`, {
          currentInspectionType: inspection.inspection_type,
          expectedInspectionType: inspectionType,
          inspectionId: inspection.id,
        });
        return;
      }
      
      lastProcessedInspectionIdRef.current = inspectionId;
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
    if (!inspection || inspection.inspection_type !== inspectionType) {
      if (inspection) {
        console.log(`[useSupabaseChecklistBase:${inspectionType}] ⏸️ Ignoring zones/elements changes - inspection type mismatch:`, {
          currentInspectionType: inspection.inspection_type,
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
        lastProcessedInspectionIdRef.current = inspectionId;
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
  }, [zones.length, elements.length, propertyId, checklistType, bedroomsCount, bathroomsCount, inspectionId, inspectionLoading, hasSupabaseProperty, hasInspection, inspectionType, inspection, checklist]);

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

      // Recopilar todos los archivos (fotos y videos) de la sección
      const allFiles: FileUpload[] = [];
      
      // Archivos de uploadZones
      if (section.uploadZones) {
        section.uploadZones.forEach(zone => {
          if (zone.photos) allFiles.push(...zone.photos);
          if (zone.videos) allFiles.push(...zone.videos);
        });
      }

      // Archivos de dynamicItems
      if (section.dynamicItems) {
        section.dynamicItems.forEach(item => {
          if (item.photos) allFiles.push(...item.photos);
          if (item.videos) allFiles.push(...item.videos);
        });
      }

      // Subir archivos a Supabase Storage
      if (allFiles.length > 0) {
        await uploadFilesToStorage(allFiles, inspection.id);
      }

      // Convertir sección a zonas y elementos de Supabase
      const bedrooms = supabaseProperty.bedrooms || null;
      const bathrooms = supabaseProperty.bathrooms || null;

      await convertSectionToZones(
        createClient(),
        inspection.id,
        checklistType,
        bedrooms,
        bathrooms,
        section
      );

      await convertSectionToElements(
        createClient(),
        inspection.id,
        checklistType,
        bedrooms,
        bathrooms,
        section,
        allFiles
      );

      // Refetch para obtener los datos actualizados
      await refetchInspection();

      // Sincronizar al otro checklist si existe el callback
      if (onSyncToOther) {
        try {
          console.log(`[useSupabaseChecklistBase:${inspectionType}] 🔄 Syncing section to other checklist:`, sectionId);
          await onSyncToOther(sectionId, section, allFiles);
          console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Section synced to other checklist successfully`);
        } catch (syncError) {
          console.error(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ Error syncing to other checklist (non-critical):`, syncError);
          // No mostrar error al usuario ya que el guardado principal fue exitoso
        }
      }

      console.log(`[useSupabaseChecklistBase:${inspectionType}] ✅ Section saved successfully`);
      toast.success("Sección guardada correctamente");
    } catch (error) {
      console.error(`[useSupabaseChecklistBase:${inspectionType}] ❌ Error saving section:`, error);
      toast.error("Error al guardar sección");
    } finally {
      savingRef.current = false;
    }
  }, [checklist, inspection, supabaseProperty, checklistType, refetchInspection, inspectionType, onSyncToOther]);

  // Actualizar sección en el estado local
  const updateSection = useCallback(async (sectionId: string, sectionData: Partial<ChecklistSection>) => {
    console.log(`[useSupabaseChecklistBase:${inspectionType}] 🔄 updateSection called:`, {
      sectionId,
      sectionData,
      sectionDataKeys: Object.keys(sectionData),
      uploadZones: sectionData.uploadZones?.map(z => ({ id: z.id, photosCount: z.photos.length, videosCount: z.videos.length })),
      uploadZonesLength: sectionData.uploadZones?.length || 0,
    });

    // Actualizar estado local
    setChecklist(prev => {
      if (!prev) {
        console.warn(`[useSupabaseChecklistBase:${inspectionType}] ⚠️ prevChecklist is null`);
        return null;
      }
      
      const updatedSections = {
        ...prev.sections,
        [sectionId]: {
          ...prev.sections[sectionId],
          ...sectionData,
        },
      };

      return {
        ...prev,
        sections: updatedSections,
      };
    });

    currentSectionRef.current = sectionId;
    pendingSaveRef.current = { sectionId, sectionData };
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
            (zone.videos && zone.videos.length > 0) ||
            zone.status === "buen_estado"
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

