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

    // Verificar el campo Est_reno_start_date en Supabase
    console.log('🔍 Verificando campo Est_reno_start_date en Supabase...\n');
    
    const supabase = createAdminClient();
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, address, Est_reno_start_date')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error al consultar Supabase:', error);
      return;
    }

    const withDate = properties?.filter(p => p.Est_reno_start_date !== null) || [];
    const withoutDate = properties?.filter(p => p.Est_reno_start_date === null) || [];

    console.log(`   - Propiedades con Est_reno_start_date: ${withDate.length}`);
    console.log(`   - Propiedades sin Est_reno_start_date: ${withoutDate.length}\n`);

    if (withDate.length > 0) {
      console.log('📅 Ejemplos de propiedades con fecha:');
      withDate.slice(0, 5).forEach(prop => {
        console.log(`   - ${prop.address || prop.id}: ${prop.Est_reno_start_date}`);
      });
    }

    if (withoutDate.length > 0) {
      console.log('\n⚠️  Ejemplos de propiedades sin fecha:');
      withoutDate.slice(0, 5).forEach(prop => {
        console.log(`   - ${prop.address || prop.id}`);
      });
    }

    // Consultar todas las propiedades para estadísticas completas
    const { data: allProperties, error: allError } = await supabase
      .from('properties')
      .select('Est_reno_start_date');

    if (!allError && allProperties) {
      const totalWithDate = allProperties.filter(p => p.Est_reno_start_date !== null).length;
      const totalWithoutDate = allProperties.filter(p => p.Est_reno_start_date === null).length;
      
      console.log('\n📊 Estadísticas completas:');
      console.log(`   - Total propiedades: ${allProperties.length}`);
      console.log(`   - Con Est_reno_start_date: ${totalWithDate} (${((totalWithDate / allProperties.length) * 100).toFixed(1)}%)`);
      console.log(`   - Sin Est_reno_start_date: ${totalWithoutDate} (${((totalWithoutDate / allProperties.length) * 100).toFixed(1)}%)\n`);
    }

    console.log('✨ Verificación completada\n');

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

