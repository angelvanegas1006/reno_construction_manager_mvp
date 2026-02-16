import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function deleteInspectionsForProperty(identifier: string) {
  const supabase = createAdminClient();
  console.log('\n🔍 Buscando propiedad:', identifier, '\n');

  let propertyId: string | null = null;

  if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    const { data: byId } = await supabase
      .from('properties')
      .select('id, name, address, "Unique ID From Engagements"')
      .eq('id', identifier)
      .single();
    if (byId) propertyId = byId.id;
  }

  if (!propertyId) {
    const { data: byUniqueId } = await supabase
      .from('properties')
      .select('id, name, address, "Unique ID From Engagements"')
      .eq('Unique ID From Engagements', identifier)
      .single();
    if (byUniqueId) propertyId = byUniqueId.id;
  }

  if (!propertyId) {
    console.log('❌ Propiedad no encontrada');
    return;
  }

  console.log('✅ Propiedad encontrada');

  const { data: inspections, error: inspError } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, inspection_status, created_at')
    .eq('property_id', propertyId)
    .in('inspection_type', ['initial', 'final']);

  if (inspError) {
    console.error('❌ Error:', inspError);
    return;
  }

  if (!inspections || inspections.length === 0) {
    console.log('\n✅ No hay inspecciones initial/final para borrar.');
    return;
  }

  console.log('\n📋 Inspecciones a borrar:', inspections.length);

  for (const inspection of inspections) {
    const inspId = inspection.id;
    const inspType = inspection.inspection_type;

    const { data: zones } = await supabase
      .from('inspection_zones')
      .select('id')
      .eq('inspection_id', inspId);

    const zoneIds = zones?.map((z: { id: string }) => z.id) || [];

    if (zoneIds.length > 0) {
      await supabase.from('inspection_elements').delete().in('zone_id', zoneIds);
      console.log('   ✅ Elementos borrados');
    }

    await supabase.from('inspection_zones').delete().eq('inspection_id', inspId);
    console.log('   ✅ Zonas borradas');

    await supabase.from('property_inspections').delete().eq('id', inspId);
    console.log('   ✅ Inspección', inspType, 'borrada');
  }

  console.log('\n✅ Completado');
}

const identifier = process.argv[2];
if (!identifier) {
  console.error('Uso: npx tsx scripts/delete-inspections-for-property.ts <Unique-ID-o-property-id>');
  process.exit(1);
}

deleteInspectionsForProperty(identifier).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
