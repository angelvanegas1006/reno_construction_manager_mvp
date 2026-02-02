import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkDetails() {
  const supabase = createAdminClient();
  const inspectionId = '6d020f73-c5e2-4b9e-aceb-fd062abbfaaa';
  
  console.log('\n🔍 Verificando elementos...\n');
  
  // Obtener todas las zonas primero
  const { data: zones, error: zonesError } = await supabase
    .from('inspection_zones')
    .select('id, zone_name, zone_type')
    .eq('inspection_id', inspectionId);
  
  if (zonesError) {
    console.error('❌ Error obteniendo zonas:', zonesError);
    return;
  }
  
  if (!zones || zones.length === 0) {
    console.log('❌ No se encontraron zonas');
    return;
  }
  
  console.log(`✅ Zonas encontradas: ${zones.length}\n`);
  
  // Obtener todos los elementos (sin status que no existe)
  const zoneIds = zones.map(z => z.id);
  const { data: elements, error: elementsError } = await supabase
    .from('inspection_elements')
    .select('id, element_name, condition, quantity, image_urls, video_urls, zone_id')
    .in('zone_id', zoneIds)
    .order('element_name')
    .limit(100);
  
  if (elementsError) {
    console.error('❌ Error obteniendo elementos:', elementsError);
    return;
  }
  
  console.log(`✅ Elementos encontrados: ${elements?.length || 0}\n`);
  
  if (!elements || elements.length === 0) {
    console.log('❌ No hay elementos guardados');
    return;
  }
  
  // Mostrar solo elementos con fotos primero
  const elementsWithPhotos = elements.filter((el: any) => 
    el.image_urls && Array.isArray(el.image_urls) && el.image_urls.length > 0
  );
  
  if (elementsWithPhotos.length > 0) {
    console.log(`📸 Elementos con fotos (${elementsWithPhotos.length}):\n`);
    elementsWithPhotos.forEach((el: any) => {
      const zone = zones.find(z => z.id === el.zone_id);
      console.log(`📋 ${el.element_name || 'N/A'}:`);
      console.log(`   Zona: ${zone?.zone_name || 'N/A'}`);
      console.log(`   📸 Fotos: ${el.image_urls.length}`);
      if (el.image_urls[0]) {
        console.log(`   URL: ${el.image_urls[0].substring(0, 80)}...`);
      }
      console.log('');
    });
  }
  
  // Mostrar todos los elementos
  console.log(`\n📋 Todos los elementos:\n`);
  elements.forEach((el: any) => {
    const zone = zones.find(z => z.id === el.zone_id);
    const photos = el.image_urls && Array.isArray(el.image_urls) ? el.image_urls.length : 0;
    console.log(`   - ${el.element_name || 'N/A'} (${zone?.zone_type || 'N/A'}): ${photos} fotos`);
    if (el.condition) console.log(`     Condition: ${el.condition}`);
    if (el.quantity !== null && el.quantity !== undefined) console.log(`     Quantity: ${el.quantity}`);
    if (photos > 0) console.log(`     ✅ Tiene ${photos} foto(s)`);
  });
}

checkDetails().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
