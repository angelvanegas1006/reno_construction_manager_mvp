#!/usr/bin/env tsx
/**
 * Script para contar propiedades sin presupuesto (budget) en fases de reno
 * 
 * Verifica propiedades en:
 * - reno-budget-renovator
 * - reno-budget-client
 * - reno-budget-start
 * - reno-budget (legacy)
 * - reno-in-progress
 * 
 * Ejecutar con: npx tsx scripts/check-properties-without-budget.ts
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

interface PropertyWithoutBudget {
  id: string;
  address: string | null;
  reno_phase: string | null;
  'Set Up Status': string | null;
  'Renovator name': string | null;
  budget_pdf_url: string | null;
  'Unique ID From Engagements': string | null;
}

const BUDGET_PHASES = [
  'reno-budget-renovator',
  'reno-budget-client',
  'reno-budget-start',
  'reno-budget', // Legacy
  'reno-in-progress',
];

async function checkPropertiesWithoutBudget() {
  console.log('🔍 Buscando propiedades sin presupuesto (budget) en fases de reno...\n');

  const supabase = createAdminClient();

  try {
    // 1. Obtener todas las propiedades en las fases de budget y reno-in-progress
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, address, reno_phase, "Set Up Status", "Renovator name", budget_pdf_url, "Unique ID From Engagements"')
      .in('reno_phase', BUDGET_PHASES)
      .order('reno_phase', { ascending: true })
      .order('address', { ascending: true });

    if (propertiesError) {
      console.error('❌ Error obteniendo propiedades:', propertiesError);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('✅ No hay propiedades en las fases de budget o reno-in-progress');
      return;
    }

    console.log(`📊 Total de propiedades en fases de budget/reno-in-progress: ${properties.length}\n`);

    // 2. Separar propiedades con y sin presupuesto
    const propertiesWithoutBudget: PropertyWithoutBudget[] = [];
    const propertiesWithBudget: PropertyWithoutBudget[] = [];
    const byPhase: Record<string, { with: PropertyWithoutBudget[]; without: PropertyWithoutBudget[] }> = {};

    for (const property of properties) {
      const hasBudget = property.budget_pdf_url && property.budget_pdf_url.trim().length > 0;
      
      const propData: PropertyWithoutBudget = {
        id: property.id,
        address: property.address,
        reno_phase: property.reno_phase,
        'Set Up Status': property['Set Up Status'],
        'Renovator name': property['Renovator name'],
        budget_pdf_url: property.budget_pdf_url,
        'Unique ID From Engagements': property['Unique ID From Engagements'],
      };

      const phase = property.reno_phase || 'unknown';
      if (!byPhase[phase]) {
        byPhase[phase] = { with: [], without: [] };
      }

      if (hasBudget) {
        propertiesWithBudget.push(propData);
        byPhase[phase].with.push(propData);
      } else {
        propertiesWithoutBudget.push(propData);
        byPhase[phase].without.push(propData);
      }
    }

    // 3. Verificar la propiedad específica reportada
    const reportedPropertyId = 'SP-KMX-CYX-001422';
    const reportedProperty = properties.find(p => p.id === reportedPropertyId);

    // 4. Generar informe
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 INFORME: Propiedades sin Presupuesto (Budget)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📊 RESUMEN GENERAL:`);
    console.log(`   Total propiedades verificadas: ${properties.length}`);
    console.log(`   ✅ Con presupuesto: ${propertiesWithBudget.length}`);
    console.log(`   ❌ Sin presupuesto: ${propertiesWithoutBudget.length}\n`);

    // Resumen por fase
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN POR FASE:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    BUDGET_PHASES.forEach(phase => {
      const phaseData = byPhase[phase] || { with: [], without: [] };
      const total = phaseData.with.length + phaseData.without.length;
      if (total > 0) {
        console.log(`📌 ${phase}:`);
        console.log(`   Total: ${total}`);
        console.log(`   ✅ Con presupuesto: ${phaseData.with.length}`);
        console.log(`   ❌ Sin presupuesto: ${phaseData.without.length}\n`);
      }
    });

    // Propiedad específica reportada
    if (reportedProperty) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`🔍 PROPIEDAD REPORTADA: ${reportedPropertyId}`);
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log(`   ID: ${reportedProperty.id}`);
      console.log(`   Dirección: ${reportedProperty.address || 'Sin dirección'}`);
      console.log(`   Fase: ${reportedProperty.reno_phase || 'N/A'}`);
      console.log(`   Set Up Status: ${reportedProperty['Set Up Status'] || 'N/A'}`);
      console.log(`   Renovador: ${reportedProperty['Renovator name'] || 'Sin renovador'}`);
      console.log(`   Presupuesto: ${reportedProperty.budget_pdf_url ? '✅ Tiene' : '❌ NO TIENE'}`);
      if (reportedProperty.budget_pdf_url) {
        console.log(`   URL: ${reportedProperty.budget_pdf_url}`);
      }
      console.log('');
    } else {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`⚠️  PROPIEDAD REPORTADA NO ENCONTRADA: ${reportedPropertyId}`);
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log('   La propiedad no está en ninguna de las fases verificadas.');
      console.log('   Verificando si existe en otras fases...\n');
      
      const { data: foundProperty } = await supabase
        .from('properties')
        .select('id, address, reno_phase, "Set Up Status", budget_pdf_url')
        .eq('id', reportedPropertyId)
        .single();
      
      if (foundProperty) {
        console.log(`   ✅ Propiedad encontrada:`);
        console.log(`      ID: ${foundProperty.id}`);
        console.log(`      Dirección: ${foundProperty.address || 'Sin dirección'}`);
        console.log(`      Fase actual: ${foundProperty.reno_phase || 'N/A'}`);
        console.log(`      Set Up Status: ${foundProperty['Set Up Status'] || 'N/A'}`);
        console.log(`      Presupuesto: ${foundProperty.budget_pdf_url ? '✅ Tiene' : '❌ NO TIENE'}`);
        if (foundProperty.budget_pdf_url) {
          console.log(`      URL: ${foundProperty.budget_pdf_url}`);
        }
      } else {
        console.log(`   ❌ La propiedad ${reportedPropertyId} no existe en la base de datos.`);
      }
      console.log('');
    }

    if (propertiesWithoutBudget.length === 0) {
      console.log('✅ ¡Excelente! Todas las propiedades tienen presupuesto.\n');
      return;
    }

    // Listado detallado de propiedades sin presupuesto
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`❌ PROPIEDADES SIN PRESUPUESTO (${propertiesWithoutBudget.length}):`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Agrupar por fase
    BUDGET_PHASES.forEach(phase => {
      const phaseData = byPhase[phase];
      if (phaseData && phaseData.without.length > 0) {
        console.log(`\n📌 ${phase} (${phaseData.without.length} sin presupuesto):`);
        phaseData.without.forEach((prop, index) => {
          console.log(`   ${index + 1}. ${prop.id} - ${prop.address || 'Sin dirección'}`);
          if (prop['Renovator name']) {
            console.log(`      Renovador: ${prop['Renovator name']}`);
          }
          if (prop['Set Up Status']) {
            console.log(`      Estado: ${prop['Set Up Status']}`);
          }
        });
      }
    });

    // Agrupar por renovador
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('👷 PROPIEDADES SIN PRESUPUESTO POR RENOVADOR:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const byRenovator: Record<string, PropertyWithoutBudget[]> = {};
    const withoutRenovator: PropertyWithoutBudget[] = [];

    propertiesWithoutBudget.forEach(prop => {
      const renovator = prop['Renovator name'] || 'Sin renovador';
      if (renovator === 'Sin renovador') {
        withoutRenovator.push(prop);
      } else {
        if (!byRenovator[renovator]) {
          byRenovator[renovator] = [];
        }
        byRenovator[renovator].push(prop);
      }
    });

    const renovators = Object.keys(byRenovator).sort();
    renovators.forEach(renovator => {
      const props = byRenovator[renovator];
      console.log(`\n👷 ${renovator} (${props.length} propiedades):`);
      props.forEach((prop, index) => {
        console.log(`   ${index + 1}. ${prop.id} - ${prop.address || 'Sin dirección'}`);
        console.log(`      Fase: ${prop.reno_phase || 'N/A'}`);
      });
    });

    if (withoutRenovator.length > 0) {
      console.log(`\n❓ Sin renovador asignado (${withoutRenovator.length} propiedades):`);
      withoutRenovator.forEach((prop, index) => {
        console.log(`   ${index + 1}. ${prop.id} - ${prop.address || 'Sin dirección'}`);
        console.log(`      Fase: ${prop.reno_phase || 'N/A'}`);
      });
    }

    // Tabla resumen
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 TABLA RESUMEN:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('ID\t\t\t\tFase\t\t\t\tDirección\t\t\t\tRenovador');
    console.log('─'.repeat(120));
    
    propertiesWithoutBudget.forEach(prop => {
      const address = (prop.address || 'Sin dirección').substring(0, 30).padEnd(30);
      const phase = (prop.reno_phase || 'N/A').substring(0, 25).padEnd(25);
      const renovator = (prop['Renovator name'] || 'Sin renovador').substring(0, 20).padEnd(20);
      console.log(`${prop.id}\t${phase}\t${address}\t${renovator}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Informe completado\n');

  } catch (error) {
    console.error('❌ Error generando informe:', error);
  }
}

// Ejecutar
checkPropertiesWithoutBudget()
  .then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });
