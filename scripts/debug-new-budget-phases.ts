#!/usr/bin/env tsx
/**
 * Script para depurar las nuevas fases de budget y ver qué propiedades deberían estar ahí
 */

import { createAdminClient } from '../lib/supabase/admin';
import { mapSetUpStatusToKanbanPhase } from '../lib/supabase/kanban-mapping';

async function main() {
  console.log('🔍 Depurando nuevas fases de budget...\n');

  const supabase = createAdminClient();

  try {
    // Obtener todas las propiedades con Set Up Status relacionado con budget
    const { data, error } = await supabase
      .from('properties')
      .select('id, address, reno_phase, "Set Up Status"')
      .or('"Set Up Status".ilike.%budget%, "Set Up Status".ilike.%reno to start%, reno_phase.eq.reno-budget');

    if (error) {
      console.error('❌ Error al obtener propiedades:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No se encontraron propiedades relacionadas con budget.');
      return;
    }

    console.log(`📊 Total de propiedades encontradas: ${data.length}\n`);

    // Analizar cada propiedad
    const analysis = {
      'reno-budget-renovator': [] as any[],
      'reno-budget-client': [] as any[],
      'reno-budget-start': [] as any[],
      'reno-budget-legacy': [] as any[],
      'no-match': [] as any[],
    };

    data.forEach((prop: any) => {
      const setUpStatus = prop['Set Up Status'];
      const renoPhase = prop.reno_phase;
      
      // Mapear usando Set Up Status
      const mappedPhase = mapSetUpStatusToKanbanPhase(setUpStatus);
      
      const info = {
        id: prop.id,
        address: prop.address,
        reno_phase: renoPhase,
        setUpStatus: setUpStatus,
        mappedPhase: mappedPhase,
      };

      if (mappedPhase === 'reno-budget-renovator') {
        analysis['reno-budget-renovator'].push(info);
      } else if (mappedPhase === 'reno-budget-client') {
        analysis['reno-budget-client'].push(info);
      } else if (mappedPhase === 'reno-budget-start') {
        analysis['reno-budget-start'].push(info);
      } else if (mappedPhase === 'reno-budget' || renoPhase === 'reno-budget') {
        analysis['reno-budget-legacy'].push(info);
      } else {
        analysis['no-match'].push(info);
      }
    });

    // Mostrar resultados
    console.log('📋 Análisis de propiedades:\n');
    
    console.log(`✅ Pendiente Presupuesto (Renovador): ${analysis['reno-budget-renovator'].length}`);
    if (analysis['reno-budget-renovator'].length > 0) {
      analysis['reno-budget-renovator'].slice(0, 5).forEach((p: any) => {
        console.log(`   - ${p.id}: "${p.setUpStatus}" (reno_phase: ${p.reno_phase})`);
      });
      if (analysis['reno-budget-renovator'].length > 5) {
        console.log(`   ... y ${analysis['reno-budget-renovator'].length - 5} más`);
      }
    }

    console.log(`\n✅ Pendiente Presupuesto (Cliente): ${analysis['reno-budget-client'].length}`);
    if (analysis['reno-budget-client'].length > 0) {
      analysis['reno-budget-client'].slice(0, 5).forEach((p: any) => {
        console.log(`   - ${p.id}: "${p.setUpStatus}" (reno_phase: ${p.reno_phase})`);
      });
      if (analysis['reno-budget-client'].length > 5) {
        console.log(`   ... y ${analysis['reno-budget-client'].length - 5} más`);
      }
    }

    console.log(`\n✅ Obra a Empezar: ${analysis['reno-budget-start'].length}`);
    if (analysis['reno-budget-start'].length > 0) {
      analysis['reno-budget-start'].slice(0, 5).forEach((p: any) => {
        console.log(`   - ${p.id}: "${p.setUpStatus}" (reno_phase: ${p.reno_phase})`);
      });
      if (analysis['reno-budget-start'].length > 5) {
        console.log(`   ... y ${analysis['reno-budget-start'].length - 5} más`);
      }
    }

    console.log(`\n⚠️ Legacy reno-budget: ${analysis['reno-budget-legacy'].length}`);
    if (analysis['reno-budget-legacy'].length > 0) {
      console.log('   Estas propiedades tienen reno_phase="reno-budget" o Set Up Status que mapea a reno-budget');
      analysis['reno-budget-legacy'].slice(0, 5).forEach((p: any) => {
        console.log(`   - ${p.id}: "${p.setUpStatus}" (reno_phase: ${p.reno_phase})`);
      });
      if (analysis['reno-budget-legacy'].length > 5) {
        console.log(`   ... y ${analysis['reno-budget-legacy'].length - 5} más`);
      }
    }

    console.log(`\n❌ Sin coincidencia: ${analysis['no-match'].length}`);
    if (analysis['no-match'].length > 0) {
      console.log('   Valores únicos de Set Up Status sin coincidencia:');
      const uniqueStatuses = new Set(analysis['no-match'].map((p: any) => p.setUpStatus).filter(Boolean));
      Array.from(uniqueStatuses).forEach((status: any) => {
        console.log(`   - "${status}"`);
      });
    }

    console.log('\n💡 Nota: Si hay propiedades en "Legacy reno-budget", necesitamos actualizar su reno_phase en Supabase');
    console.log('   o cambiar la lógica para que también mapee desde Set Up Status cuando reno_phase es reno-budget.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();


