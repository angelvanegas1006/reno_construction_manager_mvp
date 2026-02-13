"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { toast } from 'sonner';

type PropertyInspection = Database['public']['Tables']['property_inspections']['Row'];
type InspectionZone = Database['public']['Tables']['inspection_zones']['Row'];
type InspectionElement = Database['public']['Tables']['inspection_elements']['Row'];

type InspectionInsert = Database['public']['Tables']['property_inspections']['Insert'];
type InspectionUpdate = Database['public']['Tables']['property_inspections']['Update'];
type ZoneInsert = Database['public']['Tables']['inspection_zones']['Insert'];
type ZoneUpdate = Database['public']['Tables']['inspection_zones']['Update'];
type ElementInsert = Database['public']['Tables']['inspection_elements']['Insert'];
type ElementUpdate = Database['public']['Tables']['inspection_elements']['Update'];

export type InspectionType = 'initial' | 'final';

interface UseSupabaseInspectionReturn {
  inspection: PropertyInspection | null;
  zones: InspectionZone[];
  elements: InspectionElement[];
  loading: boolean;
  error: string | null;
  createInspection: (propertyId: string, type: InspectionType) => Promise<PropertyInspection | null>;
  updateInspection: (updates: InspectionUpdate) => Promise<boolean>;
  completeInspection: () => Promise<boolean>;
  createZone: (zoneData: ZoneInsert) => Promise<InspectionZone | null>;
  updateZone: (zoneId: string, updates: ZoneUpdate) => Promise<boolean>;
  deleteZone: (zoneId: string) => Promise<boolean>;
  upsertElement: (elementData: ElementInsert) => Promise<InspectionElement | null>;
  updateElement: (elementId: string, updates: ElementUpdate) => Promise<boolean>;
  deleteElement: (elementId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useSupabaseInspection(
  propertyId: string | null,
  inspectionType: InspectionType,
  enabled: boolean = true
): UseSupabaseInspectionReturn {
  const [inspection, setInspection] = useState<PropertyInspection | null>(null);
  const [zones, setZones] = useState<InspectionZone[]>([]);
  const [elements, setElements] = useState<InspectionElement[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchInspection = useCallback(async () => {
    if (!enabled) {
      // Si el hook está deshabilitado, no hacer fetch
      console.log(`[useSupabaseInspection:${inspectionType}] 🚫 Hook disabled, skipping fetch`, {
        enabled,
        inspectionType,
        propertyId,
      });
      setInspection(null);
      setZones([]);
      setElements([]);
      setLoading(false);
      return;
    }
    
    if (!propertyId) {
      setInspection(null);
      setZones([]);
      setElements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar inspección existente por property_id e inspection_type
      // Ordenar por created_at descendente para obtener la más reciente
      // Intentar primero con inspection_type, si falla (campo no existe), buscar sin él
      let { data: inspectionData, error: inspectionError } = await supabase
        .from('property_inspections')
        .select('*')
        .eq('property_id', propertyId)
        .eq('inspection_type', inspectionType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Si el error es que la columna no existe (42883) o 406 (Not Acceptable), buscar sin inspection_type
      if (inspectionError && (
        inspectionError.code === '42883' || 
        inspectionError.message?.includes('column') || 
        inspectionError.message?.includes('does not exist') ||
        inspectionError.message?.includes('406') ||
        inspectionError.code === 'PGRST116'
      )) {
        // Buscar sin filtro de inspection_type (solo por property_id), ordenar por fecha descendente
        // Silently fallback - no need to log this as it's expected behavior
        const { data: allInspections, error: allError } = await supabase
          .from('property_inspections')
          .select('*')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (allError && allError.code !== 'PGRST116') {
          throw allError;
        }
        inspectionData = allInspections;
        inspectionError = null;
      } else if (inspectionError && inspectionError.code !== 'PGRST116') {
        throw inspectionError;
      }

      // Log para debugging (solo en desarrollo)
      if (inspectionData && process.env.NODE_ENV === "development") {
        console.log('[useSupabaseInspection] ✅ Found inspection:', {
          id: inspectionData.id,
          propertyId,
          inspectionType,
          createdAt: inspectionData.created_at,
          status: inspectionData.inspection_status,
        });
      }

      if (!inspectionData) {
        setInspection(null);
        setZones([]);
        setElements([]);
        setLoading(false);
        return;
      }

      setInspection(inspectionData);

      // Cargar zonas
      const { data: zonesData, error: zonesError } = await supabase
        .from('inspection_zones')
        .select('*')
        .eq('inspection_id', inspectionData.id)
        .order('created_at', { ascending: true });

      if (zonesError) throw zonesError;
      setZones(zonesData || []);

      console.log('[useSupabaseInspection] 📍 Loaded zones:', {
        inspectionId: inspectionData.id,
        inspectionType: (inspectionData as any).inspection_type,
        zonesCount: zonesData?.length || 0,
        zoneIds: zonesData?.map(z => ({ id: z.id, zone_type: z.zone_type, zone_name: z.zone_name })) || [],
      });

      // Cargar elementos
      const zoneIds = zonesData?.map(z => z.id) || [];
      const { data: elementsData, error: elementsError } = await supabase
        .from('inspection_elements')
        .select('*')
        .in('zone_id', zoneIds)
        .order('created_at', { ascending: true });

      if (elementsError) throw elementsError;
      
      // También buscar elementos que puedan estar asociados a esta inspección pero con zone_id incorrecto
      // Esto puede pasar si los elementos se guardaron con un zone_id de otra inspección
      const photoElements = elementsData?.filter(e => e.element_name?.startsWith('fotos-') || e.element_name?.startsWith('videos-')) || [];
      console.log('[useSupabaseInspection] 📸 Loaded elements:', {
        inspectionId: inspectionData.id,
        inspectionType: (inspectionData as any).inspection_type,
        totalElementsCount: elementsData?.length || 0,
        photoElementsCount: photoElements.length,
        photoElementZoneIds: photoElements.map(e => e.zone_id),
        zoneIds: zoneIds,
        missingZones: photoElements.filter(e => !zoneIds.includes(e.zone_id)).map(e => e.zone_id),
      });
      
      setElements(elementsData || []);
    } catch (err) {
      // Mejorar el manejo de errores para mostrar información útil
      let errorMessage = 'Error al cargar inspección';
      
      // Manejar errores de Supabase (objetos con code, message, details, hint)
      if (err && typeof err === 'object') {
        const supabaseError = err as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.code) {
          errorMessage = `Error ${supabaseError.code}`;
          if (supabaseError.details) {
            errorMessage += `: ${supabaseError.details}`;
          } else if (supabaseError.hint) {
            errorMessage += `: ${supabaseError.hint}`;
          }
        } else {
          // Intentar serializar el error completo
          try {
            errorMessage = JSON.stringify(err);
          } catch {
            errorMessage = String(err);
          }
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = String(err);
      }
      
      setError(errorMessage);
      console.error('Error fetching inspection:', {
        error: err,
        message: errorMessage,
        propertyId,
        inspectionType,
        errorStringified: JSON.stringify(err, Object.getOwnPropertyNames(err)),
        errorDetails: err instanceof Error ? {
          name: err.name,
          message: err.message,
          stack: err.stack,
        } : err,
      });
      setInspection(null);
      setZones([]);
      setElements([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId, inspectionType, supabase, enabled]);

  // Limpiar datos cuando inspectionType cambia para evitar usar datos del tipo incorrecto
  useEffect(() => {
    // Limpiar inmediatamente cuando inspectionType cambia
    // Esto evita que se usen zonas/elementos de la inspección anterior mientras se carga la nueva
    setInspection(null);
    setZones([]);
    setElements([]);
    setLoading(true);
    setError(null);
    // fetchInspection se ejecutará después debido a las dependencias del useEffect anterior
  }, [inspectionType]);

  const createInspection = useCallback(async (
    propertyId: string,
    type: InspectionType
  ): Promise<PropertyInspection | null> => {
    try {
      setError(null);

      // Obtener usuario actual (puede ser null con Auth0; created_by es opcional en BD)
      const { data: { user } } = await supabase.auth.getUser();

      // Obtener has_elevator de la propiedad
      const { data: property } = await supabase
        .from('properties')
        .select('has_elevator')
        .eq('id', propertyId)
        .single();

      // Generar public_link_id único
      const publicLinkId = crypto.randomUUID();

      // Intentar crear con inspection_type primero (created_by opcional: null con Auth0)
      const newInspection: InspectionInsert & { inspection_type?: string } = {
        property_id: propertyId,
        ...(user?.id && { created_by: user.id }),
        inspection_type: type,
        inspection_status: 'in_progress',
        has_elevator: property?.has_elevator ?? false,
        public_link_id: publicLinkId,
      };

      let { data, error: createError } = await supabase
        .from('property_inspections')
        .insert(newInspection)
        .select()
        .single();

      // Si el error es que la columna inspection_type no existe, intentar sin ella
      if (createError) {
        const errorCode = (createError as any)?.code;
        const errorMessage = (createError as any)?.message || '';
        const errorDetails = (createError as any)?.details || '';
        
        if (errorCode === '42883' || 
            errorMessage.includes('column') || 
            errorMessage.includes('does not exist') ||
            errorDetails.includes('inspection_type')) {
          console.warn('Campo inspection_type no existe aún, creando sin él:', {
            code: errorCode,
            message: errorMessage,
            details: errorDetails,
            fullError: createError,
          });
          
          // Crear sin inspection_type
          const newInspectionWithoutType = {
            property_id: propertyId,
            ...(user?.id && { created_by: user.id }),
            inspection_status: 'in_progress',
            has_elevator: property?.has_elevator ?? false,
            public_link_id: publicLinkId,
          };
          
          const { data: dataWithoutType, error: createErrorWithoutType } = await supabase
            .from('property_inspections')
            .insert(newInspectionWithoutType)
            .select()
            .single();

          if (createErrorWithoutType) {
            console.error('Error al crear inspección sin inspection_type:', createErrorWithoutType);
            throw createErrorWithoutType;
          }
          
          data = dataWithoutType;
          createError = null;
        } else {
          // Otro tipo de error, lanzarlo
          throw createError;
        }
      }

      setInspection(data);
      await fetchInspection(); // Recargar para obtener zonas y elementos
      return data;
    } catch (err) {
      // Mejorar el manejo de errores
      let errorMessage = 'Error al crear inspección';
      
      // Manejar errores de Supabase (objetos con code, message, details, hint)
      if (err && typeof err === 'object') {
        const supabaseError = err as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.code) {
          errorMessage = `Error ${supabaseError.code}`;
          if (supabaseError.details) {
            errorMessage += `: ${supabaseError.details}`;
          } else if (supabaseError.hint) {
            errorMessage += `: ${supabaseError.hint}`;
          }
        } else {
          // Intentar serializar el error completo
          try {
            errorMessage = JSON.stringify(err);
          } catch {
            errorMessage = String(err);
          }
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = String(err);
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      // Log con mensaje primero para que siempre sea visible (evitar "Error creating inspection: {}")
      console.error(`[useSupabaseInspection] Error creating inspection: ${errorMessage}`, {
        propertyId,
        type,
        errorCode: (err as any)?.code,
        errorMessage: (err as any)?.message,
        errorDetails: (err as any)?.details,
        errorHint: (err as any)?.hint,
      });
      return null;
    }
  }, [supabase, fetchInspection]);

  const updateInspection = useCallback(async (updates: InspectionUpdate): Promise<boolean> => {
    if (!inspection) return false;

    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('property_inspections')
        .update(updates)
        .eq('id', inspection.id);

      if (updateError) throw updateError;

      await fetchInspection();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar inspección';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error updating inspection:', err);
      return false;
    }
  }, [inspection, supabase, fetchInspection]);

  const completeInspection = useCallback(async (): Promise<boolean> => {
    if (!inspection) return false;

    // Obtener usuario actual como quien completa (no sobrescribir created_by = quien inició)
    const { data: { user } } = await supabase.auth.getUser();
    const updates: { inspection_status: string; completed_at: string; completed_by?: string } = {
      inspection_status: 'completed',
      completed_at: new Date().toISOString(),
    };
    if (user?.id) {
      updates.completed_by = user.id;
    }

    return await updateInspection(updates);
  }, [inspection, updateInspection, supabase.auth]);

  const createZone = useCallback(async (zoneData: ZoneInsert): Promise<InspectionZone | null> => {
    if (!inspection) return null;

    try {
      setError(null);

      const newZone: ZoneInsert = {
        ...zoneData,
        inspection_id: inspection.id,
      };

      const { data, error: createError } = await supabase
        .from('inspection_zones')
        .insert(newZone)
        .select()
        .single();

      if (createError) throw createError;

      await fetchInspection();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear zona';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error creating zone:', err);
      return null;
    }
  }, [inspection, supabase, fetchInspection]);

  const updateZone = useCallback(async (zoneId: string, updates: ZoneUpdate): Promise<boolean> => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('inspection_zones')
        .update(updates)
        .eq('id', zoneId);

      if (updateError) throw updateError;

      await fetchInspection();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar zona';
      setError(errorMessage);
      console.error('Error updating zone:', err);
      return false;
    }
  }, [supabase, fetchInspection]);

  const deleteZone = useCallback(async (zoneId: string): Promise<boolean> => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('inspection_zones')
        .delete()
        .eq('id', zoneId);

      if (deleteError) throw deleteError;

      await fetchInspection();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar zona';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error deleting zone:', err);
      return false;
    }
  }, [supabase, fetchInspection]);

  const upsertElement = useCallback(async (elementData: ElementInsert): Promise<InspectionElement | null> => {
    try {
      setError(null);

      console.log('[useSupabaseInspection] 📤 Upserting element to Supabase:', {
        element_name: elementData.element_name,
        zone_id: elementData.zone_id,
        image_urls: elementData.image_urls,
        image_urls_count: elementData.image_urls?.length || 0,
        video_urls: elementData.video_urls,
        video_urls_count: elementData.video_urls?.length || 0,
      });

      // Usar upsert con unique constraint en (zone_id, element_name)
      const { data, error: upsertError } = await supabase
        .from('inspection_elements')
        .upsert(elementData, {
          onConflict: 'zone_id,element_name',
        })
        .select()
        .single();

      if (upsertError) {
        console.error('[useSupabaseInspection] ❌ Error upserting element:', {
          error: upsertError,
          element_name: elementData.element_name,
          zone_id: elementData.zone_id,
        });
        throw upsertError;
      }

      console.log('[useSupabaseInspection] ✅ Element upserted successfully:', {
        element_name: elementData.element_name,
        result_id: data?.id,
        result_image_urls: data?.image_urls,
        result_image_urls_count: data?.image_urls?.length || 0,
      });

      await fetchInspection();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar elemento';
      setError(errorMessage);
      console.error('[useSupabaseInspection] ❌ Error upserting element:', err);
      return null;
    }
  }, [supabase, fetchInspection]);

  const updateElement = useCallback(async (elementId: string, updates: ElementUpdate): Promise<boolean> => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('inspection_elements')
        .update(updates)
        .eq('id', elementId);

      if (updateError) throw updateError;

      await fetchInspection();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar elemento';
      setError(errorMessage);
      console.error('Error updating element:', err);
      return false;
    }
  }, [supabase, fetchInspection]);

  const deleteElement = useCallback(async (elementId: string): Promise<boolean> => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('inspection_elements')
        .delete()
        .eq('id', elementId);

      if (deleteError) throw deleteError;

      await fetchInspection();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar elemento';
      setError(errorMessage);
      console.error('Error deleting element:', err);
      return false;
    }
  }, [supabase, fetchInspection]);

  useEffect(() => {
    if (enabled) {
      fetchInspection();
    } else {
      // Si está deshabilitado, limpiar el estado
      setInspection(null);
      setZones([]);
      setElements([]);
      setLoading(false);
      setError(null);
    }
  }, [fetchInspection, enabled]);

  return {
    inspection,
    zones,
    elements,
    loading,
    error,
    createInspection,
    updateInspection,
    completeInspection,
    createZone,
    updateZone,
    deleteZone,
    upsertElement,
    updateElement,
    deleteElement,
    refetch: fetchInspection,
  };
}

