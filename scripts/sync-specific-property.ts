/**
 * Script para sincronizar una propiedad específica desde Airtable
 */

import { loadEnvConfig } from '@next/env';
import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncPropertiesFromAirtable } from '@/lib/airtable/sync-from-airtable';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || 'appT59F8wolMDKZeG';
const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';

function getAirtableBase() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error('Missing Airtable credentials');
  }
  return new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
}

async function syncSpecificProperty(propertyId: string) {
  const base = getAirtableBase();
  const supabase = createAdminClient();
  
  console.log(`\n🔍 Buscando "${propertyId}" en Airtable...\n`);
  
  // Buscar en todas las views posibles
  const views = [
    { phase: 'reno-in-progress', viewId: 'viwQUOrLzUrScuU4k', description: 'Reno In Progress' },
    { phase: 'upcoming-settlements', viewId: 'viwpYQ0hsSSdFrSD1', description: 'Upcoming Settlements' },
    { phase: 'initial-check', viewId: 'viwFZZ5S3VFCfYP6g', description: 'Initial Check' },
    { phase: 'reno-budget', viewId: 'viwKS3iOiyX5iu5zP', description: 'Upcoming Reno Budget' },
    { phase: 'furnishing', viewId: 'viw9NDUaeGIQDvugU', description: 'Furnishing' },
    { phase: 'final-check', viewId: 'viwnDG5TY6wjZhBL2', description: 'Final Check' },
    { phase: 'cleaning', viewId: 'viwLajczYxzQd4UvU', description: 'Cleaning' },
  ];
  
  let foundRecord: any = null;
  let foundPhase: string | null = null;
  
  for (const viewConfig of views) {
    try {
      const records: any[] = [];
      await base(AIRTABLE_TABLE_ID)
        .select({ view: viewConfig.viewId })
        .eachPage((pageRecords, fetchNextPage) => {
          pageRecords.forEach((record) => {
            const uniqueIdValue = 
              record.fields['UNIQUEID (from Engagements)'] ||
              record.fields['Unique ID (From Engagements)'] ||
              record.fields['Unique ID From Engagements'] ||
              record.fields['Unique ID'];
            
            const uniqueId = Array.isArray(uniqueIdValue) 
              ? uniqueIdValue[0] 
              : uniqueIdValue;
            
            if (uniqueId === propertyId) {
              records.push(record);
            }
          });
          fetchNextPage();
        });
      
      if (records.length > 0) {
        foundRecord = records[0];
        foundPhase = viewConfig.phase;
        console.log(`✅ ENCONTRADA en view "${viewConfig.description}" (${viewConfig.phase})`);
        console.log(`   Record ID: ${foundRecord.id}`);
        console.log(`   Address: ${foundRecord.fields['Address'] || 'N/A'}`);
        console.log(`   Set Up Status: ${foundRecord.fields['Set Up Status'] || foundRecord.fields['Set up status'] || 'N/A'}`);
        break;
      }
    } catch (error: any) {
      console.warn(`⚠️  Error buscando en ${viewConfig.description}: ${error.message}`);
    }
  }
  
  if (!foundRecord) {
    console.log(`❌ No encontrada en ninguna view de Airtable`);
    console.log(`💡 Verificando en Supabase...\n`);
    
    const { data: supabaseProperty } = await supabase
      .from('properties')
      .select('id, reno_phase, "Set Up Status", address')
      .eq('id', propertyId)
      .single();
    
    if (supabaseProperty) {
      console.log(`✅ Existe en Supabase pero no en Airtable:`);
      console.log(`   ID: ${supabaseProperty.id}`);
      console.log(`   reno_phase: ${supabaseProperty.reno_phase || 'NULL'}`);
      console.log(`   Set Up Status: ${supabaseProperty['Set Up Status'] || 'NULL'}`);
    }
    return;
  }
  
  // Sincronizar la propiedad específica
  console.log(`\n🔄 Sincronizando propiedad desde Airtable...\n`);
  
  // Usar la función de sincronización pero solo para esta view
  const result = await syncPropertiesFromAirtable(
    AIRTABLE_TABLE_ID,
    foundPhase === 'reno-in-progress' ? 'viwQUOrLzUrScuU4k' : views.find(v => v.phase === foundPhase)?.viewId || 'viwQUOrLzUrScuU4k'
  );
  
  console.log(`\n📊 Resultado de sincronización:`);
  console.log(`   Creadas: ${result.created}`);
  console.log(`   Actualizadas: ${result.updated}`);
  console.log(`   Errores: ${result.errors}`);
  
  if (result.details.length > 0) {
    console.log(`\n   Detalles:`);
    result.details.slice(0, 10).forEach(detail => console.log(`      - ${detail}`));
  }
  
  // Si está en reno-in-progress, forzar la fase
  if (foundPhase === 'reno-in-progress') {
    console.log(`\n🔧 Forzando fase a 'reno-in-progress'...\n`);
    
    const { error: updateError } = await supabase
      .from('properties')
      .update({ 
        reno_phase: 'reno-in-progress',
        'Set Up Status': 'Reno in progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', propertyId);
    
    if (updateError) {
      console.error(`❌ Error actualizando fase: ${updateError.message}`);
    } else {
      console.log(`✅ Fase actualizada correctamente a 'reno-in-progress'`);
    }
  }
  
  // Verificar estado final
  const { data: finalProperty } = await supabase
    .from('properties')
    .select('id, reno_phase, "Set Up Status", address')
    .eq('id', propertyId)
    .single();
  
  if (finalProperty) {
    console.log(`\n✅ Estado final en Supabase:`);
    console.log(`   ID: ${finalProperty.id}`);
    console.log(`   reno_phase: ${finalProperty.reno_phase || 'NULL'}`);
    console.log(`   Set Up Status: ${finalProperty['Set Up Status'] || 'NULL'}`);
  }
}

const propertyId = process.argv[2];
if (!propertyId) {
  console.error('❌ Por favor proporciona un Property ID');
  process.exit(1);
}

syncSpecificProperty(propertyId).catch(console.error);
