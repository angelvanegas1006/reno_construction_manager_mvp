#!/usr/bin/env tsx
/**
 * Script para verificar que los campos de tablas relacionadas se guardaron en Supabase
 */

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  console.log('🔍 Verificando campos de tablas relacionadas en Supabase...\n');

  const supabase = createAdminClient();

  // Verificar algunas propiedades para ver si tienen los campos relacionados
  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .eq('reno_phase', 'upcoming-settlements')
    .limit(5);

  if (error) {
    console.error('❌ Error al consultar propiedades:', error);
    process.exit(1);
  }

  console.log(`✅ Verificando ${properties?.length || 0} propiedades:\n`);

  if (properties && properties.length > 0) {
    // Log del primer objeto completo para debugging
    console.log('📋 Primer objeto completo:', JSON.stringify(properties[0], null, 2));
    console.log('\n');
    
    properties.forEach((prop: any, index) => {
      const propId = Array.isArray(prop.id) ? prop.id[0] : prop.id;
      console.log(`${index + 1}. ID: ${propId}`);
      console.log(`   Dirección: ${prop.address || 'N/A'}`);
      console.log(`   Area Cluster: ${prop.area_cluster !== null && prop.area_cluster !== undefined ? prop.area_cluster : '❌ NO TIENE'}`);
      console.log(`   Hubspot ID: ${prop['Hubspot ID'] !== null && prop['Hubspot ID'] !== undefined ? prop['Hubspot ID'] : '❌ NO TIENE'}`);
      console.log(`   Renovation Type: ${prop.renovation_type !== null && prop.renovation_type !== undefined ? prop.renovation_type : '❌ NO TIENE'}`);
      console.log(`   Responsible Owner: ${prop.responsible_owner !== null && prop.responsible_owner !== undefined ? prop.responsible_owner : '❌ NO TIENE'}`);
      console.log(`   Technical Construction: ${prop['Technical construction'] !== null && prop['Technical construction'] !== undefined ? prop['Technical construction'] : '❌ NO TIENE'}`);
      console.log(`   Property Unique ID: ${prop.property_unique_id !== null && prop.property_unique_id !== undefined ? prop.property_unique_id : '❌ NO TIENE'}`);
      console.log('');
    });
  } else {
    console.log('⚠️  No se encontraron propiedades');
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

