#!/usr/bin/env tsx
/**
 * Script para verificar columnas y datos en Supabase
 */

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  console.log('🔍 Verificando columnas y datos en Supabase...\n');

  const supabase = createAdminClient();

  // Obtener una propiedad específica con todos los campos
  const { data: property, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', 'SP-GMC-WPO-004112')
    .single();

  if (error) {
    console.error('❌ Error al consultar propiedad:', error);
    process.exit(1);
  }

  if (!property) {
    console.log('❌ Propiedad no encontrada');
    return;
  }

  console.log('📋 Todos los campos de la propiedad SP-GMC-WPO-004112:\n');
  console.log(JSON.stringify(property, null, 2));

  console.log('\n\n🔍 Campos específicos que buscamos:\n');
  console.log(`   area_cluster: ${property.area_cluster || '❌ NULL'}`);
  console.log(`   Hubspot ID: ${property['Hubspot ID'] || '❌ NULL'}`);
  console.log(`   renovation_type: ${property.renovation_type || '❌ NULL'}`);
  console.log(`   property_unique_id: ${property.property_unique_id || '❌ NULL'}`);
  console.log(`   responsible_owner: ${property.responsible_owner || '❌ NULL'}`);
  console.log(`   Technical construction: ${property['Technical construction'] || '❌ NULL'}`);
  
  console.log('\n\n🔍 Nuevos campos de días y duración:\n');
  console.log(`   Days to Start Reno (Since RSD): ${property['Days to Start Reno (Since RSD)'] !== undefined ? property['Days to Start Reno (Since RSD)'] : '❌ NO EXISTE'}`);
  console.log(`   Reno Duration: ${property['Reno Duration'] !== undefined ? property['Reno Duration'] : '❌ NO EXISTE'}`);
  console.log(`   Days to Property Ready: ${property['Days to Property Ready'] !== undefined ? property['Days to Property Ready'] : '❌ NO EXISTE'}`);
  
  console.log('\n\n📋 Todas las claves de la propiedad:\n');
  Object.keys(property).sort().forEach(key => {
    const value = property[key];
    const type = typeof value;
    const preview = type === 'object' ? JSON.stringify(value).substring(0, 50) : String(value).substring(0, 50);
    console.log(`   ${key}: ${type} = ${preview}${String(value).length > 50 ? '...' : ''}`);
  });
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});




