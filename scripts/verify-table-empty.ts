#!/usr/bin/env tsx
/**
 * Script para verificar que la tabla properties está completamente vacía
 */

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  console.log('🔍 Verificando estado de la tabla properties...\n');

  const supabase = createAdminClient();

  try {
    // Contar todas las propiedades sin filtros
    const { count, error: countError } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error al contar propiedades:', countError);
      process.exit(1);
    }

    console.log(`📊 Total de propiedades en la tabla: ${count || 0}\n`);

    if (count === 0) {
      console.log('✅ La tabla está completamente vacía');
    } else {
      console.log(`⚠️  Aún hay ${count} propiedades en la tabla`);
      
      // Mostrar algunas propiedades por fase para ver qué queda
      const { data: byPhase, error: phaseError } = await supabase
        .from('properties')
        .select('reno_phase, id')
        .limit(20);

      if (!phaseError && byPhase) {
        const phaseCounts: Record<string, number> = {};
        byPhase.forEach((p: any) => {
          const phase = p.reno_phase || 'sin fase';
          phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
        });

        console.log('\n📋 Propiedades por fase (primeras 20):');
        Object.entries(phaseCounts).forEach(([phase, count]) => {
          console.log(`   ${phase}: ${count}`);
        });
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});









