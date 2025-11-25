#!/usr/bin/env tsx
/**
 * Script para verificar que las propiedades sincronizadas aparezcan correctamente
 */

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  console.log('🔍 Verificando propiedades sincronizadas...\n');

  const supabase = createAdminClient();

  // Verificar propiedades en "upcoming-settlements"
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, address, reno_phase, "Set Up Status", type, created_at')
    .eq('reno_phase', 'upcoming-settlements')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error al consultar propiedades:', error);
    process.exit(1);
  }

  console.log(`✅ Encontradas ${properties?.length || 0} propiedades en "upcoming-settlements"\n`);

  if (properties && properties.length > 0) {
    console.log('📋 Primeras 10 propiedades:');
    properties.forEach((prop, index) => {
      console.log(`\n${index + 1}. ID: ${prop.id}`);
      console.log(`   Dirección: ${prop.address || 'N/A'}`);
      console.log(`   Fase: ${prop.reno_phase}`);
      console.log(`   Set Up Status: ${prop['Set Up Status'] || 'N/A'}`);
      console.log(`   Tipo: ${prop.type || 'N/A'}`);
      console.log(`   Creada: ${prop.created_at ? new Date(prop.created_at).toLocaleString() : 'N/A'}`);
    });
  } else {
    console.log('⚠️  No se encontraron propiedades en "upcoming-settlements"');
  }

  // Contar total de propiedades sincronizadas
  const { count } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('reno_phase', 'upcoming-settlements');

  console.log(`\n📊 Total de propiedades en "upcoming-settlements": ${count || 0}`);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});


