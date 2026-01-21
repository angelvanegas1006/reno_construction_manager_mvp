/**
 * Script para verificar el estado de sincronización de una propiedad específica
 * y contar propiedades mal ubicadas o faltantes
 * 
 * Uso: npx tsx scripts/check-property-sync-status.ts [PROPERTY_ID]
 * Ejemplo: npx tsx scripts/check-property-sync-status.ts SP-RZ2-NQB005312
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function checkProperty(propertyId: string) {
  const supabase = createAdminClient();
  
  console.log(`\n🔍 Verificando propiedad: ${propertyId}\n`);
  
  // Buscar en Supabase
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('❌ NO encontrada en Supabase');
      console.log('\n💡 Esta propiedad necesita ser sincronizada desde Airtable.');
      console.log('   Ejecuta: npm run sync:property-by-id -- ' + propertyId);
    } else {
      console.error('❌ Error buscando en Supabase:', error);
    }
    return;
  }

  console.log('✅ Encontrada en Supabase:');
  console.log(`   ID: ${property.id}`);
  console.log(`   Address: ${property.address || 'N/A'}`);
  console.log(`   reno_phase: ${property.reno_phase || 'NULL'}`);
  console.log(`   Set Up Status: ${property['Set Up Status'] || 'NULL'}`);
  console.log(`   airtable_property_id: ${property.airtable_property_id || 'NULL'}`);
  
  // Verificar si debería estar en reno-in-progress
  const setUpStatus = property['Set Up Status'] || '';
  const shouldBeInRenoInProgress = 
    setUpStatus?.toLowerCase().includes('reno in progress') ||
    setUpStatus?.toLowerCase().includes('obras en proceso');
  
  console.log('\n📊 Análisis:');
  if (shouldBeInRenoInProgress && property.reno_phase !== 'reno-in-progress') {
    console.log('   ❌ MAL UBICADA: Set Up Status indica "Reno in progress" pero reno_phase es:', property.reno_phase || 'NULL');
    console.log('   💡 Ejecuta: npm run sync:reno-in-progress');
  } else if (property.reno_phase === 'reno-in-progress') {
    console.log('   ✅ Correctamente ubicada en reno-in-progress');
  } else {
    console.log(`   ℹ️  Fase actual: ${property.reno_phase || 'NULL'}`);
    console.log(`   Set Up Status: ${setUpStatus || 'NULL'}`);
  }
}

async function countMisplacedAndMissing() {
  const supabase = createAdminClient();
  
  console.log('\n📊 Analizando sincronización de propiedades...\n');
  
  // 1. Obtener todas las propiedades en Supabase
  console.log('1️⃣ Obteniendo todas las propiedades de Supabase...');
  const { data: allProperties, error: fetchError } = await supabase
    .from('properties')
    .select('id, reno_phase, "Set Up Status", address, airtable_property_id');
  
  if (fetchError) {
    console.error('❌ Error obteniendo propiedades:', fetchError);
    return;
  }
  
  console.log(`   ✅ Total propiedades en Supabase: ${allProperties?.length || 0}\n`);
  
  // 2. Analizar propiedades que deberían estar en reno-in-progress
  console.log('2️⃣ Analizando propiedades que deberían estar en reno-in-progress...\n');
  
  const misplaced: Array<{ id: string; address: string; setUpStatus: string; currentPhase: string }> = [];
  const inRenoInProgress: Array<{ id: string; address: string }> = [];
  const missingSetUpStatus: Array<{ id: string; address: string }> = [];
  
  allProperties?.forEach(prop => {
    const setUpStatus = prop['Set Up Status'] || '';
    const shouldBeInRenoInProgress = 
      setUpStatus?.toLowerCase().includes('reno in progress') ||
      setUpStatus?.toLowerCase().includes('obras en proceso');
    
    if (shouldBeInRenoInProgress) {
      if (prop.reno_phase === 'reno-in-progress') {
        inRenoInProgress.push({ id: prop.id, address: prop.address || 'N/A' });
      } else {
        misplaced.push({
          id: prop.id,
          address: prop.address || 'N/A',
          setUpStatus,
          currentPhase: prop.reno_phase || 'NULL',
        });
      }
    } else if (!setUpStatus) {
      missingSetUpStatus.push({ id: prop.id, address: prop.address || 'N/A' });
    }
  });
  
  // 3. Mostrar resultados
  console.log('📊 RESULTADOS:\n');
  console.log(`   ✅ Correctamente en reno-in-progress: ${inRenoInProgress.length}`);
  console.log(`   ❌ Mal ubicadas (Set Up Status = "Reno in progress" pero reno_phase ≠ "reno-in-progress"): ${misplaced.length}`);
  console.log(`   ⚠️  Sin Set Up Status: ${missingSetUpStatus.length}\n`);
  
  if (misplaced.length > 0) {
    console.log('📋 Propiedades mal ubicadas (primeras 20):');
    misplaced.slice(0, 20).forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.id} - ${item.address}`);
      console.log(`      Set Up Status: "${item.setUpStatus}"`);
      console.log(`      reno_phase actual: "${item.currentPhase}"`);
    });
    if (misplaced.length > 20) {
      console.log(`   ... y ${misplaced.length - 20} más\n`);
    } else {
      console.log('');
    }
  }
  
  // 4. Verificar propiedades sin airtable_property_id (posiblemente no migradas)
  console.log('3️⃣ Verificando propiedades sin airtable_property_id...\n');
  const withoutAirtableId = allProperties?.filter(p => !p.airtable_property_id) || [];
  console.log(`   ⚠️  Propiedades sin airtable_property_id: ${withoutAirtableId.length}`);
  if (withoutAirtableId.length > 0 && withoutAirtableId.length <= 10) {
    console.log('   IDs:', withoutAirtableId.map(p => p.id).join(', '));
  }
  console.log('');
  
  return {
    total: allProperties?.length || 0,
    correctlyPlaced: inRenoInProgress.length,
    misplaced: misplaced.length,
    missingSetUpStatus: missingSetUpStatus.length,
    withoutAirtableId: withoutAirtableId.length,
    misplacedIds: misplaced.map(m => m.id),
  };
}

async function main() {
  const propertyId = process.argv[2];
  
  if (propertyId) {
    await checkProperty(propertyId);
  } else {
    const results = await countMisplacedAndMissing();
    
    console.log('\n✅ Análisis completado\n');
    console.log('📊 Resumen final:');
    console.log(`   Total propiedades en Supabase: ${results?.total || 0}`);
    console.log(`   Correctamente en reno-in-progress: ${results?.correctlyPlaced || 0}`);
    console.log(`   Mal ubicadas: ${results?.misplaced || 0}`);
    console.log(`   Sin Set Up Status: ${results?.missingSetUpStatus || 0}`);
    console.log(`   Sin airtable_property_id: ${results?.withoutAirtableId || 0}\n`);
    
    if (results && results.misplaced > 0) {
      console.log('💡 Para corregir propiedades mal ubicadas, ejecuta:');
      console.log('   npm run sync:reno-in-progress\n');
    }
  }
}

main().catch(console.error);
