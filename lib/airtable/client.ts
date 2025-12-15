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
export async function findRecordByPropertyId(
  tableName: string,
  propertyId: string
): Promise<string | null> {
  try {
    const base = getBase();
    if (!base) {
      return null;
    }

    // Si el propertyId ya es un Record ID de Airtable (empieza con "rec"), validar que existe
    if (propertyId && propertyId.startsWith('rec')) {
      console.debug('[findRecordByPropertyId] Property ID is already an Airtable Record ID, validating:', propertyId);
      try {
        // Intentar obtener el registro para validar que existe
        await base(tableName).find(propertyId);
        console.debug('[findRecordByPropertyId] ✅ Record ID validated:', propertyId);
        return propertyId;
      } catch (validationError: any) {
        // Si el Record ID no existe, NO retornarlo - buscar por Property ID en su lugar
        const errorMessage = validationError?.message || String(validationError);
        console.warn('[findRecordByPropertyId] ⚠️ Record ID does not exist, will search by Property ID instead:', {
          recordId: propertyId,
          error: errorMessage,
        });
        // NO retornar aquí - continuar con la búsqueda normal abajo
        // Si el Record ID no existe, debemos buscar el registro correcto por Property ID
      }
    }

    // Intentar buscar por diferentes campos posibles
    // Priorizar "UNIQUEID (from Engagements)" como especificado
    const possibleFields = [
      'UNIQUEID (from Engagements)',
      'Unique ID (From Engagements)',
      'Unique ID From Engagements',
      'Property ID',
      'Unique ID'
    ];

    for (const fieldName of possibleFields) {
      try {
        console.log(`[findRecordByPropertyId] Trying field "${fieldName}" with value "${propertyId}"`);
        const records = await base(tableName)
          .select({
            filterByFormula: `{${fieldName}} = "${propertyId}"`,
            maxRecords: 1,
          })
          .firstPage();
        
        console.log(`[findRecordByPropertyId] Field "${fieldName}" returned ${records.length} records`);
        if (records.length > 0) {
          console.log(`[findRecordByPropertyId] ✅ Found record with ID: ${records[0].id}`);
          return records[0].id;
        }
      } catch (fieldError: any) {
        // Si el campo no existe o hay un error de sintaxis (422), continuar con el siguiente
        const isFieldError = fieldError?.message?.includes('Unknown field') || 
            fieldError?.message?.includes('does not exist') ||
            fieldError?.status === 422 ||
            fieldError?.statusCode === 422;
        
        if (isFieldError) {
          console.debug(`[findRecordByPropertyId] Field "${fieldName}" not found or invalid (422), trying next...`);
          continue;
        }
        // Si es otro error, loguearlo pero continuar
        console.debug(`[findRecordByPropertyId] Field ${fieldName} search failed:`, {
          message: fieldError?.message,
          status: fieldError?.status || fieldError?.statusCode,
        });
      }
    }
    
    return null;
  } catch (error: any) {
    // Distinguir entre errores reales y casos donde simplemente no se encuentra un registro
    // Si el error es sobre "not found" o es un objeto vacío, no es un error crítico
    const errorMessage = error?.message || String(error);
    const errorCode = error?.statusCode || error?.code;
    
    // Errores que indican problemas reales (conexión, autenticación, etc.)
    const isRealError = errorCode === 401 || errorCode === 403 || errorCode === 500 || 
                       errorMessage.includes('authentication') || 
                       errorMessage.includes('unauthorized') ||
                       errorMessage.includes('network') ||
                       errorMessage.includes('timeout');
    
    if (isRealError) {
      console.error('Error finding Airtable record:', {
        tableName,
        propertyId,
        error: errorMessage,
        code: errorCode,
      });
    } else {
      // No se encontró el registro o error menor - solo log de debug
      console.debug('Airtable record not found or minor error:', {
        tableName,
        propertyId,
        error: errorMessage || 'Record not found',
      });
    }
    
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
  for (let i = 0; i < maxRetries; i++) {
    try {
      const success = await updateAirtableRecord(tableName, recordId, fields);
      if (success) return true;
    } catch (error: any) {
      // Si es un error de rate limit, esperar antes de reintentar
      if (error?.statusCode === 429 || error?.message?.includes('rate limit')) {
        const waitTime = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Rate limit hit, waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (i === maxRetries - 1) {
        console.error('Failed to update Airtable after retries:', error);
        return false;
      }
    }
  }
  return false;
}


