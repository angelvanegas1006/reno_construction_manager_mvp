/**
 * Verifica los valores del campo type en Supabase (properties)
 * para diagnosticar por qué no aparecen propiedades en el primer kanban
 * o al filtrar por Lot / Unit / Building.
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkPropertyTypes() {
  const supabase = createAdminClient();

  console.log('\n🔍 Verificación de tipos de propiedad (campo type) en Supabase\n');

  // 1. Total propiedades y no orphaned
  const { data: allRows, error: e1 } = await supabase
    .from('properties')
    .select('id, type, reno_phase');
  if (e1) {
    console.error('Error:', e1.message);
    return;
  }
  const total = allRows?.length ?? 0;
  const nonOrphaned = allRows?.filter((r: any) => r.reno_phase !== 'orphaned').length ?? 0;
  const orphaned = allRows?.filter((r: any) => r.reno_phase === 'orphaned').length ?? 0;

  console.log('📊 Resumen:');
  console.log(`   Total propiedades: ${total}`);
  console.log(`   No orphaned (visibles en kanban): ${nonOrphaned}`);
  console.log(`   Orphaned: ${orphaned}\n`);

  // 2. Valores distintos de type (con conteo)
  const typeCounts: Record<string, number> = {};
  (allRows || []).forEach((r: any) => {
    const t = r.type == null ? '(null)' : String(r.type).trim();
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  console.log('📋 Valores del campo type (y conteo):');
  sortedTypes.forEach(([value, count]) => {
    const label = value === '(null)' ? 'NULL (se mostrará como "Piso" en la app)' : value;
    console.log(`   "${value}" → ${count}`);
  });

  // 3. Cuántas coinciden con Unit / Building / Lot (normalizado: contiene la palabra)
  const normalize = (s: string) => (s ?? '').toLowerCase().trim();
  const matchUnit = (t: string) => /unit/.test(normalize(t));
  const matchBuilding = (t: string) => /building/.test(normalize(t));
  const matchLot = (t: string) => /lot/.test(normalize(t));
  const matchProject = (t: string) => /project/.test(normalize(t));
  const matchWip = (t: string) => /wip/.test(normalize(t));

  const nonOrphanedRows = (allRows || []).filter((r: any) => r.reno_phase !== 'orphaned');
  const withUnit = nonOrphanedRows.filter((r: any) => matchUnit(r.type));
  const withBuilding = nonOrphanedRows.filter((r: any) => matchBuilding(r.type));
  const withLot = nonOrphanedRows.filter((r: any) => matchLot(r.type));
  const withProject = nonOrphanedRows.filter((r: any) => matchProject(r.type));
  const withWip = nonOrphanedRows.filter((r: any) => matchWip(r.type));
  const notProjectOrWip = nonOrphanedRows.filter(
    (r: any) => !matchProject(r.type) && !matchWip(r.type)
  );

  console.log('\n📌 No orphaned - coincidencia con filtros del primer kanban:');
  console.log(`   Contienen "unit": ${withUnit.length}`);
  console.log(`   Contienen "building": ${withBuilding.length}`);
  console.log(`   Contienen "lot": ${withLot.length}`);
  console.log(`   Contienen "project": ${withProject.length}`);
  console.log(`   Contienen "wip": ${withWip.length}`);
  console.log(`   Ni project ni wip (deberían verse en primer kanban): ${notProjectOrWip.length}`);

  if (withLot.length === 0) {
    console.log('\n⚠️  No hay propiedades con type que contenga "lot".');
    console.log('   Para que aparezcan al filtrar por Lot: pon Type = "Lot" en Airtable y vuelve a sincronizar.');
  }
  if (notProjectOrWip.length === 0 && nonOrphaned > 0) {
    console.log('\n⚠️  Todas las propiedades no orphaned tienen type project/wip.');
    console.log('   Revisa en Airtable el campo Type (Unit, Building, Lot).');
  }

  console.log('\n✅ Fin\n');
}

checkPropertyTypes().catch((e) => {
  console.error(e);
  process.exit(1);
});
