/**
 * Script para verificar si el campo "Days to Start Reno (Since RSD)" se está sincronizando correctamente
 */

import { createAdminClient } from '../lib/supabase/admin';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkDaysToStartField() {
  const supabase = createAdminClient();
  
  // Verificar propiedades en fases de presupuesto después del sync
  const { data: props } = await supabase
    .from('properties')
    .select('id, property_unique_id, "Days to Start Reno (Since RSD)", reno_phase, "Set Up Status"')
    .in('reno_phase', ['reno-budget-renovator', 'reno-budget-client', 'reno-budget-start', 'reno-budget'])
    .limit(50);
  
  console.log('\n📊 Verificando campo "Days to Start Reno (Since RSD)" después del sync:\n');
  
  let withValue = 0;
  let withoutValue = 0;
  
  props?.forEach((p) => {
    const days = p['Days to Start Reno (Since RSD)'];
    if (days !== null && days !== undefined) {
      withValue++;
      if (withValue <= 10) {
        console.log(`✅ ${p.property_unique_id} (${p.reno_phase}): ${days} días`);
      }
    } else {
      withoutValue++;
      if (withoutValue <= 10) {
        console.log(`❌ ${p.property_unique_id} (${p.reno_phase}): NULL - Status: "${p['Set Up Status'] || 'null'}"`);
      }
    }
  });
  
  console.log(`\n📊 Resumen:\n`);
  console.log(`   Con valor: ${withValue}`);
  console.log(`   Sin valor: ${withoutValue}`);
  console.log(`   Total: ${props?.length || 0}`);
  
  // Verificar también si hay propiedades con el campo en otras fases
  console.log('\n🔍 Verificando propiedades en otras fases:\n');
  const { data: otherProps } = await supabase
    .from('properties')
    .select('id, property_unique_id, "Days to Start Reno (Since RSD)", reno_phase')
    .not('Days to Start Reno (Since RSD)', 'is', null)
    .limit(10);
  
  if (otherProps && otherProps.length > 0) {
    console.log(`   Encontradas ${otherProps.length} propiedades con el campo en otras fases:`);
    otherProps.forEach(p => {
      console.log(`   - ${p.property_unique_id} (${p.reno_phase}): ${p['Days to Start Reno (Since RSD)']} días`);
    });
  } else {
    console.log('   ✅ No hay propiedades con el campo en otras fases');
  }
}

checkDaysToStartField().catch(console.error);




















