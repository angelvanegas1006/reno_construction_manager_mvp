"use client";

import { updateAirtableWithRetry, findRecordByPropertyId } from './client';
import { createClient } from '@/lib/supabase/client';

/**
 * Sincroniza un cambio de fase a Airtable
 * 
 * @param propertyId - ID de la propiedad en Supabase
 * @param newPhase - Nueva fase (ej: "initial-check", "final-check")
 * @returns true si la sincronización fue exitosa
 */
export async function syncPhaseToAirtable(
  propertyId: string,
  newPhase: string
): Promise<boolean> {
  const supabase = createClient();
  const tableName = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Properties';
  
  try {
    // 1. Obtener propiedad de Supabase
    const { data: property, error } = await supabase
      .from('properties')
      .select('airtable_property_id, "Unique ID From Engagements"')
      .eq('id', propertyId)
      .single();

    if (error || !property) {
      console.warn('Property not found in Supabase:', propertyId);
      return false;
    }

    // Usar airtable_property_id o Unique ID From Engagements como fallback
    const airtablePropertyId = property.airtable_property_id || property['Unique ID From Engagements'];
    
    if (!airtablePropertyId) {
      console.warn('Property has no Airtable ID, skipping sync:', propertyId);
      return false;
    }

    // 2. Buscar record en Airtable
    const recordId = await findRecordByPropertyId(tableName, airtablePropertyId);

    if (!recordId) {
      console.warn('Airtable record not found, skipping sync:', airtablePropertyId);
      return false;
    }

    // 3. Mapear fase interna a formato de Airtable
    const airtablePhase = mapPhaseToAirtable(newPhase);

    // 4. Actualizar Airtable con retry
    const success = await updateAirtableWithRetry(tableName, recordId, {
      'Set Up Status': airtablePhase,
      'Last Phase Change Date': new Date().toISOString(),
    });

    if (success) {
      console.log(`✅ Synced phase change to Airtable: ${propertyId} → ${airtablePhase}`);
    }

    return success;
  } catch (error) {
    console.error('Error syncing phase to Airtable:', error);
    return false;
  }
}

/**
 * Mapea las fases internas a los valores esperados en Airtable
 */
function mapPhaseToAirtable(phase: string): string {
  const mapping: Record<string, string> = {
    'upcoming-settlements': 'Upcoming Settlements',
    'initial-check': 'Initial Check',
    'in-progress': 'In Progress',
    'final-check': 'Final Check',
    'completed': 'Completed',
    'nuevas-escrituras': 'Nuevas Escrituras',
    'furnishing': 'Furnishing',
    'cleaning': 'Cleaning',
  };

  return mapping[phase] || phase;
}


