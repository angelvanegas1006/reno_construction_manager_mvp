import type { Database } from '@/lib/supabase/types';
import type { Property } from '@/lib/property-storage';
import { mapSetUpStatusToKanbanPhase } from './kanban-mapping';

type SupabaseProperty = Database['public']['Tables']['properties']['Row'];

/**
 * Converts Supabase property to Property format for detail page
 * This is a more complete conversion than the kanban one
 */
export function convertSupabasePropertyToProperty(
  supabaseProperty: SupabaseProperty
): Property {
  // Calculate days in stage
  const createdAt = supabaseProperty.created_at 
    ? new Date(supabaseProperty.created_at)
    : new Date();
  const daysSinceCreation = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    id: supabaseProperty.id,
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
    // New fields - assuming snake_case names, adjust if different
    realSettlementDate: (supabaseProperty as any)['real_settlement_date'] || 
                       (supabaseProperty as any)['Real Settlement Date'] || 
                       undefined,
    estimatedVisitDate: (supabaseProperty as any)['Estimated Visit Date'] || 
                        (supabaseProperty as any)['estimated_visit_date'] || 
                        undefined,
    setupStatusNotes: (supabaseProperty as any)['Setup Status Notes'] || 
                      (supabaseProperty as any)['SetUp Notes'] || 
                      supabaseProperty.notes || 
                      undefined,
    // Additional Supabase fields
    uniqueIdFromEngagements: supabaseProperty['Unique ID From Engagements'] || undefined,
    // Days and duration fields
    daysToStartRenoSinceRSD: (supabaseProperty as any)['Days to Start Reno (Since RSD)'] || undefined,
    renoDuration: (supabaseProperty as any)['Reno Duration'] || undefined,
    daysToPropertyReady: (supabaseProperty as any)['Days to Property Ready'] || undefined,
    daysToVisit: (supabaseProperty as any)['days_to_visit'] || undefined,
  };
}

/**
 * Gets the Kanban phase from a Supabase property using "Set Up Status"
 */
export function getPropertyRenoPhaseFromSupabase(
  supabaseProperty: SupabaseProperty
): ReturnType<typeof mapSetUpStatusToKanbanPhase> {
  return mapSetUpStatusToKanbanPhase(supabaseProperty['Set Up Status']);
}

