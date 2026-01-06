#!/usr/bin/env tsx
/**
 * Script para verificar que los campos de días se están guardando correctamente
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  console.log('🔍 Verificando campos de días en Supabase...\n');

  const supabase = createAdminClient();

  // Obtener algunas propiedades con los nuevos campos
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, address')
    .limit(10);

  if (error) {
    console.error('❌ Error al consultar propiedades:', error);
    process.exit(1);
  }

  if (!properties || properties.length === 0) {
    console.log('❌ No se encontraron propiedades');
    return;
  }

  console.log(`📋 Verificando ${properties.length} propiedades...\n`);
  
  // Obtener los valores completos de cada propiedad
  for (const prop of properties) {
    const { data: fullProp, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', prop.id)
      .single();

    if (!propError && fullProp) {
      console.log(`  📌 ${prop.id} - ${prop.address}`);
      console.log(`     Days to Start Reno (Since RSD): ${fullProp['Days to Start Reno (Since RSD)'] ?? 'NULL'}`);
      console.log(`     Reno Duration: ${fullProp['Reno Duration'] ?? 'NULL'}`);
      console.log(`     Days to Property Ready: ${fullProp['Days to Property Ready'] ?? 'NULL'}`);
      console.log('');
    }
  }

  // Estadísticas generales
  console.log('\n📊 Estadísticas generales:\n');
  
  const { count: totalProps } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });

  const { count: withDaysToStart } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .not('Days to Start Reno (Since RSD)', 'is', null);

  const { count: withDuration } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .not('Reno Duration', 'is', null);

  const { count: withDaysToReady } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .not('Days to Property Ready', 'is', null);

  console.log(`  Total propiedades: ${totalProps ?? 0}`);
  console.log(`  Con "Days to Start Reno (Since RSD)": ${withDaysToStart ?? 0}`);
  console.log(`  Con "Reno Duration": ${withDuration ?? 0}`);
  console.log(`  Con "Days to Property Ready": ${withDaysToReady ?? 0}`);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

