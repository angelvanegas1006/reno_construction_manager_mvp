#!/usr/bin/env tsx
/**
 * Sincroniza budget_pdf_url desde Airtable Transactions para TODAS las propiedades
 * en fase "reno-in-progress" (obras en progreso). Sirve para comprobar que no haya
 * ninguna obra sin presupuesto en Supabase cuando sí existe en Airtable.
 *
 * Uso:
 *   npx tsx scripts/sync-budget-reno-in-progress.ts
 *   npx tsx scripts/sync-budget-reno-in-progress.ts --limit 50   # solo las 50 más recientes (más rápido)
 *   npx tsx scripts/sync-budget-reno-in-progress.ts --limit=100
 */

import { loadEnvConfig } from '@next/env';
import { syncBudgetsForPhase } from '@/lib/airtable/sync-budget-from-transactions';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const PHASE = 'reno-in-progress';

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit'));
  let limit: number | undefined;
  if (limitArg) {
    if (limitArg.includes('=')) {
      limit = parseInt(limitArg.split('=')[1], 10);
    } else {
      const idx = process.argv.indexOf('--limit');
      const next = process.argv[idx + 1];
      limit = next && /^\d+$/.test(next) ? parseInt(next, 10) : undefined;
    }
  }

  console.log('🔧 Sincronizando presupuestos desde Airtable para todas las propiedades en obra en progreso...\n');

  const result = await syncBudgetsForPhase(PHASE, limit != null ? { limit } : undefined);

  console.log('\n' + '='.repeat(60));
  console.log('📊 Resumen - Fase: reno-in-progress (obras en progreso)');
  console.log('='.repeat(60));
  console.log(`  Total procesadas: ${result.synced + result.errors + result.skipped}`);
  console.log(`  ✅ Sincronizadas (presupuesto traído de Airtable): ${result.synced}`);
  console.log(`  📤 Extracción de categorías disparada (n8n): ${result.categoriesTriggered}`);
  console.log(`  ⏭️  Sin presupuesto en Airtable: ${result.skipped}`);
  console.log(`  ❌ Errores: ${result.errors}`);
  console.log('='.repeat(60));

  if (result.details.length > 0) {
    console.log('\nDetalle por propiedad:\n');
    result.details.forEach((line) => console.log('  ' + line));
  }

  if (result.errors > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
