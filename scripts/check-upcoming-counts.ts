#!/usr/bin/env tsx
/**
 * Script para verificar los conteos de propiedades en upcoming-settlements y upcoming
 * Ejecutar con: npx tsx scripts/check-upcoming-counts.ts
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  console.log('🔍 Verificando conteos de propiedades en upcoming-settlements y upcoming...\n');

  const supabase = createAdminClient();

  try {
    // Contar propiedades en upcoming-settlements
    const { count: upcomingSettlementsCount, error: error1 } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('reno_phase', 'upcoming-settlements');

    if (error1) {
      console.error('❌ Error contando upcoming-settlements:', error1.message);
    } else {
      console.log(`📊 Propiedades en 'upcoming-settlements': ${upcomingSettlementsCount || 0}`);
    }

    // Contar propiedades en upcoming
    const { count: upcomingCount, error: error2 } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('reno_phase', 'upcoming');

    if (error2) {
      console.error('❌ Error contando upcoming:', error2.message);
    } else {
      console.log(`📊 Propiedades en 'upcoming': ${upcomingCount || 0}`);
    }

    // Suma total
    const total = (upcomingSettlementsCount || 0) + (upcomingCount || 0);
    console.log(`\n📊 Total combinado: ${total}`);

    // Verificar si hay propiedades con Set Up Status que podrían estar mal asignadas
    const { data: upcomingSettlementsProps, error: error3 } = await supabase
      .from('properties')
      .select('id, address, reno_phase, "Set Up Status"')
      .eq('reno_phase', 'upcoming-settlements')
      .limit(15);

    if (!error3 && upcomingSettlementsProps) {
      console.log(`\n📋 Primeras 15 propiedades en 'upcoming-settlements':`);
      upcomingSettlementsProps.forEach((prop, index) => {
        console.log(`\n${index + 1}. ID: ${prop.id}`);
        console.log(`   Dirección: ${prop.address || 'N/A'}`);
        console.log(`   reno_phase: ${prop.reno_phase}`);
        console.log(`   Set Up Status: ${(prop as any)['Set Up Status'] || 'N/A'}`);
      });
    }

    const { data: upcomingProps, error: error4 } = await supabase
      .from('properties')
      .select('id, address, reno_phase, "Set Up Status"')
      .eq('reno_phase', 'upcoming')
      .limit(15);

    if (!error4 && upcomingProps) {
      console.log(`\n📋 Primeras 15 propiedades en 'upcoming':`);
      upcomingProps.forEach((prop, index) => {
        console.log(`\n${index + 1}. ID: ${prop.id}`);
        console.log(`   Dirección: ${prop.address || 'N/A'}`);
        console.log(`   reno_phase: ${prop.reno_phase}`);
        console.log(`   Set Up Status: ${(prop as any)['Set Up Status'] || 'N/A'}`);
      });
    }

    console.log('\n✅ Verificación completada');
    console.log('\n💡 Nota: La fase "upcoming" está oculta en el kanban pero sus propiedades se cuentan en stageCounts.');
    console.log('   Si ves 24 en lugar de 10, probablemente hay 10 en upcoming-settlements + 14 en upcoming = 24 total.');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});


