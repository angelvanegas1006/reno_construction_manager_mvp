/**
 * Sincronización de budget_pdf_url desde Airtable Transactions a Supabase.
 * Usado por el sync unificado (cron + botón "Sync con Airtable") para que las propiedades
 * que no tienen presupuesto en Supabase lo obtengan automáticamente desde Airtable.
 */

import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';
import { findTransactionsRecordIdByUniqueId, findTransactionsRecordIdByPropertiesId } from './client';

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

const WEBHOOK_CATEGORIES_URL = 'https://n8n.prod.prophero.com/webhook/send_categories_cursor';

export interface SyncBudgetForPropertyResult {
  updated: boolean;
  urlCount: number;
  /** Primera URL de presupuesto (para disparar extracción de categorías) */
  firstBudgetUrl?: string;
  error?: string;
}

/**
 * Dispara la extracción de categorías en n8n solo si la propiedad no tiene categorías en property_dynamic_categories.
 */
export async function triggerCategoriesExtractionIfNeeded(
  supabase: ReturnType<typeof createAdminClient>,
  propertyId: string,
  firstBudgetUrl: string,
  uniqueId: string,
  address?: string | null
): Promise<{ triggered: boolean; error?: string }> {
  const { data: existing } = await supabase
    .from('property_dynamic_categories')
    .select('id')
    .eq('property_id', propertyId)
    .limit(1);
  if (existing && existing.length > 0) {
    return { triggered: false };
  }
  try {
    const payload = {
      budget_pdf_url: firstBudgetUrl,
      property_id: propertyId,
      unique_id: uniqueId,
      property_name: null,
      address: address ?? null,
      client_name: null,
      client_email: null,
      renovation_type: null,
      area_cluster: null,
      budget_index: 1,
    };
    const res = await fetch(WEBHOOK_CATEGORIES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return { triggered: true };
    }
    const text = await res.text();
    return { triggered: false, error: `${res.status}: ${text.slice(0, 100)}` };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { triggered: false, error: message };
  }
}

/**
 * Sincroniza budget_pdf_url para una propiedad desde Airtable Transactions.
 * Si no encuentra por Unique ID, intenta por airtable_property_id (link Properties en Transactions).
 * @returns Resultado con updated, urlCount y opcionalmente error
 */
export async function syncBudgetForProperty(
  propertyId: string,
  uniqueId: string,
  options?: {
    supabase?: ReturnType<typeof createAdminClient>;
    base?: Airtable.Base;
    airtablePropertyId?: string | null;
  }
): Promise<SyncBudgetForPropertyResult> {
  const supabase = options?.supabase ?? createAdminClient();
  const base = options?.base ?? getAirtableBase();

  if (!base) {
    return { updated: false, urlCount: 0, error: 'Airtable not configured' };
  }

  let transactionsRecordId = await findTransactionsRecordIdByUniqueId(uniqueId);
  if (!transactionsRecordId && options?.airtablePropertyId) {
    transactionsRecordId = await findTransactionsRecordIdByPropertiesId(options.airtablePropertyId, uniqueId);
  }
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

  return { updated: true, urlCount: uniqueUrls.length, firstBudgetUrl: uniqueUrls[0] };
}

export interface SyncBudgetsResult {
  synced: number;
  errors: number;
  skipped: number;
  /** Propiedades a las que se les disparó extracción de categorías (n8n) porque no tenían categorías */
  categoriesTriggered: number;
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
  const result: SyncBudgetsResult = { synced: 0, errors: 0, skipped: 0, categoriesTriggered: 0, details: [] };

  const supabase = createAdminClient();
  const base = getAirtableBase();
  if (!base) {
    result.details.push('Airtable not configured, skipping budget sync');
    return result;
  }

  let query = supabase
    .from('properties')
    .select('id, address, "Unique ID From Engagements", airtable_property_id')
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

  for (const prop of properties as {
    id: string;
    address: string | null;
    'Unique ID From Engagements': string | null;
    airtable_property_id?: string | null;
  }[]) {
    const uniqueId = prop['Unique ID From Engagements'] || prop.id;
    const res = await syncBudgetForProperty(prop.id, uniqueId, {
      supabase,
      base,
      airtablePropertyId: prop.airtable_property_id ?? undefined,
    });

    if (res.error) {
      result.errors++;
      result.details.push(`${prop.id}: ${res.error}`);
    } else if (res.updated && res.urlCount > 0) {
      result.synced++;
      result.details.push(`${prop.id}: synced ${res.urlCount} budget URL(s)`);
      if (res.firstBudgetUrl) {
        const cat = await triggerCategoriesExtractionIfNeeded(
          supabase,
          prop.id,
          res.firstBudgetUrl,
          uniqueId,
          prop.address ?? undefined
        );
        if (cat.triggered) {
          result.categoriesTriggered++;
          result.details.push(`${prop.id}: categories extraction triggered`);
        }
      }
    } else {
      result.skipped++;
    }
  }

  return result;
}

/**
 * Sincroniza budget_pdf_url desde Airtable Transactions para TODAS las propiedades del kanban
 * (no solo las que no tienen presupuesto). Así siempre refrescamos desde Airtable en cada sync/cron.
 *
 * @param options.limit - Máximo de propiedades a procesar (por defecto 200)
 */
export async function syncBudgetsForAllProperties(options?: { limit?: number }): Promise<SyncBudgetsResult> {
  const limit = options?.limit ?? 200;
  const result: SyncBudgetsResult = { synced: 0, errors: 0, skipped: 0, categoriesTriggered: 0, details: [] };

  const supabase = createAdminClient();
  const base = getAirtableBase();
  if (!base) {
    result.details.push('Airtable not configured, skipping budget sync');
    return result;
  }

  const { data: properties, error: fetchError } = await supabase
    .from('properties')
    .select('id, address, "Unique ID From Engagements", airtable_property_id')
    .not('reno_phase', 'is', null)
    .neq('reno_phase', 'orphaned')
    .limit(limit)
    .order('updated_at', { ascending: false });

  if (fetchError) {
    result.errors++;
    result.details.push(`Error fetching properties: ${fetchError.message}`);
    return result;
  }

  if (!properties?.length) {
    result.details.push('No properties in kanban to sync budgets');
    return result;
  }

  result.details.push(`Syncing budgets for ${properties.length} properties from Airtable...`);

  for (const prop of properties as {
    id: string;
    address?: string | null;
    'Unique ID From Engagements': string | null;
    airtable_property_id?: string | null;
  }[]) {
    const uniqueId = prop['Unique ID From Engagements'] || prop.id;
    const res = await syncBudgetForProperty(prop.id, uniqueId, {
      supabase,
      base,
      airtablePropertyId: prop.airtable_property_id ?? undefined,
    });

    if (res.error) {
      result.errors++;
      result.details.push(`${prop.id}: ${res.error}`);
    } else if (res.updated && res.urlCount > 0) {
      result.synced++;
      result.details.push(`${prop.id}: synced ${res.urlCount} budget URL(s)`);
      if (res.firstBudgetUrl) {
        const cat = await triggerCategoriesExtractionIfNeeded(
          supabase,
          prop.id,
          res.firstBudgetUrl,
          uniqueId,
          prop.address ?? undefined
        );
        if (cat.triggered) {
          result.categoriesTriggered++;
          result.details.push(`${prop.id}: categories extraction triggered`);
        }
      }
    } else {
      result.skipped++;
    }
  }

  return result;
}

/**
 * Sincroniza budget_pdf_url desde Airtable Transactions para todas las propiedades de UNA fase.
 * Útil para revisar una fase concreta (ej. reno-in-progress) y asegurar que todas tienen presupuesto.
 *
 * @param phase - reno_phase a filtrar (ej. 'reno-in-progress')
 * @param options.limit - Máximo de propiedades (por defecto sin límite para la fase)
 */
export async function syncBudgetsForPhase(
  phase: string,
  options?: { limit?: number }
): Promise<SyncBudgetsResult> {
  const result: SyncBudgetsResult = { synced: 0, errors: 0, skipped: 0, categoriesTriggered: 0, details: [] };

  const supabase = createAdminClient();
  const base = getAirtableBase();
  if (!base) {
    result.details.push('Airtable not configured, skipping budget sync');
    return result;
  }

  let query = supabase
    .from('properties')
    .select('id, address, "Unique ID From Engagements", airtable_property_id, budget_pdf_url')
    .eq('reno_phase', phase)
    .order('updated_at', { ascending: false });

  if (options?.limit != null) {
    query = query.limit(options.limit);
  }

  const { data: properties, error: fetchError } = await query;

  if (fetchError) {
    result.errors++;
    result.details.push(`Error fetching properties: ${fetchError.message}`);
    return result;
  }

  if (!properties?.length) {
    result.details.push(`No properties in phase "${phase}"`);
    return result;
  }

  result.details.push(`Phase "${phase}": ${properties.length} properties. Syncing budgets from Airtable...`);

  for (const prop of properties as {
    id: string;
    address: string | null;
    'Unique ID From Engagements': string | null;
    airtable_property_id?: string | null;
    budget_pdf_url?: string | null;
  }[]) {
    const uniqueId = prop['Unique ID From Engagements'] || prop.id;
    const res = await syncBudgetForProperty(prop.id, uniqueId, {
      supabase,
      base,
      airtablePropertyId: prop.airtable_property_id ?? undefined,
    });

    if (res.error) {
      result.errors++;
      result.details.push(`${prop.id} (${prop.address ?? 'N/A'}): ${res.error}`);
    } else if (res.updated && res.urlCount > 0) {
      result.synced++;
      result.details.push(`${prop.id} (${prop.address ?? 'N/A'}): synced ${res.urlCount} budget URL(s)`);
      if (res.firstBudgetUrl) {
        const cat = await triggerCategoriesExtractionIfNeeded(
          supabase,
          prop.id,
          res.firstBudgetUrl,
          uniqueId,
          prop.address ?? undefined
        );
        if (cat.triggered) {
          result.categoriesTriggered++;
          result.details.push(`${prop.id} (${prop.address ?? 'N/A'}): categories extraction triggered`);
        }
      }
    } else {
      result.skipped++;
      result.details.push(`${prop.id} (${prop.address ?? 'N/A'}): no budget in Airtable`);
    }
  }

  return result;
}
