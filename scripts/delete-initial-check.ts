#!/usr/bin/env tsx
/**
 * Elimina solo el initial check de una propiedad (inspección tipo "initial").
 * Las zonas y elementos se eliminan en cascada.
 *
 * Uso: npx tsx scripts/delete-initial-check.ts <propertyId>
 * Ejemplo: npx tsx scripts/delete-initial-check.ts SP11021826
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  const propertyId = process.argv[2]?.trim();
  if (!propertyId) {
    console.error('Uso: npx tsx scripts/delete-initial-check.ts <propertyId>');
    process.exit(1);
  }

  const supabase = createAdminClient();

  const { data: inspections, error: fetchError } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, created_at')
    .eq('property_id', propertyId)
    .eq('inspection_type', 'initial');

  if (fetchError) {
    console.error('❌ Error buscando inspecciones:', fetchError.message);
    process.exit(1);
  }

  if (!inspections?.length) {
    console.log(`ℹ️  No hay initial check para la propiedad ${propertyId}.`);
    process.exit(0);
  }

  console.log(`🔍 Propiedad ${propertyId}: ${inspections.length} initial check(s) encontrado(s).`);
  inspections.forEach((i) => console.log(`   - ${i.id} (${i.created_at})`));

  const ids = inspections.map((i) => i.id);

  const { error: deleteError } = await supabase
    .from('property_inspections')
    .delete()
    .in('id', ids);

  if (deleteError) {
    console.error('❌ Error eliminando initial check:', deleteError.message);
    process.exit(1);
  }

  console.log('✅ Initial check eliminado correctamente.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
