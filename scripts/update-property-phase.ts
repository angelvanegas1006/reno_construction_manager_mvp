import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function updateProperty() {
  const supabase = createAdminClient();
  const propertyId = 'SP-RZ2-NQB-005312';
  
  console.log(`\n🔧 Actualizando propiedad ${propertyId}...\n`);
  
  const { error } = await supabase
    .from('properties')
    .update({ 
      reno_phase: 'reno-in-progress',
      'Set Up Status': 'Reno in progress',
      updated_at: new Date().toISOString()
    })
    .eq('id', propertyId);
  
  if (error) {
    console.error(`❌ Error: ${error.message}`);
  } else {
    console.log(`✅ Propiedad actualizada correctamente`);
    
    // Verificar estado final
    const { data } = await supabase
      .from('properties')
      .select('id, reno_phase, "Set Up Status"')
      .eq('id', propertyId)
      .single();
    
    if (data) {
      console.log(`\n📊 Estado final:`);
      console.log(`   reno_phase: ${data.reno_phase}`);
      console.log(`   Set Up Status: ${data['Set Up Status']}`);
    }
  }
}

updateProperty().catch(console.error);
