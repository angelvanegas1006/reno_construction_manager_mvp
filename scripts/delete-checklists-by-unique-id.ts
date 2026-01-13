import { createAdminClient } from '@/lib/supabase/admin';
import { loadEnvConfig } from '@next/env';

// Cargar variables de entorno
const projectDir = process.cwd();
loadEnvConfig(projectDir);

/**
 * Script para eliminar los checklists inicial y final de una propiedad
 * identificada por su Unique ID From Engagements
 */
async function deleteChecklistsByUniqueId(uniqueId: string) {
  console.log(`🗑️  Eliminando checklists para Unique ID: ${uniqueId}\n`);

  const supabase = createAdminClient();

  try {
    // 1. Buscar la propiedad por Unique ID From Engagements
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, address, "Unique ID From Engagements"')
      .eq('Unique ID From Engagements', uniqueId)
      .single();

    if (propertyError || !property) {
      console.error('❌ Error: Propiedad no encontrada con Unique ID:', uniqueId);
      console.error('Error:', propertyError);
      return;
    }

    console.log('✅ Propiedad encontrada:');
    console.log(`   ID: ${property.id}`);
    console.log(`   Dirección: ${property.address || 'N/A'}`);
    console.log(`   Unique ID: ${property['Unique ID From Engagements']}\n`);

    // 2. Buscar todas las inspecciones (initial y final) de esta propiedad
    const { data: inspections, error: inspectionsError } = await supabase
      .from('property_inspections')
      .select('id, inspection_type, created_at')
      .eq('property_id', property.id);

    if (inspectionsError) {
      console.error('❌ Error buscando inspecciones:', inspectionsError);
      return;
    }

    if (!inspections || inspections.length === 0) {
      console.log('ℹ️  No se encontraron checklists (inspecciones) para esta propiedad.');
      return;
    }

    console.log(`📋 Checklists encontrados: ${inspections.length}`);
    inspections.forEach((inspection) => {
      console.log(`   - ${inspection.inspection_type} (ID: ${inspection.id}, Creado: ${inspection.created_at})`);
    });
    console.log('');

    // 3. Eliminar todas las inspecciones
    // Nota: Las zonas y elementos se eliminarán automáticamente por CASCADE
    const { error: deleteError } = await supabase
      .from('property_inspections')
      .delete()
      .eq('property_id', property.id);

    if (deleteError) {
      console.error('❌ Error eliminando checklists:', deleteError);
      return;
    }

    console.log('✅ Checklists eliminados exitosamente:');
    console.log(`   - ${inspections.length} checklist(s) eliminado(s)`);
    console.log(`   - Las zonas y elementos relacionados también fueron eliminados (CASCADE)\n`);

    // 4. Verificar que se eliminaron correctamente
    const { data: remainingInspections, error: verifyError } = await supabase
      .from('property_inspections')
      .select('id')
      .eq('property_id', property.id);

    if (verifyError) {
      console.warn('⚠️  Error al verificar eliminación:', verifyError);
    } else if (remainingInspections && remainingInspections.length > 0) {
      console.warn(`⚠️  Advertencia: Aún quedan ${remainingInspections.length} checklist(s) sin eliminar.`);
    } else {
      console.log('✅ Verificación: No quedan checklists para esta propiedad.\n');
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

// Ejecutar el script
const uniqueId = process.argv[2];

if (!uniqueId) {
  console.error('❌ Error: Debes proporcionar el Unique ID como argumento');
  console.log('Uso: npx tsx scripts/delete-checklists-by-unique-id.ts <Unique ID>');
  console.log('Ejemplo: npx tsx scripts/delete-checklists-by-unique-id.ts SP-TJP-JXR-005643');
  process.exit(1);
}

deleteChecklistsByUniqueId(uniqueId)
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

