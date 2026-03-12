/**
 * Sincronización de proyectos desde Airtable a Supabase.
 * Requiere AIRTABLE_PROJECTS_TABLE_ID en env (ID de la tabla de proyectos en Airtable).
 * Transactions: "Project name" (fldYKVjNcqyR6ZSvN) lookup → Properties → Projects.
 * Projects: "Project Name" (fldivXm0vlDYdNHpC).
 * Projects tiene "Properties linked" (linked a Properties). Relación en Supabase: properties.project_id.
 *
 * IMPORTANTE: Todos los campos se acceden por Field ID (inmutables) en vez de por nombre
 * para evitar problemas de capitalización inconsistente en la API de Airtable.
 */

// ─── Airtable Field Names & IDs ──────────────────────────────────────────────
// The SDK returns fields by their human-readable name. We centralise all names
// here so a rename in Airtable only requires changing one place.
// The Field ID is kept as a comment for traceability.
const F = {
  PROJECT_NAME:               'Project Name',             // fldivXm0vlDYdNHpC
  INVESTMENT_TYPE:            'Investment type',           // fldqEG0ELFy8MMahd
  PROPERTIES_TO_CONVERT:      'Properties to convert',    // fldvz2h1As8l0wFM5
  PROJECT_START_DATE:         'Project start date',       // fldm2GkittZedjjgo
  RENOVATION_SPEND:           'Renovation spend',         // fldgUj4koDoLmVia1
  PROJECT_UNIQUE_ID:          'Project Unique ID',        // fldEpcdZ9IRytENi4
  ESTIMATED_SETTLEMENT_DATE:  'Estimated settlement date',// fldrLe0R4eOMzDFb8
  PROJECT_STATUS:             'Project status',           // flds2Fe3uSYu9ipUZ
  DRIVE_FOLDER:               'Drive folder',             // fldK6cfta4u4fJiSq
  AREA_CLUSTER:               'Area cluster',             // fldaXmigA6pfpwCYG
  PROJECT_SETUP_TEAM_NOTES:   'Project Set up team notes',// fldlwg6qwfEMFJ4qA
  PROJECT_KEYS_LOCATION:      'Project keys location',    // fldYFSjn9dRTzqpS0
  RENOVATOR:                  'Renovator',                // fldhEjMMmiodnBHFW
  EST_RENO_START_DATE:        'Est. reno start date',     // fld06pg57Bo1zXy9O
  RENO_START_DATE:            'Reno start date',          // fldY7PqHCZahKDiQF
  RENO_END_DATE:              'Reno end date',            // fldqzu3dXk1bBkd1v
  EST_RENO_END_DATE:          'Est. reno end date',       // fldWbTN9n4BZQ3zSM
  TYPE:                       'Type',                     // fldHrPVWqJ2m9EucF
  RENO_DURATION:              'Reno duration',            // fldW9EfmK05fYjiPr
  PROJECT_ADDRESS:            'Project address',          // fldJKUEuK8hRttoy6
  SETTLEMENT_DATE:            'Settlement date',          // fldopnOMgl7wmjl3y
  ALREADY_TENANTED:           'Already tenanted',         // fldyehoj5ZEGaLrLE
  OPERATION_NAME:             'Operation name',           // fldxxeOLZWPhOVBfO
  OPPORTUNITY_STAGE:          'Opportunity stage',        // fldm8rncZl4gFyKkN
  SCOUTER:                    'Scouter',                  // fld0kTfLFaCMqGDzG
  LEAD:                       'Lead',                     // fldjSFG3SZv34igsd
  RENOVATION_EXECUTOR:        'Renovation executor',      // fldojf9FKqX3kkh9p
  PROPERTIES_LINKED:          'Properties linked',        // fldNNtxGRZcUO5Xr2

  // Maturation-specific fields
  EST_PROPERTIES:             'Est. Properties',          // fldHyN7COZgThuPsL
  ARCHITECT:                  'Architect',                // fldsAsdiGeOaQvlHe
  EXCLUDED_FROM_ECU:          'Excluded from ECU',        // fldbOhkaWOFxgEF9N
  DRAFT_ORDER_DATE:           'Draft order date',         // fldolJBkc8xg4zX4u
  MEASUREMENT_DATE:           'Measurement date',         // flduoq2AThXWINa12
  PROJECT_DRAFT_DATE:         'Project draft date',       // fld1MRXYInkTA5zfY
  DRAFT_PLAN:                 'Draft plan',               // fldb2MtV66Z7lOknJ
  PROJECT_VALIDATION_NOTES:   'Project validation notes', // fldSv6DaHv0JiVnAI
  OFFER_STATUS:               'Offer status',             // fldhwWGWazLA4hcWU
  ECU_CONTACT:                'ECU contact',              // fld4Xgn8xt2OD7iF4
  ESTIMATED_PROJECT_END_DATE: 'Estimated project end date',// fldBd9H8MzeIB7FLE
  PROJECT_END_DATE:           'Project end date',         // fldU09hsxbuciKWLi
  ARRAS_DEADLINE:             'Arras deadline',           // fld7WWN0ZwhTsUKfJ
  ECU_DELIVERY_DATE:          'ECU delivery date',        // fldZw1fCoB7P4uec9
  EST_FIRST_CORRECTION_DATE:  'Estimated first correction date', // fld48U9r5NgQIOkyY
  FIRST_CORRECTION_DATE:      'First correction date',    // fldobn5jZpdWBJyn3
  FIRST_VALIDATION_DURATION:  'First validation duration',// fldiBaYTDuEqcAuw4
  DEFINITIVE_VALIDATION_DATE: 'Definitive validation date',// fldSPVWoaocQwpx0S
  TECHNICAL_PROJECT_DOC:      'Technical project doc',    // fldqmIliUeNEjIQUO
  FINAL_PLAN:                 'Final plan',               // fldz5e4HkJWDByrtj
  LICENSE_ATTACHMENT:          'License attachment',       // fldpOMBUKylokMJ0E
} as const;

// Linked record tables
const LINKED_TABLE_SCOUTER = 'tblBbuRrxZQEavbML'; // Team Profiles
const LINKED_TABLE_B2B     = 'tbljB4pROJtXPOdpt'; // B2B Partners (Architect + ECU Contact)

import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';
import type { RenoKanbanPhase } from '@/lib/reno-kanban-config';
import {
  AIRTABLE_PROJECTS_VIEW_ID,
  SET_UP_STATUS_TO_PROJECT_PHASE,
  AIRTABLE_MATURATION_PROJECTS_VIEW_ID,
  MATURATION_PROJECT_STATUS_TO_PHASE,
  PHASES_KANBAN_MATURATION,
} from '@/lib/reno-kanban-config';
import { persistAttachmentArray, clearFolderCache } from '@/lib/airtable/persist-attachment';

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
  // Fallback: case-insensitive match (Airtable capitalisation can vary)
  const fieldKeys = Object.keys(fields);
  for (const k of keys) {
    const lower = k.toLowerCase();
    const match = fieldKeys.find((fk) => fk.toLowerCase() === lower);
    if (match) {
      const v = fields[match];
      if (v !== undefined && v !== null && v !== '') return v as T;
    }
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

interface AttachmentMeta {
  url: string;
  filename: string;
  type: string;
  size?: number;
}

function parseAttachments(value: unknown): AttachmentMeta[] | null {
  if (value == null) return null;
  if (Array.isArray(value) && value.length > 0) {
    const result: AttachmentMeta[] = [];
    for (const item of value) {
      if (typeof item === 'object' && item !== null && 'url' in item) {
        const a = item as any;
        result.push({
          url: String(a.url),
          filename: String(a.filename ?? 'attachment'),
          type: String(a.type ?? 'application/octet-stream'),
          size: typeof a.size === 'number' ? a.size : undefined,
        });
      }
    }
    return result.length > 0 ? result : null;
  }
  if (typeof value === 'string' && value.trim()) {
    return [{ url: value.trim(), filename: 'attachment', type: 'unknown' }];
  }
  return null;
}

function extractLinkedRecordIds(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

/**
 * Resuelve record IDs de Airtable a sus nombres (campo primario).
 * Usa la API REST directamente porque el SDK de Airtable no soporta fetch por ID en batch fácilmente.
 */
async function resolveLinkedRecordNames(
  recordIds: string[],
  tableId: string,
): Promise<Map<string, string>> {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
  const nameMap = new Map<string, string>();

  if (!apiKey || !baseId || recordIds.length === 0) return nameMap;

  const uniqueIds = [...new Set(recordIds)];

  // Airtable permite fetch de un registro individual por ID
  // Procesamos en paralelo con un límite de concurrencia
  const BATCH_SIZE = 10;
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (recId) => {
      try {
        const resp = await fetch(
          `https://api.airtable.com/v0/${baseId}/${tableId}/${recId}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        if (!resp.ok) return;
        const data = await resp.json();
        const fields = data.fields ?? {};
        // El campo primario suele ser "Name" o el primer campo
        const name = fields['Name'] ?? fields['name'] ?? fields['Full Name'] ??
          fields['Nombre'] ?? Object.values(fields)[0];
        if (name && typeof name === 'string' && name.trim()) {
          nameMap.set(recId, name.trim());
        }
      } catch {
        // Silently skip unresolvable records
      }
    });
    await Promise.all(promises);
  }

  console.log(`[Resolve Linked Records] Resolved ${nameMap.size}/${uniqueIds.length} records from table ${tableId}`);
  return nameMap;
}

function linkedIdsToNames(value: unknown, nameMap: Map<string, string>): string | null {
  const ids = extractLinkedRecordIds(value);
  if (ids.length === 0) return null;
  const names = ids.map((id) => nameMap.get(id) ?? id).filter(Boolean);
  return names.length > 0 ? names.join(', ') : null;
}

function parseBool(value: unknown): boolean | null {
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const l = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'sí', 'si'].includes(l)) return true;
    if (['false', '0', 'no'].includes(l)) return false;
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

function mapMaturationStatusToPhase(value: unknown): RenoKanbanPhase | null {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const mapped = MATURATION_PROJECT_STATUS_TO_PHASE[raw];
  if (mapped) return mapped;
  const normalized = raw.toLowerCase().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [k, v] of Object.entries(MATURATION_PROJECT_STATUS_TO_PHASE)) {
    const keyNorm = k.toLowerCase().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (keyNorm === normalized) return v;
  }
  const sortedEntries = Object.entries(MATURATION_PROJECT_STATUS_TO_PHASE).sort((a, b) => b[0].length - a[0].length);
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
    renovation_executor: string | null;
  };

  const records: ProjectRecord[] = [];

  const viewId = AIRTABLE_PROJECTS_VIEW_ID;

  try {
    const pageRecords = await base(tableId)
      .select({ maxRecords: 500, view: viewId })
      .all();

    pageRecords.forEach((rec: any) => {
      const f = rec.fields ?? {};
      const name = getField<string>(f, F.PROJECT_NAME) ?? null;
      const phaseRaw = getField<string>(f, F.PROJECT_STATUS) ?? null;
      let reno_phase = mapSetUpStatusToProjectPhase(phaseRaw);
      if (!reno_phase) reno_phase = 'obra-en-progreso';
      records.push({
        id: rec.id,
        name: name != null ? String(name) : null,
        reno_phase,
        investment_type: getField<string>(f, F.INVESTMENT_TYPE) ?? null,
        properties_to_convert: getField<string>(f, F.PROPERTIES_TO_CONVERT) ?? null,
        project_start_date: parseDate(getField(f, F.PROJECT_START_DATE)),
        renovation_spend: parseNumber(getField(f, F.RENOVATION_SPEND)),
        project_unique_id: getField<string>(f, F.PROJECT_UNIQUE_ID) ?? null,
        estimated_settlement_date: parseDate(getField(f, F.ESTIMATED_SETTLEMENT_DATE)),
        project_status: getField<string>(f, F.PROJECT_STATUS) ?? null,
        drive_folder: getField<string>(f, F.DRIVE_FOLDER) ?? null,
        area_cluster: getField<string>(f, F.AREA_CLUSTER) ?? null,
        project_set_up_team_notes: getField<string>(f, F.PROJECT_SETUP_TEAM_NOTES) ?? null,
        project_keys_location: getField<string>(f, F.PROJECT_KEYS_LOCATION) ?? null,
        renovator: getField<string>(f, F.RENOVATOR) ?? null,
        est_reno_start_date: parseDate(getField(f, F.EST_RENO_START_DATE)),
        reno_start_date: parseDate(getField(f, F.RENO_START_DATE)),
        reno_end_date: parseDate(getField(f, F.RENO_END_DATE)),
        est_reno_end_date: parseDate(getField(f, F.EST_RENO_END_DATE)),
        type: getField<string>(f, F.TYPE) ?? null,
        reno_duration: parseNumber(getField(f, F.RENO_DURATION)),
        project_address: getField<string>(f, F.PROJECT_ADDRESS) ?? null,
        settlement_date: parseDate(getField(f, F.SETTLEMENT_DATE)),
        already_tenanted: (() => { const v = getField(f, F.ALREADY_TENANTED); return v != null && v !== '' ? String(v) : null; })(),
        operation_name: getField<string>(f, F.OPERATION_NAME) ?? null,
        opportunity_stage: getField<string>(f, F.OPPORTUNITY_STAGE) ?? null,
        scouter: getField<string>(f, F.SCOUTER) ?? null,
        lead: getField<string>(f, F.LEAD) ?? null,
        renovation_executor: getField<string>(f, F.RENOVATION_EXECUTOR) ?? null,
      });
    });
  } catch (e: unknown) {
    console.error('[Sync Projects] Error fetching from Airtable:', e);
    result.errors++;
    return result;
  }

  const { data: existing } = await supabase
    .from('projects')
    .select('id, airtable_project_id, is_maturation_project')
    .in('airtable_project_id', records.map((r) => r.id));

  const byAirtableId = new Map<string | null, { id: string; is_maturation_project: boolean | null }>();
  existing?.forEach((row: { id: string; airtable_project_id: string | null; is_maturation_project: boolean | null }) => {
    if (row.airtable_project_id) byAirtableId.set(row.airtable_project_id, { id: row.id, is_maturation_project: row.is_maturation_project });
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
    renovation_executor: rec.renovation_executor,
    updated_at: now,
  });

  let firstError: string | null = null;

  for (const rec of records) {
    const existingRow = byAirtableId.get(rec.id);
    if (existingRow) {
      // Skip maturation projects — they are managed by syncMaturationProjectsFromAirtable
      // which has richer data (resolved linked records, extra fields)
      if (existingRow.is_maturation_project) {
        continue;
      }
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
  // Excluir proyectos marcados como maduración (se gestionan en syncMaturationProjectsFromAirtable)
  const airtableIdsInView = new Set(records.map((r) => r.id));
  const { data: allSupabase } = await supabase
    .from('projects')
    .select('id, airtable_project_id, reno_phase, is_maturation_project')
    .not('airtable_project_id', 'is', null);
  const toOrphan = (allSupabase ?? []).filter(
    (row: { id: string; airtable_project_id: string | null; reno_phase: string | null; is_maturation_project: boolean | null }) =>
      row.airtable_project_id &&
      !airtableIdsInView.has(row.airtable_project_id) &&
      !row.is_maturation_project
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

/** Posibles nombres del campo en Airtable Projects que enlaza a Properties o Transactions. */
const LINK_FIELD_IDS_AND_NAMES = [
  F.PROPERTIES_LINKED,
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

/**
 * Sincroniza proyectos de maduración desde la view de Airtable viwGr62VwUAlFCvcH.
 * Usa el mismo AIRTABLE_PROJECTS_TABLE_ID pero con la view y mapeo de fases de maduración.
 * No marca orphaned: la detección de orphaned se hace solo en el sync principal.
 */
export async function syncMaturationProjectsFromAirtable(): Promise<SyncProjectsResult> {
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
    est_properties: string | null;
    architect: string | null;
    excluded_from_ecu: boolean | null;
    draft_order_date: string | null;
    measurement_date: string | null;
    project_draft_date: string | null;
    draft_plan: AttachmentMeta[] | null;
    project_validation_notes: string | null;
    offer_status: string | null;
    ecu_contact: string | null;
    estimated_project_end_date: string | null;
    project_end_date: string | null;
    arras_deadline: string | null;
    ecu_delivery_date: string | null;
    estimated_first_correction_date: string | null;
    first_correction_date: string | null;
    first_validation_duration: number | null;
    definitive_validation_date: string | null;
    technical_project_doc: AttachmentMeta[] | null;
    final_plan: AttachmentMeta[] | null;
    license_attachment: AttachmentMeta[] | null;
    renovation_executor: string | null;
  };

  const records: ProjectRecord[] = [];
  const viewId = AIRTABLE_MATURATION_PROJECTS_VIEW_ID;

  try {
    const pageRecords = await base(tableId)
      .select({ maxRecords: 500, view: viewId })
      .all();

    if (pageRecords.length > 0) {
      const firstFields = (pageRecords[0] as any).fields ?? {};
      console.log('[Sync Maturation Projects] First record field keys:', Object.keys(firstFields));
      console.log('[Sync Maturation Projects] First record Project status:', firstFields[F.PROJECT_STATUS]);
    }

    // Phase 1: Collect linked record IDs grouped by source table
    const scouterIds: string[] = [];
    const b2bIds: string[] = [];

    pageRecords.forEach((rec: any) => {
      const f = rec.fields ?? {};
      scouterIds.push(...extractLinkedRecordIds(f[F.SCOUTER]).filter((id) => id.startsWith('rec')));
      b2bIds.push(...extractLinkedRecordIds(f[F.ARCHITECT]).filter((id) => id.startsWith('rec')));
      b2bIds.push(...extractLinkedRecordIds(f[F.ECU_CONTACT]).filter((id) => id.startsWith('rec')));
    });

    // Phase 2: Resolve linked record IDs to names (in parallel, one call per table)
    const [scouterNameMap, b2bNameMap] = await Promise.all([
      resolveLinkedRecordNames([...new Set(scouterIds)], LINKED_TABLE_SCOUTER),
      resolveLinkedRecordNames([...new Set(b2bIds)], LINKED_TABLE_B2B),
    ]);
    // Merge both maps into one for easy lookup
    const linkedNameMap = new Map<string, string>([...scouterNameMap, ...b2bNameMap]);

    // Phase 3: Build project records with resolved names
    pageRecords.forEach((rec: any) => {
      const f = rec.fields ?? {};
      const name = getField<string>(f, F.PROJECT_NAME) ?? null;
      const phaseRaw = getField<string>(f, F.PROJECT_STATUS) ?? null;
      let reno_phase = mapMaturationStatusToPhase(phaseRaw);
      if (!reno_phase) reno_phase = 'get-project-draft';

      const rawScouter = getField(f, F.SCOUTER);
      const rawArchitect = getField(f, F.ARCHITECT);
      const rawEcuContact = getField(f, F.ECU_CONTACT);

      records.push({
        id: rec.id,
        name: name != null ? String(name) : null,
        reno_phase,
        investment_type: getField<string>(f, F.INVESTMENT_TYPE) ?? null,
        properties_to_convert: getField<string>(f, F.PROPERTIES_TO_CONVERT) ?? null,
        project_start_date: parseDate(getField(f, F.PROJECT_START_DATE)),
        renovation_spend: parseNumber(getField(f, F.RENOVATION_SPEND)),
        project_unique_id: getField<string>(f, F.PROJECT_UNIQUE_ID) ?? null,
        estimated_settlement_date: parseDate(getField(f, F.ESTIMATED_SETTLEMENT_DATE)),
        project_status: getField<string>(f, F.PROJECT_STATUS) ?? null,
        drive_folder: getField<string>(f, F.DRIVE_FOLDER) ?? null,
        area_cluster: getField<string>(f, F.AREA_CLUSTER) ?? null,
        project_set_up_team_notes: getField<string>(f, F.PROJECT_SETUP_TEAM_NOTES) ?? null,
        project_keys_location: getField<string>(f, F.PROJECT_KEYS_LOCATION) ?? null,
        renovator: getField<string>(f, F.RENOVATOR) ?? null,
        est_reno_start_date: parseDate(getField(f, F.EST_RENO_START_DATE)),
        reno_start_date: parseDate(getField(f, F.RENO_START_DATE)),
        reno_end_date: parseDate(getField(f, F.RENO_END_DATE)),
        est_reno_end_date: parseDate(getField(f, F.EST_RENO_END_DATE)),
        type: getField<string>(f, F.TYPE) ?? null,
        reno_duration: parseNumber(getField(f, F.RENO_DURATION)),
        project_address: getField<string>(f, F.PROJECT_ADDRESS) ?? null,
        settlement_date: parseDate(getField(f, F.SETTLEMENT_DATE)),
        already_tenanted: (() => { const v = getField(f, F.ALREADY_TENANTED); return v != null && v !== '' ? String(v) : null; })(),
        operation_name: getField<string>(f, F.OPERATION_NAME) ?? null,
        opportunity_stage: getField<string>(f, F.OPPORTUNITY_STAGE) ?? null,
        scouter: linkedIdsToNames(rawScouter, linkedNameMap) ?? (typeof rawScouter === 'string' ? rawScouter : null),
        lead: getField<string>(f, F.LEAD) ?? null,
        est_properties: getField<string>(f, F.EST_PROPERTIES) ?? null,
        architect: linkedIdsToNames(rawArchitect, linkedNameMap) ?? (typeof rawArchitect === 'string' ? rawArchitect : null),
        excluded_from_ecu: parseBool(getField(f, F.EXCLUDED_FROM_ECU)),
        draft_order_date: parseDate(getField(f, F.DRAFT_ORDER_DATE)),
        measurement_date: parseDate(getField(f, F.MEASUREMENT_DATE)),
        project_draft_date: parseDate(getField(f, F.PROJECT_DRAFT_DATE)),
        draft_plan: parseAttachments(getField(f, F.DRAFT_PLAN)),
        project_validation_notes: getField<string>(f, F.PROJECT_VALIDATION_NOTES) ?? null,
        offer_status: getField<string>(f, F.OFFER_STATUS) ?? null,
        ecu_contact: linkedIdsToNames(rawEcuContact, linkedNameMap) ?? (typeof rawEcuContact === 'string' ? rawEcuContact : null),
        estimated_project_end_date: parseDate(getField(f, F.ESTIMATED_PROJECT_END_DATE)),
        project_end_date: parseDate(getField(f, F.PROJECT_END_DATE)),
        arras_deadline: parseDate(getField(f, F.ARRAS_DEADLINE)),
        ecu_delivery_date: parseDate(getField(f, F.ECU_DELIVERY_DATE)),
        estimated_first_correction_date: parseDate(getField(f, F.EST_FIRST_CORRECTION_DATE)),
        first_correction_date: parseDate(getField(f, F.FIRST_CORRECTION_DATE)),
        first_validation_duration: parseNumber(getField(f, F.FIRST_VALIDATION_DURATION)),
        definitive_validation_date: parseDate(getField(f, F.DEFINITIVE_VALIDATION_DATE)),
        technical_project_doc: parseAttachments(getField(f, F.TECHNICAL_PROJECT_DOC)),
        final_plan: parseAttachments(getField(f, F.FINAL_PLAN)),
        license_attachment: parseAttachments(getField(f, F.LICENSE_ATTACHMENT)),
        renovation_executor: getField<string>(f, F.RENOVATION_EXECUTOR) ?? null,
      });
    });

    console.log(`[Sync Maturation Projects] Fetched ${records.length} records from view ${viewId}`);
    if (records.length > 0) {
      const phaseCounts: Record<string, number> = {};
      records.forEach((r) => { phaseCounts[r.reno_phase ?? 'null'] = (phaseCounts[r.reno_phase ?? 'null'] || 0) + 1; });
      console.log('[Sync Maturation Projects] Phase distribution:', phaseCounts);
      console.log('[Sync Maturation Projects] Sample:', records.slice(0, 3).map((r) => ({ name: r.name, status: r.project_status, phase: r.reno_phase, scouter: r.scouter, architect: r.architect })));
    }
  } catch (e: unknown) {
    console.error('[Sync Maturation Projects] Error fetching from Airtable:', e);
    result.errors++;
    return result;
  }

  // Persist Airtable attachment files to Supabase Storage so URLs never expire
  clearFolderCache();
  const ATTACHMENT_FIELDS = ['draft_plan', 'technical_project_doc', 'final_plan', 'license_attachment'] as const;
  let persistProgress = 0;
  const recordsWithAttachments = records.filter((r) =>
    ATTACHMENT_FIELDS.some((f) => { const v = r[f]; return v && v.length > 0; })
  );
  console.log(`[Sync Maturation] Persisting attachments for ${recordsWithAttachments.length}/${records.length} projects...`);
  for (const rec of recordsWithAttachments) {
    persistProgress++;
    const entityId = rec.id;
    for (const field of ATTACHMENT_FIELDS) {
      const value = rec[field];
      if (!value || value.length === 0) continue;
      try {
        console.log(`[Sync Maturation] Persisting ${field} (${value.length} files) for ${rec.name?.slice(0, 40)} [${persistProgress}/${recordsWithAttachments.length}]`);
        const persisted = await persistAttachmentArray(value, 'projects', entityId, field, supabase);
        (rec as any)[field] = persisted;
      } catch (err: any) {
        console.warn(`[Sync Maturation] Failed to persist ${field} for ${rec.name}: ${err?.message}`);
      }
    }
    if (persistProgress % 10 === 0 || persistProgress === recordsWithAttachments.length) {
      console.log(`[Sync Maturation] Attachment progress: ${persistProgress}/${recordsWithAttachments.length}`);
    }
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
    est_properties: rec.est_properties,
    architect: rec.architect,
    excluded_from_ecu: rec.excluded_from_ecu,
    draft_order_date: rec.draft_order_date,
    measurement_date: rec.measurement_date,
    project_draft_date: rec.project_draft_date,
    draft_plan: rec.draft_plan,
    project_validation_notes: rec.project_validation_notes,
    offer_status: rec.offer_status,
    ecu_contact: rec.ecu_contact,
    estimated_project_end_date: rec.estimated_project_end_date,
    project_end_date: rec.project_end_date,
    arras_deadline: rec.arras_deadline,
    ecu_delivery_date: rec.ecu_delivery_date,
    estimated_first_correction_date: rec.estimated_first_correction_date,
    first_correction_date: rec.first_correction_date,
    first_validation_duration: rec.first_validation_duration,
    definitive_validation_date: rec.definitive_validation_date,
    technical_project_doc: rec.technical_project_doc,
    final_plan: rec.final_plan,
    license_attachment: rec.license_attachment,
    renovation_executor: rec.renovation_executor,
    is_maturation_project: true,
    updated_at: now,
  });

  for (const rec of records) {
    const existingRow = byAirtableId.get(rec.id);
    if (existingRow) {
      const { error } = await supabase
        .from('projects')
        .update(toPayload(rec))
        .eq('id', existingRow.id);
      if (error) { console.error(`[Sync Maturation] Update error for ${rec.name}:`, error.message); result.errors++; } else { result.updated++; }
    } else {
      const payload = {
        airtable_project_id: rec.id,
        ...toPayload(rec),
        created_at: now,
      };
      const { error } = await supabase.from('projects').insert(payload);
      if (error) { console.error(`[Sync Maturation] Insert error for ${rec.name}:`, error.message, JSON.stringify(payload).slice(0, 300)); result.errors++; } else { result.created++; }
    }
  }

  // Proyectos que ya no están en la vista de maduración de Airtable: quitar el flag
  const maturationAirtableIds = new Set(records.map((r) => r.id));
  const { data: currentMaturation } = await supabase
    .from('projects')
    .select('id, airtable_project_id')
    .eq('is_maturation_project', true);
  const toUnflag = (currentMaturation ?? []).filter(
    (row: { id: string; airtable_project_id: string | null }) =>
      row.airtable_project_id && !maturationAirtableIds.has(row.airtable_project_id)
  );
  if (toUnflag.length > 0) {
    await supabase
      .from('projects')
      .update({ is_maturation_project: false, updated_at: now })
      .in('id', toUnflag.map((r: { id: string }) => r.id));
    console.log(`[Sync Maturation Projects] Unflagged ${toUnflag.length} projects no longer in maturation view`);
  }

  console.log('[Sync Maturation Projects] Done:', { created: result.created, updated: result.updated, errors: result.errors });
  return result;
}
