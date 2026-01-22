import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkProperty(propertyId: string) {
  const supabase = createAdminClient();
  
  console.log(`\n🔍 Verificando: ${propertyId}\n`);
  
  // 1. Propiedad
  const { data: property } = await supabase
    .from('properties')
    .select('id, address, reno_phase, "Set Up Status", drive_folder_url, drive_folder_id')
    .eq('id', propertyId)
    .single();
  
  if (!property) {
    console.log(`❌ Propiedad no encontrada`);
    return;
  }
  
  console.log(`✅ Propiedad:`);
  console.log(`   Phase: ${property.reno_phase || 'NULL'}`);
  console.log(`   Drive URL: ${property.drive_folder_url || 'NULL'}`);
  console.log(`   Drive ID: ${property.drive_folder_id || 'NULL'}`);
  
  // 2. Todas las inspecciones
  const { data: inspections } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, inspection_status, created_at, completed_at')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  
  console.log(`\n📋 Inspecciones totales: ${inspections?.length || 0}`);
  inspections?.forEach((insp: any, i: number) => {
    console.log(`   ${i + 1}. ${insp.inspection_type || 'NULL'} - ${insp.inspection_status || 'NULL'} (${insp.id})`);
  });
  
  const finalInspection = inspections?.find((insp: any) => 
    insp.inspection_type === 'final'
  );
  
  if (!finalInspection) {
    console.log(`\n❌ No hay inspección final`);
    return;
  }
  
  console.log(`\n✅ Inspección final:`);
  console.log(`   ID: ${finalInspection.id}`);
  console.log(`   Type: ${finalInspection.inspection_type || 'NULL'}`);
  console.log(`   Status: ${finalInspection.inspection_status || 'NULL'}`);
  console.log(`   Created: ${finalInspection.created_at}`);
  console.log(`   Completed: ${finalInspection.completed_at || 'NULL'}`);
  
  // 3. Zonas de la inspección final
  const { data: zones } = await supabase
    .from('inspection_zones')
    .select('id, zone_name, zone_type')
    .eq('inspection_id', finalInspection.id);
  
  console.log(`\n🏢 Zonas: ${zones?.length || 0}`);
  zones?.forEach((zone: any, i: number) => {
    console.log(`   ${i + 1}. ${zone.zone_name || 'N/A'} (${zone.zone_type || 'N/A'})`);
  });
  
  // 4. Elementos con fotos
  const { data: elements } = await supabase
    .from('inspection_elements')
    .select('id, element_name, image_urls, zone_id, status')
    .eq('inspection_id', finalInspection.id);
  
  console.log(`\n📸 Elementos totales: ${elements?.length || 0}`);
  
  const elementsWithPhotos = elements?.filter((el: any) => 
    el.image_urls && Array.isArray(el.image_urls) && el.image_urls.length > 0
  ) || [];
  
  const totalPhotos = elements?.reduce((sum: number, el: any) => {
    return sum + (el.image_urls && Array.isArray(el.image_urls) ? el.image_urls.length : 0);
  }, 0) || 0;
  
  console.log(`   Con fotos: ${elementsWithPhotos.length}`);
  console.log(`   Total fotos: ${totalPhotos}`);
  
  if (elements && elements.length > 0) {
    console.log(`\n   Primeros elementos:`);
    elements.slice(0, 10).forEach((el: any, i: number) => {
      const photoCount = el.image_urls && Array.isArray(el.image_urls) ? el.image_urls.length : 0;
      console.log(`   ${i + 1}. ${el.element_name || 'N/A'} - ${el.status || 'N/A'} - ${photoCount} fotos`);
    });
  }
  
  // 5. Verificar si hay PDF de la inspección final
  const { data: pdfData } = await supabase
    .from('property_inspections')
    .select('pdf_url')
    .eq('id', finalInspection.id)
    .single();
  
  console.log(`\n📄 PDF URL: ${pdfData?.pdf_url || 'NULL'}`);
  
  console.log(`\n✅ Diagnóstico completo`);
}

const propertyId = process.argv[2] || 'SP-OVN-OKN-005402';
checkProperty(propertyId).catch(console.error);
