/**
 * Sincronización de budget_pdf_url desde Airtable Transactions a Supabase.
 * Usado por el sync unificado (cron + botón "Sync con Airtable") para que las propiedades
 * que no tienen presupuesto en Supabase lo obtengan automáticamente desde Airtable.
 */

import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';
import { findTransactionsRecordIdByUniqueId } from './client';

const BUDGET_ATTACHMENT_FIELD_ID = 'fldVOO4zqx5HUzIjz';

function getAirtableBase(): Airtable.Base | null {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) return null;
  return new Airtable({ apiKey }).base(baseId);
}

function extractBudgetUrls(budgetField: unknown): string[] {
  const urls: string[] = [];
  if (budgetField == null) return urls;
  if (typeof budgetField === 'string') {
    budgetField
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0 && (s.startsWith('http://') || s.startsWith('https://')))
      .forEach((u: string) => urls.push(u));
    return urls;
  }
  if (Array.isArray(budgetField)) {
    budgetField.forEach((item: unknown) => {
      if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
        urls.push(item.trim());
      } else if (item && typeof item === 'object' && item !== null && 'url' in item && typeof (item as { url: string }).url === 'string') {
        urls.push(String((item as { url: string }).url).trim());
      }
    });
  }
  return urls.filter((u) => u.length > 0);
}

export interface SyncBudgetForPropertyResult {
  updated: boolean;
  urlCount: number;
  error?: string;
}

/**
 * Sincroniza budget_pdf_url para una propiedad desde Airtable Transactions.
 * @returns Resultado con updated, urlCount y opcionalmente error
 */
export async function syncBudgetForProperty(
  propertyId: string,
  uniqueId: string,
  options?: { supabase?: ReturnType<typeof createAdminClient>; base?: Airtable.Base }
): Promise<SyncBudgetForPropertyResult> {
  const supabase = options?.supabase ?? createAdminClient();
  const base = options?.base ?? getAirtableBase();

  if (!base) {
    return { updated: false, urlCount: 0, error: 'Airtable not configured' };
  }

  const transactionsRecordId = await findTransactionsRecordIdByUniqueId(uniqueId);
  if (!transactionsRecordId) {
    return { updated: false, urlCount: 0, error: `No Transactions record for Unique ID: ${uniqueId}` };
  }

  const record = await base('Transactions').find(transactionsRecordId);
  const fieldKeys = Object.keys(record.fields);

  const budgetFieldNames = fieldKeys.filter(
    (k) =>
      k === 'TECH - Budget Attachment (URLs)' ||
      k === BUDGET_ATTACHMENT_FIELD_ID ||
      (k.toLowerCase().includes('budget') && (k.toLowerCase().includes('attachment') || k.toLowerCase().includes('url')))
  );

  const allUrls: string[] = [];
  const checkedFields = [BUDGET_ATTACHMENT_FIELD_ID, ...budgetFieldNames.filter((k) => k !== BUDGET_ATTACHMENT_FIELD_ID)];

  for (const fieldKey of checkedFields) {
    const value = record.fields[fieldKey];
    if (value == null) continue;
    const urls = extractBudgetUrls(value);
    allUrls.push(...urls);
  }

  const uniqueUrls = [...new Set(allUrls)];
  if (uniqueUrls.length === 0) {
    return { updated: false, urlCount: 0 };
  }

  const budgetPdfUrlValue = uniqueUrls.join(',');
  const { error: updateError } = await supabase
    .from('properties')
    .update({ budget_pdf_url: budgetPdfUrlValue, updated_at: new Date().toISOString() })
    .eq('id', propertyId);

  if (updateError) {
    return { updated: false, urlCount: uniqueUrls.length, error: updateError.message };
  }

  return { updated: true, urlCount: uniqueUrls.length };
}

export interface SyncBudgetsResult {
  synced: number;
  errors: number;
  skipped: number;
  details: string[];
}

/**
 * Sincroniza budget_pdf_url para propiedades que no lo tienen (o está vacío).
 * Pensado para ejecutarse después del sync unificado de fases (cron + botón Sync con Airtable).
 *
 * @param options.limit - Máximo de propiedades a procesar (por defecto 100)
 * @param options.phases - Si se especifica, solo propiedades en estas fases (por defecto todas las que no tienen budget)
 */
export async function syncBudgetsForPropertiesWithoutBudget(options?: {
  limit?: number;
  phases?: string[];
}): Promise<SyncBudgetsResult> {
  const limit = options?.limit ?? 100;
  const result: SyncBudgetsResult = { synced: 0, errors: 0, skipped: 0, details: [] };

  const supabase = createAdminClient();
  const base = getAirtableBase();
  if (!base) {
    result.details.push('Airtable not configured, skipping budget sync');
    return result;
  }

  let query = supabase
    .from('properties')
    .select('id, address, "Unique ID From Engagements"')
    .or('budget_pdf_url.is.null,budget_pdf_url.eq.""');

  if (options?.phases?.length) {
    query = query.in('reno_phase', options.phases);
  }

  const { data: properties, error: fetchError } = await query
    .limit(limit)
    .order('updated_at', { ascending: false });

  if (fetchError) {
    result.errors++;
    result.details.push(`Error fetching properties: ${fetchError.message}`);
    return result;
  }

  if (!properties?.length) {
    result.details.push('No properties without budget to sync');
    return result;
  }

  result.details.push(`Processing ${properties.length} properties without budget...`);

  for (const prop of properties as { id: string; address: string | null; 'Unique ID From Engagements': string | null }[]) {
    const uniqueId = prop['Unique ID From Engagements'] || prop.id;
    const res = await syncBudgetForProperty(prop.id, uniqueId, { supabase, base });

    if (res.error) {
      result.errors++;
      result.details.push(`${prop.id}: ${res.error}`);
    } else if (res.updated && res.urlCount > 0) {
      result.synced++;
      result.details.push(`${prop.id}: synced ${res.urlCount} budget URL(s)`);
    } else {
      result.skipped++;
    }
  }

  return result;
}
