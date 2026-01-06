/**
 * Script para corregir una inspección que debería estar completada pero aparece como "En progreso"
 * 
 * Uso: npx tsx scripts/fix-completed-inspection.ts <propertyId>
 */

import { createAdminClient } from '@/lib/supabase/admin';

async function fixCompletedInspection(propertyId: string) {
  const supabase = createAdminClient();

  console.log(`🔍 Buscando inspecciones para la propiedad: ${propertyId}`);

  // Buscar todas las inspecciones de la propiedad
  let { data: inspections, error } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, inspection_status, completed_at, created_at')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  // Si hay error con inspection_type, intentar sin ese campo
  if (error && (error.code === '42883' || error.message?.includes('column'))) {
    console.warn('Campo inspection_type no existe, buscando sin filtro');
    const { data: allInspections, error: allError } = await supabase
      .from('property_inspections')
      .select('id, inspection_status, completed_at, created_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('❌ Error al buscar inspecciones:', allError);
      return;
    }
    inspections = allInspections;
  } else if (error) {
    console.error('❌ Error al buscar inspecciones:', error);
    return;
  }

  if (!inspections || inspections.length === 0) {
    console.log('⚠️ No se encontraron inspecciones para esta propiedad');
    return;
  }

  console.log(`\n📋 Encontradas ${inspections.length} inspección(es):`);
  inspections.forEach((insp, index) => {
    console.log(`\n${index + 1}. Inspección ID: ${insp.id}`);
    console.log(`   Tipo: ${(insp as any).inspection_type || 'N/A'}`);
    console.log(`   Estado: ${insp.inspection_status || 'N/A'}`);
    console.log(`   Completada en: ${insp.completed_at || 'No completada'}`);
    console.log(`   Creada en: ${insp.created_at}`);
  });

  // Buscar la inspección final (la más reciente o la que tenga inspection_type = 'final')
  const finalInspection = inspections.find(insp => 
    (insp as any).inspection_type === 'final'
  ) || inspections[0]; // Si no hay tipo, usar la más reciente

  if (!finalInspection) {
    console.log('⚠️ No se encontró inspección final');
    return;
  }

  console.log(`\n🎯 Inspección a corregir: ${finalInspection.id}`);

  // Verificar si ya está completada
  const isCompleted = finalInspection.inspection_status === 'completed' && finalInspection.completed_at !== null;

  if (isCompleted) {
    console.log('✅ La inspección ya está completada correctamente');
    return;
  }

  console.log('🔧 Corrigiendo inspección...');

  // Actualizar la inspección para marcarla como completada
  const { error: updateError } = await supabase
    .from('property_inspections')
    .update({
      inspection_status: 'completed',
      completed_at: finalInspection.completed_at || new Date().toISOString(),
    })
    .eq('id', finalInspection.id);

  if (updateError) {
    console.error('❌ Error al actualizar la inspección:', updateError);
    return;
  }

  console.log('✅ Inspección corregida exitosamente');
  console.log(`   Estado actualizado a: completed`);
  console.log(`   Fecha de completado: ${finalInspection.completed_at || new Date().toISOString()}`);

  // Verificar la actualización
  const { data: updatedInspection, error: verifyError } = await supabase
    .from('property_inspections')
    .select('id, inspection_status, completed_at')
    .eq('id', finalInspection.id)
    .single();

  if (verifyError) {
    console.warn('⚠️ No se pudo verificar la actualización:', verifyError);
  } else {
    console.log('\n✅ Verificación:');
    console.log(`   Estado: ${updatedInspection?.inspection_status}`);
    console.log(`   Completada en: ${updatedInspection?.completed_at}`);
  }
}

// Ejecutar el script
const propertyId = process.argv[2];

if (!propertyId) {
  console.error('❌ Por favor proporciona el ID de la propiedad');
  console.log('Uso: npx tsx scripts/fix-completed-inspection.ts <propertyId>');
  process.exit(1);
}

fixCompletedInspection(propertyId)
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  });
