/**
 * Script para avanzar propiedades de fase y agregar fecha de visita inicial
 * 
 * Propiedades a actualizar:
 * 1. SP-JN8-EAX-004446 - Fecha: 2026-01-08 - Fase: reno-budget-renovator
 * 2. SP-FDC-W4F-005172 - Fecha: 2026-01-16 - Fase: reno-budget-renovator
 * 
 * Ejecutar con: npx tsx scripts/advance-properties-phase-with-visit-date.ts
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';
import { findTransactionsRecordIdByUniqueId, updateAirtableWithRetry } from '../lib/airtable/client';
import type { RenoKanbanPhase } from '../lib/reno-kanban-config';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

interface PropertyUpdate {
  id: string;
  visitDate: string; // YYYY-MM-DD format
  targetPhase: RenoKanbanPhase;
  setUpStatus: string;
}

const PROPERTIES_TO_UPDATE: PropertyUpdate[] = [
  {
    id: 'SP-JN8-EAX-004446',
    visitDate: '2026-01-08',
    targetPhase: 'reno-budget-renovator',
    setUpStatus: 'Pending to budget (from renovator)',
  },
  {
    id: 'SP-FDC-W4F-005172',
    visitDate: '2026-01-16',
    targetPhase: 'reno-budget-renovator',
    setUpStatus: 'Pending to budget (from renovator)',
  },
];

async function advancePropertiesPhase() {
  console.log('🚀 Starting property phase advancement script\n');
  console.log(`📋 Properties to update: ${PROPERTIES_TO_UPDATE.length}\n`);
  
  const supabase = createAdminClient();
  const tableName = 'Transactions'; // AirTable table name
  
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  
  for (const propertyUpdate of PROPERTIES_TO_UPDATE) {
    const { id: propertyId, visitDate, targetPhase, setUpStatus } = propertyUpdate;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Processing property: ${propertyId}`);
    console.log(`   Visit Date: ${visitDate}`);
    console.log(`   Target Phase: ${targetPhase}`);
    console.log(`   Set Up Status: ${setUpStatus}`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
      // 1. Verificar que la propiedad existe en Supabase
      const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('id, airtable_property_id, "Unique ID From Engagements", reno_phase, "Set Up Status", "Estimated Visit Date"')
        .eq('id', propertyId)
        .single();
      
      if (fetchError || !property) {
        const errorMsg = `Property not found in Supabase: ${propertyId}`;
        console.error(`   ❌ ${errorMsg}`);
        errors.push(`${propertyId}: ${errorMsg}`);
        errorCount++;
        continue;
      }
      
      console.log(`   ✅ Property found in Supabase`);
      console.log(`   Current Phase: ${property.reno_phase || 'null'}`);
      console.log(`   Current Set Up Status: ${property['Set Up Status'] || 'null'}`);
      console.log(`   Current Estimated Visit Date: ${property['Estimated Visit Date'] || 'null'}`);
      
      // 2. Actualizar fase y fecha de visita en Supabase
      console.log(`\n   📝 Updating Supabase...`);
      
      // Actualizar fase, Set Up Status y fecha de visita en una sola operación
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          'Set Up Status': setUpStatus,
          reno_phase: targetPhase,
          'Estimated Visit Date': visitDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId);
      
      if (updateError) {
        throw new Error(`Failed to update property: ${updateError.message}`);
      }
      
      console.log(`   ✅ Updated Supabase: phase=${targetPhase}, setUpStatus=${setUpStatus}, visitDate=${visitDate}`);
      
      // 3. Actualizar AirTable
      console.log(`\n   🔄 Updating AirTable...`);
      
      // Obtener el Unique ID para buscar en AirTable
      const uniqueId = property['Unique ID From Engagements'] || propertyId;
      console.log(`   🔍 Searching AirTable record by Unique ID: ${uniqueId}`);
      
      const airtableRecordId = await findTransactionsRecordIdByUniqueId(uniqueId);
      
      if (!airtableRecordId) {
        const errorMsg = `AirTable record not found for Unique ID: ${uniqueId}`;
        console.warn(`   ⚠️  ${errorMsg}`);
        errors.push(`${propertyId}: ${errorMsg}`);
        // Continuar aunque no se haya actualizado AirTable, ya que Supabase se actualizó
        console.log(`   ⚠️  Supabase updated successfully, but AirTable update skipped`);
        successCount++;
        continue;
      }
      
      console.log(`   ✅ Found AirTable record ID: ${airtableRecordId}`);
      
      // Actualizar fecha de visita en AirTable
      const airtableUpdates: Record<string, any> = {
        'fldIhqPOAFL52MMBn': visitDate, // Estimated Visit Date field ID
      };
      
      // También actualizar Set Up Status en AirTable si es necesario
      // Nota: El Set Up Status puede estar en diferentes campos según la tabla
      // Por ahora solo actualizamos la fecha de visita
      
      const airtableSuccess = await updateAirtableWithRetry(
        tableName,
        airtableRecordId,
        airtableUpdates
      );
      
      if (airtableSuccess) {
        console.log(`   ✅ Updated AirTable successfully`);
        successCount++;
      } else {
        const errorMsg = `Failed to update AirTable record`;
        console.error(`   ❌ ${errorMsg}`);
        errors.push(`${propertyId}: ${errorMsg}`);
        // Contar como éxito parcial ya que Supabase se actualizó
        successCount++;
      }
      
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error(`   ❌ Error processing property ${propertyId}:`, errorMsg);
      errors.push(`${propertyId}: ${errorMsg}`);
      errorCount++;
    }
  }
  
  // Resumen final
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Script Summary:');
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Successfully processed: ${successCount}/${PROPERTIES_TO_UPDATE.length}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Errors encountered:`);
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  console.log(`\n✅ Script completed!\n`);
  
  if (errorCount > 0) {
    process.exit(1);
  }
}

// Ejecutar script
advancePropertiesPhase()
  .then(() => {
    console.log('✨ Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
