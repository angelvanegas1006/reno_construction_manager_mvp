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
    
    try {
      await base(tableName).update([
        {
          id: recordId,
          fields,
        },
      ]);
      
      console.log(`✅ Updated Airtable record ${recordId} in ${tableName}`, { fields });
      return true;
    } catch (updateError: any) {
      // Si el error es que el Record ID no existe en esta tabla específica,
      // proporcionar más información de diagnóstico
      const errorMessage = updateError?.message || String(updateError);
      if (errorMessage.includes('does not exist in this table')) {
        console.error(`[Airtable Update] ❌ Record ID ${recordId} does not exist in table "${tableName}"`, {
          recordId,
          tableName,
          possibleCauses: [
            'Record ID belongs to a different table',
            'Table name is incorrect',
            'Record was deleted from Airtable',
            'Record ID format is invalid',
          ],
          suggestion: 'Verify that the Record ID belongs to the correct table in Airtable',
        });
      }
      throw updateError; // Re-throw para que el manejo de errores superior lo capture
    }
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
 * Encuentra el Record ID de Transactions usando el Record ID de Properties o el Unique ID
 * Busca en Transactions el record que tiene el campo "Properties" vinculado al airtable_property_id dado
 * También puede buscar por Unique ID si se proporciona
 * 
 * @param propertiesRecordId - El Record ID de la tabla "Properties" en Airtable
 * @param uniqueId - Opcional: El Unique ID (From Engagements) para búsqueda alternativa
 * @returns El Record ID de Transactions si se encuentra, null si no existe
 */
export async function findTransactionsRecordIdByPropertiesId(
  propertiesRecordId: string,
  uniqueId?: string
): Promise<string | null> {
  try {
    const base = getBase();
    if (!base) {
      console.warn('[findTransactionsRecordIdByPropertiesId] Airtable base not configured');
      return null;
    }

    // PRIORIDAD 1: Si tenemos Unique ID, buscar por Unique ID primero (más confiable)
    if (uniqueId) {
      console.log('[findTransactionsRecordIdByPropertiesId] 🔍 Searching by Unique ID first:', uniqueId);
      try {
        const uniqueIdRecords: any[] = [];
        await base('Transactions')
          .select({
            filterByFormula: `OR({UNIQUEID (from Engagements)} = "${uniqueId}", {Unique ID (From Engagements)} = "${uniqueId}", {Unique ID From Engagements} = "${uniqueId}")`,
            maxRecords: 1,
          })
          .eachPage((pageRecords, fetchNextPage) => {
            pageRecords.forEach((record) => {
              uniqueIdRecords.push(record);
            });
            fetchNextPage();
          });

        if (uniqueIdRecords.length > 0) {
          const transactionsRecordId = uniqueIdRecords[0].id;
          console.log('[findTransactionsRecordIdByPropertiesId] ✅ Found Transactions Record ID by Unique ID:', {
            uniqueId,
            transactionsRecordId,
            totalMatches: uniqueIdRecords.length,
          });
          return transactionsRecordId;
        }
        
        console.log('[findTransactionsRecordIdByPropertiesId] ⚠️ No records found by Unique ID search, trying Properties link search');
      } catch (uniqueIdError: any) {
        console.warn('[findTransactionsRecordIdByPropertiesId] Unique ID search failed, trying Properties link:', uniqueIdError.message);
      }
    }

    // PRIORIDAD 2: Buscar por Properties link
    // Validar que propertiesRecordId es un Record ID válido
    if (!propertiesRecordId || !propertiesRecordId.startsWith('rec')) {
      console.warn('[findTransactionsRecordIdByPropertiesId] Invalid properties Record ID:', propertiesRecordId);
      return null;
    }
    
    console.log('[findTransactionsRecordIdByPropertiesId] 🔍 Searching by Properties Record ID:', propertiesRecordId);

    // Buscar en Transactions el record que tiene el campo "Properties" vinculado a este Record ID
    // El campo "Properties" es un link field que contiene un array de Record IDs
    // Usamos una búsqueda más directa: buscar todos los records y filtrar manualmente
    // porque las fórmulas de filtro con link fields pueden ser problemáticas
    const records: any[] = [];
    
    try {
      // Intentar primero con una fórmula simple que funcione con link fields
      // En Airtable, los link fields se pueden buscar usando el Record ID directamente
      await base('Transactions')
        .select({
          filterByFormula: `SEARCH("${propertiesRecordId}", CONCATENATE({Properties})) > 0`,
          maxRecords: 100, // Limitar a 100 para no sobrecargar
        })
        .eachPage((pageRecords, fetchNextPage) => {
          pageRecords.forEach((record) => {
            // Verificar que el record realmente tiene este Properties ID en su campo Properties
            const propertiesField = record.fields['Properties'];
            if (Array.isArray(propertiesField) && propertiesField.includes(propertiesRecordId)) {
              records.push(record);
            } else if (propertiesField === propertiesRecordId) {
              records.push(record);
            }
          });
          fetchNextPage();
        });
    } catch (formulaError: any) {
      // Si la fórmula falla, buscar sin filtro y filtrar manualmente
      console.debug('[findTransactionsRecordIdByPropertiesId] Formula search failed, trying manual search:', formulaError.message);
      
      await base('Transactions')
        .select({
          maxRecords: 1000, // Limitar para no sobrecargar
        })
        .eachPage((pageRecords, fetchNextPage) => {
          pageRecords.forEach((record) => {
            const propertiesField = record.fields['Properties'];
            if (Array.isArray(propertiesField) && propertiesField.includes(propertiesRecordId)) {
              records.push(record);
            } else if (propertiesField === propertiesRecordId) {
              records.push(record);
            }
          });
          fetchNextPage();
        });
    }

    if (records.length > 0) {
      const transactionsRecordId = records[0].id;
      console.log('[findTransactionsRecordIdByPropertiesId] ✅ Found Transactions Record ID:', {
        propertiesRecordId,
        transactionsRecordId,
        totalMatches: records.length,
      });
      return transactionsRecordId;
    }
    
    console.log('[findTransactionsRecordIdByPropertiesId] ⚠️ No records found by Properties link search');


    console.warn('[findTransactionsRecordIdByPropertiesId] ❌ No Transactions record found for Properties ID:', {
      propertiesRecordId,
      uniqueId: uniqueId || 'not provided',
      searchMethodsAttempted: ['Properties link search', uniqueId ? 'Unique ID search' : null].filter(Boolean),
    });
    return null;
  } catch (error: any) {
    console.error('[findTransactionsRecordIdByPropertiesId] Error:', error);
    return null;
  }
}

/**
 * Busca el Record ID de Transactions usando el Unique ID (From Engagements)
 * 
 * @param uniqueId - El Unique ID From Engagements (ej: "SP-TJP-JXR-005643")
 * @returns El Record ID de Transactions si se encuentra, null si no existe
 */
export async function findTransactionsRecordIdByUniqueId(
  uniqueId: string
): Promise<string | null> {
  try {
    const base = getBase();
    if (!base) {
      console.warn('[findTransactionsRecordIdByUniqueId] Airtable base not configured');
      return null;
    }

    if (!uniqueId || typeof uniqueId !== 'string') {
      console.warn('[findTransactionsRecordIdByUniqueId] Invalid Unique ID:', uniqueId);
      return null;
    }

    console.log('[findTransactionsRecordIdByUniqueId] 🔍 Searching Transactions by Unique ID:', uniqueId);
    
    const records: any[] = [];
    
    try {
      // Escapar comillas en el Unique ID para evitar problemas con la fórmula
      const escapedUniqueId = uniqueId.replace(/"/g, '\\"');
      
      // Intentar primero con el field ID en la fórmula (si Airtable lo soporta)
      // Field ID: fldrpCWcjaKEDCy4g para "UNIQUEID (from Engagements)"
      try {
        await base('Transactions')
          .select({
            filterByFormula: `{fldrpCWcjaKEDCy4g} = "${escapedUniqueId}"`,
            maxRecords: 1,
          })
          .eachPage((pageRecords, fetchNextPage) => {
            pageRecords.forEach((record) => {
              records.push(record);
            });
            fetchNextPage();
          });
      } catch (formulaError: any) {
        // Si la fórmula con field ID falla, buscar sin filtro y filtrar manualmente usando el field ID
        console.log('[findTransactionsRecordIdByUniqueId] Formula with field ID failed, trying manual search:', formulaError?.message);
        
        await base('Transactions')
          .select({
            maxRecords: 1000, // Limitar para no sobrecargar
          })
          .eachPage((pageRecords, fetchNextPage) => {
            pageRecords.forEach((record) => {
              // Buscar usando el field ID directamente en los campos del record
              // Field ID: fldrpCWcjaKEDCy4g
              const uniqueIdValue = record.fields['fldrpCWcjaKEDCy4g'] || 
                                   record.fields['UNIQUEID (from Engagements)'] ||
                                   record.fields['Unique ID (From Engagements)'] ||
                                   record.fields['Unique ID From Engagements'];
              
              // El campo puede ser un array o un string
              const uniqueIdArray = Array.isArray(uniqueIdValue) ? uniqueIdValue : [uniqueIdValue];
              
              if (uniqueIdArray.includes(uniqueId)) {
                records.push(record);
              }
            });
            fetchNextPage();
          });
      }
    } catch (selectError: any) {
      // Capturar todos los detalles posibles del error
      const errorInfo: any = {
        message: selectError?.message || 'Unknown error',
        name: selectError?.name,
        uniqueId,
      };
      
      // Intentar extraer más información del error
      if (selectError?.error) {
        errorInfo.error = selectError.error;
      }
      if (selectError?.statusCode) {
        errorInfo.statusCode = selectError.statusCode;
      }
      if (selectError?.status) {
        errorInfo.status = selectError.status;
      }
      if (selectError?.errorType) {
        errorInfo.errorType = selectError.errorType;
      }
      
      // Intentar serializar el error completo
      try {
        errorInfo.fullError = JSON.stringify(selectError, Object.getOwnPropertyNames(selectError));
      } catch {
        errorInfo.fullError = String(selectError);
      }
      
      console.error('[findTransactionsRecordIdByUniqueId] Error during Airtable select:', errorInfo);
      throw selectError; // Re-throw para que el catch externo lo maneje
    }

    if (records.length > 0) {
      const transactionsRecordId = records[0].id;
      console.log('[findTransactionsRecordIdByUniqueId] ✅ Found Transactions Record ID:', {
        uniqueId,
        transactionsRecordId,
      });
      return transactionsRecordId;
    }

    console.warn('[findTransactionsRecordIdByUniqueId] ❌ No Transactions record found for Unique ID:', uniqueId);
    return null;
  } catch (error: any) {
    // Capturar todos los detalles posibles del error
    const errorDetails: any = {
      uniqueId,
    };
    
    // Intentar extraer información del error de diferentes formas
    try {
      errorDetails.message = error?.message || String(error);
      errorDetails.name = error?.name;
      errorDetails.errorType = error?.errorType;
      errorDetails.statusCode = error?.statusCode;
      errorDetails.status = error?.status;
      errorDetails.error = error?.error;
      errorDetails.stack = error?.stack;
      
      // Intentar serializar el error completo
      try {
        errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (serializeError) {
        errorDetails.fullError = String(error);
      }
      
      // Intentar acceder a todas las propiedades del error
      if (error && typeof error === 'object') {
        try {
          const errorKeys = Object.getOwnPropertyNames(error);
          errorDetails.properties = errorKeys.reduce((acc: any, key: string) => {
            try {
              acc[key] = (error as any)[key];
            } catch {
              acc[key] = '[Cannot access]';
            }
            return acc;
          }, {});
        } catch {
          // Ignorar errores al acceder a propiedades
        }
      }
    } catch (extractError) {
      errorDetails.extractionError = String(extractError);
      errorDetails.originalError = String(error);
    }
    
    console.error('[findTransactionsRecordIdByUniqueId] ❌ Error:', errorDetails);
    return null;
  }
}

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

    // Validar que el Record ID existe en la tabla especificada
    try {
      const record = await Promise.race([
        base(tableName).find(airtablePropertyId),
        // Timeout de 5 segundos para evitar esperas infinitas
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Validation timeout')), 5000)
        ),
      ]) as any;
      
      // Verificar que el record realmente existe y pertenece a esta tabla
      if (record && record.id === airtablePropertyId) {
        console.debug('[findRecordByPropertyId] ✅ Record ID validated in table:', {
          recordId: airtablePropertyId,
          tableName,
        });
        return airtablePropertyId;
      }
      
      console.warn('[findRecordByPropertyId] Record ID found but validation failed:', {
        recordId: airtablePropertyId,
        tableName,
        recordIdMatch: record?.id === airtablePropertyId,
      });
      return null;
    } catch (validationError: any) {
      const errorMessage = validationError?.message || String(validationError);
      const errorCode = validationError?.statusCode || validationError?.status;
      
      // Si el Record ID no existe en esta tabla específica, retornar null
      const isNotFoundError = 
        errorMessage.includes('does not exist') || 
        errorMessage.includes('not exist') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('Record ID') && errorMessage.includes('does not exist') ||
        errorCode === 404 ||
        (validationError?.error && typeof validationError.error === 'string' && validationError.error.includes('does not exist'));
      
      if (isNotFoundError) {
        console.error('[findRecordByPropertyId] ❌ Record ID does not exist in table:', {
          recordId: airtablePropertyId,
          tableName,
          error: errorMessage,
          possibleCauses: [
            `Record ID belongs to a different table (not "${tableName}")`,
            'Record was deleted from Airtable',
            'Table name is incorrect',
          ],
        });
        return null;
      }
      
      // Para otros errores (autenticación, red, etc.), loguear como error
      console.error('[findRecordByPropertyId] Error validating Record ID:', {
        recordId: airtablePropertyId,
        tableName,
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


