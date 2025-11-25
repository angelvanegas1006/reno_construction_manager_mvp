#!/usr/bin/env tsx
/**
 * Script para verificar el estado de las propiedades sincronizadas
 */

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  console.log('🔍 Verificando estado de propiedades sincronizadas...\n');

  const supabase = createAdminClient();

  try {
    // Verificar las 5 propiedades que se actualizaron
    const propertyIds = [
      'SP-NNE-OZV-003732',
      'SP-CIJ-FRP-004309',
      'SP-T6S-JID-004485',
      'SP-MYJ-FOZ-002993',
      'SP-KRP-2YS-003768'
    ];

    const { data, error } = await supabase
      .from('properties')
      .select('id, address, reno_phase, "Set Up Status", next_reno_steps, "Renovator name", keys_location')
      .in('id', propertyIds);

    if (error) {
      console.error('❌ Error al obtener propiedades:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No se encontraron las propiedades.');
      return;
    }

    console.log(`✅ Encontradas ${data.length} propiedades\n`);
    console.log('📋 Estado actual:\n');

    data.forEach((property, index) => {
      console.log(`${index + 1}. ID: ${property.id}`);
      console.log(`   Dirección: ${property.address}`);
      console.log(`   reno_phase: ${property.reno_phase || '❌ NULL'}`);
      console.log(`   Set Up Status: ${property['Set Up Status'] || '❌ NULL'}`);
      console.log(`   Next Reno Steps: ${property.next_reno_steps || '❌ NULL'}`);
      console.log(`   Renovator Name: ${property['Renovator name'] || '❌ NULL'}`);
      console.log(`   Keys Location: ${property.keys_location || '❌ NULL'}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});


