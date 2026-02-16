/**
 * Script para eliminar los checks inicial y final de una vivienda.
 * Uso: npx tsx scripts/delete-property-inspections.ts SP-NIU-O3C-005809
 *
 * Script para regenerar HTML: npx tsx scripts/regenerate-checklist-html.ts SP-NIU-O3C-005809 final
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function deletePropertyInspections(propertyIdentifier: string) {
  const supabase = createAdminClient();

  console.log(`\nEliminando checks inicial y final para: ${propertyIdentifier}\n`);

  const { data: byUniqueId } = await supabase
    .from('properties')
    .select('id, name, property_unique_id')
    .eq('property_unique_id', propertyIdentifier)
    .single();

  const { data: byId } = await supabase
    .from('properties')
    .select('id, name, property_unique_id')
    .eq('id', propertyIdentifier)
    .single();

  const property = byUniqueId ?? byId;
  if (!property) {
    console.log(`No se encontro la propiedad: ${propertyIdentifier}`);
    return;
  }

  const propertyId = property.id;
  console.log(`Propiedad encontrada: ${property.name || property.property_unique_id}\n`);

  const { data: inspections, error: inspError } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, inspection_status, created_at')
    .eq('property_id', propertyId)
    .in('inspection_type', ['initial', 'final']);

  if (inspError) {
    console.error('Error al buscar inspecciones:', inspError);
    return;
  }

  if (!inspections || inspections.length === 0) {
    console.log('No hay inspecciones inicial o final para esta propiedad.');
    return;
  }

  console.log(`Inspecciones a eliminar (${inspections.length}):`);
  inspections.forEach((i) => console.log(`  - ${i.inspection_type} (${i.id})`));
  console.log('');

  let totalElements = 0;
  let totalZones = 0;

  for (const inspection of inspections) {
    const { data: zones } = await supabase
      .from('inspection_zones')
      .select('id')
      .eq('inspection_id', inspection.id);

    if (zones && zones.length > 0) {
      for (const zone of zones) {
        const { data: elements } = await supabase
          .from('inspection_elements')
          .select('id')
          .eq('zone_id', zone.id);

        if (elements && elements.length > 0) {
          const { error: delEl } = await supabase
            .from('inspection_elements')
            .delete()
            .eq('zone_id', zone.id);

          if (!delEl) totalElements += elements.length;
          else console.error('Error eliminando elementos:', delEl);
        }

        const { error: delZone } = await supabase
          .from('inspection_zones')
          .delete()
          .eq('id', zone.id);

        if (!delZone) totalZones++;
        else console.error('Error eliminando zona:', delZone);
      }
    }

    const { error: delInsp } = await supabase
      .from('property_inspections')
      .delete()
      .eq('id', inspection.id);

    if (delInsp) {
      console.error('Error eliminando inspeccion:', delInsp);
    } else {
      console.log(`Eliminada inspeccion ${inspection.inspection_type}`);
    }
  }

  console.log(`\nCompletado: ${totalElements} elementos, ${totalZones} zonas, ${inspections.length} inspecciones eliminadas.\n`);
}

const propertyIdentifier = process.argv[2] || 'SP-NIU-O3C-005809';
deletePropertyInspections(propertyIdentifier).catch(console.error);
