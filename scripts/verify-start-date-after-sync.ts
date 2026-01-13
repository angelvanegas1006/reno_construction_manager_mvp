#!/usr/bin/env tsx
/**
 * Script para verificar que start_date se sincronizó correctamente después del cron job
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function verifyStartDateAfterSync() {
  console.log('\n🔍 Verificando start_date en Supabase después de sincronización...\n');
  
  const supabase = createAdminClient();
  
  // Obtener todas las propiedades
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, address, start_date, "Unique ID From Engagements", reno_phase')
    .order('id');
  
  if (error) {
    console.error('❌ Error obteniendo propiedades:', error);
    process.exit(1);
  }
  
  const total = properties?.length || 0;
  const withStartDate = properties?.filter(p => p.start_date !== null && p.start_date !== undefined).length || 0;
  const withoutStartDate = total - withStartDate;
  
  console.log('📊 Estadísticas de start_date en Supabase:');
  console.log(`   Total propiedades: ${total}`);
  console.log(`   Con start_date: ${withStartDate} (${total > 0 ? ((withStartDate / total) * 100).toFixed(1) : 0}%)`);
  console.log(`   Sin start_date: ${withoutStartDate} (${total > 0 ? ((withoutStartDate / total) * 100).toFixed(1) : 0}%)\n`);
  
  // Agrupar por fase
  const byPhase = new Map<string, { total: number; withDate: number; withoutDate: number }>();
  
  properties?.forEach(prop => {
    const phase = prop.reno_phase || 'sin-fase';
    const current = byPhase.get(phase) || { total: 0, withDate: 0, withoutDate: 0 };
    current.total++;
    if (prop.start_date) {
      current.withDate++;
    } else {
      current.withoutDate++;
    }
    byPhase.set(phase, current);
  });
  
  console.log('📊 Por fase:');
  Array.from(byPhase.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([phase, stats]) => {
      const percentage = stats.total > 0 ? ((stats.withDate / stats.total) * 100).toFixed(1) : '0';
      console.log(`   ${phase}: ${stats.withDate}/${stats.total} (${percentage}%)`);
    });
  console.log('');
  
  if (withoutStartDate > 0) {
    console.log('⚠️  Propiedades sin start_date (primeras 20):');
    properties?.filter(p => !p.start_date).slice(0, 20).forEach((prop, i) => {
      console.log(`   ${i + 1}. ${prop.id} - ${prop.address || 'Sin dirección'} (${prop.reno_phase || 'sin-fase'})`);
    });
    if (withoutStartDate > 20) {
      console.log(`   ... y ${withoutStartDate - 20} más`);
    }
    console.log('');
  } else {
    console.log('✅ Todas las propiedades tienen start_date!\n');
  }
  
  // Verificar algunas propiedades específicas que deberían tener start_date
  console.log('🔍 Verificando propiedades en fase "reno-in-progress"...\n');
  const renoInProgress = properties?.filter(p => p.reno_phase === 'reno-in-progress') || [];
  const renoInProgressWithDate = renoInProgress.filter(p => p.start_date).length;
  
  console.log(`   Total en reno-in-progress: ${renoInProgress.length}`);
  console.log(`   Con start_date: ${renoInProgressWithDate}`);
  console.log(`   Sin start_date: ${renoInProgress.length - renoInProgressWithDate}\n`);
  
  if (renoInProgress.length > 0 && renoInProgressWithDate < renoInProgress.length) {
    console.log('   Propiedades en reno-in-progress sin start_date:');
    renoInProgress.filter(p => !p.start_date).slice(0, 10).forEach((prop, i) => {
      console.log(`   ${i + 1}. ${prop.id} - ${prop.address || 'Sin dirección'}`);
    });
    console.log('');
  }
}

verifyStartDateAfterSync().catch(console.error);

