import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkChecklistData(propertyId: string) {
  const supabase = createAdminClient();
  
  console.log(`\n🔍 Verificando datos del checklist para: ${propertyId}\n`);
  
  // 1. Buscar la inspección final
  const { data: inspection } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, inspection_status, created_at, completed_at')
    .eq('property_id', propertyId)
    .eq('inspection_type', 'final')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!inspection) {
    console.log(`❌ No se encontró inspección final para esta propiedad`);
    return;
  }
  
  console.log(`✅ Inspección final encontrada:`);
  console.log(`   ID: ${inspection.id}`);
  console.log(`   Status: ${inspection.inspection_status}`);
  console.log(`   Created: ${inspection.created_at}`);
  console.log(`   Completed: ${inspection.completed_at || 'No completada'}\n`);
  
  // 2. Buscar la zona "distribucion" (estado-general)
  const { data: zone } = await supabase
    .from('inspection_zones')
    .select('id, zone_name, zone_type')
    .eq('inspection_id', inspection.id)
    .eq('zone_type', 'distribucion')
    .single();
  
  if (!zone) {
    console.log(`❌ No se encontró zona "distribucion" (estado-general)`);
    return;
  }
  
  console.log(`✅ Zona encontrada:`);
  console.log(`   ID: ${zone.id}`);
  console.log(`   Nombre: ${zone.zone_name}`);
  console.log(`   Tipo: ${zone.zone_type}\n`);
  
  // 3. Buscar elementos de esta zona
  const { data: elements } = await supabase
    .from('inspection_elements')
    .select('id, element_name, condition, quantity, status, notes, image_urls, video_urls')
    .eq('zone_id', zone.id)
    .order('element_name');
  
  if (!elements || elements.length === 0) {
    console.log(`❌ No se encontraron elementos en esta zona`);
    return;
  }
  
  console.log(`✅ Elementos encontrados (${elements.length}):\n`);
  
  // Mostrar elementos relevantes
  elements.forEach((el: any) => {
    console.log(`📋 ${el.element_name || 'N/A'}:`);
    
    if (el.condition) {
      console.log(`   Condition: ${el.condition}`);
    }
    
    if (el.quantity !== null && el.quantity !== undefined) {
      console.log(`   Quantity: ${el.quantity}`);
    }
    
    if (el.status) {
      console.log(`   Status: ${el.status}`);
    }
    
    if (el.notes) {
      console.log(`   Notes: ${el.notes.substring(0, 100)}${el.notes.length > 100 ? '...' : ''}`);
    }
    
    if (el.image_urls && Array.isArray(el.image_urls) && el.image_urls.length > 0) {
      console.log(`   Photos: ${el.image_urls.length}`);
    }
    
    if (el.video_urls && Array.isArray(el.video_urls) && el.video_urls.length > 0) {
      console.log(`   Videos: ${el.video_urls.length}`);
    }
    
    console.log('');
  });
  
  // 4. Buscar específicamente "acabados" (question) y "radiadores" (climatization item)
  const acabados = elements.find((el: any) => 
    el.element_name === 'acabados' || 
    el.element_name?.toLowerCase() === 'finishes'
  );
  
  const radiadores = elements.find((el: any) => 
    el.element_name?.toLowerCase().startsWith('climatization-radiador') ||
    el.element_name?.toLowerCase().includes('radiator')
  );
  
  console.log(`\n📊 Verificación específica:\n`);
  
  if (acabados) {
    console.log(`✅ Acabados (Finishes):`);
    console.log(`   Condition: ${acabados.condition || 'No especificado'}`);
    console.log(`   Status: ${acabados.status || 'No especificado'}`);
  } else {
    console.log(`❌ Acabados (Finishes): No encontrado`);
  }
  
  console.log('');
  
  if (radiadores) {
    console.log(`✅ Radiadores (Radiators):`);
    console.log(`   Quantity: ${radiadores.quantity !== null && radiadores.quantity !== undefined ? radiadores.quantity : 'No especificado'}`);
    console.log(`   Condition: ${radiadores.condition || 'No especificado'}`);
  } else {
    console.log(`❌ Radiadores (Radiators): No encontrado`);
  }
  
  console.log(`\n✅ Verificación completa`);
}

const propertyId = process.argv[2] || 'SP-OVN-OKN-005402';
checkChecklistData(propertyId).catch(console.error);
