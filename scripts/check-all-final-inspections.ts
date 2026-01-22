import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkAllFinalInspections() {
  const supabase = createAdminClient();
  
  console.log(`\n🔍 Verificando todas las inspecciones finales...\n`);
  
  // 1. Obtener todas las inspecciones finales completadas
  const { data: inspections } = await supabase
    .from('property_inspections')
    .select('id, property_id, inspection_type, inspection_status, created_at, completed_at')
    .eq('inspection_type', 'final')
    .eq('inspection_status', 'completed')
    .order('completed_at', { ascending: false });
  
  if (!inspections || inspections.length === 0) {
    console.log(`❌ No hay inspecciones finales completadas`);
    return;
  }
  
  console.log(`📋 Total inspecciones finales completadas: ${inspections.length}\n`);
  
  let totalWithZones = 0;
  let totalWithElements = 0;
  let totalWithPhotos = 0;
  let totalWithoutData = 0;
  
  const inspectionsWithoutData: Array<{ id: string; property_id: string; completed_at: string }> = [];
  
  for (const inspection of inspections) {
    // Verificar zonas
    const { data: zones } = await supabase
      .from('inspection_zones')
      .select('id')
      .eq('inspection_id', inspection.id);
    
    // Verificar elementos
    const { data: elements } = await supabase
      .from('inspection_elements')
      .select('id, image_urls')
      .in('zone_id', zones?.map(z => z.id) || []);
    
    const hasZones = zones && zones.length > 0;
    const hasElements = elements && elements.length > 0;
    const hasPhotos = elements?.some(el => el.image_urls && Array.isArray(el.image_urls) && el.image_urls.length > 0) || false;
    
    if (hasZones) totalWithZones++;
    if (hasElements) totalWithElements++;
    if (hasPhotos) totalWithPhotos++;
    
    if (!hasZones || !hasElements) {
      totalWithoutData++;
      inspectionsWithoutData.push({
        id: inspection.id,
        property_id: inspection.property_id,
        completed_at: inspection.completed_at || inspection.created_at,
      });
    }
  }
  
  console.log(`📊 Estadísticas:`);
  console.log(`   Con zonas: ${totalWithZones}/${inspections.length} (${Math.round(totalWithZones / inspections.length * 100)}%)`);
  console.log(`   Con elementos: ${totalWithElements}/${inspections.length} (${Math.round(totalWithElements / inspections.length * 100)}%)`);
  console.log(`   Con fotos: ${totalWithPhotos}/${inspections.length} (${Math.round(totalWithPhotos / inspections.length * 100)}%)`);
  console.log(`   Sin datos (zonas o elementos): ${totalWithoutData}/${inspections.length}`);
  
  if (inspectionsWithoutData.length > 0) {
    console.log(`\n⚠️ Inspecciones sin datos (${inspectionsWithoutData.length}):`);
    inspectionsWithoutData.slice(0, 10).forEach((insp, i) => {
      console.log(`   ${i + 1}. Property: ${insp.property_id} | Completed: ${insp.completed_at}`);
    });
    if (inspectionsWithoutData.length > 10) {
      console.log(`   ... y ${inspectionsWithoutData.length - 10} más`);
    }
  } else {
    console.log(`\n✅ Todas las inspecciones tienen datos guardados`);
  }
  
  console.log(`\n✅ Verificación completa`);
}

checkAllFinalInspections().catch(console.error);
