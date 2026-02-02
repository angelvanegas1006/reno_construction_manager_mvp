/**
 * Elimina solo el Initial Check de una propiedad (deja el Final si existe).
 * Uso: npx tsx scripts/delete-initial-check-for-property.ts <id o Unique ID>
 * Ejemplo: npx tsx scripts/delete-initial-check-for-property.ts SP-NIU-O3C-005809
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function deleteInitialCheck(identifier: string) {
  const supabase = createAdminClient();

  console.log(`\n🗑️  Buscando propiedad "${identifier}" para eliminar solo el Initial Check...\n`);

  // 1. Buscar propiedad por id o por Unique ID From Engagements
  let property: { id: string; address: string | null; 'Unique ID From Engagements'?: string } | null = null;

  const { data: byId, error: errId } = await supabase
    .from('properties')
    .select('id, address, "Unique ID From Engagements"')
    .eq('id', identifier)
    .maybeSingle();

  if (!errId && byId) {
    property = byId as any;
  }

  if (!property) {
    const { data: byUniqueId, error: errUnique } = await supabase
      .from('properties')
      .select('id, address, "Unique ID From Engagements"')
      .eq('Unique ID From Engagements', identifier)
      .maybeSingle();

    if (!errUnique && byUniqueId) {
      property = byUniqueId as any;
    }
  }

  if (!property) {
    console.error('❌ No se encontró ninguna propiedad con id ni Unique ID:', identifier);
    process.exit(1);
  }

  console.log('✅ Propiedad encontrada:');
  console.log(`   ID: ${property.id}`);
  console.log(`   Dirección: ${property.address || 'N/A'}`);
  console.log(`   Unique ID: ${property['Unique ID From Engagements'] ?? 'N/A'}\n`);

  // 2. Listar inspecciones tipo initial
  const { data: initialInspections, error: listErr } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, created_at')
    .eq('property_id', property.id)
    .eq('inspection_type', 'initial');

  if (listErr) {
    console.error('❌ Error listando inspecciones:', listErr);
    process.exit(1);
  }

  if (!initialInspections || initialInspections.length === 0) {
    console.log('ℹ️  No hay Initial Check para esta propiedad. Nada que borrar.');
    process.exit(0);
  }

  console.log(`📋 Initial Check(s) encontrado(s): ${initialInspections.length}`);
  initialInspections.forEach((i) => console.log(`   - ${i.id} (${i.created_at})`));
  console.log('');

  // 3. Borrar solo las inspecciones tipo initial (CASCADE borra zones y elements)
  const { error: deleteErr } = await supabase
    .from('property_inspections')
    .delete()
    .eq('property_id', property.id)
    .eq('inspection_type', 'initial');

  if (deleteErr) {
    console.error('❌ Error eliminando Initial Check:', deleteErr);
    process.exit(1);
  }

  console.log('✅ Initial Check eliminado correctamente. Puedes hacer otro cuando quieras.\n');
}

const id = process.argv[2];
if (!id) {
  console.error('Uso: npx tsx scripts/delete-initial-check-for-property.ts <id o Unique ID>');
  console.error('Ejemplo: npx tsx scripts/delete-initial-check-for-property.ts SP-NIU-O3C-005809');
  process.exit(1);
}

deleteInitialCheck(id).then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
