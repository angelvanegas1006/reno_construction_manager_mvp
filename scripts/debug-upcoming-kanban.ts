/**
 * Script para debuggear por qué hay más propiedades en upcoming-settlements
 * de las que debería haber según Airtable
 */

import { createAdminClient } from '../lib/supabase/admin';
import { loadEnvConfig } from '@next/env';
import { mapSetUpStatusToKanbanPhase } from '../lib/supabase/kanban-mapping';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function debugUpcomingKanban() {
  const supabase = createAdminClient();
  
  // Obtener TODAS las propiedades que podrían aparecer en upcoming-settlements
  const { data: allProperties, error } = await supabase
    .from('properties')
    .select('id, property_unique_id, "Set Up Status", reno_phase, airtable_property_id')
    .limit(200);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\n📊 Analizando ${allProperties?.length || 0} propiedades...\n`);
  
  // Simular la lógica del hook useSupabaseKanbanProperties
  const propertiesInUpcoming: any[] = [];
  
  const validPhases = [
    'upcoming-settlements',
    'initial-check',
    'reno-budget-renovator',
    'reno-budget-client',
    'reno-budget-start',
    'reno-budget',
    'reno-in-progress',
    'furnishing-cleaning',
    'final-check',
    'reno-fixes',
    'done',
  ];
  
  allProperties?.forEach(prop => {
    let kanbanPhase: string | null = null;
    
    // 1. Preferir reno_phase si está disponible y es válido
    if (prop.reno_phase) {
      if (validPhases.includes(prop.reno_phase)) {
        kanbanPhase = prop.reno_phase;
      } else {
        // Si reno_phase está establecido pero no es válido (ej: "orphaned"),
        // NO usar el mapeo de Set Up Status - ignorar la propiedad
        return; // Skip this property
      }
    } else {
      // 2. Si no hay reno_phase, usar el mapeo de Set Up Status
      kanbanPhase = mapSetUpStatusToKanbanPhase(prop['Set Up Status']);
    }
    
    // 3. Si mapea a upcoming-settlements, agregarlo a la lista
    if (kanbanPhase === 'upcoming-settlements') {
      propertiesInUpcoming.push({
        id: prop.id,
        property_unique_id: prop.property_unique_id,
        reno_phase: prop.reno_phase,
        'Set Up Status': prop['Set Up Status'],
        reason: prop.reno_phase ? 'Por reno_phase' : 'Por mapeo de Set Up Status'
      });
    }
  });
  
  console.log(`\n🔍 Propiedades que aparecerían en upcoming-settlements: ${propertiesInUpcoming.length}\n`);
  
  // Agrupar por razón
  const byReason: Record<string, any[]> = {};
  propertiesInUpcoming.forEach(p => {
    const reason = p.reason;
    if (!byReason[reason]) {
      byReason[reason] = [];
    }
    byReason[reason].push(p);
  });
  
  console.log('📋 Agrupadas por razón:\n');
  Object.entries(byReason).forEach(([reason, props]) => {
    console.log(`  ${reason}: ${props.length} propiedades`);
    if (props.length <= 10) {
      props.forEach(p => {
        console.log(`    - ${p.property_unique_id} (reno_phase: "${p.reno_phase || 'null'}", Set Up Status: "${p['Set Up Status'] || 'null'}")`);
      });
    } else {
      props.slice(0, 10).forEach(p => {
        console.log(`    - ${p.property_unique_id} (reno_phase: "${p.reno_phase || 'null'}", Set Up Status: "${p['Set Up Status'] || 'null'}")`);
      });
      console.log(`    ... y ${props.length - 10} más`);
    }
  });
  
  // Verificar propiedades que tienen reno_phase en otra fase pero Set Up Status que mapea a upcoming-settlements
  console.log('\n⚠️  Propiedades con reno_phase en otra fase pero Set Up Status que mapea a upcoming-settlements:\n');
  const conflicting: any[] = [];
  allProperties?.forEach(prop => {
    if (prop.reno_phase && prop.reno_phase !== 'upcoming-settlements') {
      const mappedPhase = mapSetUpStatusToKanbanPhase(prop['Set Up Status']);
      if (mappedPhase === 'upcoming-settlements') {
        conflicting.push({
          id: prop.id,
          property_unique_id: prop.property_unique_id,
          reno_phase: prop.reno_phase,
          'Set Up Status': prop['Set Up Status'],
          mapped_phase: mappedPhase
        });
      }
    }
  });
  
  if (conflicting.length > 0) {
    console.log(`  Encontradas ${conflicting.length} propiedades con conflicto:`);
    conflicting.forEach(p => {
      console.log(`    - ${p.property_unique_id}: reno_phase="${p.reno_phase}", Set Up Status="${p['Set Up Status']}" (mapea a "${p.mapped_phase}")`);
    });
  } else {
    console.log('  ✅ No hay conflictos');
  }
}

debugUpcomingKanban().catch(console.error);

