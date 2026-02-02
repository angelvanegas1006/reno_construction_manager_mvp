/**
 * Script para verificar el estado de una propiedad en final-check
 * Verifica inspecciones, fotos y carpeta de Drive
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkProperty(propertyId: string) {
  const supabase = createAdminClient();
  
  console.log(`\n🔍 Verificando propiedad: ${propertyId}\n`);
  
  // 1. Obtener propiedad
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();
  
  if (propError) {
    console.error(`❌ Error obteniendo propiedad: ${propError.message}`);
    return;
  }
  
  if (!property) {
    console.error(`❌ Propiedad no encontrada`);
    return;
  }
  
  console.log(`✅ Propiedad encontrada:`);
  console.log(`   ID: ${property.id}`);
  console.log(`   Address: ${property.address || 'N/A'}`);
  console.log(`   reno_phase: ${property.reno_phase || 'NULL'}`);
  console.log(`   Set Up Status: ${property['Set Up Status'] || 'NULL'}`);
  console.log(`   Drive Folder URL: ${property.drive_folder_url || 'NULL'}`);
  console.log(`   Drive Folder ID: ${property.drive_folder_id || 'NULL'}`);
  
  // 2. Buscar inspección final
  console.log(`\n🔍 Buscando inspección final...\n`);
  
  // Intentar con inspection_type primero
  let { data: finalInspection, error: inspectionError } = await supabase
    .from('property_inspections')
    .select('*')
    .eq('property_id', propertyId)
    .eq('inspection_type', 'final')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  // Si falla, buscar sin filtro de tipo
  if (inspectionError || !finalInspection) {
    const { data: allInspections } = await supabase
      .from('property_inspections')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });
    
    if (allInspections && allInspections.length > 0) {
      // Buscar la que tenga inspection_type = 'final' o la más reciente
      finalInspection = allInspections.find((insp: any) => 
        insp.inspection_type === 'final'
      ) || allInspections[0];
    }
  }
  
  if (!finalInspection) {
    console.log(`❌ No se encontró inspección final`);
  } else {
    console.log(`✅ Inspección final encontrada:`);
    console.log(`   ID: ${finalInspection.id}`);
    console.log(`   Type: ${finalInspection.inspection_type || 'NULL'}`);
    console.log(`   Status: ${finalInspection.inspection_status || 'NULL'}`);
    console.log(`   Created: ${finalInspection.created_at || 'NULL'}`);
    console.log(`   Completed: ${finalInspection.completed_at || 'NULL'}`);
    
    // 3. Buscar zonas de la inspección
    const { data: zones } = await supabase
      .from('inspection_zones')
      .select('*')
      .eq('inspection_id', finalInspection.id);
    
    console.log(`\n📁 Zonas encontradas: ${zones?.length || 0}`);
    if (zones && zones.length > 0) {
      zones.forEach((zone, i) => {
        console.log(`   ${i + 1}. ${zone.zone_type || 'N/A'} (ID: ${zone.id})`);
      });
    }
    
    // 4. Buscar elementos con fotos
    const { data: elements } = await supabase
      .from('inspection_elements')
      .select('*')
      .eq('inspection_id', finalInspection.id);
    
    console.log(`\n📸 Elementos encontrados: ${elements?.length || 0}`);
    
    if (elements && elements.length > 0) {
      const elementsWithPhotos = elements.filter((el: any) => 
        el.image_urls && Array.isArray(el.image_urls) && el.image_urls.length > 0
      );
      
      console.log(`   Elementos con fotos: ${elementsWithPhotos.length}`);
      
      elementsWithPhotos.forEach((el: any, i: number) => {
        console.log(`   ${i + 1}. ${el.element_name || 'N/A'}: ${el.image_urls.length} fotos`);
        console.log(`      Zone ID: ${el.zone_id || 'N/A'}`);
      });
      
      // Contar total de fotos
      const totalPhotos = elements.reduce((sum: number, el: any) => {
        return sum + (el.image_urls && Array.isArray(el.image_urls) ? el.image_urls.length : 0);
      }, 0);
      
      console.log(`\n   Total de fotos: ${totalPhotos}`);
    } else {
      console.log(`   ⚠️  No hay elementos con fotos`);
    }
  }
  
  // 5. Verificar carpeta de Drive
  console.log(`\n📂 Verificando carpeta de Drive...\n`);
  
  if (!property.drive_folder_url && !property.drive_folder_id) {
    console.log(`❌ No tiene carpeta de Drive configurada`);
    console.log(`   drive_folder_url: ${property.drive_folder_url || 'NULL'}`);
    console.log(`   drive_folder_id: ${property.drive_folder_id || 'NULL'}`);
  } else {
    console.log(`✅ Carpeta de Drive configurada:`);
    console.log(`   URL: ${property.drive_folder_url || 'NULL'}`);
    console.log(`   ID: ${property.drive_folder_id || 'NULL'}`);
  }
}

const propertyId = process.argv[2] || 'SP-OVN-OKN-005402';
checkProperty(propertyId).catch(console.error);
