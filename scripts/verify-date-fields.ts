/**
 * Verifica en Supabase que los campos de fechas existen y tienen datos
 * Ejecutar después del sync: npx tsx scripts/verify-date-fields.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { createAdminClient } from '../lib/supabase/admin';

const dateColumns = [
  'budget_ph_ready_date',
  'renovator_budget_approval_date',
  'initial_visit_date',
  'est_reno_start_date',
  'start_date',
  'estimated_end_date',
  'reno_end_date',
] as const;

async function main() {
  const supabase = createAdminClient();
  const selectFields = ['id', 'address', ...dateColumns].join(', ');
  const { data: properties, error } = await supabase
    .from('properties')
    .select(selectFields)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  const total = properties?.length ?? 0;
  console.log('Verificación de campos de fecha (muestra:', total, 'propiedades)\n');

  const counts: Record<string, number> = {};
  dateColumns.forEach((col) => {
    counts[col] = properties?.filter((p: any) => p[col] != null && p[col] !== '').length ?? 0;
  });

  console.log('Conteo por campo:');
  dateColumns.forEach((col) => {
    console.log('  ', col + ':', counts[col], 'de', total);
  });

  const withAny = properties?.filter((p: any) =>
    dateColumns.some((col) => p[col] != null && p[col] !== '')
  ) ?? [];
  if (withAny.length > 0) {
    console.log('\nEjemplos (con al menos una fecha):');
    withAny.slice(0, 8).forEach((p: any) => {
      const vals = dateColumns.filter((c) => p[c]).map((c) => c + '=' + p[c]);
      console.log('  ', (p.address || p.id).toString().slice(0, 50) + ':', vals.join(', '));
    });
  }
  console.log('\nListo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
