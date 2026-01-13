/**
 * Script para verificar que el contador de "Obras Activas" funciona correctamente
 * y que incluye las propiedades en reno-in-progress
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { createAdminClient } from '../lib/supabase/admin';

async function verifyObrasActivas() {
  console.log('🔍 Verificando contador de "Obras Activas"...\n');

  const supabase = createAdminClient();

  try {
    // Obtener propiedades por fase
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, address, reno_phase')
      .in('reno_phase', ['reno-in-progress', 'furnishing', 'final-check', 'cleaning']);

    if (error) {
      console.error('❌ Error al consultar Supabase:', error);
      return;
    }

    // Agrupar por fase
    const byPhase: Record<string, any[]> = {
      'reno-in-progress': [],
      'furnishing': [],
      'final-check': [],
      'cleaning': [],
    };

    properties?.forEach(prop => {
      if (prop.reno_phase && byPhase[prop.reno_phase]) {
        byPhase[prop.reno_phase].push(prop);
      }
    });

    const totalObrasActivas = 
      byPhase['reno-in-progress'].length +
      byPhase['furnishing'].length +
      byPhase['final-check'].length +
      byPhase['cleaning'].length;

    console.log('📊 Propiedades por fase:\n');
    console.log(`   - reno-in-progress: ${byPhase['reno-in-progress'].length}`);
    console.log(`   - furnishing: ${byPhase['furnishing'].length}`);
    console.log(`   - final-check: ${byPhase['final-check'].length}`);
    console.log(`   - cleaning: ${byPhase['cleaning'].length}`);
    console.log(`\n   ✅ Total Obras Activas: ${totalObrasActivas}\n`);

    // Mostrar algunas propiedades de reno-in-progress como ejemplo
    if (byPhase['reno-in-progress'].length > 0) {
      console.log('📋 Ejemplos de propiedades en reno-in-progress (primeras 5):\n');
      byPhase['reno-in-progress'].slice(0, 5).forEach((prop, i) => {
        console.log(`   ${i + 1}. ${prop.address || prop.id}`);
      });
    }

    // Verificar que todas las fases están incluidas
    const expectedPhases = ['reno-in-progress', 'furnishing', 'final-check', 'cleaning'];
    const missingPhases = expectedPhases.filter(phase => !byPhase[phase] || byPhase[phase].length === 0);
    
    if (missingPhases.length > 0) {
      console.log(`\n⚠️  Fases sin propiedades: ${missingPhases.join(', ')}`);
    } else {
      console.log('\n✅ Todas las fases tienen propiedades o están correctamente configuradas');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyObrasActivas()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

