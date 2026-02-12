/**
 * Script para ejecutar la sincronización de Airtable a Supabase en local
 * Verifica que el campo Est_reno_start_date se sincronice correctamente
 */

// Cargar variables de entorno
import * as dotenv from 'dotenv';
import * as path from 'path';

// Intentar cargar .env.local primero, luego .env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { syncAllPhasesFromAirtable } from '../lib/airtable/sync-all-phases';
import { createAdminClient } from '../lib/supabase/admin';

async function runLocalSync() {
  console.log('🚀 Iniciando sincronización local de Airtable a Supabase...\n');

  try {
    // Ejecutar la sincronización
    const result = await syncAllPhasesFromAirtable();

    console.log('\n✅ Sincronización completada:');
    console.log(`   - Total creadas: ${result.totalCreated}`);
    console.log(`   - Total actualizadas: ${result.totalUpdated}`);
    console.log(`   - Total errores: ${result.totalErrors}`);
    console.log(`   - Timestamp: ${result.timestamp}\n`);

    // Verificar todos los campos de fechas en Supabase
    const dateColumns = [
      'budget_ph_ready_date',
      'renovator_budget_approval_date',
      'initial_visit_date',
      'est_reno_start_date',
      'start_date',
      'estimated_end_date',
      'reno_end_date',
    ] as const;

    console.log('🔍 Verificando campos de fechas en Supabase...\n');

    const supabase = createAdminClient();
    const selectFields = ['id', 'address', ...dateColumns].join(', ');
    const { data: properties, error } = await supabase
      .from('properties')
      .select(selectFields)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Error al consultar Supabase:', error);
      return;
    }

    const total = properties?.length ?? 0;
    console.log(`📋 Muestra: ${total} propiedades (últimas por updated_at)\n`);

    const counts: Record<string, number> = {};
    dateColumns.forEach((col) => {
      counts[col] = properties?.filter((p: any) => p[col] != null && p[col] !== '').length ?? 0;
    });

    console.log('📊 Conteo por campo de fecha:');
    dateColumns.forEach((col) => {
      console.log(`   - ${col}: ${counts[col]} de ${total}`);
    });

    // Ejemplos de propiedades con al menos una fecha
    const withAnyDate = properties?.filter((p: any) =>
      dateColumns.some((col) => p[col] != null && p[col] !== '')
    ) ?? [];
    if (withAnyDate.length > 0) {
      console.log('\n📅 Ejemplos (propiedades con al menos una fecha):');
      withAnyDate.slice(0, 5).forEach((prop: any) => {
        const dates = dateColumns.filter((c) => prop[c]).map((c) => `${c}=${prop[c]}`);
        console.log(`   - ${prop.address || prop.id}: ${dates.join(', ')}`);
      });
    }

    console.log('\n✨ Verificación completada\n');

  } catch (error: any) {
    console.error('❌ Error durante la sincronización:', error);
    process.exit(1);
  }
}

// Ejecutar
runLocalSync()
  .then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

