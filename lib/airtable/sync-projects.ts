/**
 * Sincronización de proyectos desde Airtable a Supabase.
 * Requiere AIRTABLE_PROJECTS_TABLE_ID en env (ID de la tabla de proyectos en Airtable).
 * Transactions: "Project name" (fldYKVjNcqyR6ZSvN) lookup → Properties → Projects.
 * Projects: "Project Name" (fldivXm0vlDYdNHpC).
 * Projects tiene "Properties linked" (linked a Properties). Relación en Supabase: properties.project_id.
 *
 * Campos Airtable Projects (por nombre en API; IDs de referencia):
 * Investment type fldqEG0ELFy8MMahd, Properties to convert fldvz2h1As8l0wFM5,
 * Project start date fldm2GkittZedjjgo, Renovation spend fldgUj4koDoLmVia1,
 * Project Unique ID fldEpcdZ9IRytENi4, Estimated settlement date fldrLe0R4eOMzDFb8,
 * Project status flds2Fe3uSYu9ipUZ, Drive folder fldK6cfta4u4fJiSq, Area cluster fldaXmigA6pfpwCYG,
 * Project Set up team notes fldlwg6qwfEMFJ4qA, Project keys location fldYFSjn9dRTzqpS0,
 * Renovator fldhEjMMmiodnBHFW, Est. reno start date fld06pg57Bo1zXy9O,
 * Reno start date fldY7PqHCZahKDiQF, Reno end date fldqzu3dXk1bBkd1v, Est. reno end date fldWbTN9n4BZQ3zSM,
 * Type fldHrPVWqJ2m9EucF, Reno duration fldW9EfmK05fYjiPr, Project address fldJKUEuK8hRttoy6,
 * Settlement date fldopnOMgl7wmjl3y, Already tenanted fldyehoj5ZEGaLrLE,
 * Operation name fldxxeOLZWPhOVBfO, Opportunity stage fldm8rncZl4gFyKkN,
 * Scouter fld0kTfLFaCMqGDzG, Lead fldjSFG3SZv34igsd
 */

import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';
import type { RenoKanbanPhase } from '@/lib/reno-kanban-config';
import { AIRTABLE_PROJECTS_VIEW_ID, SET_UP_STATUS_TO_PROJECT_PHASE } from '@/lib/reno-kanban-config';

function getAirtableBase(): Airtable.Base | null {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) return null;
  return new Airtable({ apiKey }).base(baseId);
}

function getField<T>(fields: Record<string, unknown>, ...keys: string[]): T | null {
  for (const k of keys) {
    const v = fields[k];
    if (v !== undefined && v !== null && v !== '') return v as T;
  }
  return null;
}

function parseDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/,/g, '.'));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function mapSetUpStatusToProjectPhase(value: unknown): RenoKanbanPhase | null {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const mapped = SET_UP_STATUS_TO_PROJECT_PHASE[raw];
  if (mapped) return mapped;
  const normalized = raw.toLowerCase().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Coincidencia exacta normalizada (sin acentos, espacios colapsados)
  for (const [k, v] of Object.entries(SET_UP_STATUS_TO_PROJECT_PHASE)) {
    const keyNorm = k.toLowerCase().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (keyNorm === normalized) return v;
  }
  // Coincidencia parcial: si el valor de Airtable contiene la clave (p. ej. "Reno in progress" en "Reno in progress (delayed)")
  const sortedEntries = Object.entries(SET_UP_STATUS_TO_PROJECT_PHASE).sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of sortedEntries) {
    const keyNorm = k.toLowerCase().replace(/\s+/g, ' ');
    if (normalized.includes(keyNorm)) return v;
  }
  return null;
}

export interface SyncProjectsResult {
  created: number;
  updated: number;
  errors: number;
  skipped: boolean; // true if AIRTABLE_PROJECTS_TABLE_ID not set
}

/**
 * Sincroniza la tabla projects desde Airtable.
 * Inserta o actualiza por airtable_project_id.
 */
export async function syncProjectsFromAirtable(): Promise<SyncProjectsResult> {
  const tableId = process.env.AIRTABLE_PROJECTS_TABLE_ID;
  const result: SyncProjectsResult = { created: 0, updated: 0, errors: 0, skipped: false };

  if (!tableId || tableId.trim() === '') {
    result.skipped = true;
    return result;
  }

  const base = getAirtableBase();
  const supabase = createAdminClient();
  if (!base) {
    result.skipped = true;
    return result;
  }

  type ProjectRecord = {
    id: string;
    name: string | null;
    reno_phase: RenoKanbanPhase | null;
    investment_type: string | null;
    properties_to_convert: string | null;
    project_start_date: string | null;
    renovation_spend: number | null;
    project_unique_id: string | null;
    estimated_settlement_date: string | null;
    project_status: string | null;
    drive_folder: string | null;
    area_cluster: string | null;
    project_set_up_team_notes: string | null;
    project_keys_location: string | null;
    renovator: string | null;
    est_reno_start_date: string | null;
    reno_start_date: string | null;
    reno_end_date: string | null;
    est_reno_end_date: string | null;
    type: string | null;
    reno_duration: number | null;
    project_address: string | null;
    settlement_date: string | null;
    already_tenanted: string | null;
    operation_name: string | null;
    opportunity_stage: string | null;
    scouter: string | null;
    lead: string | null;
  };

  const records: ProjectRecord[] = [];

  const viewId = AIRTABLE_PROJECTS_VIEW_ID;

  try {
    const pageRecords = await base(tableId)
      .select({ maxRecords: 500, view: viewId })
      .all();

    pageRecords.forEach((rec: any) => {
      const f = rec.fields ?? {};
      const name =
        getField<string>(f, 'Name', 'name', 'Project Name', 'Title') ?? null;
      const phaseRaw =
        getField<string>(f, 'Project status', 'Set Up Status', 'Phase', 'Status', 'Stage') ?? null;
      let reno_phase = mapSetUpStatusToProjectPhase(phaseRaw);
      if (!reno_phase) reno_phase = 'obra-en-progreso';
      records.push({
        id: rec.id,
        name: name != null ? String(name) : null,
        reno_phase,
        investment_type: getField<string>(f, 'Investment type') ?? null,
        properties_to_convert: getField<string>(f, 'Properties to convert') ?? null,
        project_start_date: parseDate(getField(f, 'Project start date')),
        renovation_spend: parseNumber(getField(f, 'Renovation spend')),
        project_unique_id: getField<string>(f, 'Project Unique ID') ?? null,
        estimated_settlement_date: parseDate(getField(f, 'Estimated settlement date')),
        project_status: getField<string>(f, 'Project status') ?? null,
        drive_folder: getField<string>(f, 'Drive folder') ?? null,
        area_cluster: getField<string>(f, 'Area cluster') ?? null,
        project_set_up_team_notes: getField<string>(f, 'Project Set up team notes') ?? null,
        project_keys_location: getField<string>(f, 'Project keys location') ?? null,
        renovator: getField<string>(f, 'Renovator') ?? null,
        est_reno_start_date: parseDate(getField(f, 'Est. reno start date')),
        reno_start_date: parseDate(getField(f, 'Reno start date')),
        reno_end_date: parseDate(getField(f, 'Reno end date')),
        est_reno_end_date: parseDate(getField(f, 'Est. reno end date')),
        type: getField<string>(f, 'Type') ?? null,
        reno_duration: parseNumber(getField(f, 'Reno duration')),
        project_address: getField<string>(f, 'Project address') ?? null,
        settlement_date: parseDate(getField(f, 'Settlement date')),
        already_tenanted: (() => { const v = getField(f, 'Already tenanted'); return v != null && v !== '' ? String(v) : null; })(),
        operation_name: getField<string>(f, 'Operation name') ?? null,
        opportunity_stage: getField<string>(f, 'Opportunity stage') ?? null,
        scouter: getField<string>(f, 'Scouter') ?? null,
        lead: getField<string>(f, 'Lead') ?? null,
      });
    });
  } catch (e: unknown) {
    console.error('[Sync Projects] Error fetching from Airtable:', e);
    result.errors++;
    return result;
  }

  const { data: existing } = await supabase
    .from('projects')
    .select('id, airtable_project_id')
    .in('airtable_project_id', records.map((r) => r.id));

  const byAirtableId = new Map<string | null, { id: string }>();
  existing?.forEach((row: { id: string; airtable_project_id: string | null }) => {
    if (row.airtable_project_id) byAirtableId.set(row.airtable_project_id, { id: row.id });
  });

  const now = new Date().toISOString();

  const toPayload = (rec: ProjectRecord) => ({
    name: rec.name,
    reno_phase: rec.reno_phase,
    investment_type: rec.investment_type,
    properties_to_convert: rec.properties_to_convert,
    project_start_date: rec.project_start_date,
    renovation_spend: rec.renovation_spend,
    project_unique_id: rec.project_unique_id,
    estimated_settlement_date: rec.estimated_settlement_date,
    project_status: rec.project_status,
    drive_folder: rec.drive_folder,
    area_cluster: rec.area_cluster,
    project_set_up_team_notes: rec.project_set_up_team_notes,
    project_keys_location: rec.project_keys_location,
    renovator: rec.renovator,
    est_reno_start_date: rec.est_reno_start_date,
    reno_start_date: rec.reno_start_date,
    reno_end_date: rec.reno_end_date,
    est_reno_end_date: rec.est_reno_end_date,
    type: rec.type,
    reno_duration: rec.reno_duration,
    project_address: rec.project_address,
    settlement_date: rec.settlement_date,
    already_tenanted: rec.already_tenanted,
    operation_name: rec.operation_name,
    opportunity_stage: rec.opportunity_stage,
    scouter: rec.scouter,
    lead: rec.lead,
    updated_at: now,
  });

  let firstError: string | null = null;

  for (const rec of records) {
    const existingRow = byAirtableId.get(rec.id);
    if (existingRow) {
      const { error } = await supabase
        .from('projects')
        .update(toPayload(rec))
        .eq('id', existingRow.id);
      if (error) {
        result.errors++;
        if (!firstError) firstError = `${rec.id}: ${error.message}`;
      } else {
        result.updated++;
      }
    } else {
      const { error } = await supabase.from('projects').insert({
        airtable_project_id: rec.id,
        ...toPayload(rec),
        created_at: now,
      });
      if (error) {
        result.errors++;
        if (!firstError) firstError = `insert ${rec.id}: ${error.message}`;
      } else {
        result.created++;
      }
    }
  }

  if (firstError) {
    console.error('[Sync Projects] Primer error:', firstError);
  }

  // Proyectos que están en Supabase pero NO en la vista actual de Airtable → reno_phase = 'orphaned'
  const airtableIdsInView = new Set(records.map((r) => r.id));
  const { data: allSupabase } = await supabase
    .from('projects')
    .select('id, airtable_project_id')
    .not('airtable_project_id', 'is', null);
  const toOrphan = (allSupabase ?? []).filter(
    (row: { id: string; airtable_project_id: string | null }) =>
      row.airtable_project_id && !airtableIdsInView.has(row.airtable_project_id)
  );
  if (toOrphan.length > 0) {
    const ids = toOrphan.map((r: { id: string }) => r.id);
    const { error: orphanError } = await supabase
      .from('projects')
      .update({ reno_phase: 'orphaned', updated_at: now })
      .in('id', ids);
    if (orphanError) {
      console.error('[Sync Projects] Error marcando orphaned:', orphanError.message);
    } else {
      console.log('[Sync Projects] Proyectos marcados como orphaned (no están en la vista Airtable):', toOrphan.length);
    }
  }

  return result;
}

/**
 * Devuelve un Map airtable_project_id -> supabase project id para usar al mapear propiedades.
 * Incluye proyectos orphaned para que las propiedades puedan enlazarse a ellos.
 */
export async function getAirtableProjectIdToSupabaseIdMap(): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('projects')
    .select('id, airtable_project_id')
    .not('airtable_project_id', 'is', null);
  const map = new Map<string, string>();
  data?.forEach((row: { id: string; airtable_project_id: string | null }) => {
    if (row.airtable_project_id) {
      map.set(row.airtable_project_id, row.id);
    }
  });
  return map;
}

/**
 * Normaliza un nombre de proyecto para búsqueda insensible a mayúsculas/espacios.
 * Exportado para uso en sync-unified al resolver project_id por nombre.
 */
export function normalizeProjectName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Devuelve un Map project_name (normalizado) -> supabase project id.
 * Usado para enlazar properties.project_id desde el lookup "Project Name" de Transactions.
 * Incluye proyectos orphaned para que las propiedades puedan enlazarse a ellos.
 */
export async function getProjectNameToSupabaseIdMap(): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('projects')
    .select('id, name')
    .not('name', 'is', null);
  const map = new Map<string, string>();
  data?.forEach((row: { id: string; name: string | null }) => {
    if (row.name && row.name.trim()) {
      const normalized = normalizeProjectName(row.name);
      if (!map.has(normalized)) {
        map.set(normalized, row.id);
      }
    }
  });
  return map;
}

/** Posibles nombres/IDs del campo en Airtable Projects que enlaza a Properties o Transactions. */
const LINK_FIELD_IDS_AND_NAMES = [
  'fldNNtxGRZcUO5Xr2', // "Properties linked"
  'Properties linked',
  'Linked properties',
  'Properties',
  'Transactions',
  'Transaction Names',
  'Property',
];

function extractLinkedIds(fields: Record<string, unknown>): string[] {
  for (const key of LINK_FIELD_IDS_AND_NAMES) {
    const raw = fields[key];
    if (raw === undefined || raw === null) continue;
    const arr = Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === 'string')
      : typeof raw === 'string'
        ? [raw]
        : [];
    if (arr.length > 0) return arr;
  }
  return [];
}

/**
 * Asigna project_id en Supabase a partir del campo de enlace (Properties/Transactions) de la tabla Projects en Airtable.
 * Coincide por airtable_properties_record_id (si el link es a Properties) o airtable_property_id (si el link es a Transactions).
 */
export async function linkPropertiesToProjectsFromAirtable(): Promise<{ linked: number; errors: number }> {
  const tableId = process.env.AIRTABLE_PROJECTS_TABLE_ID;
  const result = { linked: 0, errors: 0 };
  if (!tableId || tableId.trim() === '') return result;

  const base = getAirtableBase();
  const supabase = createAdminClient();
  if (!base) return result;

  const projectMap = await getAirtableProjectIdToSupabaseIdMap();
  if (projectMap.size === 0) {
    console.log('[Sync Projects] linkPropertiesToProjectsFromAirtable: no projects (non-orphaned) in Supabase.');
    return result;
  }

  const propertyIdToProjectId = new Map<string, string>();

  try {
    // No pasar fields: en Projects el nombre del campo principal puede no ser "Name".
    // Sin fields, Airtable devuelve todos los campos y extractLinkedIds busca el de enlace.
    const pageRecords = await base(tableId)
      .select({ maxRecords: 500 })
      .all();

    let projectsWithLinked = 0;
    pageRecords.forEach((rec: any) => {
      const f = rec.fields ?? {};
      const airtableProjectId = rec.id;
      const supabaseProjectId = projectMap.get(airtableProjectId);
      if (!supabaseProjectId) return;

      const linkedIds = extractLinkedIds(f);

      if (linkedIds.length > 0) projectsWithLinked++;
      linkedIds.forEach((propRecordId: string) => {
        propertyIdToProjectId.set(propRecordId, supabaseProjectId);
      });
    });

    console.log(
      '[Sync Projects] linkPropertiesToProjectsFromAirtable:',
      `projects fetched=${pageRecords.length}, with link field=${projectsWithLinked}, property→project pairs=${propertyIdToProjectId.size}`
    );
  } catch (e: unknown) {
    console.error('[Sync Projects] Error fetching Projects linked properties:', e);
    result.errors++;
    return result;
  }

  if (propertyIdToProjectId.size === 0) {
    console.log('[Sync Projects] linkPropertiesToProjectsFromAirtable: no property→project pairs, skipping updates.');
    return result;
  }

  const now = new Date().toISOString();
  const projectIdToPropertyIds = new Map<string, string[]>();
  for (const [airtablePropertiesRecordId, supabaseProjectId] of propertyIdToProjectId) {
    const list = projectIdToPropertyIds.get(supabaseProjectId) ?? [];
    list.push(airtablePropertiesRecordId);
    projectIdToPropertyIds.set(supabaseProjectId, list);
  }

  const linkedIds = new Set<string>();

  for (const [supabaseProjectId, airtableIds] of projectIdToPropertyIds) {
    const batchSize = 100;
    for (let i = 0; i < airtableIds.length; i += batchSize) {
      const batch = airtableIds.slice(i, i + batchSize);

      // 1) Enlace por airtable_properties_record_id (si en Airtable Projects enlaza a tabla Properties)
      const { data: dataByPropRecordId, error: err1 } = await supabase
        .from('properties')
        .update({ project_id: supabaseProjectId, updated_at: now })
        .in('airtable_properties_record_id', batch)
        .select('id');
      if (!err1 && dataByPropRecordId?.length) {
        dataByPropRecordId.forEach((r: { id: string }) => linkedIds.add(r.id));
      } else if (err1) {
        result.errors++;
      }

      // 2) Enlace por airtable_property_id (si en Airtable Projects enlaza a tabla Transactions; los nombres que ves son "Transaction Names")
      const { data: dataByPropId, error: err2 } = await supabase
        .from('properties')
        .update({ project_id: supabaseProjectId, updated_at: now })
        .in('airtable_property_id', batch)
        .select('id');
      if (!err2 && dataByPropId?.length) {
        dataByPropId.forEach((r: { id: string }) => linkedIds.add(r.id));
      } else if (err2) {
        result.errors++;
      }
    }
  }

  result.linked = linkedIds.size;
  console.log('[Sync Projects] linkPropertiesToProjectsFromAirtable: updated=', result.linked, 'errors=', result.errors);
  return result;
}
