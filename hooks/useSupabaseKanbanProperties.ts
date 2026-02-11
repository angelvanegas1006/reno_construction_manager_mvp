"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { mapSetUpStatusToKanbanPhase } from '@/lib/supabase/kanban-mapping';
import { matchesTechnicalConstruction, extractNameFromEmail } from '@/lib/supabase/user-name-utils';
import { useAppAuth } from '@/lib/auth/app-auth-context';
import { logger } from '@/lib/utils/logger';
import type { Database } from '@/lib/supabase/types';
import type { RenoKanbanPhase } from '@/lib/reno-kanban-config';
import type { Property } from '@/lib/property-storage';

const log = logger.tagged('useSupabaseKanbanProperties');

type SupabaseProperty = Database['public']['Tables']['properties']['Row'];

interface UseSupabaseKanbanPropertiesReturn {
  propertiesByPhase: Record<RenoKanbanPhase, Property[]>;
  loading: boolean;
  error: string | null;
  totalProperties: number;
}

/**
 * Converts Supabase property to Property format for kanban
 */
function convertSupabasePropertyToKanbanProperty(
  supabaseProperty: SupabaseProperty
): Property | null {
  // Preferir reno_phase si está disponible, pero si es 'reno-budget' (legacy),
  // intentar mapear desde Set Up Status para determinar la fase específica
  let kanbanPhase: RenoKanbanPhase | null = null;
  
  if (supabaseProperty.reno_phase) {
    // Si es 'reno-budget' (legacy), intentar mapear desde Set Up Status primero
    if (supabaseProperty.reno_phase === 'reno-budget') {
      const mappedFromStatus = mapSetUpStatusToKanbanPhase(supabaseProperty['Set Up Status']);
      // Si el mapeo da una de las nuevas fases, usarla; sino mantener reno-budget
      if (mappedFromStatus && mappedFromStatus !== 'reno-budget') {
        kanbanPhase = mappedFromStatus;
      } else {
        kanbanPhase = 'reno-budget'; // Mantener legacy si no hay mapeo específico
      }
    } else {
      // Para otras fases, validar que reno_phase es un RenoKanbanPhase válido
      const validPhases: RenoKanbanPhase[] = [
        'upcoming-settlements',
        'initial-check',
        'reno-budget-renovator',
        'reno-budget-client',
        'reno-budget-start',
        'reno-budget', // Legacy
        'upcoming', // Legacy
        'reno-in-progress',
        'furnishing',
        'final-check',
        'pendiente-suministros',
        'cleaning',
        'furnishing-cleaning', // Legacy
        'reno-fixes',
        'done',
        'orphaned',
      ];
      if (validPhases.includes(supabaseProperty.reno_phase as RenoKanbanPhase)) {
        kanbanPhase = supabaseProperty.reno_phase as RenoKanbanPhase;
      }
    }
  }
  
  // Si no hay reno_phase o no se pudo determinar, usar el mapeo de Set Up Status
  if (!kanbanPhase) {
    kanbanPhase = mapSetUpStatusToKanbanPhase(supabaseProperty['Set Up Status']);
  }
  
  // Si no tiene un mapeo válido, retornar null para ignorarlo
  if (!kanbanPhase) return null;

  // Calcular días en etapa (simplificado - puedes mejorarlo)
  const createdAt = supabaseProperty.created_at 
    ? new Date(supabaseProperty.created_at)
    : new Date();
  const daysSinceCreation = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    id: supabaseProperty.id, // Keep internal ID for navigation
    fullAddress: supabaseProperty.address || supabaseProperty.name || 'Sin dirección',
    propertyType: (supabaseProperty.type as any) || 'Piso',
    currentStage: 'settlement', // Mantener para compatibilidad
    address: supabaseProperty.address || '',
    price: 0, // No hay campo de precio directo en Supabase
    analyst: supabaseProperty.team || 'CM',
    completion: undefined,
    timeInStage: daysSinceCreation === 0 ? 'Hoy' : `${daysSinceCreation} día${daysSinceCreation > 1 ? 's' : ''}`,
    timeCreated: daysSinceCreation === 0 ? 'Hoy' : `Hace ${daysSinceCreation} día${daysSinceCreation > 1 ? 's' : ''}`,
    createdAt: supabaseProperty.created_at || new Date().toISOString(),
    proximaActualizacion: supabaseProperty.next_update || undefined,
    ultimaActualizacion: supabaseProperty.last_update || undefined,
    inicio: supabaseProperty.start_date || undefined,
    finEst: supabaseProperty.estimated_end_date || undefined,
    region: supabaseProperty.area_cluster || undefined,
    renoType: supabaseProperty.renovation_type || undefined,
    renovador: supabaseProperty['Renovator name'] || undefined,
    realSettlementDate: (supabaseProperty as any)['real_settlement_date'] || 
                       (supabaseProperty as any)['Real Settlement Date'] || 
                       undefined,
    estimatedVisitDate: (supabaseProperty as any)['Estimated Visit Date'] || 
                        (supabaseProperty as any)['estimated_visit_date'] || 
                        undefined,
    setupStatusNotes: supabaseProperty.notes || 
                      (supabaseProperty as any)['Setup Status Notes'] || 
                      undefined,
    // Campos adicionales de Supabase
    status: supabaseProperty.status || undefined,
    bedrooms: supabaseProperty.bedrooms || undefined,
    bathrooms: supabaseProperty.bathrooms || undefined,
    square_meters: supabaseProperty.square_meters || undefined,
    // Campo para mostrar el ID único de Engagements
    uniqueIdFromEngagements: supabaseProperty['Unique ID From Engagements'] || undefined,
    // Campo para la fase de renovación
    renoPhase: kanbanPhase,
    // Days and duration fields from Supabase
    daysToStartRenoSinceRSD: supabaseProperty['Days to Start Reno (Since RSD)'] !== null && supabaseProperty['Days to Start Reno (Since RSD)'] !== undefined 
      ? supabaseProperty['Days to Start Reno (Since RSD)'] 
      : undefined,
    renoDuration: supabaseProperty['Reno Duration'] !== null && supabaseProperty['Reno Duration'] !== undefined 
      ? supabaseProperty['Reno Duration'] 
      : undefined,
    daysToPropertyReady: supabaseProperty['Days to Property Ready'] !== null && supabaseProperty['Days to Property Ready'] !== undefined 
      ? supabaseProperty['Days to Property Ready'] 
      : undefined,
    daysToVisit: supabaseProperty.days_to_visit !== null && supabaseProperty.days_to_visit !== undefined 
      ? supabaseProperty.days_to_visit 
      : undefined,
    // Incluir el supabaseProperty original para acceso a todos los campos
    supabaseProperty: supabaseProperty as any,
  } as Property & { supabaseProperty?: any };
}

export function useSupabaseKanbanProperties() {
  const [supabaseProperties, setSupabaseProperties] = useState<SupabaseProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { role, user } = useAppAuth();
  const fetchInProgressRef = useRef(false);
  const lastFetchKeyRef = useRef<string | null>(null);
  const propertiesCountRef = useRef(0);

  useEffect(() => {
    propertiesCountRef.current = supabaseProperties.length;
  }, [supabaseProperties.length]);

  // Fetch properties function (extracted to be reusable)
  const fetchProperties = useCallback(async (force = false) => {
    // Create a unique key for this fetch attempt
    const fetchKey = `${role}-${user?.id || 'no-user'}-${user?.email || 'no-email'}`;
    
    // Skip if already fetching with the same key (unless forced)
    if (!force && fetchInProgressRef.current && lastFetchKeyRef.current === fetchKey) {
      log.debug('Fetch already in progress with same key, skipping...', { fetchKey });
      return;
    }
    
    // Skip if we already fetched with this exact key and we have data (unless forced).
    // Si misma key pero 0 propiedades (p. ej. primer fetch sin sesión), forzar refetch.
    if (!force && lastFetchKeyRef.current === fetchKey) {
      if (propertiesCountRef.current === 0) {
        log.debug('Same key but 0 properties, forcing refetch...', { fetchKey });
        lastFetchKeyRef.current = null;
      } else {
        log.debug('Already fetched with this key, skipping...', { fetchKey });
        return;
      }
    }
    
    // Mark as in progress
    fetchInProgressRef.current = true;
    if (force) {
      // Reset last fetch key when forcing to allow refetch
      lastFetchKeyRef.current = null;
    } else {
      lastFetchKeyRef.current = fetchKey;
    }
    
    try {
      log.debug('Starting fetch...', { role, userEmail: user?.email, userId: user?.id, fetchKey, force });
      
      setLoading(true);
      setError(null);

      // Build query based on user role
      // Exclude orphaned properties (not visible in kanban)
      let query = supabase
        .from('properties')
        .select('*')
        .neq('reno_phase', 'orphaned');

      // Filter by role:
      // - Admin/Construction Manager: see all properties
      // - Foreman: only see properties where "Technical construction" matches their name/email
      if (role === 'foreman' && user?.email) {
        // For foreman, we need to filter by "Technical construction"
        // Since we can't do complex matching in the query, we'll fetch all and filter client-side
        // This is not ideal for large datasets, but works for now
        query = query.select('*');
      }
      // Admin, construction_manager and other roles: no filter needed (fetch all)

      log.debug('Executing query...', { role, userEmail: user?.email });

      // Supabase/PostgREST limita a 1000 filas por petición. Paginamos para traer hasta MAX_PROPERTIES_FETCH.
      const PAGE_SIZE = 1000;
      const MAX_PROPERTIES_FETCH = 2500;
      const allData: SupabaseProperty[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore && allData.length < MAX_PROPERTIES_FETCH) {
        const to = from + PAGE_SIZE - 1;
        const { data: pageData, error: fetchError } = await query
          .order('created_at', { ascending: false })
          .range(from, to);

        if (fetchError) {
          const errorMessage = fetchError.message || JSON.stringify(fetchError) || 'Unknown error';
          const errorDetails = {
            message: errorMessage,
            code: fetchError.code,
            details: fetchError.details,
            hint: fetchError.hint,
            fullError: fetchError,
          };
          log.error('Error fetching properties:', errorDetails);
          setError(errorMessage);
          setLoading(false);
          fetchInProgressRef.current = false;
          return;
        }

        const page = pageData ?? [];
        allData.push(...page);
        hasMore = page.length === PAGE_SIZE;
        from += PAGE_SIZE;
      }

      const data = allData;
      log.debug('Query response:', { dataCount: data.length, pages: Math.ceil(data.length / PAGE_SIZE) });

      // Diagnóstico: propiedad por Unique ID (quitar cuando se resuelva)
      const DEBUG_UNIQUE_ID = 'SP-J5P-ID7-005259';
      const rawMatch = (data || []).find(
        (p: any) =>
          (p.property_unique_id && String(p.property_unique_id).trim() === DEBUG_UNIQUE_ID) ||
          (p['Unique ID From Engagements'] && String(p['Unique ID From Engagements']).trim() === DEBUG_UNIQUE_ID) ||
          (p.unique_id_from_engagements && String(p.unique_id_from_engagements).trim() === DEBUG_UNIQUE_ID)
      );
      if (rawMatch) {
        console.log('[Kanban Debug] Propiedad encontrada en RAW fetch:', {
          uniqueId: DEBUG_UNIQUE_ID,
          id: rawMatch.id,
          reno_phase: rawMatch.reno_phase,
          type: rawMatch.type,
          address: rawMatch.address,
          totalEnRespuesta: data?.length ?? 0,
        });
      } else {
        console.warn('[Kanban Debug] Propiedad NO está en la respuesta de Supabase:', {
          uniqueId: DEBUG_UNIQUE_ID,
          totalEnRespuesta: data?.length ?? 0,
          posibleCausa: (data?.length ?? 0) >= 2500 ? 'Límite 2500 propiedades (orden created_at desc)' : (data?.length ?? 0) >= 1000 ? 'Solo se recibieron las primeras 1000 filas (paginación aplicada para traer más)' : 'No encontrada en el rango solicitado',
        });
      }

      // Debug: Log phase counts (only in development)
      log.debug('Raw data from Supabase:', {
        count: data?.length || 0,
        initialCheckCount: data?.filter(p => p.reno_phase === 'initial-check').length || 0,
        furnishingCount: data?.filter(p => p.reno_phase === 'furnishing').length || 0,
        cleaningCount: data?.filter(p => p.reno_phase === 'cleaning').length || 0,
      });

      // Apply client-side filtering for foreman: Technical construction O asignados a él (assigned_site_manager_email)
      let filteredData = data || [];
      if (role === 'foreman' && user?.email) {
        log.debug('Starting foreman filter...', { userEmail: user.email, totalProperties: data?.length || 0 });
        const userEmailLower = user.email.trim().toLowerCase();
        filteredData = filteredData.filter((property) => {
          const technicalConstruction = property['Technical construction'];
          const assignedEmail = (property as any).assigned_site_manager_email;
          const isAssignedToMe =
            assignedEmail != null &&
            String(assignedEmail).trim().toLowerCase() === userEmailLower;
          return matchesTechnicalConstruction(technicalConstruction, user.email) || isAssignedToMe;
        });
        
        log.debug('Filtered for foreman:', {
          originalCount: data?.length || 0,
          filteredCount: filteredData.length,
          userEmail: user.email,
        });
        
        // If no properties match, log a warning and show all (dev mode)
        if (filteredData.length === 0 && (data?.length || 0) > 0) {
          log.warn('No properties matched foreman filter!', {
            userEmail: user.email,
            extractedName: extractNameFromEmail(user.email),
          });
          // TEMPORARY: For development, if no matches, show all properties
          // TODO: Remove this in production or adjust user role to 'admin'
          log.warn('TEMPORARY: Showing all properties for foreman (dev mode)');
          filteredData = data || [];
        }
      }

      log.debug('Setting properties state:', {
        count: filteredData.length,
        role,
        userEmail: user?.email,
      });

      setSupabaseProperties(filteredData);
      setLoading(false);
      
      log.debug('Fetch completed:', { propertiesCount: filteredData.length });
    } catch (err) {
      log.error('Unexpected error:', err);
      setError(err instanceof Error ? err.message : 'Error fetching properties');
      setLoading(false);
    } finally {
      // Reset fetch flag
      fetchInProgressRef.current = false;
      if (!force) {
        lastFetchKeyRef.current = fetchKey;
      }
    }
  }, [role, user?.id, user?.email]);

  // Initial fetch on mount or when role/user changes
  useEffect(() => {
    // Only fetch if we have both role and user, and we're not already fetching
    if (role !== null && user !== null && !fetchInProgressRef.current) {
      fetchProperties(false);
    } else if (role === null || user === null) {
      log.debug('Waiting for role/user...', { hasRole: role !== null, hasUser: user !== null });
    }
  }, [role, user?.id, user?.email, fetchProperties]);

  // Expose refetch function
  const refetch = useCallback(() => {
    log.debug('Manual refetch requested');
    return fetchProperties(true);
  }, [fetchProperties]);

  // Convert and group properties by kanban phase
  // Memoized to avoid unnecessary recalculations
  // Using supabaseProperties.length as dependency to detect actual changes
  const propertiesByPhase = useMemo(() => {
    if (supabaseProperties.length === 0) {
      // Return empty structure if no properties
      return {
        'upcoming-settlements': [],
        'initial-check': [],
        'reno-budget-renovator': [],
        'reno-budget-client': [],
        'reno-budget-start': [],
        'reno-budget': [],
        'upcoming': [],
        'reno-in-progress': [],
        'furnishing': [],
        'final-check': [],
        'pendiente-suministros': [],
        'cleaning': [],
        'furnishing-cleaning': [],
        'reno-fixes': [],
        'done': [],
        'orphaned': [],
        'analisis-supply': [],
        'analisis-reno': [],
        'administracion-reno': [],
        'pendiente-presupuestos-renovador': [],
        'obra-a-empezar': [],
        'obra-en-progreso': [],
        'amueblamiento': [],
        'check-final': [],
      } as Record<RenoKanbanPhase, Property[]>;
    }

    log.debug('Converting properties by phase...', {
      supabasePropertiesCount: supabaseProperties.length,
    });

    const grouped: Record<RenoKanbanPhase, Property[]> = {
      'upcoming-settlements': [],
      'initial-check': [],
      'reno-budget-renovator': [],
      'reno-budget-client': [],
      'reno-budget-start': [],
      'reno-budget': [], // Legacy
      'upcoming': [],
      'reno-in-progress': [],
      'furnishing': [],
      'final-check': [],
      'pendiente-suministros': [],
      'cleaning': [],
      'furnishing-cleaning': [], // Legacy
      'reno-fixes': [],
      'done': [],
      'orphaned': [],
      'analisis-supply': [],
      'analisis-reno': [],
      'administracion-reno': [],
      'pendiente-presupuestos-renovador': [],
      'obra-a-empezar': [],
      'obra-en-progreso': [],
      'amueblamiento': [],
      'check-final': [],
    };

    let convertedCount = 0;
    let skippedCount = 0;
    const phaseCounts: Record<string, number> = {};
    const propertyIdsSeen = new Set<string>(); // Track properties to avoid duplicates

    supabaseProperties.forEach((supabaseProperty) => {
      // Skip if we've already processed this property ID (avoid duplicates)
      if (propertyIdsSeen.has(supabaseProperty.id)) {
        log.warn('Duplicate property ID detected:', {
          id: supabaseProperty.id,
          address: supabaseProperty.address,
        });
        return;
      }
      
      const kanbanProperty = convertSupabasePropertyToKanbanProperty(supabaseProperty);
      
      if (kanbanProperty && kanbanProperty.renoPhase) {
        // Use the renoPhase that was already assigned during conversion
        const phase = kanbanProperty.renoPhase;
        // Type guard to ensure phase is a valid RenoKanbanPhase
        if (phase && phase in grouped) {
          // Mark property as seen
          propertyIdsSeen.add(supabaseProperty.id);
          
          grouped[phase as RenoKanbanPhase].push(kanbanProperty);
          phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
          convertedCount++;
          
        } else {
          log.warn('Property without valid phase:', {
            id: supabaseProperty.id,
            status: supabaseProperty['Set Up Status'],
            renoPhase: kanbanProperty.renoPhase,
            mappedPhase: phase,
          });
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    });

    log.debug('Properties grouped by phase:', {
      total: supabaseProperties.length,
      converted: convertedCount,
      skipped: skippedCount,
      byPhase: phaseCounts,
    });

    // Diagnóstico: comprobar si la propiedad SP-J5P-ID7-005259 llegó a alguna fase (quitar cuando se resuelva)
    const DEBUG_UNIQUE_ID = 'SP-J5P-ID7-005259';
    const inSupabaseList = supabaseProperties.find(
      (p: any) =>
        (p.property_unique_id && String(p.property_unique_id).trim() === DEBUG_UNIQUE_ID) ||
        (p['Unique ID From Engagements'] && String(p['Unique ID From Engagements']).trim() === DEBUG_UNIQUE_ID) ||
        (p.unique_id_from_engagements && String(p.unique_id_from_engagements).trim() === DEBUG_UNIQUE_ID)
    );
    if (inSupabaseList) {
      const inRenoProgress = (grouped['reno-in-progress'] || []).some(
        (p: any) => p.id === inSupabaseList.id || (p.uniqueIdFromEngagements && String(p.uniqueIdFromEngagements).trim() === DEBUG_UNIQUE_ID)
      );
      console.log('[Kanban Debug] Después de convertir:', {
        uniqueId: DEBUG_UNIQUE_ID,
        enListaFiltrada: true,
        enRenoProgress: inRenoProgress,
        tipoPropiedad: (grouped['reno-in-progress'] || []).find((p: any) => p.id === inSupabaseList.id)?.propertyType ?? inSupabaseList.type,
      });
    }

    // Diagnóstico en desarrollo: ver en consola role, user y conteos por fase (para comparar local vs Vercel)
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      const phaseOrder = ['initial-check', 'reno-budget', 'reno-in-progress', 'final-check', 'pendiente-suministros', 'cleaning', 'furnishing', 'upcoming-settlements'];
      const counts = phaseOrder.map((p) => `${p}: ${phaseCounts[p] ?? 0}`).join(', ');
      console.log('[Kanban Properties] role=%s email=%s total=%s converted=%s skipped=%s | %s', role, user?.email ?? '(none)', supabaseProperties.length, convertedCount, skippedCount, counts);
    }

    return grouped;
  }, [supabaseProperties, role, user?.email]);

  const totalProperties = useMemo(() => {
    return Object.values(propertiesByPhase).reduce((sum, props) => sum + props.length, 0);
  }, [propertiesByPhase]);

  return {
    propertiesByPhase,
    loading,
    error,
    totalProperties,
    refetch,
  };
}

