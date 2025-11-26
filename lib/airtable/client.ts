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
    console.error('Error updating Airtable:', {
      error: error?.message || error,
      statusCode: error?.statusCode,
      errorType: error?.errorType,
      tableName,
      recordId,
      fields,
    });
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

    // Intentar buscar por diferentes campos posibles
    const possibleFields = [
      'Property ID',
      'Unique ID (From Engagements)',
      'Unique ID From Engagements',
      'UNIQUEID (from Engagements)',
      'Unique ID'
    ];

    for (const fieldName of possibleFields) {
      try {
        const records = await base(tableName)
          .select({
            filterByFormula: `{${fieldName}} = "${propertyId}"`,
            maxRecords: 1,
          })
          .firstPage();
        
        if (records.length > 0) {
          return records[0].id;
        }
      } catch (fieldError: any) {
        // Si el campo no existe, continuar con el siguiente
        if (fieldError?.message?.includes('Unknown field') || fieldError?.message?.includes('does not exist')) {
          continue;
        }
        // Si es otro error, loguearlo pero continuar
        console.debug(`Field ${fieldName} search failed:`, fieldError?.message);
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


