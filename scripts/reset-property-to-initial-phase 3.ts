#!/usr/bin/env tsx
/**
 * Script para resetear una propiedad a la fase inicial (upcoming-settlements)
 * Uso: npm run reset-property -- SP-TJP-JXR-005643
 * O: tsx scripts/reset-property-to-initial-phase.ts SP-TJP-JXR-005643
 */

import { createAdminClient } from '../lib/supabase/admin';

async function resetPropertyToInitialPhase(propertyId: string) {
  console.log(`🔄 Reseteando propiedad ${propertyId} a fase inicial...\n`);

  const supabase = createAdminClient();

  try {
    // Primero verificar que la propiedad existe
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('id, address, "Set Up Status", reno_phase, "Renovator name", "Estimated Visit Date", "Reno Start Date", "Estimated Reno End Date"')
      .eq('id', propertyId)
      .single();

    if (fetchError) {
      console.error('❌ Error al buscar la propiedad:', fetchError);
      process.exit(1);
    }

    if (!property) {
      console.error(`❌ Propiedad ${propertyId} no encontrada`);
      process.exit(1);
    }

    console.log('📋 Estado actual de la propiedad:');
    console.log(`   - ID: ${property.id}`);
    console.log(`   - Dirección: ${property.address || 'N/A'}`);
    console.log(`   - Set Up Status: ${property['Set Up Status'] || 'N/A'}`);
    console.log(`   - Reno Phase: ${property.reno_phase || 'N/A'}`);
    console.log(`   - Renovator Name: ${property['Renovator name'] || 'N/A'}`);
    console.log(`   - Estimated Visit Date: ${property['Estimated Visit Date'] || 'N/A'}`);
    console.log(`   - Reno Start Date: ${property['Reno Start Date'] || 'N/A'}`);
    console.log(`   - Estimated Reno End Date: ${property['Estimated Reno End Date'] || 'N/A'}`);
    console.log('');

    // Actualizar la propiedad a fase inicial
    const updates: Record<string, any> = {
      'Set Up Status': 'Pending to visit',
      reno_phase: 'upcoming-settlements',
      'Renovator name': null,
      'Estimated Visit Date': null,
      'Reno Start Date': null,
      'Estimated Reno End Date': null,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProperty, error: updateError } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', propertyId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error al actualizar la propiedad:', updateError);
      process.exit(1);
    }

    console.log('✅ Propiedad reseteada exitosamente a fase inicial:');
    console.log(`   - Set Up Status: ${updatedProperty['Set Up Status']}`);
    console.log(`   - Reno Phase: ${updatedProperty.reno_phase}`);
    console.log(`   - Renovator Name: ${updatedProperty['Renovator name'] || 'null (limpiado)'}`);
    console.log(`   - Estimated Visit Date: ${updatedProperty['Estimated Visit Date'] || 'null (limpiado)'}`);
    console.log(`   - Reno Start Date: ${updatedProperty['Reno Start Date'] || 'null (limpiado)'}`);
    console.log(`   - Estimated Reno End Date: ${updatedProperty['Estimated Reno End Date'] || 'null (limpiado)'}`);
    console.log('\n🎉 La propiedad ahora está en la fase "upcoming-settlements" y lista para empezar el proceso desde el inicio.');

  } catch (error: any) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Obtener el propertyId de los argumentos de línea de comandos
const propertyId = process.argv[2];

if (!propertyId) {
  console.error('❌ Por favor proporciona el ID de la propiedad');
  console.error('   Uso: npm run reset-property -- SP-TJP-JXR-005643');
  console.error('   O: tsx scripts/reset-property-to-initial-phase.ts SP-TJP-JXR-005643');
  process.exit(1);
}

resetPropertyToInitialPhase(propertyId);

