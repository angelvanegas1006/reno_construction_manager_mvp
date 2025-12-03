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
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});









