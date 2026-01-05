/**
 * Script para debuggear por qué las fases de presupuesto no muestran propiedades
 */

import { createAdminClient } from '../lib/supabase/admin';
import { loadEnvConfig } from '@next/env';
import { mapSetUpStatusToKanbanPhase } from '../lib/supabase/kanban-mapping';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function debugBudgetPhases() {
  const supabase = createAdminClient();
  
  // Obtener todas las propiedades
  const { data: allProperties, error } = await supabase
    .from('properties')
    .select('id, property_unique_id, "Set Up Status", reno_phase')
    .limit(200);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\n📊 Analizando ${allProperties?.length || 0} propiedades...\n`);
  
  // Buscar propiedades que deberían estar en las fases de presupuesto según su Set Up Status
  const budgetRenovator: any[] = [];
  const budgetClient: any[] = [];
  const budgetStart: any[] = [];
  const budgetLegacy: any[] = [];
  
  allProperties?.forEach(prop => {
    const setUpStatus = prop['Set Up Status'];
    if (!setUpStatus) return;
    
    const mappedPhase = mapSetUpStatusToKanbanPhase(setUpStatus);
    const currentPhase = prop.reno_phase;
    
    if (mappedPhase === 'reno-budget-renovator') {
      budgetRenovator.push({
        id: prop.id,
        property_unique_id: prop.property_unique_id,
        'Set Up Status': setUpStatus,
        reno_phase: currentPhase,
        mapped_phase: mappedPhase,
        matches: currentPhase === mappedPhase
      });
    } else if (mappedPhase === 'reno-budget-client') {
      budgetClient.push({
        id: prop.id,
        property_unique_id: prop.property_unique_id,
        'Set Up Status': setUpStatus,
        reno_phase: currentPhase,
        mapped_phase: mappedPhase,
        matches: currentPhase === mappedPhase
      });
    } else if (mappedPhase === 'reno-budget-start') {
      budgetStart.push({
        id: prop.id,
        property_unique_id: prop.property_unique_id,
        'Set Up Status': setUpStatus,
        reno_phase: currentPhase,
        mapped_phase: mappedPhase,
        matches: currentPhase === mappedPhase
      });
    } else if (mappedPhase === 'reno-budget') {
      budgetLegacy.push({
        id: prop.id,
        property_unique_id: prop.property_unique_id,
        'Set Up Status': setUpStatus,
        reno_phase: currentPhase,
        mapped_phase: mappedPhase,
        matches: currentPhase === mappedPhase
      });
    }
  });
  
  console.log('🔍 Propiedades que deberían estar en cada fase según su "Set Up Status":\n');
  
  console.log(`📋 reno-budget-renovator: ${budgetRenovator.length} propiedades`);
  if (budgetRenovator.length > 0) {
    budgetRenovator.forEach(p => {
      const status = p.matches ? '✅' : '❌';
      console.log(`  ${status} ${p.property_unique_id} - Status: "${p['Set Up Status']}" - reno_phase: "${p.reno_phase || 'null'}"`);
    });
  }
  
  console.log(`\n📋 reno-budget-client: ${budgetClient.length} propiedades`);
  if (budgetClient.length > 0) {
    budgetClient.forEach(p => {
      const status = p.matches ? '✅' : '❌';
      console.log(`  ${status} ${p.property_unique_id} - Status: "${p['Set Up Status']}" - reno_phase: "${p.reno_phase || 'null'}"`);
    });
  }
  
  console.log(`\n📋 reno-budget-start: ${budgetStart.length} propiedades`);
  if (budgetStart.length > 0) {
    budgetStart.forEach(p => {
      const status = p.matches ? '✅' : '❌';
      console.log(`  ${status} ${p.property_unique_id} - Status: "${p['Set Up Status']}" - reno_phase: "${p.reno_phase || 'null'}"`);
    });
  }
  
  console.log(`\n📋 reno-budget (legacy): ${budgetLegacy.length} propiedades`);
  if (budgetLegacy.length > 0) {
    budgetLegacy.slice(0, 10).forEach(p => {
      const status = p.matches ? '✅' : '❌';
      console.log(`  ${status} ${p.property_unique_id} - Status: "${p['Set Up Status']}" - reno_phase: "${p.reno_phase || 'null'}"`);
    });
    if (budgetLegacy.length > 10) {
      console.log(`  ... y ${budgetLegacy.length - 10} más`);
    }
  }
  
  // Verificar propiedades que tienen reno_phase en estas fases
  console.log('\n\n🔍 Propiedades que actualmente tienen reno_phase en estas fases:\n');
  
  const { data: inRenovator } = await supabase
    .from('properties')
    .select('id, property_unique_id, "Set Up Status", reno_phase')
    .eq('reno_phase', 'reno-budget-renovator')
    .limit(50);
  
  const { data: inClient } = await supabase
    .from('properties')
    .select('id, property_unique_id, "Set Up Status", reno_phase')
    .eq('reno_phase', 'reno-budget-client')
    .limit(50);
  
  const { data: inStart } = await supabase
    .from('properties')
    .select('id, property_unique_id, "Set Up Status", reno_phase')
    .eq('reno_phase', 'reno-budget-start')
    .limit(50);
  
  console.log(`📋 reno-budget-renovator: ${inRenovator?.length || 0} propiedades`);
  inRenovator?.forEach(p => {
    console.log(`  - ${p.property_unique_id} - Status: "${p['Set Up Status'] || 'null'}"`);
  });
  
  console.log(`\n📋 reno-budget-client: ${inClient?.length || 0} propiedades`);
  inClient?.forEach(p => {
    console.log(`  - ${p.property_unique_id} - Status: "${p['Set Up Status'] || 'null'}"`);
  });
  
  console.log(`\n📋 reno-budget-start: ${inStart?.length || 0} propiedades`);
  inStart?.forEach(p => {
    console.log(`  - ${p.property_unique_id} - Status: "${p['Set Up Status'] || 'null'}"`);
  });
}

debugBudgetPhases().catch(console.error);
















