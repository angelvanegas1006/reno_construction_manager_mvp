/**
 * Script para corregir las fases de presupuesto según su Set Up Status
 */

import { createAdminClient } from '../lib/supabase/admin';
import { loadEnvConfig } from '@next/env';
import { mapSetUpStatusToKanbanPhase } from '../lib/supabase/kanban-mapping';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function fixBudgetPhases() {
  const supabase = createAdminClient();
  
  console.log('🔧 Corrigiendo fases de presupuesto según Set Up Status...\n');
  
  // Obtener todas las propiedades con reno_phase = "reno-budget"
  const { data: legacyProperties, error } = await supabase
    .from('properties')
    .select('id, property_unique_id, "Set Up Status", reno_phase')
    .eq('reno_phase', 'reno-budget')
    .limit(200);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`📊 Encontradas ${legacyProperties?.length || 0} propiedades en fase legacy 'reno-budget'\n`);
  
  const updates: Array<{ id: string; property_unique_id: string; oldPhase: string; newPhase: string; status: string }> = [];
  
  legacyProperties?.forEach(prop => {
    const setUpStatus = prop['Set Up Status'];
    if (!setUpStatus) return;
    
    const mappedPhase = mapSetUpStatusToKanbanPhase(setUpStatus);
    
    // Solo actualizar si el mapeo indica una de las nuevas fases de presupuesto
    if (mappedPhase && ['reno-budget-renovator', 'reno-budget-client', 'reno-budget-start'].includes(mappedPhase)) {
      updates.push({
        id: prop.id,
        property_unique_id: prop.property_unique_id,
        oldPhase: prop.reno_phase || 'null',
        newPhase: mappedPhase,
        status: setUpStatus
      });
    }
  });
  
  console.log(`📋 Propiedades a actualizar: ${updates.length}\n`);
  
  if (updates.length === 0) {
    console.log('✅ No hay propiedades que necesiten actualización');
    return;
  }
  
  // Agrupar por fase
  const byPhase: Record<string, typeof updates> = {};
  updates.forEach(u => {
    if (!byPhase[u.newPhase]) {
      byPhase[u.newPhase] = [];
    }
    byPhase[u.newPhase].push(u);
  });
  
  Object.entries(byPhase).forEach(([phase, props]) => {
    console.log(`\n📋 ${phase}: ${props.length} propiedades`);
    props.forEach(p => {
      console.log(`  - ${p.property_unique_id} - Status: "${p.status}"`);
    });
  });
  
  // Actualizar propiedades
  console.log('\n🔄 Actualizando propiedades...\n');
  
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('properties')
      .update({
        reno_phase: update.newPhase,
        updated_at: new Date().toISOString()
      })
      .eq('id', update.id);
    
    if (updateError) {
      console.error(`❌ Error actualizando ${update.property_unique_id}:`, updateError);
      errorCount++;
    } else {
      console.log(`✅ ${update.property_unique_id}: ${update.oldPhase} → ${update.newPhase}`);
      updatedCount++;
    }
  }
  
  console.log(`\n✅ Actualización completada:`);
  console.log(`   - Actualizadas: ${updatedCount}`);
  console.log(`   - Errores: ${errorCount}`);
}

fixBudgetPhases().catch(console.error);


















