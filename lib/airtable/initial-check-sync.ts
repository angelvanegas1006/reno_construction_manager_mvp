"use client";

import { updateAirtableWithRetry, findRecordByPropertyId } from './client';
import { createClient } from '@/lib/supabase/client';

/**
 * Actualiza SetUpnotes en Airtable agregando una nueva línea con timestamp
 */
export async function appendSetUpNotesToAirtable(
  propertyId: string,
  newNotes: string
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

    // 3. Obtener notas actuales de Airtable
    const base = await import('airtable').then(m => {
      const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
      const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
      if (!apiKey || !baseId) return null;
      return new m.default({ apiKey }).base(baseId);
    });

    if (!base) {
      console.warn('Airtable not configured');
      return false;
    }

    const record = await base(tableName).find(recordId);
    const currentNotes = (record.fields['SetUp Team Notes'] || record.fields['Set up team notes'] || '') as string;
    
    // 4. Agregar nueva línea con timestamp
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const newLine = `\n[${timestamp}] ${newNotes}`;
    const updatedNotes = currentNotes ? `${currentNotes}${newLine}` : newNotes;

    // 5. Actualizar Airtable
    const success = await updateAirtableWithRetry(tableName, recordId, {
      'SetUp Team Notes': updatedNotes,
    });

    if (success) {
      console.log(`✅ Updated SetUpnotes in Airtable for property ${propertyId}`);
    }

    return success;
  } catch (error) {
    console.error('Error appending SetUpnotes to Airtable:', error);
    return false;
  }
}

/**
 * Trae campos de Airtable cuando se entra a initial-check
 */
export async function fetchInitialCheckFieldsFromAirtable(
  propertyId: string
): Promise<{
  nextRenoSteps?: string;
  renovatorName?: string;
  keysLocation?: string;
  setUpStatus?: string;
} | null> {
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
      return null;
    }

    const airtablePropertyId = property.airtable_property_id || property['Unique ID From Engagements'];
    
    if (!airtablePropertyId) {
      console.warn('Property has no Airtable ID, skipping fetch:', propertyId);
      return null;
    }

    // 2. Buscar record en Airtable
    const recordId = await findRecordByPropertyId(tableName, airtablePropertyId);

    if (!recordId) {
      // No es un error crítico - simplemente el registro no existe en Airtable
      console.debug('Airtable record not found for property:', {
        propertyId,
        airtablePropertyId,
        tableName,
      });
      return null;
    }

    // 3. Obtener campos de Airtable
    const Airtable = await import('airtable');
    const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
    const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
    
    if (!apiKey || !baseId) {
      console.warn('Airtable not configured');
      return null;
    }

    const base = new Airtable.default({ apiKey }).base(baseId);
    const record = await base(tableName).find(recordId);
    const fields = record.fields;

    return {
      nextRenoSteps: fields['Next Reno Steps'] as string | undefined,
      renovatorName: fields['Renovator Name'] as string | undefined,
      keysLocation: fields['Keys Location'] as string | undefined,
      setUpStatus: fields['Set Up Status'] as string | undefined,
    };
  } catch (error: any) {
    // Solo mostrar errores reales, no casos donde simplemente no se encuentra un registro
    const errorMessage = error?.message || String(error);
    const isRealError = errorMessage && errorMessage !== '{}' && errorMessage !== '[object Object]';
    
    if (isRealError) {
      console.error('Error fetching initial check fields from Airtable:', {
        propertyId,
        error: errorMessage,
        code: error?.code || error?.statusCode,
      });
    } else {
      console.debug('No Airtable data available for property:', propertyId);
    }
    return null;
  }
}

/**
 * Actualiza Airtable cuando se guarda el checklist (cada guardado)
 */
export async function syncChecklistToAirtable(
  propertyId: string,
  checklistData: {
    progress?: number;
    completed?: boolean;
  }
): Promise<boolean> {
  const supabase = createClient();
  const tableName = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Properties';
  
  try {
    const { data: property, error } = await supabase
      .from('properties')
      .select('airtable_property_id, "Unique ID From Engagements"')
      .eq('id', propertyId)
      .single();

    if (error || !property) {
      console.warn('Property not found in Supabase:', propertyId);
      return false;
    }

    const airtablePropertyId = property.airtable_property_id || property['Unique ID From Engagements'];
    
    if (!airtablePropertyId) {
      console.warn('Property has no Airtable ID, skipping sync:', propertyId);
      return false;
    }

    const recordId = await findRecordByPropertyId(tableName, airtablePropertyId);

    if (!recordId) {
      console.warn('Airtable record not found, skipping sync:', airtablePropertyId);
      return false;
    }

    // Actualizar campos de checklist en Airtable
    const updates: Record<string, any> = {};
    
    if (checklistData.progress !== undefined) {
      updates['Checklist Progress'] = checklistData.progress;
    }
    
    if (checklistData.completed !== undefined) {
      updates['Initial Check Complete'] = checklistData.completed;
    }

    const success = await updateAirtableWithRetry(tableName, recordId, updates);

    if (success) {
      console.log(`✅ Synced checklist to Airtable for property ${propertyId}`);
    }

    return success;
  } catch (error) {
    console.error('Error syncing checklist to Airtable:', error);
    return false;
  }
}

/**
 * Genera URL pública del checklist
 */
export function generateChecklistPublicUrl(propertyId: string, checklistType: 'reno_initial' | 'reno_final'): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://dev.vistral.io';
  const publicBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  
  // URL pública del checklist (sin autenticación requerida)
  // Esto debería ser una ruta pública que muestre el checklist en modo lectura
  return `${publicBaseUrl}/reno/construction-manager/property/${propertyId}/checklist/public?type=${checklistType}`;
}

/**
 * Finaliza el checklist y actualiza todos los campos en Airtable
 */
export async function finalizeInitialCheckInAirtable(
  propertyId: string,
  checklistType: 'reno_initial' | 'reno_final',
  data: {
    estimatedVisitDate?: string;
    autoVisitDate?: string;
    nextRenoSteps?: string;
  }
): Promise<boolean> {
  const supabase = createClient();
  const tableName = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Properties';
  
  try {
    const { data: property, error } = await supabase
      .from('properties')
      .select('airtable_property_id, "Unique ID From Engagements"')
      .eq('id', propertyId)
      .single();

    if (error || !property) {
      console.warn('Property not found in Supabase:', propertyId);
      return false;
    }

    const airtablePropertyId = property.airtable_property_id || property['Unique ID From Engagements'];
    
    if (!airtablePropertyId) {
      console.warn('Property has no Airtable ID, skipping sync:', propertyId);
      return false;
    }

    const recordId = await findRecordByPropertyId(tableName, airtablePropertyId);

    if (!recordId) {
      console.warn('Airtable record not found, skipping sync:', airtablePropertyId);
      return false;
    }

    // Preparar actualizaciones según la lógica especificada:
    // Para reno_initial:
    //   1. Set up status: "Pending to budget (from renovator)"
    //   2. Visit Date: fecha del día que se envía
    //   3. Reno checklist form: link público del PDF del checklist
    // Para reno_final:
    //   1. NO se actualiza Set Up Status (se mantiene como está)
    //   2. NO se actualiza Visit Date (ese es solo para initial check)
    //   3. Reno checklist form: link público del PDF del checklist
    const updates: Record<string, any> = {};

    // 1. Set Up Status: Solo para reno_initial
    //    - reno_initial -> "Pending to budget (from renovator)"
    //    - reno_final -> NO se actualiza (se mantiene como está)
    if (checklistType === 'reno_initial') {
      updates['Set Up Status'] = 'Pending to budget (from Renovator)';
      updates['Initial Check Complete'] = true;
    }
    // Para reno_final, NO actualizamos Set Up Status

    // 2. Visit Date: Solo para reno_initial (el Visit Date es de la visita inicial)
    //    - Para reno_final, NO se actualiza
    if (checklistType === 'reno_initial') {
      if (data.estimatedVisitDate) {
        updates['fldIhqPOAFL52MMBn'] = data.estimatedVisitDate; // Estimated visit date
      }
      
      if (data.autoVisitDate) {
        updates['Auto Visit Date'] = data.autoVisitDate;
      }
    }
    // Para reno_final, NO actualizamos Visit Date

    // 3. Next Reno Steps: Solo si se proporciona
    if (data.nextRenoSteps) {
      updates['fldwzJJY5jWtaUvl'] = data.nextRenoSteps; // Next Reno Steps
    }
    
    // 4. Reno checklist form: fldBOpKEktOI2GnZK -> link público del PDF del checklist
    //    - Se actualiza tanto para initial como para final
    const checklistPublicUrl = generateChecklistPublicUrl(propertyId, checklistType);
    updates['fldBOpKEktOI2GnZK'] = checklistPublicUrl;

    const success = await updateAirtableWithRetry(tableName, recordId, updates);

    if (success) {
      console.log(`✅ Finalized initial check in Airtable for property ${propertyId}`);
      
      // También actualizar fase en Supabase usando helper
      const { updatePropertyPhaseConsistent } = await import('@/lib/supabase/phase-update-helper');
      
      if (checklistType === 'reno_initial') {
        // Checklist inicial: mover a reno-budget-renovator
        await updatePropertyPhaseConsistent(propertyId, {
          setUpStatus: 'Pending to budget (from renovator)',
          renoPhase: 'reno-budget-renovator',
        });
      } else if (checklistType === 'reno_final') {
        // Checklist final: pasar de Final Check -> Cleaning
        await updatePropertyPhaseConsistent(propertyId, {
          setUpStatus: 'Cleaning',
          renoPhase: 'cleaning',
        });
      }
    }

    return success;
  } catch (error) {
    console.error('Error finalizing initial check in Airtable:', error);
    return false;
  }
}

