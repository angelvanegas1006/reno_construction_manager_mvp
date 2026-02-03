"use client";

import { updateAirtableWithRetry, findRecordByPropertyId, findTransactionsRecordIdByUniqueId } from './client';
import { createClient } from '@/lib/supabase/client';
import { mapSetUpStatusToKanbanPhase } from '@/lib/supabase/kanban-mapping';
import { uploadChecklistPDFToStorage } from '@/lib/pdf/checklist-pdf-storage';
import { convertSupabaseToChecklist } from '@/lib/supabase/checklist-converter';
import { ChecklistData } from '@/lib/checklist-storage';

/**
 * Actualiza SetUpnotes en Airtable agregando una nueva línea con timestamp
 */
export async function appendSetUpNotesToAirtable(
  propertyId: string,
  newNotes: string
): Promise<boolean> {
  const supabase = createClient();
  // IMPORTANTE: El Record ID siempre está en "Transactions", no en "Properties"
  const tableName = 'Transactions';
  
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
  // IMPORTANTE: El Record ID siempre está en "Transactions", no en "Properties"
  const tableName = 'Transactions';
  
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
  // IMPORTANTE: El Record ID siempre está en "Transactions", no en "Properties"
  const tableName = 'Transactions';
  
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

    // Priorizar "Unique ID From Engagements" para buscar por "UNIQUEID (from Engagements)" en Airtable
    // Solo usar airtable_property_id si es un Record ID válido
    let recordId: string | null = null;
    
    // Primero intentar con "Unique ID From Engagements" (corresponde a "UNIQUEID (from Engagements)" en Airtable)
    if (property['Unique ID From Engagements']) {
      console.log('[syncChecklistToAirtable] Searching by Unique ID From Engagements:', property['Unique ID From Engagements']);
      recordId = await findRecordByPropertyId(tableName, property['Unique ID From Engagements']);
    }
    
    // Si no se encontró y hay airtable_property_id, validar si es un Record ID válido
    if (!recordId && property.airtable_property_id) {
      // Si es un Record ID (empieza con "rec"), validarlo primero
      if (property.airtable_property_id.startsWith('rec')) {
        console.log('[syncChecklistToAirtable] Validating Record ID:', property.airtable_property_id);
        // findRecordByPropertyId ya valida Record IDs, pero si no existe, buscará por Property ID
        const validatedRecordId = await findRecordByPropertyId(tableName, property.airtable_property_id);
        // Solo usar el Record ID si es válido (no null y es el mismo Record ID)
        if (validatedRecordId && validatedRecordId === property.airtable_property_id) {
          recordId = validatedRecordId;
        } else {
          console.warn('[syncChecklistToAirtable] Record ID is invalid or not found, will search by Property ID instead:', {
            invalidRecordId: property.airtable_property_id,
            foundRecordId: validatedRecordId,
          });
          // Si findRecordByPropertyId encontró un registro diferente, usarlo
          if (validatedRecordId && validatedRecordId !== property.airtable_property_id) {
            recordId = validatedRecordId;
          }
        }
      } else {
        // Si no es un Record ID, buscar por ese valor como Property ID
        console.log('[syncChecklistToAirtable] Searching by airtable_property_id:', property.airtable_property_id);
        recordId = await findRecordByPropertyId(tableName, property.airtable_property_id);
      }
    }
    
    if (!recordId) {
      console.warn('[syncChecklistToAirtable] ⚠️ Airtable record not found, skipping sync:', {
        propertyId,
        uniqueIdFromEngagements: property['Unique ID From Engagements'],
        airtablePropertyId: property.airtable_property_id,
      });
      // No retornar false aquí - permitir que el checklist se guarde en Supabase aunque no se sincronice con Airtable
      return true; // Retornar true para no bloquear el guardado en Supabase
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
 * Genera URL pública del PDF del checklist (con tipo: initial o final)
 */
export function generateChecklistPublicUrl(propertyId: string, checklistType: 'reno_initial' | 'reno_final'): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://dev.vistral.io';
  const publicBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  
  // Convertir tipo de checklist a formato de ruta pública
  const type = checklistType === 'reno_initial' ? 'initial' : 'final';
  
  // URL pública del checklist HTML (compartible sin autenticación)
  return `${publicBaseUrl}/checklist-public/${propertyId}/${type}`;
}

/**
 * Genera la URL pública única del selector (sin tipo).
 * Una sola URL por propiedad en Airtable; el usuario elige Initial o Final en esa página.
 */
export function generateChecklistPublicSelectorUrl(propertyId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://dev.vistral.io';
  const publicBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  return `${publicBaseUrl}/checklist-public/${propertyId}`;
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
    progress?: number; // Progreso del checklist (0-100)
  }
): Promise<boolean> {
  const supabase = createClient();
  // IMPORTANTE: El Record ID siempre está en "Transactions", no en "Properties"
  const tableName = 'Transactions';
  
  try {
    // Obtener información completa de la propiedad de Supabase
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('"Unique ID From Engagements", address, "Renovator name", bedrooms, bathrooms, drive_folder_url')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      console.error('[Initial Check Sync] Property not found in Supabase:', propertyId);
      return false;
    }

    const uniqueId = property['Unique ID From Engagements'];
    
    if (!uniqueId) {
      console.error(`[Initial Check Sync] Property ${propertyId} does not have Unique ID From Engagements. Cannot update Airtable.`);
      return false;
    }

    console.log(`[Initial Check Sync] Searching Transactions by Unique ID:`, uniqueId);

    // Buscar Record ID usando Unique ID From Engagements
    const recordId = await findTransactionsRecordIdByUniqueId(uniqueId);

    if (!recordId) {
      console.error(`[Initial Check Sync] Airtable Transactions record not found for Unique ID ${uniqueId}.`);
      return false;
    }

    console.log(`[Initial Check Sync] ✅ Found Transactions Record ID:`, recordId);

    // 1. Cargar checklist desde Supabase
    const inspectionType = checklistType === 'reno_initial' ? 'initial' : 'final';
    
    console.log(`[Initial Check Sync] 🔍 Buscando inspección del tipo: ${inspectionType} para propertyId: ${propertyId}`);
    
    // IMPORTANTE: Buscar la inspección del tipo correcto, no solo la más reciente
    // Esto asegura que el HTML del final check se guarde en la inspección del final check, no en la del initial check
    let { data: inspection, error: inspectionError } = await supabase
      .from('property_inspections')
      .select('id, inspection_type, inspection_status, completed_at')
      .eq('property_id', propertyId)
      .eq('inspection_type', inspectionType) // FILTRAR POR TIPO CORRECTO
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Si hay un error porque la columna inspection_type no existe, intentar sin filtro (por compatibilidad)
    if (inspectionError && (inspectionError.code === '42883' || inspectionError.message?.includes('column') || inspectionError.message?.includes('does not exist'))) {
      console.warn('[Initial Check Sync] ⚠️ Campo inspection_type no existe, buscando sin filtro:', inspectionError.message);
      const { data: latestInspection, error: latestError } = await supabase
        .from('property_inspections')
        .select('id, inspection_type, inspection_status, completed_at')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!latestError && latestInspection && typeof latestInspection === 'object' && 'id' in latestInspection) {
        // Type assertion para asegurar que TypeScript entienda el tipo correcto
        const inspectionData = latestInspection as { id: string; inspection_type?: string; pdf_url?: string };
        
        // Validar que el tipo coincida si existe
        if (inspectionData.inspection_type && inspectionData.inspection_type !== inspectionType) {
          console.error('[Initial Check Sync] ❌ Inspección encontrada tiene tipo incorrecto:', {
            esperado: inspectionType,
            obtenido: inspectionData.inspection_type,
            id: inspectionData.id,
          });
          inspection = null;
          inspectionError = { code: 'PGRST116', message: 'No matching inspection found' } as any;
        } else {
        inspection = latestInspection;
        inspectionError = null;
      }
      }
    } else if (inspectionError && inspectionError.code !== 'PGRST116') {
      // PGRST116 es "no rows returned", que es válido si no existe la inspección
      console.error('[Initial Check Sync] ❌ Error buscando inspección:', inspectionError);
    }
    
    // Validar que la inspección obtenida tenga el tipo correcto
    // Verificar que inspection es un objeto válido y no un error
    if (inspection && typeof inspection === 'object' && 'id' in inspection) {
      // Type assertion para asegurar que TypeScript entienda el tipo correcto
      const inspectionData = inspection as { id: string; inspection_type?: string; inspection_status?: string; pdf_url?: string };
      
      if (inspectionData.inspection_type && inspectionData.inspection_type !== inspectionType) {
        console.error('[Initial Check Sync] ❌ Inspección con tipo incorrecto:', {
          esperado: inspectionType,
          obtenido: inspectionData.inspection_type,
          id: inspectionData.id,
        });
        inspection = null;
        inspectionError = { code: 'PGRST116', message: 'No matching inspection found' } as any;
      } else {
        console.log(`[Initial Check Sync] ✅ Inspección encontrada:`, {
          id: inspectionData.id,
          inspection_type: inspectionData.inspection_type,
          inspection_status: inspectionData.inspection_status,
        });
      }
    } else {
      console.warn(`[Initial Check Sync] ⚠️ No se encontró inspección del tipo ${inspectionType} para propertyId ${propertyId}`);
    }

    // Si encontramos una inspección pero no está completada, completarla ahora
    if (!inspectionError && inspection && typeof inspection === 'object' && 'id' in inspection) {
      const inspectionData = inspection as { id: string; inspection_status?: string };
      if (inspectionData.inspection_status !== 'completed') {
        console.log('[Initial Check Sync] Inspection not completed, completing it now:', inspectionData.id);
      const { error: completeError } = await supabase
        .from('property_inspections')
        .update({
          inspection_status: 'completed',
          completed_at: new Date().toISOString(),
        })
          .eq('id', inspectionData.id);
      
      if (completeError) {
        console.error('[Initial Check Sync] Error completing inspection:', completeError);
      } else {
        console.log('[Initial Check Sync] ✅ Inspection completed successfully');
        }
      }
    }

    let pdfUrl: string | null = null;

    if (!inspectionError && inspection && typeof inspection === 'object' && 'id' in inspection) {
      const inspectionData = inspection as { id: string };
      
      // Cargar zonas y elementos del checklist
      const { data: zones } = await supabase
        .from('inspection_zones')
        .select('*')
        .eq('inspection_id', inspectionData.id);

      const { data: elements } = await supabase
        .from('inspection_elements')
        .select('*')
        .in('zone_id', zones?.map(z => z.id) || []);

      if (zones && elements) {
        // Convertir a formato ChecklistData
        const checklistData = convertSupabaseToChecklist(
          zones,
          elements,
          property.bedrooms,
          property.bathrooms
        );

        // Crear ChecklistData completo
        const fullChecklist: ChecklistData = {
          propertyId,
          checklistType,
          sections: checklistData.sections || {},
          completedAt: new Date().toISOString(),
          createdAt: checklistData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // 2. Generar y subir PDF
        try {
          console.log('[Initial Check Sync] 📄 Generating PDF...');
          pdfUrl = await uploadChecklistPDFToStorage(
            fullChecklist,
            {
              address: property.address || propertyId,
              propertyId,
              renovatorName: property['Renovator name'] || undefined,
              driveFolderUrl: property.drive_folder_url || undefined,
            },
            'es' // Por ahora siempre en español
          );
          console.log('[Initial Check Sync] ✅ PDF generated and uploaded:', pdfUrl);

          // Guardar URL del PDF en property_inspections
          if (inspection && typeof inspection === 'object' && 'id' in inspection) {
            const inspectionData = inspection as { id: string };
          await supabase
            .from('property_inspections')
            .update({ pdf_url: pdfUrl })
              .eq('id', inspectionData.id);
          }
        } catch (pdfError: any) {
          console.error('[Initial Check Sync] ❌ Error generating PDF:', pdfError);
          // Continuar aunque falle la generación del PDF
        }
      }
    }

    // Preparar actualizaciones según la lógica especificada:
    // Para reno_initial:
    //   1. Set up status: "Pending to budget (from renovator)"
    //   2. Visit Date: fecha del día que se envía
    //   3. Reno checklist form: link público del PDF del checklist
    // Para reno_final:
    //   1. Set up status: NO se actualiza (se mantiene el actual)
    //   2. Visit Date: NO se actualiza (se mantiene el actual)
    //   3. Reno checklist form: link público del PDF del checklist
    const updates: Record<string, any> = {};

    // 1. Set Up Status: fldE95fZPdw45XV2J
    //    - reno_initial -> "Pending to budget (from renovator)"
    //    - reno_final -> NO se actualiza
    if (checklistType === 'reno_initial') {
      updates['fldE95fZPdw45XV2J'] = 'Pending to budget (from renovator)';
    }
    // Para reno_final, no agregamos Set Up Status a updates

    // 2. Visit Date: flddFKqUl6WiDe97c -> fecha del día que se envía
    //    Solo para reno_initial, no para reno_final
    if (checklistType === 'reno_initial') {
      const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      updates['flddFKqUl6WiDe97c'] = todayDate;
    }
    // Para reno_final, no agregamos Visit Date a updates

    // 3. Reno checklist form: fldBOpKEktOI2GnZK -> URL única del selector (Initial / Final)
    const checklistPublicUrl = generateChecklistPublicSelectorUrl(propertyId);
    updates['fldBOpKEktOI2GnZK'] = checklistPublicUrl;

    console.log(`[Initial Check Sync] 📋 About to update Airtable with:`, {
      tableName,
      recordId,
      updates,
      propertyId,
      uniqueId,
    });

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
      }
      // Para reno_final, NO actualizamos Set Up Status ni reno_phase en Supabase
      // Se mantiene el estado actual de la propiedad
    } else {
      console.error(`[Initial Check Sync] Failed to update Airtable for property ${propertyId}`);
    }

    return success;
  } catch (error: any) {
    console.error('[Initial Check Sync] Error finalizing initial check in Airtable:', {
      error: error?.message || error,
      stack: error?.stack,
      propertyId,
    });
    return false;
  }
}

