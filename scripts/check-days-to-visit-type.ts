#!/usr/bin/env tsx
/**
 * Script para verificar el tipo de la columna days_to_visit en Supabase
 * Ejecutar con: npx tsx scripts/check-days-to-visit-type.ts
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  console.log('🔍 Verificando tipo de columna days_to_visit en Supabase...\n');

  const supabase = createAdminClient();

  try {
    // Intentar obtener información de la columna de otra manera
    const { data: sampleData, error: sampleError } = await supabase
      .from('properties')
      .select('days_to_visit')
      .limit(1);

    if (sampleError) {
      // Si hay error, puede ser que la columna no exista o tenga un tipo incorrecto
      console.log('⚠️  Error al acceder a la columna:', sampleError.message);
      console.log('\n📋 Información del error:');
      console.log('   - Si el error menciona "date", la columna es de tipo date');
      console.log('   - Si el error menciona "integer" o "numeric", la columna es numérica');
      console.log('   - Si el error menciona "no existe", la columna no existe');
      
      // Intentar verificar el tipo intentando insertar diferentes valores
      console.log('\n🧪 Probando inserción de valores...');
      
      const testProperty = await supabase
        .from('properties')
        .select('id')
        .limit(1)
        .single();

      if (testProperty.data) {
        // Intentar actualizar con un número
        const { error: numError } = await supabase
          .from('properties')
          .update({ days_to_visit: 5 })
          .eq('id', testProperty.data.id);

        if (numError) {
          console.log('❌ No se puede insertar número:', numError.message);
          
          // Intentar con una fecha
          const { error: dateError } = await supabase
            .from('properties')
            .update({ days_to_visit: '2024-01-01' as any })
            .eq('id', testProperty.data.id);

          if (!dateError) {
            console.log('✅ La columna acepta fechas - es de tipo DATE');
            console.log('\n⚠️  ACCIÓN REQUERIDA: Ejecuta la migración SQL para cambiar el tipo a numeric');
            console.log('   Archivo: supabase/migrations/009_change_days_to_visit_to_numeric.sql');
          }
        } else {
          console.log('✅ La columna acepta números - es de tipo NUMERIC/INTEGER');
          console.log('\n✅ El tipo de columna es correcto, puedes ejecutar la sincronización');
        }
      }
    } else {
      console.log('✅ La columna days_to_visit existe y es accesible');
      
      if (sampleData && sampleData.length > 0) {
        const sampleValue = sampleData[0].days_to_visit;
        console.log('\n📊 Valor de muestra:', sampleValue);
        console.log('   Tipo JavaScript:', typeof sampleValue);
        
        if (typeof sampleValue === 'number') {
          console.log('✅ La columna es de tipo NUMERIC/INTEGER');
          console.log('\n✅ El tipo de columna es correcto, puedes ejecutar la sincronización');
        } else if (sampleValue instanceof Date || typeof sampleValue === 'string') {
          console.log('⚠️  La columna parece ser de tipo DATE');
          console.log('\n⚠️  ACCIÓN REQUERIDA: Ejecuta la migración SQL para cambiar el tipo a numeric');
          console.log('   Archivo: supabase/migrations/009_change_days_to_visit_to_numeric.sql');
        }
      } else {
        console.log('ℹ️  No hay valores en la columna (está vacía)');
        console.log('\n⚠️  Verifica manualmente el tipo en Supabase Dashboard');
        console.log('   O ejecuta la migración SQL para asegurarte de que sea numeric');
      }
    }

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

