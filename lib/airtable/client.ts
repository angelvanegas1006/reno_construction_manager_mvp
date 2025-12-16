"use client";

import Airtable from 'airtable';

// Initialize Airtable base
const getBase = () => {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    console.warn('Airtable credentials not configured. Set NEXT_PUBLIC_AIRTABLE_API_KEY and NEXT_PUBLIC_AIRTABLE_BASE_ID');
    return null;
  }

  return new Airtable({ apiKey }).base(baseId);
};

export interface AirtableUpdate {
  recordId: string; // ID del registro en Airtable
  fields: Record<string, any>;
}

/**
 * Actualiza un registro en Airtable
 */
export async function updateAirtableRecord(
  tableName: string,
  recordId: string,
  fields: Record<string, any>
): Promise<boolean> {
  try {
    const base = getBase();
    if (!base) {
      console.warn('Airtable not configured, skipping update');
      return false;
    }

    console.log(`[Airtable Update] Updating record ${recordId} in table ${tableName} with fields:`, fields);
    
    await base(tableName).update([
      {
        id: recordId,
        fields,
      },
    ]);
    
    console.log(`✅ Updated Airtable record ${recordId} in ${tableName}`, { fields });
    return true;
  } catch (error: any) {
    // Extraer toda la información posible del error
    let errorDetails: any = {};
    
    // Intentar extraer información del error de diferentes formas
    try {
      errorDetails = {
        // Propiedades comunes de errores
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        // Propiedades específicas de Airtable
        statusCode: error?.statusCode || error?.status,
        status: error?.status,
        errorType: error?.errorType || error?.type,
        error: error?.error,
        code: error?.code,
        details: error?.details,
        errorDetails: error?.errorDetails,
        // Información del contexto
        tableName,
        recordId,
        fields,
        // Serializar el error completo si es posible
        stringified: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        // Todas las propiedades del error
        allProperties: error ? Object.getOwnPropertyNames(error).reduce((acc: any, key: string) => {
          try {
            acc[key] = (error as any)[key];
          } catch {
            acc[key] = '[Cannot access]';
          }
          return acc;
        }, {}) : null,
      };
    } catch (serializationError) {
      errorDetails = {
        error: 'Failed to serialize error',
        originalError: String(error),
        tableName,
        recordId,
        fields,
      };
    }

    console.error('[Airtable] ❌ Error updating record:', errorDetails);
    return false;
  }
}

/**
 * Busca un registro por Property ID o Unique ID (From Engagements)
 * Intenta múltiples campos para mayor compatibilidad
 */
/**
 * Encuentra el Record ID de Airtable usando airtable_property_id (Record_ID)
 * 
 * IMPORTANTE: Todas las propiedades deben tener airtable_property_id porque se crean desde Airtable.
 * Este campo contiene el Record_ID de Airtable (field ID: fldEOW8KmmfOBLGKl)
 * 
 * @param tableName - Nombre de la tabla en Airtable
 * @param airtablePropertyId - El airtable_property_id de Supabase (debe ser un Record ID que empieza con "rec")
 * @returns El Record ID de Airtable si es válido, null si no existe o no es válido
 */
export async function findRecordByPropertyId(
  tableName: string,
  airtablePropertyId: string
): Promise<string | null> {
  try {
    const base = getBase();
    if (!base) {
      return null;
    }

    // Validar que airtablePropertyId es un Record ID válido (debe empezar con "rec")
    if (!airtablePropertyId || !airtablePropertyId.startsWith('rec')) {
      console.debug('[findRecordByPropertyId] Invalid airtable_property_id (must start with "rec"):', airtablePropertyId);
      return null;
    }

    // Validar que el Record ID existe en Airtable
    try {
      await Promise.race([
        base(tableName).find(airtablePropertyId),
        // Timeout de 5 segundos para evitar esperas infinitas
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Validation timeout')), 5000)
        ),
      ]);
      console.debug('[findRecordByPropertyId] ✅ Record ID validated:', airtablePropertyId);
      return airtablePropertyId;
    } catch (validationError: any) {
      const errorMessage = validationError?.message || String(validationError);
      const errorCode = validationError?.statusCode || validationError?.status;
      
      // Si el Record ID no existe, retornar null
      const isNotFoundError = 
        errorMessage.includes('does not exist') || 
        errorMessage.includes('not exist') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('Record ID') && errorMessage.includes('does not exist') ||
        errorCode === 404 ||
        (validationError?.error && typeof validationError.error === 'string' && validationError.error.includes('does not exist'));
      
      if (isNotFoundError) {
        console.debug('[findRecordByPropertyId] Record ID does not exist in Airtable:', {
          recordId: airtablePropertyId,
          tableName,
        });
        return null;
      }
      
      // Para otros errores (autenticación, red, etc.), loguear como error
      console.error('[findRecordByPropertyId] Error validating Record ID:', {
        recordId: airtablePropertyId,
        error: errorMessage,
        code: errorCode,
      });
      return null;
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.statusCode || error?.code;
    
    console.error('[findRecordByPropertyId] Error:', {
      tableName,
      airtablePropertyId,
      error: errorMessage,
      code: errorCode,
    });
    
    return null;
  }
}

/**
 * Actualiza con retry automático (para manejar rate limits)
 */
export async function updateAirtableWithRetry(
  tableName: string,
  recordId: string,
  fields: Record<string, any>,
  maxRetries = 3
): Promise<boolean> {
  console.log(`[updateAirtableWithRetry] Starting update attempt:`, {
    tableName,
    recordId,
    fields,
    maxRetries,
  });
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`[updateAirtableWithRetry] Attempt ${i + 1}/${maxRetries}`);
      const success = await updateAirtableRecord(tableName, recordId, fields);
      if (success) {
        console.log(`[updateAirtableWithRetry] ✅ Success on attempt ${i + 1}`);
        return true;
      }
      console.warn(`[updateAirtableWithRetry] updateAirtableRecord returned false on attempt ${i + 1}`);
    } catch (error: any) {
      // Si es un error de rate limit, esperar antes de reintentar
      if (error?.statusCode === 429 || error?.message?.includes('rate limit')) {
        const waitTime = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`[updateAirtableWithRetry] Rate limit hit, waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      console.error(`[updateAirtableWithRetry] Error on attempt ${i + 1}:`, {
        error: error?.message || error,
        statusCode: error?.statusCode,
        tableName,
        recordId,
        fields,
      });
      
      if (i === maxRetries - 1) {
        console.error('[updateAirtableWithRetry] Failed to update Airtable after all retries:', {
          error: error?.message || error,
          statusCode: error?.statusCode,
          tableName,
          recordId,
          fields,
        });
        return false;
      }
    }
  }
  
  console.error('[updateAirtableWithRetry] All retries exhausted, returning false');
  return false;
}


