#!/usr/bin/env tsx
/**
 * Elimina Initial Check y Final Check de una propiedad.
 * CASCADE borra inspection_zones e inspection_elements.
 * Uso: npx tsx scripts/delete-initial-and-final-check-for-property.ts <propertyId|reference>
 * propertyId puede ser el id de Supabase (UUID) o una referencia como SP-NIU-O3C-005809 (property_unique_id o id).
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function resolvePropertyId(supabase: ReturnType<typeof createAdminClient>, ref: string): Promise<string> {
  const { data: byId } = await supabase.from('properties').select('id').eq('id', ref).maybeSingle();
  if (byId?.id) return byId.id;
  const { data: byUniqueId } = await supabase.from('properties').select('id').eq('property_unique_id', ref).maybeSingle();
  if (byUniqueId?.id) return byUniqueId.id;
  const { data: byName } = await supabase.from('properties').select('id').ilike('name', `%${ref}%`).limit(1).maybeSingle();
  if (byName?.id) return byName.id;
  return ref;
}

async function main() {
  const ref = process.argv[2];
  if (!ref) {
    console.error('Uso: npx tsx scripts/delete-initial-and-final-check-for-property.ts <propertyId|reference>');
    process.exit(1);
  }

  const supabase = createAdminClient();
  const propertyId = await resolvePropertyId(supabase, ref);
  if (ref !== propertyId) {
    console.log(`Resuelto "${ref}" -> property_id: ${propertyId}`);
  }

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
