/**
 * Diagnóstico: conteos por reno_phase en Supabase
 * Ejecutar: npx tsx scripts/diagnose-kanban-phases.ts
 * Compara lo que hay en la DB con lo que el front debería mostrar.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  const supabase = createAdminClient();

  // 1. Total y excluyendo orphaned (igual que el front)
  const { data: allNonOrphaned, error: e1 } = await supabase
    .from('properties')
    .select('id, reno_phase, type, address')
    .neq('reno_phase', 'orphaned')
    .order('created_at', { ascending: false })
    .limit(3000);

  if (e1) {
    console.error('Error fetching properties:', e1);
    process.exit(1);
  }

  const total = allNonOrphaned?.length ?? 0;
  const byPhase: Record<string, number> = {};
  (allNonOrphaned ?? []).forEach((p) => {
    const phase = p.reno_phase ?? '(null)';
    byPhase[phase] = (byPhase[phase] ?? 0) + 1;
  });

  console.log('\n=== DIAGNÓSTICO KANBAN - SUPABASE ===\n');
  console.log('Query: properties donde reno_phase != \'orphaned\' (igual que el front)');
  console.log('Total filas devueltas:', total);
  console.log('\nConteos por reno_phase:');
  const phasesOrder = [
    'upcoming-settlements',
    'initial-check',
    'reno-budget-renovator',
    'reno-budget-client',
    'reno-budget-start',
    'reno-budget',
    'upcoming',
    'reno-in-progress',
    'furnishing',
    'final-check',
    'pendiente-suministros',
    'cleaning',
    'furnishing-cleaning',
    'reno-fixes',
    'done',
    '(null)',
  ];
  phasesOrder.forEach((phase) => {
    const count = byPhase[phase] ?? 0;
    if (count > 0 || phase === 'pendiente-suministros' || phase === 'initial-check') {
      console.log(`  ${phase}: ${count}`);
    }
  });
  Object.keys(byPhase)
    .filter((p) => !phasesOrder.includes(p))
    .forEach((phase) => console.log(`  ${phase}: ${byPhase[phase]}`));

  // 2. Cuántas tienen reno_phase null
  const { count: nullPhaseCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .is('reno_phase', null);
  console.log('\nPropiedades con reno_phase NULL (no las devuelve .neq(\'orphaned\')):', nullPhaseCount ?? 0);

  // 3. Límite del front: 2500
  if (total >= 2500) {
    console.log('\n⚠️ El front solo pide .range(0, 2499) = 2500 filas. Hay más en la DB, se pierden las más antiguas (por created_at desc).');
  }

  console.log('\n=== FIN DIAGNÓSTICO ===\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
