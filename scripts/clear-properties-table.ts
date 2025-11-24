#!/usr/bin/env tsx
/**
 * Script para borrar todas las propiedades de Supabase
 * Uso: npm run clear:properties
 */

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  console.log('🗑️  Borrando todas las propiedades de Supabase...\n');

  const supabase = createAdminClient();

  try {
    // Primero contar cuántas propiedades hay
    const { count, error: countError } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error al contar propiedades:', countError);
      process.exit(1);
    }

    console.log(`📊 Propiedades encontradas: ${count || 0}\n`);

    if (count === 0) {
      console.log('✅ La tabla ya está vacía');
      return;
    }

    // Borrar todas las propiedades sin importar su fase/estado
    // Usar una consulta que siempre sea verdadera para borrar todo
    const { error: deleteError } = await supabase
      .from('properties')
      .delete()
      .neq('id', ''); // Delete all (usando un filtro que siempre es verdadero ya que id nunca está vacío)

    if (deleteError) {
      console.error('❌ Error al borrar propiedades:', deleteError);
      process.exit(1);
    }

    // Verificar que se borraron
    const { count: remainingCount, error: verifyError } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true });

    if (verifyError) {
      console.error('❌ Error al verificar:', verifyError);
      process.exit(1);
    }

    console.log(`✅ Propiedades borradas exitosamente`);
    console.log(`📊 Propiedades restantes: ${remainingCount || 0}\n`);

    if (remainingCount === 0) {
      console.log('✅ La tabla está completamente vacía. Listo para sincronizar desde Airtable.');
    } else {
      console.log(`⚠️  Aún quedan ${remainingCount} propiedades. Puede haber un problema.`);
    }

  } catch (error: any) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

