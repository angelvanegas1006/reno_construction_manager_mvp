/**
 * Script para borrar el checklist final de una propiedad
 * Uso: npx tsx scripts/delete-final-checklist.ts SP-NIU-O3C-005809
 *
 * El identificador puede ser:
 * - UUID de la propiedad (id)
 * - Unique ID From Engagements (ej: SP-NIU-O3C-005809)
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function deleteFinalChecklist(propertyIdentifier: string) {
  const supabase = createAdminClient();

  console.log(`\n🔍 Buscando propiedad: ${propertyIdentifier}\n`);

  // 1. Buscar la propiedad (por id o por Unique ID From Engagements)
  let propertyId: string | null = null;

  const { data: byId } = await supabase
    .from('properties')
    .select('id, address, "Unique ID From Engagements"')
    .eq('id', propertyIdentifier)
    .single();

  if (byId) {
    propertyId = byId.id;
    console.log(`✅ Propiedad encontrada por ID:`);
    console.log(`   UUID: ${byId.id}`);
    console.log(`   Dirección: ${byId.address || 'N/A'}`);
    console.log(`   Unique ID: ${byId['Unique ID From Engagements'] || 'N/A'}\n`);
  } else {
    const { data: byUniqueId } = await supabase
      .from('properties')
      .select('id, address, "Unique ID From Engagements"')
      .eq('"Unique ID From Engagements"', propertyIdentifier)
      .single();

    if (byUniqueId) {
      propertyId = byUniqueId.id;
      console.log(`✅ Propiedad encontrada por Unique ID From Engagements:`);
      console.log(`   UUID: ${byUniqueId.id}`);
      console.log(`   Dirección: ${byUniqueId.address || 'N/A'}\n`);
    }
  }

  if (!propertyId) {
    console.log(`❌ Propiedad no encontrada con: ${propertyIdentifier}`);
    console.log(`   Prueba con el UUID o con el Unique ID From Engagements`);
    process.exit(1);
  }

  // 2. Buscar la inspección final
  const { data: inspection, error: inspError } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, inspection_status, created_at')
    .eq('property_id', propertyId)
    .eq('inspection_type', 'final')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (inspError || !inspection) {
    console.log(`❌ No se encontró inspección final (checklist final) para esta propiedad`);
    process.exit(1);
  }

  console.log(`📋 Inspección final encontrada:`);
  console.log(`   ID: ${inspection.id}`);
  console.log(`   Status: ${inspection.inspection_status || 'N/A'}`);
  console.log(`   Creada: ${inspection.created_at}\n`);

  // 3. Obtener zonas de esta inspección
  const { data: zones } = await supabase
    .from('inspection_zones')
    .select('id, zone_name, zone_type')
    .eq('inspection_id', inspection.id);

  if (zones && zones.length > 0) {
    console.log(`🗂️ Zonas a eliminar: ${zones.length}`);
    zones.forEach((z: any) => console.log(`   - ${z.zone_name} (${z.zone_type})`));

    // 4. Eliminar elementos de cada zona
    let totalElementsDeleted = 0;
    for (const zone of zones) {
      const { data: elements, error: elemError } = await supabase
        .from('inspection_elements')
        .delete()
        .eq('zone_id', zone.id)
        .select('id');

      if (!elemError && elements) {
        totalElementsDeleted += elements.length;
      }
    }
    console.log(`\n   ✅ Elementos eliminados: ${totalElementsDeleted}`);

    // 5. Eliminar zonas
    const { error: zonesError } = await supabase
      .from('inspection_zones')
      .delete()
      .eq('inspection_id', inspection.id);

    if (zonesError) {
      console.error(`❌ Error eliminando zonas:`, zonesError);
      process.exit(1);
    }
    console.log(`   ✅ Zonas eliminadas: ${zones.length}`);
  }

  // 6. Eliminar la inspección
  const { error: inspDeleteError } = await supabase
    .from('property_inspections')
    .delete()
    .eq('id', inspection.id);

  if (inspDeleteError) {
    console.error(`❌ Error eliminando inspección:`, inspDeleteError);
    process.exit(1);
  }

  console.log(`\n✅ Checklist final eliminado correctamente para la propiedad ${propertyIdentifier}\n`);
}

const propertyIdentifier = process.argv[2];
if (!propertyIdentifier) {
  console.error('Uso: npx tsx scripts/delete-final-checklist.ts <property-id-o-unique-id>');
  console.error('Ejemplo: npx tsx scripts/delete-final-checklist.ts SP-NIU-O3C-005809');
  process.exit(1);
}

deleteFinalChecklist(propertyIdentifier).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
