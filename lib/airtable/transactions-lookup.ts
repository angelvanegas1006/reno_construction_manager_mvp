/**
 * Búsqueda de Record ID en Airtable Transactions.
 * Módulo solo para servidor (API routes, cron, scripts). No usar "use client".
 * Usado por sync-budget-from-transactions y /api/sync-budget-from-airtable.
 */

import Airtable from 'airtable';

function getBase(): Airtable.Base | null {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) return null;
  return new Airtable({ apiKey }).base(baseId);
}

/**
 * Busca el Record ID de Transactions usando el Unique ID (From Engagements).
 */
export async function findTransactionsRecordIdByUniqueId(
  uniqueId: string
): Promise<string | null> {
  try {
    const base = getBase();
    if (!base) return null;
    if (!uniqueId || typeof uniqueId !== 'string') return null;

    const records: { id: string }[] = [];
    const escapedUniqueId = uniqueId.replace(/"/g, '\\"');

    try {
      try {
        await base('Transactions')
          .select({
            filterByFormula: `{fldrpCWcjaKEDCy4g} = "${escapedUniqueId}"`,
            maxRecords: 1,
          })
          .eachPage((pageRecords, fetchNextPage) => {
            pageRecords.forEach((r) => records.push(r));
            fetchNextPage();
          });
      } catch {
        await base('Transactions')
          .select({ maxRecords: 1000 })
          .eachPage((pageRecords, fetchNextPage) => {
            pageRecords.forEach((record) => {
              const uniqueIdValue =
                record.fields['fldrpCWcjaKEDCy4g'] ||
                record.fields['UNIQUEID (from Engagements)'] ||
                record.fields['Unique ID (From Engagements)'] ||
                record.fields['Unique ID From Engagements'];
              const arr = Array.isArray(uniqueIdValue) ? uniqueIdValue : [uniqueIdValue];
              if (arr.includes(uniqueId)) records.push(record);
            });
            fetchNextPage();
          });
      }
    } catch (selectError) {
      throw selectError;
    }

    return records.length > 0 ? records[0].id : null;
  } catch {
    return null;
  }
}

/**
 * Busca el Record ID de Transactions por Properties Record ID o por Unique ID.
 */
export async function findTransactionsRecordIdByPropertiesId(
  propertiesRecordId: string,
  uniqueId?: string
): Promise<string | null> {
  try {
    const base = getBase();
    if (!base) return null;

    if (uniqueId) {
      try {
        const uniqueIdRecords: { id: string }[] = [];
        await base('Transactions')
          .select({
            filterByFormula: `OR({UNIQUEID (from Engagements)} = "${uniqueId}", {Unique ID (From Engagements)} = "${uniqueId}", {Unique ID From Engagements} = "${uniqueId}")`,
            maxRecords: 1,
          })
          .eachPage((pageRecords, fetchNextPage) => {
            pageRecords.forEach((r) => uniqueIdRecords.push(r));
            fetchNextPage();
          });
        if (uniqueIdRecords.length > 0) return uniqueIdRecords[0].id;
      } catch {
        // fall through to Properties link search
      }
    }

    if (!propertiesRecordId || !propertiesRecordId.startsWith('rec')) return null;

    const records: { id: string }[] = [];
    try {
      await base('Transactions')
        .select({
          filterByFormula: `SEARCH("${propertiesRecordId}", CONCATENATE({Properties})) > 0`,
          maxRecords: 100,
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
    } catch {
      await base('Transactions')
        .select({ maxRecords: 1000 })
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

    return records.length > 0 ? records[0].id : null;
  } catch {
    return null;
  }
}
