import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function deleteFinalChecklist(propertyId: string) {
  const supabase = createAdminClient();
  console.log(`\nEliminando checklist final de: ${propertyId}\n`);

  let finalPropertyId: string | null = null;
  const { data: byId } = await supabase.from('properties').select('id').eq('id', propertyId).maybeSingle();
  if (byId?.id) finalPropertyId = byId.id;
  else {
    const { data: byAirtable } = await supabase.from('properties').select('id').eq('airtable_properties_record_id', propertyId).maybeSingle();
    if (byAirtable?.id) finalPropertyId = byAirtable.id;
  }
  if (!finalPropertyId) {
    console.log('Propiedad no encontrada');
    return;
  }

  const { data: inspections, error: inspError } = await supabase
    .from('property_inspections')
    .select('id')
    .eq('property_id', finalPropertyId)
    .eq('inspection_type', 'final');

  if (inspError || !inspections?.length) {
    console.log(inspError ? 'Error: ' + inspError.message : 'No existe checklist final');
    return;
  }

  for (const inspection of inspections) {
    const { data: zones } = await supabase.from('inspection_zones').select('id').eq('inspection_id', inspection.id);
    const zoneIds = zones?.map((z) => z.id) ?? [];

    if (zoneIds.length > 0) {
      await supabase.from('inspection_elements').delete().in('zone_id', zoneIds);
    }
    await supabase.from('inspection_zones').delete().eq('inspection_id', inspection.id);
    await supabase.from('property_inspections').delete().eq('id', inspection.id);
  }

  console.log(`Checklist final eliminado correctamente (${inspections.length} inspección/es)\n`);
}

const propertyId = process.argv[2] || '';
if (!propertyId) {
  console.log('Uso: npx tsx scripts/delete-final-checklist.ts <property_id>');
  process.exit(1);
}
deleteFinalChecklist(propertyId).catch(console.error);
