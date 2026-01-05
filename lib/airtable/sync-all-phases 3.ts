/**
 * Sync maestro que sincroniza todas las fases del kanban desde Airtable
 * Usa el método unificado que asegura consistencia entre Airtable y Supabase
 * 
 * IMPORTANTE: Este es el método que se ejecuta varias veces al día en producción
 */

import { syncAllPhasesUnified, type UnifiedSyncResult } from './sync-unified';

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
}

/**
 * Sincroniza todas las fases del kanban desde Airtable usando el método unificado
 * Este método asegura consistencia total entre Airtable y Supabase:
 * - Resuelve conflictos usando prioridad de fases (fase más avanzada gana)
 * - Mueve propiedades que no están en ninguna vista a fase "orphaned"
 * - Mantiene sincronización exacta entre ambos sistemas
 */
export async function syncAllPhasesFromAirtable(): Promise<AllPhasesSyncResult> {
  // Usar el método unificado
  const unifiedResult = await syncAllPhasesUnified();

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
  };
}

// La limpieza ahora se maneja en sync-unified.ts
// Esta función se mantiene por compatibilidad pero ya no se usa

