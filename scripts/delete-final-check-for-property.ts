#!/usr/bin/env tsx
/**
 * Borra todos los datos de Final Check de una vivienda (por property_id).
 * Así la vivienda deja de mostrar "Ver informe generado" y vuelve a estado sin check final.
 *
 * Elimina:
 * - project_final_check_dwellings (vivienda dentro del check de proyecto)
 * - project_final_checks que queden sin viviendas
 * - property_inspections con inspection_type = 'final' (y en cascada zones/elements)
 * - Archivo en Storage: checklists/{propertyId}/final/checklist.html
 *
 * Uso: npm run delete-final-check -- SP-NIU-O3C-005809
 *   o:  npx tsx scripts/delete-final-check-for-property.ts SP-NIU-O3C-005809
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createAdminClient } from '../lib/supabase/admin';

const PROPERTY_ID = process.argv[2]?.trim();
const BUCKET = 'checklists';
const STORAGE_PATH = (id: string) => `${id}/final/checklist.html`;

async function main() {
  if (!PROPERTY_ID) {
    console.error('Uso: npm run delete-final-check -- <property_id>');
    console.error('Ejemplo: npm run delete-final-check -- SP-NIU-O3C-005809');
    process.exit(1);
  }

  const supabase = createAdminClient();
  console.log(`\n🗑️  Borrando Final Check de la vivienda: ${PROPERTY_ID}\n`);

  // 1) project_final_check_dwellings
  const { data: delDwellings, error: errDwellings } = await supabase
    .from('project_final_check_dwellings')
    .delete()
    .eq('property_id', PROPERTY_ID)
    .select('id');

  if (errDwellings) {
    console.error('❌ Error borrando project_final_check_dwellings:', errDwellings.message);
    process.exit(1);
  }
  console.log(`   ✅ project_final_check_dwellings: ${delDwellings?.length ?? 0} fila(s) eliminada(s).`);

  // 2) project_final_checks que ya no tienen viviendas
  const { data: remaining } = await supabase
    .from('project_final_check_dwellings')
    .select('project_final_check_id');
  const keptIds = [...new Set((remaining || []).map((r) => r.project_final_check_id))];

  const { data: allChecks } = await supabase.from('project_final_checks').select('id');
  const toDelete = (allChecks || []).filter((c) => !keptIds.includes(c.id)).map((c) => c.id);

  if (toDelete.length > 0) {
    const { error: errChecks } = await supabase
      .from('project_final_checks')
      .delete()
      .in('id', toDelete);
    if (errChecks) {
      console.error('❌ Error borrando project_final_checks:', errChecks.message);
      process.exit(1);
    }
    console.log(`   ✅ project_final_checks: ${toDelete.length} fila(s) eliminada(s).`);
  } else {
    console.log('   ✅ project_final_checks: ninguna fila huérfana.');
  }

  // 3) property_inspections (final) — en cascada se borran zones y elements
  const { data: delInspections, error: errInspections } = await supabase
    .from('property_inspections')
    .delete()
    .eq('property_id', PROPERTY_ID)
    .eq('inspection_type', 'final')
    .select('id');

  if (errInspections) {
    console.error('❌ Error borrando property_inspections (final):', errInspections.message);
    process.exit(1);
  }
  console.log(`   ✅ property_inspections (final): ${delInspections?.length ?? 0} fila(s) eliminada(s).`);

  // 4) Storage: checklist HTML del final
  const path = STORAGE_PATH(PROPERTY_ID);
  const { error: errStorage } = await supabase.storage.from(BUCKET).remove([path]);
  if (errStorage) {
    console.warn('   ⚠️ Storage (no crítico):', errStorage.message);
  } else {
    console.log(`   ✅ Storage: ${path} eliminado.`);
  }

  console.log('\n✅ Final Check de la vivienda borrado correctamente. Ya no debería mostrarse "Ver informe generado".\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
