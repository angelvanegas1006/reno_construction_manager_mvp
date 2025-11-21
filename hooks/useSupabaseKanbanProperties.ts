"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { mapSetUpStatusToKanbanPhase } from '@/lib/supabase/kanban-mapping';
import { matchesTechnicalConstruction, extractNameFromEmail } from '@/lib/supabase/user-name-utils';
import { useAppAuth } from '@/lib/auth/app-auth-context';
import type { Database } from '@/lib/supabase/types';
import type { RenoKanbanPhase } from '@/lib/reno-kanban-config';
import type { Property } from '@/lib/property-storage';

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
  const kanbanPhase = mapSetUpStatusToKanbanPhase(supabaseProperty['Set Up Status']);
  
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
    realSettlementDate: undefined, // No hay en Supabase
    estimatedVisitDate: undefined, // No hay en Supabase
    setupStatusNotes: supabaseProperty.notes || undefined,
    // Campos adicionales de Supabase
    status: supabaseProperty.status || undefined,
    bedrooms: supabaseProperty.bedrooms || undefined,
    bathrooms: supabaseProperty.bathrooms || undefined,
    square_meters: supabaseProperty.square_meters || undefined,
    // Campo para mostrar el ID único de Engagements
    uniqueIdFromEngagements: supabaseProperty['Unique ID From Engagements'] || undefined,
  };
}

export function useSupabaseKanbanProperties() {
  const [supabaseProperties, setSupabaseProperties] = useState<SupabaseProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { role, user } = useAppAuth();

  // Fetch properties from Supabase
  useEffect(() => {
    async function fetchProperties() {
      try {
        console.log('[useSupabaseKanbanProperties] 🔄 Starting fetch...', {
          role,
          userEmail: user?.email,
          userId: user?.id,
          timestamp: new Date().toISOString(),
        });
        
        setLoading(true);
        setError(null);

        // Build query based on user role
        let query = supabase
          .from('properties')
          .select('*');

        // Filter by role:
        // - Admin: see all properties
        // - Foreman: only see properties where "Technical construction" matches their name/email
        if (role === 'foreman' && user?.email) {
          // For foreman, we need to filter by "Technical construction"
          // Since we can't do complex matching in the query, we'll fetch all and filter client-side
          // This is not ideal for large datasets, but works for now
          query = query.select('*');
        }
        // Admin and other roles: no filter needed (fetch all)

        console.log('[useSupabaseKanbanProperties] 📡 Executing query...', {
          role,
          userEmail: user?.email,
        });

        const { data, error: fetchError } = await query.order('created_at', { ascending: false });

        console.log('[useSupabaseKanbanProperties] 📥 Query response:', {
          dataCount: data?.length || 0,
          error: fetchError ? {
            message: fetchError.message,
            code: fetchError.code,
            details: fetchError.details,
          } : null,
          timestamp: new Date().toISOString(),
        });

        if (fetchError) {
          console.error('[useSupabaseKanbanProperties] ❌ Error fetching properties:', fetchError);
          throw fetchError;
        }

        console.log('[useSupabaseKanbanProperties] ✅ Raw data from Supabase:', {
          count: data?.length || 0,
          sample: data?.[0] ? {
            id: data[0].id,
            name: data[0].name,
            address: data[0].address,
            'Set Up Status': data[0]['Set Up Status'],
          } : null,
          allStatuses: data?.map(p => p['Set Up Status']).filter(Boolean) || [],
        });

        // Apply client-side filtering for foreman
        let filteredData = data || [];
        if (role === 'foreman' && user?.email) {
          console.log('[useSupabaseKanbanProperties] 🔍 Starting foreman filter...', {
            userEmail: user.email,
            totalProperties: data?.length || 0,
          });
          
          const filterResults: Array<{ id: string; technicalConstruction: any; matched: boolean }> = [];
          
          filteredData = filteredData.filter((property) => {
            const technicalConstruction = property['Technical construction'];
            const matched = matchesTechnicalConstruction(technicalConstruction, user.email);
            
            // Log first 5 properties for debugging
            if (filterResults.length < 5) {
              filterResults.push({
                id: property.id,
                technicalConstruction: technicalConstruction,
                matched: matched,
              });
            }
            
            return matched;
          });
          
          console.log('[useSupabaseKanbanProperties] 🔍 Filtered for foreman:', {
            originalCount: data?.length || 0,
            filteredCount: filteredData.length,
            userEmail: user.email,
            sampleMatches: filterResults,
          });
          
          // If no properties match, log a warning
          if (filteredData.length === 0 && (data?.length || 0) > 0) {
            // Get unique Technical construction values for debugging
            const uniqueTechnicalConstructions = Array.from(
              new Set(
                (data || [])
                  .map(p => p['Technical construction'])
                  .filter(Boolean)
              )
            ).slice(0, 10);
            
            console.warn('[useSupabaseKanbanProperties] ⚠️ No properties matched foreman filter!', {
              userEmail: user.email,
              extractedName: extractNameFromEmail(user.email),
              uniqueTechnicalConstructions: uniqueTechnicalConstructions,
              sampleTechnicalConstruction: data?.slice(0, 5).map(p => ({
                id: p.id,
                name: p.name,
                technicalConstruction: p['Technical construction'],
              })),
            });
            
            // TEMPORARY: For development, if no matches, show all properties
            // TODO: Remove this in production or adjust user role to 'admin'
            console.warn('[useSupabaseKanbanProperties] ⚠️ TEMPORARY: Showing all properties for foreman (dev mode)');
            filteredData = data || [];
            
            // TEMPORARY: For development, if no matches, show all properties
            // TODO: Remove this in production or adjust user role to 'admin'
            console.warn('[useSupabaseKanbanProperties] ⚠️ TEMPORARY: Showing all properties for foreman (dev mode)');
            filteredData = data || [];
          }
        }

        console.log('[useSupabaseKanbanProperties] 💾 Setting properties state:', {
          count: filteredData.length,
          timestamp: new Date().toISOString(),
        });

        setSupabaseProperties(filteredData);
        setLoading(false);
        
        console.log('[useSupabaseKanbanProperties] ✅ Fetch completed:', {
          propertiesCount: filteredData.length,
          loading: false,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[useSupabaseKanbanProperties] ❌ Unexpected error:', err);
        setError(err instanceof Error ? err.message : 'Error fetching properties');
        setLoading(false);
      }
    }

    // Only fetch if we have role information (or if loading is complete)
    console.log('[useSupabaseKanbanProperties] 🎯 Effect trigger:', {
      role,
      user: user ? { id: user.id, email: user.email } : null,
      shouldFetch: role !== null || !user,
      timestamp: new Date().toISOString(),
    });

    if (role !== null || !user) {
      fetchProperties();
    } else {
      console.log('[useSupabaseKanbanProperties] ⏳ Waiting for role/user...');
    }
  }, [supabase, role, user]);

  // Convert and group properties by kanban phase
  const propertiesByPhase = useMemo(() => {
    console.log('[useSupabaseKanbanProperties] 🔄 Converting properties by phase...', {
      supabasePropertiesCount: supabaseProperties.length,
      timestamp: new Date().toISOString(),
    });

    const grouped: Record<RenoKanbanPhase, Property[]> = {
      'upcoming-settlements': [],
      'initial-check': [],
      'upcoming': [],
      'reno-in-progress': [],
      'furnishing-cleaning': [],
      'final-check': [],
      'reno-fixes': [],
      'done': [],
    };

    let convertedCount = 0;
    let skippedCount = 0;
    const phaseCounts: Record<string, number> = {};

    supabaseProperties.forEach((supabaseProperty) => {
      const kanbanProperty = convertSupabasePropertyToKanbanProperty(supabaseProperty);
      if (kanbanProperty) {
        const phase = mapSetUpStatusToKanbanPhase(supabaseProperty['Set Up Status']);
        if (phase && grouped[phase]) {
          grouped[phase].push(kanbanProperty);
          phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
          convertedCount++;
        } else {
          console.warn('[useSupabaseKanbanProperties] ⚠️ Property without valid phase:', {
            id: supabaseProperty.id,
            status: supabaseProperty['Set Up Status'],
            mappedPhase: phase,
          });
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    });

    console.log('[useSupabaseKanbanProperties] ✅ Properties grouped by phase:', {
      total: supabaseProperties.length,
      converted: convertedCount,
      skipped: skippedCount,
      byPhase: phaseCounts,
      groupedCounts: Object.entries(grouped).reduce((acc, [phase, props]) => {
        acc[phase] = props.length;
        return acc;
      }, {} as Record<string, number>),
      timestamp: new Date().toISOString(),
    });

    return grouped;
  }, [supabaseProperties]);

  const totalProperties = useMemo(() => {
    const total = Object.values(propertiesByPhase).reduce((sum, props) => sum + props.length, 0);
    console.log('[useSupabaseKanbanProperties] 📊 Total properties calculated:', {
      total,
      timestamp: new Date().toISOString(),
    });
    return total;
  }, [propertiesByPhase]);

  // Log whenever the hook returns new values
  useEffect(() => {
    console.log('[useSupabaseKanbanProperties] 🎯 Hook return values:', {
      loading,
      error,
      totalProperties,
      propertiesByPhaseCounts: Object.entries(propertiesByPhase).reduce((acc, [phase, props]) => {
        acc[phase] = props.length;
        return acc;
      }, {} as Record<string, number>),
      timestamp: new Date().toISOString(),
    });
  }, [loading, error, totalProperties, propertiesByPhase]);

  return {
    propertiesByPhase,
    loading,
    error,
    totalProperties,
  };
}

