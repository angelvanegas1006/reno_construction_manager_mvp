#!/usr/bin/env tsx
/**
 * Script para ejecutar el cron job de sincronización y verificar que start_date se sincroniza correctamente
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';
import { syncAllPhasesFromAirtable } from '../lib/airtable/sync-all-phases';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function runSyncAndVerify() {
  console.log('\n🔄 Ejecutando sincronización de Airtable...\n');
  
  try {
    // Ejecutar sincronización
    const result = await syncAllPhasesFromAirtable();
    
    console.log('\n📊 Resultados de la sincronización:');
    console.log(`   ✅ Procesadas: ${result.totalProcessed}`);
    console.log(`   ✅ Creadas: ${result.totalCreated}`);
    console.log(`   ✅ Actualizadas: ${result.totalUpdated}`);
    console.log(`   ⚠️  Errores: ${result.totalErrors}\n`);
    
    if (result.totalErrors > 0 && result.details.length > 0) {
      console.log('   Detalles de errores:');
      result.details.slice(0, 5).forEach((detail, i) => {
        console.log(`   ${i + 1}. ${detail}`);
      });
      if (result.details.length > 5) {
        console.log(`   ... y ${result.details.length - 5} más`);
      }
      console.log('');
    }
    
    // Verificar start_date después de la sincronización
    console.log('🔍 Verificando start_date después de la sincronización...\n');
    
    const supabase = createAdminClient();
    
    // Obtener estadísticas de start_date
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, start_date, "Unique ID From Engagements"')
      .order('id');
    
    if (error) {
      console.error('❌ Error obteniendo propiedades:', error);
      return;
    }
    
    const total = properties?.length || 0;
    const withStartDate = properties?.filter(p => p.start_date !== null).length || 0;
    const withoutStartDate = total - withStartDate;
    
    console.log('📊 Estadísticas de start_date en Supabase:');
    console.log(`   Total propiedades: ${total}`);
    console.log(`   Con start_date: ${withStartDate} (${((withStartDate / total) * 100).toFixed(1)}%)`);
    console.log(`   Sin start_date: ${withoutStartDate} (${((withoutStartDate / total) * 100).toFixed(1)}%)\n`);
    
    if (withoutStartDate > 0) {
      console.log('⚠️  Propiedades sin start_date (primeras 10):');
      properties?.filter(p => !p.start_date).slice(0, 10).forEach((prop, i) => {
        console.log(`   ${i + 1}. ${prop.id} - ${prop['Unique ID From Engagements'] || 'N/A'}`);
      });
      if (withoutStartDate > 10) {
        console.log(`   ... y ${withoutStartDate - 10} más`);
      }
      console.log('');
      console.log('💡 Nota: Si las propiedades tienen el campo en Airtable pero no en Supabase,');
      console.log('   puede ser que el campo esté vacío en Airtable o que el field ID no sea correcto.\n');
    } else {
      console.log('✅ Todas las propiedades tienen start_date!\n');
    }
    
  } catch (error: any) {
    console.error('❌ Error ejecutando sincronización:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

runSyncAndVerify().catch(console.error);

