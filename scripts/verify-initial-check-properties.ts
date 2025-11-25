#!/usr/bin/env tsx
/**
 * Script para verificar propiedades en fase Initial Check en Supabase
 * Uso: npm run verify:initial-check
 */

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  console.log('🔍 Verificando propiedades en fase Initial Check...\n');

  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('properties')
      .select('id, address, reno_phase, "Set Up Status", next_reno_steps, "Renovator name", keys_location')
      .eq('reno_phase', 'initial-check')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Error al obtener propiedades de Supabase:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No se encontraron propiedades en la fase "initial-check".');
      return;
    }

    console.log(`✅ Encontradas ${data.length} propiedades en "initial-check"\n`);
    console.log('📋 Propiedades:\n');

    data.forEach((property, index) => {
      console.log(`${index + 1}. ID: ${property.id}`);
      console.log(`   Dirección: ${property.address}`);
      console.log(`   Fase: ${property.reno_phase}`);
      console.log(`   Set Up Status: ${property['Set Up Status']}`);
      console.log(`   Next Reno Steps: ${property.next_reno_steps || '❌ NULL'}`);
      console.log(`   Renovator Name: ${property['Renovator name'] || '❌ NULL'}`);
      console.log(`   Keys Location: ${property.keys_location || '❌ NULL'}`);
      console.log('');
    });

    const { count, error: countError } = await supabase
      .from('properties')
      .select('id', { count: 'exact' })
      .eq('reno_phase', 'initial-check');

    if (countError) {
      console.error('❌ Error al contar propiedades:', countError);
      process.exit(1);
    }

    console.log(`📊 Total de propiedades en "initial-check": ${count}\n`);

  } catch (error: any) {
    console.error('❌ Error fatal durante la verificación:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});


