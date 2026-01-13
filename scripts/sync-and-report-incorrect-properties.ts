#!/usr/bin/env tsx
/**
 * Script para sincronizar propiedades desde Airtable a Supabase (kanban)
 * y generar un informe de las propiedades que estaban incorrectamente en el kanban
 * 
 * Uso: npx tsx scripts/sync-and-report-incorrect-properties.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { createAdminClient } from '../lib/supabase/admin';
import { syncAllPhasesUnified } from '../lib/airtable/sync-unified';

interface PropertySnapshot {
  id: string;
  address: string | null;
  reno_phase: string | null;
  airtable_property_id: string | null;
  'Unique ID From Engagements': string | null;
  'Set Up Status': string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface IncorrectProperty {
  id: string;
  address: string | null;
  previousPhase: string | null;
  correctPhase: string | null;
  reason: string;
  details: string;
}

async function syncAndReport() {
  console.log('🔄 Sincronizando propiedades desde Airtable a Supabase (Kanban)\n');
  console.log('='.repeat(80));
  
  const supabase = createAdminClient();
  
  // 1. Tomar snapshot ANTES de la sincronización
  console.log('\n📸 Tomando snapshot de propiedades ANTES de la sincronización...\n');
  
  const { data: propertiesBefore, error: beforeError } = await supabase
    .from('properties')
    .select(`
      id,
      address,
      reno_phase,
      airtable_property_id,
      "Unique ID From Engagements",
      "Set Up Status",
      created_at,
      updated_at
    `)
    .order('address');
  
  if (beforeError) {
    console.error('❌ Error obteniendo propiedades antes de sincronización:', beforeError);
    process.exit(1);
  }
  
  const snapshotBefore = new Map<string, PropertySnapshot>();
  (propertiesBefore || []).forEach(prop => {
    snapshotBefore.set(prop.id, prop as PropertySnapshot);
  });
  
  console.log(`✅ Snapshot tomado: ${snapshotBefore.size} propiedades\n`);
  
  // 2. Ejecutar la sincronización
  console.log('🔄 Ejecutando sincronización desde Airtable...\n');
  console.log('='.repeat(80));
  
  let syncResult;
  try {
    syncResult = await syncAllPhasesUnified();
  } catch (error: any) {
    console.error('❌ Error durante la sincronización:', error);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Sincronización completada\n');
  console.log(`   Total procesadas: ${syncResult.totalProcessed}`);
  console.log(`   Creadas: ${syncResult.totalCreated}`);
  console.log(`   Actualizadas: ${syncResult.totalUpdated}`);
  console.log(`   Movidas a orphaned: ${syncResult.totalMovedToOrphaned}`);
  console.log(`   Errores: ${syncResult.totalErrors}\n`);
  
  // 3. Tomar snapshot DESPUÉS de la sincronización
  console.log('📸 Tomando snapshot de propiedades DESPUÉS de la sincronización...\n');
  
  const { data: propertiesAfter, error: afterError } = await supabase
    .from('properties')
    .select(`
      id,
      address,
      reno_phase,
      airtable_property_id,
      "Unique ID From Engagements",
      "Set Up Status",
      created_at,
      updated_at
    `)
    .order('address');
  
  if (afterError) {
    console.error('❌ Error obteniendo propiedades después de sincronización:', afterError);
    process.exit(1);
  }
  
  const snapshotAfter = new Map<string, PropertySnapshot>();
  (propertiesAfter || []).forEach(prop => {
    snapshotAfter.set(prop.id, prop as PropertySnapshot);
  });
  
  console.log(`✅ Snapshot tomado: ${snapshotAfter.size} propiedades\n`);
  
  // 4. Comparar y identificar propiedades incorrectas
  console.log('🔍 Analizando propiedades que estaban incorrectamente en el kanban...\n');
  console.log('='.repeat(80));
  
  const incorrectProperties: IncorrectProperty[] = [];
  
  // Propiedades que cambiaron de fase
  for (const [id, propBefore] of snapshotBefore.entries()) {
    const propAfter = snapshotAfter.get(id);
    
    if (!propAfter) {
      // Propiedad eliminada (no debería pasar normalmente)
      incorrectProperties.push({
        id,
        address: propBefore.address,
        previousPhase: propBefore.reno_phase,
        correctPhase: null,
        reason: 'ELIMINADA',
        details: 'La propiedad fue eliminada durante la sincronización',
      });
      continue;
    }
    
    // Si cambió de fase, estaba incorrecta
    if (propBefore.reno_phase !== propAfter.reno_phase) {
      incorrectProperties.push({
        id,
        address: propBefore.address,
        previousPhase: propBefore.reno_phase,
        correctPhase: propAfter.reno_phase,
        reason: 'FASE_INCORRECTA',
        details: `Estaba en fase "${propBefore.reno_phase}" pero debería estar en "${propAfter.reno_phase}"`,
      });
    }
    
    // Si estaba en "orphaned" y ahora tiene una fase válida, estaba incorrecta
    if (propBefore.reno_phase === 'orphaned' && propAfter.reno_phase !== 'orphaned') {
      incorrectProperties.push({
        id,
        address: propBefore.address,
        previousPhase: 'orphaned',
        correctPhase: propAfter.reno_phase,
        reason: 'ORPHANED_INCORRECTO',
        details: `Estaba marcada como "orphaned" pero debería estar en "${propAfter.reno_phase}"`,
      });
    }
  }
  
  // Propiedades nuevas que fueron creadas (no estaban antes)
  for (const [id, propAfter] of snapshotAfter.entries()) {
    if (!snapshotBefore.has(id)) {
      incorrectProperties.push({
        id,
        address: propAfter.address,
        previousPhase: null,
        correctPhase: propAfter.reno_phase,
        reason: 'FALTABA_EN_KANBAN',
        details: `No estaba en el kanban pero debería estar en fase "${propAfter.reno_phase}"`,
      });
    }
  }
  
  // 5. Agrupar por tipo de error
  const byReason = new Map<string, IncorrectProperty[]>();
  incorrectProperties.forEach(prop => {
    const list = byReason.get(prop.reason) || [];
    list.push(prop);
    byReason.set(prop.reason, list);
  });
  
  // 6. Generar informe
  console.log('\n📊 INFORME DE PROPIEDADES INCORRECTAS EN EL KANBAN\n');
  console.log('='.repeat(80));
  console.log(`\n📋 Total de propiedades incorrectas: ${incorrectProperties.length}\n`);
  
  // Estadísticas por tipo
  console.log('📊 DESGLOSE POR TIPO DE ERROR:\n');
  byReason.forEach((props, reason) => {
    console.log(`   ${reason}: ${props.length} propiedades`);
  });
  
  // Detalles por tipo
  console.log('\n' + '='.repeat(80));
  console.log('\n📋 DETALLES POR TIPO DE ERROR:\n');
  
  // FASE_INCORRECTA
  const faseIncorrecta = byReason.get('FASE_INCORRECTA') || [];
  if (faseIncorrecta.length > 0) {
    console.log(`\n❌ FASE INCORRECTA (${faseIncorrecta.length} propiedades):\n`);
    faseIncorrecta.slice(0, 20).forEach((prop, idx) => {
      console.log(`   ${idx + 1}. ${prop.address || prop.id}`);
      console.log(`      ID: ${prop.id}`);
      console.log(`      Fase anterior: ${prop.previousPhase || 'N/A'}`);
      console.log(`      Fase correcta: ${prop.correctPhase || 'N/A'}`);
      console.log('');
    });
    if (faseIncorrecta.length > 20) {
      console.log(`   ... y ${faseIncorrecta.length - 20} más\n`);
    }
  }
  
  // ORPHANED_INCORRECTO
  const orphanedIncorrecto = byReason.get('ORPHANED_INCORRECTO') || [];
  if (orphanedIncorrecto.length > 0) {
    console.log(`\n⚠️  ORPHANED INCORRECTO (${orphanedIncorrecto.length} propiedades):\n`);
    orphanedIncorrecto.slice(0, 20).forEach((prop, idx) => {
      console.log(`   ${idx + 1}. ${prop.address || prop.id}`);
      console.log(`      ID: ${prop.id}`);
      console.log(`      Fase correcta: ${prop.correctPhase || 'N/A'}`);
      console.log('');
    });
    if (orphanedIncorrecto.length > 20) {
      console.log(`   ... y ${orphanedIncorrecto.length - 20} más\n`);
    }
  }
  
  // FALTABA_EN_KANBAN
  const faltabaEnKanban = byReason.get('FALTABA_EN_KANBAN') || [];
  if (faltabaEnKanban.length > 0) {
    console.log(`\n➕ FALTABAN EN EL KANBAN (${faltabaEnKanban.length} propiedades):\n`);
    faltabaEnKanban.slice(0, 20).forEach((prop, idx) => {
      console.log(`   ${idx + 1}. ${prop.address || prop.id}`);
      console.log(`      ID: ${prop.id}`);
      console.log(`      Fase asignada: ${prop.correctPhase || 'N/A'}`);
      console.log('');
    });
    if (faltabaEnKanban.length > 20) {
      console.log(`   ... y ${faltabaEnKanban.length - 20} más\n`);
    }
  }
  
  // ELIMINADA
  const eliminadas = byReason.get('ELIMINADA') || [];
  if (eliminadas.length > 0) {
    console.log(`\n🗑️  ELIMINADAS (${eliminadas.length} propiedades):\n`);
    eliminadas.forEach((prop, idx) => {
      console.log(`   ${idx + 1}. ${prop.address || prop.id}`);
      console.log(`      ID: ${prop.id}`);
      console.log(`      Fase anterior: ${prop.previousPhase || 'N/A'}`);
      console.log('');
    });
  }
  
  // Resumen final
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RESUMEN FINAL:\n');
  console.log(`   ✅ Propiedades corregidas: ${incorrectProperties.length}`);
  console.log(`      - Fase incorrecta: ${faseIncorrecta.length}`);
  console.log(`      - Orphaned incorrecto: ${orphanedIncorrecto.length}`);
  console.log(`      - Faltaban en kanban: ${faltabaEnKanban.length}`);
  if (eliminadas.length > 0) {
    console.log(`      - Eliminadas: ${eliminadas.length}`);
  }
  console.log(`\n   📋 Total propiedades en kanban ahora: ${snapshotAfter.size}`);
  console.log(`   📋 Total propiedades antes: ${snapshotBefore.size}`);
  console.log(`   📈 Diferencia: ${snapshotAfter.size - snapshotBefore.size}\n`);
  
  console.log('✅ Informe completado\n');
}

syncAndReport()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
