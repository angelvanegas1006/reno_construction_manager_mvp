/**
 * Script para analizar qué campos se están sincronizando desde Airtable
 * y compararlos con los campos disponibles en Supabase
 */

import { createAdminClient } from '../lib/supabase/admin';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function analyzeSyncCoverage() {
  const supabase = createAdminClient();
  
  // Obtener una propiedad de ejemplo para ver qué campos tiene
  const { data: sampleProperty, error } = await supabase
    .from('properties')
    .select('*')
    .limit(1)
    .single();
  
  if (error || !sampleProperty) {
    console.error('Error obteniendo propiedad de ejemplo:', error);
    return;
  }
  
  console.log('\n📊 ANÁLISIS DE SINCRONIZACIÓN AIRTABLE → SUPABASE\n');
  console.log('='.repeat(80));
  
  // Campos que se están sincronizando según el código
  const syncedFields = [
    'id',
    'address',
    'type',
    'renovation_type',
    'notes',
    'Set Up Status',
    'keys_location',
    'stage',
    'Client email',
    'Unique ID From Engagements',
    'area_cluster',
    'property_unique_id',
    'Technical construction',
    'responsible_owner',
    'Hubspot ID',
    'next_reno_steps',
    'Renovator name',
    'Estimated Visit Date',
    'estimated_end_date',
    'start_date',
    'Days to Start Reno (Since RSD)',
    'Reno Duration',
    'Days to Property Ready',
    'days_to_visit',
    'reno_phase',
    'pics_urls',
    'airtable_property_id',
    'updated_at',
  ];
  
  // Campos disponibles en Supabase
  const supabaseFields = Object.keys(sampleProperty);
  
  console.log('\n✅ CAMPOS QUE SE ESTÁN SINCRONIZANDO:\n');
  syncedFields.forEach(field => {
    const exists = supabaseFields.includes(field);
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${field}`);
  });
  
  console.log('\n📋 CAMPOS EN SUPABASE QUE NO SE ESTÁN SINCRONIZANDO:\n');
  const notSynced = supabaseFields.filter(field => 
    !syncedFields.includes(field) && 
    !['created_at', 'updated_at', 'updated_by'].includes(field)
  );
  
  if (notSynced.length > 0) {
    notSynced.forEach(field => {
      console.log(`  ⚠️  ${field}`);
    });
  } else {
    console.log('  ✅ Todos los campos relevantes se están sincronizando');
  }
  
  // Verificar campos críticos
  console.log('\n🔍 VERIFICACIÓN DE CAMPOS CRÍTICOS:\n');
  const criticalFields = [
    'Days to Start Reno (Since RSD)',
    'Reno Duration',
    'Days to Property Ready',
    'days_to_visit',
    'Estimated Visit Date',
    'Renovator name',
    'Technical construction',
    'Set Up Status',
    'reno_phase',
  ];
  
  criticalFields.forEach(field => {
    const exists = supabaseFields.includes(field);
    const synced = syncedFields.includes(field);
    const status = exists && synced ? '✅' : '❌';
    console.log(`  ${status} ${field} - Existe: ${exists ? 'Sí' : 'No'}, Sincroniza: ${synced ? 'Sí' : 'No'}`);
  });
  
  // Verificar propiedades recientes para ver si los campos se están actualizando
  console.log('\n📊 VERIFICACIÓN DE ACTUALIZACIONES RECIENTES:\n');
  const { data: recentProps } = await supabase
    .from('properties')
    .select('id, property_unique_id, updated_at, "Days to Start Reno (Since RSD)", "Set Up Status", reno_phase')
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (recentProps && recentProps.length > 0) {
    console.log('✅ 10 propiedades más recientes actualizadas:\n');
    recentProps.forEach((prop, idx) => {
      const updatedDate = prop.updated_at ? new Date(prop.updated_at).toLocaleString('es-ES') : 'N/A';
      const daysToStart = prop['Days to Start Reno (Since RSD)'];
      console.log(`  ${idx + 1}. ${prop.property_unique_id || prop.id}`);
      console.log(`     Actualizado: ${updatedDate}`);
      console.log(`     Days to Start Reno: ${daysToStart !== null && daysToStart !== undefined ? daysToStart : 'NULL'}`);
      console.log(`     Set Up Status: ${prop['Set Up Status'] || 'NULL'}`);
      console.log(`     reno_phase: ${prop.reno_phase || 'NULL'}\n`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Análisis completado\n');
}

analyzeSyncCoverage().catch(console.error);
