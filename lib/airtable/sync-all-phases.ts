/**
 * Sync maestro que sincroniza todas las fases del kanban desde Airtable
 * Usa el método unificado que asegura consistencia entre Airtable y Supabase
 * También sincroniza budget_pdf_url desde Airtable Transactions para propiedades sin presupuesto.
 *
 * IMPORTANTE: Este es el método que se ejecuta varias veces al día en producción (cron + botón "Sync con Airtable").
 * Incluye el enlace properties.project_id desde Airtable Projects "Properties linked" (linkPropertiesToProjectsFromAirtable).
 */

import { syncAllPhasesUnified, type UnifiedSyncResult } from './sync-unified';
import { syncBudgetsForAllProperties, type SyncBudgetsResult } from './sync-budget-from-transactions';
import { syncProjectsFromAirtable, linkPropertiesToProjectsFromAirtable } from './sync-projects';

export interface SyncResult {
  phase: string;
  created: number;
  updated: number;
  errors: number;
  details: string[];
}

export interface AllPhasesSyncResult {
  success: boolean;
  timestamp: string;
  phases: SyncResult[];
  totalCreated: number;
  totalUpdated: number;
  totalErrors: number;
  /** Sincronización de presupuestos desde Airtable Transactions (propiedades sin budget_pdf_url) */
  budgetSync?: SyncBudgetsResult;
}

/**
 * Sincroniza todas las fases del kanban desde Airtable usando el método unificado
 * Este método asegura consistencia total entre Airtable y Supabase:
 * - Resuelve conflictos usando prioridad de fases (fase más avanzada gana)
 * - Mueve propiedades que no están en ninguna vista a fase "orphaned"
 * - Mantiene sincronización exacta entre ambos sistemas
 */
export async function syncAllPhasesFromAirtable(): Promise<AllPhasesSyncResult> {
  // 1. Sincronizar fases y datos de propiedades desde Airtable
  const unifiedResult = await syncAllPhasesUnified();

  // 2. Sincronizar proyectos (reno_phase desde Airtable Set Up Status / Project status) y enlace properties.project_id
  try {
    const projectsResult = await syncProjectsFromAirtable();
    if (!projectsResult.skipped && (projectsResult.created > 0 || projectsResult.updated > 0)) {
      console.log('[Airtable Sync] Projects:', { created: projectsResult.created, updated: projectsResult.updated });
    }
    const linkResult = await linkPropertiesToProjectsFromAirtable();
    if (linkResult.linked > 0) {
      console.log('[Airtable Sync] Properties linked to projects:', linkResult.linked);
    }
  } catch (projectsErr: unknown) {
    const message = projectsErr instanceof Error ? projectsErr.message : String(projectsErr);
    console.error('[Airtable Sync] Projects/link sync failed:', message);
  }

  // 3. Sincronizar budget_pdf_url desde Airtable Transactions para TODAS las propiedades del kanban
  // (traer todos los presupuestos desde Airtable en cada sync/cron)
  let budgetSync: SyncBudgetsResult | undefined;
  try {
    budgetSync = await syncBudgetsForAllProperties({ limit: 200 });
    if (budgetSync.synced > 0 || budgetSync.errors > 0 || budgetSync.categoriesTriggered > 0) {
      console.log('[Airtable Sync] Budget sync:', {
        synced: budgetSync.synced,
        errors: budgetSync.errors,
        skipped: budgetSync.skipped,
        categoriesTriggered: budgetSync.categoriesTriggered,
      });
    }
  } catch (budgetErr: unknown) {
    const message = budgetErr instanceof Error ? budgetErr.message : String(budgetErr);
    console.error('[Airtable Sync] Budget sync failed:', message);
    budgetSync = { synced: 0, errors: 1, skipped: 0, categoriesTriggered: 0, details: [`Budget sync error: ${message}`] };
  }

  // Convertir resultado unificado al formato esperado por la API
  const results: SyncResult[] = Object.entries(unifiedResult.phaseCounts)
    .filter(([phase]) => phase !== 'orphaned' && phase !== 'reno-fixes' && phase !== 'done')
    .map(([phase, count]) => ({
      phase,
      created: 0, // El método unificado no separa por fase
      updated: 0,
      errors: 0,
      details: [`${count} properties in ${phase}`],
    }));

  // Agregar resultado de orphaned si hay propiedades
  if (unifiedResult.totalMovedToOrphaned > 0) {
    results.push({
      phase: 'orphaned',
      created: 0,
      updated: unifiedResult.totalMovedToOrphaned,
      errors: 0,
      details: [`${unifiedResult.totalMovedToOrphaned} properties moved to orphaned`],
    });
  }

  return {
    success: unifiedResult.success,
    timestamp: unifiedResult.timestamp,
    phases: results,
    totalCreated: unifiedResult.totalCreated,
    totalUpdated: unifiedResult.totalUpdated,
    totalErrors: unifiedResult.totalErrors,
    budgetSync,
  };
}

// La limpieza ahora se maneja en sync-unified.ts
// Esta función se mantiene por compatibilidad pero ya no se usa

