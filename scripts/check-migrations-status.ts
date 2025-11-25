/**
 * Script para verificar si las migraciones ya están aplicadas en Supabase
 */

import { createAdminClient } from '../lib/supabase/admin';

async function checkMigrationsStatus() {
  const supabase = createAdminClient();
  
  console.log('🔍 Verificando estado de migraciones...\n');
  
  try {
    // Verificar tabla property_dynamic_categories (migración 009)
    const { data: categoriesTable, error: categoriesError } = await supabase
      .from('property_dynamic_categories')
      .select('id')
      .limit(1);
    
    if (categoriesError) {
      if (categoriesError.message.includes('does not exist')) {
        console.log('❌ Migración 009: Tabla property_dynamic_categories NO existe');
      } else {
        console.log('⚠️  Migración 009: Error al verificar:', categoriesError.message);
      }
    } else {
      console.log('✅ Migración 009: Tabla property_dynamic_categories existe');
    }
    
    // Verificar campo pics_urls en properties (migración 011)
    const { data: propertiesSample, error: propertiesError } = await supabase
      .from('properties')
      .select('id, pics_urls')
      .limit(1);
    
    if (propertiesError) {
      if (propertiesError.message.includes('column') && propertiesError.message.includes('does not exist')) {
        console.log('❌ Migración 011: Campo pics_urls NO existe en properties');
      } else {
        console.log('⚠️  Migración 011: Error al verificar:', propertiesError.message);
      }
    } else {
      console.log('✅ Migración 011: Campo pics_urls existe en properties');
      if (propertiesSample && propertiesSample.length > 0) {
        console.log('   Ejemplo de datos:', { 
          id: propertiesSample[0].id, 
          hasPicsUrls: propertiesSample[0].pics_urls !== null && propertiesSample[0].pics_urls !== undefined 
        });
      }
    }
    
    // Verificar índice next_reno_steps (migración 010 - debería estar eliminado)
    // No podemos verificar directamente si un índice fue eliminado, pero podemos intentar
    // una query que fallaría si el índice problemático existiera
    console.log('\n📋 Migración 010: Fix de índice next_reno_steps');
    console.log('   (No se puede verificar directamente, pero si no hay errores en queries, está OK)');
    
    console.log('\n✅ Verificación completada');
    console.log('\n💡 Nota: Si todas las migraciones muestran ✅, no necesitas ejecutarlas de nuevo.');
    console.log('   Si alguna muestra ❌, ejecuta esa migración específica en Supabase SQL Editor.');
    
  } catch (error) {
    console.error('❌ Error al verificar migraciones:', error);
  }
  
  process.exit(0);
}

checkMigrationsStatus();
