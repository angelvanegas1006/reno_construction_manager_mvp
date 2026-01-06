/**
 * Script para verificar la discrepancia entre propiedades en Airtable y kanban
 * para la fase "upcoming reno"
 */

import { createAdminClient } from '../lib/supabase/admin';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkUpcomingDiscrepancy() {
  const supabase = createAdminClient();
  
  // Obtener todas las propiedades en fase upcoming-settlements
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, property_unique_id, "Set Up Status", reno_phase, airtable_property_id')
    .eq('reno_phase', 'upcoming-settlements')
    .order('property_unique_id');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\n📊 Total propiedades en fase 'upcoming-settlements': ${properties?.length || 0}\n`);
  
  // Agrupar por Set Up Status
  const byStatus: Record<string, any[]> = {};
  properties?.forEach(prop => {
    const status = prop['Set Up Status'] || 'SIN STATUS';
    if (!byStatus[status]) {
      byStatus[status] = [];
    }
    byStatus[status].push(prop);
  });
  
  console.log('📋 Agrupadas por "Set Up Status":\n');
  Object.entries(byStatus).forEach(([status, props]) => {
    console.log(`  "${status}": ${props.length} propiedades`);
    if (props.length <= 5) {
      props.forEach(p => console.log(`    - ${p.property_unique_id}`));
    } else {
      props.slice(0, 5).forEach(p => console.log(`    - ${p.property_unique_id}`));
      console.log(`    ... y ${props.length - 5} más`);
    }
  });
  
  console.log('\n📝 Lista completa de IDs:\n');
  properties?.forEach((prop, idx) => {
    console.log(`${idx + 1}. ${prop.property_unique_id} - Status: "${prop['Set Up Status'] || 'SIN STATUS'}"`);
  });
  
  // Verificar también si hay propiedades que deberían estar en otra fase
  console.log('\n🔍 Verificando propiedades con "Pending to visit" que NO están en upcoming-settlements:\n');
  const { data: pendingToVisit, error: error2 } = await supabase
    .from('properties')
    .select('id, property_unique_id, "Set Up Status", reno_phase')
    .ilike('Set Up Status', '%pending to visit%')
    .neq('reno_phase', 'upcoming-settlements');
  
  if (!error2 && pendingToVisit && pendingToVisit.length > 0) {
    console.log(`  Encontradas ${pendingToVisit.length} propiedades con "Pending to visit" en otras fases:`);
    pendingToVisit.forEach(p => {
      console.log(`    - ${p.property_unique_id}: fase "${p.reno_phase}"`);
    });
  } else {
    console.log('  ✅ Todas las propiedades con "Pending to visit" están en upcoming-settlements');
  }
}

checkUpcomingDiscrepancy().catch(console.error);
















