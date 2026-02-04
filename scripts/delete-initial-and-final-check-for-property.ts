#!/usr/bin/env tsx
/**
 * Elimina Initial Check y Final Check de una propiedad.
 * CASCADE borra inspection_zones e inspection_elements.
 * Uso: npx tsx scripts/delete-initial-and-final-check-for-property.ts <propertyId>
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  const propertyId = process.argv[2];
  if (!propertyId) {
    console.error('Uso: npx tsx scripts/delete-initial-and-final-check-for-property.ts <propertyId>');
    process.exit(1);
  }

  const supabase = createAdminClient();

  const { data: inspections, error: listErr } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, created_at')
    .eq('property_id', propertyId)
    .in('inspection_type', ['initial', 'final']);

  if (listErr) {
    console.error('Error listando inspecciones:', listErr.message);
    process.exit(1);
  }

  if (!inspections?.length) {
    console.log(`No hay initial/final check para ${propertyId}.`);
    process.exit(0);
  }

  console.log(`Encontradas ${inspections.length} inspección(es) para ${propertyId}:`);
  inspections.forEach((i) => console.log(`  - ${i.inspection_type} (${i.id})`));

  const { error: deleteErr } = await supabase
    .from('property_inspections')
    .delete()
    .eq('property_id', propertyId)
    .in('inspection_type', ['initial', 'final']);

  if (deleteErr) {
    console.error('Error eliminando:', deleteErr.message);
    process.exit(1);
  }

  console.log('Initial y Final check eliminados correctamente.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
