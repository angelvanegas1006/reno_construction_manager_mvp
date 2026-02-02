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
  
  // 2. Inspección final (sin filtro de tipo primero)
  const { data: inspections } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, inspection_status, created_at, completed_at')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log(`\n📋 Inspecciones: ${inspections?.length || 0}`);
  
  const finalInspection = inspections?.find((insp: any) => 
    insp.inspection_type === 'final'
  ) || inspections?.[0];
  
  if (!finalInspection) {
    console.log(`❌ No hay inspección final`);
    return;
  }
  
  console.log(`✅ Inspección final:`);
  console.log(`   ID: ${finalInspection.id}`);
  console.log(`   Type: ${finalInspection.inspection_type || 'NULL'}`);
  console.log(`   Status: ${finalInspection.inspection_status || 'NULL'}`);
  
  // 3. Elementos con fotos
  const { data: elements } = await supabase
    .from('inspection_elements')
    .select('id, element_name, image_urls, zone_id')
    .eq('inspection_id', finalInspection.id)
    .limit(100);
  
  const elementsWithPhotos = elements?.filter((el: any) => 
    el.image_urls && Array.isArray(el.image_urls) && el.image_urls.length > 0
  ) || [];
  
  const totalPhotos = elements?.reduce((sum: number, el: any) => {
    return sum + (el.image_urls && Array.isArray(el.image_urls) ? el.image_urls.length : 0);
  }, 0) || 0;
  
  console.log(`\n📸 Elementos: ${elements?.length || 0}`);
  console.log(`   Con fotos: ${elementsWithPhotos.length}`);
  console.log(`   Total fotos: ${totalPhotos}`);
  
  if (elementsWithPhotos.length > 0) {
    console.log(`\n   Primeros elementos con fotos:`);
    elementsWithPhotos.slice(0, 5).forEach((el: any, i: number) => {
      console.log(`   ${i + 1}. ${el.element_name || 'N/A'}: ${el.image_urls.length} fotos`);
    });
  }
}

const propertyId = process.argv[2] || 'SP-OVN-OKN-005402';
checkProperty(propertyId).catch(console.error);
