/**
 * Script para corregir las fases de propiedades que deberían estar en reno-in-progress
 * Compara Airtable con Supabase y corrige las diferencias
 */

import { loadEnvConfig } from '@next/env';
import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || 'appT59F8wolMDKZeG';
const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const AIRTABLE_VIEW_ID_RENO_IN_PROGRESS = 'viwQUOrLzUrScuU4k';

function getAirtableBase() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error('Missing Airtable credentials');
  }
  return new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
}

async function fetchPropertiesFromView(viewId: string): Promise<any[]> {
  const base = getAirtableBase();
  const records: any[] = [];
  
  await base(AIRTABLE_TABLE_ID)
    .select({ view: viewId })
    .eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach((record) => {
        records.push({
          id: record.id,
          fields: record.fields,
        });
      });
      fetchNextPage();
    });
  
  return records;
}

async function searchProperty(propertyId: string) {
  const base = getAirtableBase();
  
  console.log(`\n🔍 Buscando "${propertyId}" en todas las views de Airtable...\n`);
  
  const views = [
    { phase: 'upcoming-settlements', viewId: 'viwpYQ0hsSSdFrSD1', description: 'Upcoming Settlements' },
    { phase: 'initial-check', viewId: 'viwFZZ5S3VFCfYP6g', description: 'Initial Check' },
    { phase: 'reno-budget', viewId: 'viwKS3iOiyX5iu5zP', description: 'Upcoming Reno Budget' },
    { phase: 'reno-in-progress', viewId: 'viwQUOrLzUrScuU4k', description: 'Reno In Progress' },
    { phase: 'furnishing', viewId: 'viw9NDUaeGIQDvugU', description: 'Furnishing' },
    { phase: 'final-check', viewId: 'viwnDG5TY6wjZhBL2', description: 'Final Check' },
    { phase: 'cleaning', viewId: 'viwLajczYxzQd4UvU', description: 'Cleaning' },
  ];
  
  for (const viewConfig of views) {
    const records = await fetchPropertiesFromView(viewConfig.viewId);
    
    for (const record of records) {
      const uniqueIdValue = 
        record.fields['UNIQUEID (from Engagements)'] ||
        record.fields['Unique ID (From Engagements)'] ||
        record.fields['Unique ID From Engagements'] ||
        record.fields['Unique ID'];
      
      const uniqueId = Array.isArray(uniqueIdValue) ? uniqueIdValue[0] : uniqueIdValue;
      
      if (uniqueId === propertyId) {
        console.log(`✅ ENCONTRADA en "${viewConfig.description}"`);
        console.log(`   Record ID: ${record.id}`);
        console.log(`   Address: ${record.fields['Address'] || 'N/A'}`);
        console.log(`   Set Up Status: ${record.fields['Set Up Status'] || record.fields['Set up status'] || 'N/A'}`);
        return { found: true, record, phase: viewConfig.phase };
      }
    }
  }
  
  // Buscar directamente en la tabla
  console.log(`\n🔍 Buscando directamente en la tabla...\n`);
  
  const fieldNames = [
    'UNIQUEID (from Engagements)',
    'Unique ID (From Engagements)', 
    'Unique ID From Engagements',
    'Unique ID'
  ];
  
  for (const fieldName of fieldNames) {
    try {
      const records: any[] = [];
      await base(AIRTABLE_TABLE_ID)
        .select({
          filterByFormula: `{${fieldName}} = "${propertyId}"`,
          maxRecords: 1,
        })
        .eachPage((pageRecords) => {
          pageRecords.forEach((r) => records.push(r));
        });
      
      if (records.length > 0) {
        const record = records[0];
        console.log(`✅ ENCONTRADA directamente en la tabla`);
        console.log(`   Record ID: ${record.id}`);
        console.log(`   Address: ${record.fields['Address'] || 'N/A'}`);
        console.log(`   Set Up Status: ${record.fields['Set Up Status'] || record.fields['Set up status'] || 'N/A'}`);
        console.log(`   Stage: ${record.fields['Stage'] || 'N/A'}`);
        return { found: true, record, phase: null };
      }
    } catch (error: any) {
      // Continuar
    }
  }
  
  console.log(`❌ NO encontrada en Airtable`);
  return { found: false, record: null, phase: null };
}

async function fixRenoInProgressPhases() {
  const supabase = createAdminClient();
  
  console.log('\n🔧 Corrigiendo fases de propiedades en reno-in-progress...\n');
  
  // 1. Obtener todas las propiedades de la view de Airtable
  const airtableRecords = await fetchPropertiesFromView(AIRTABLE_VIEW_ID_RENO_IN_PROGRESS);
  
  const airtableIds = airtableRecords.map(record => {
    const uniqueIdValue = 
      record.fields['UNIQUEID (from Engagements)'] ||
      record.fields['Unique ID (From Engagements)'] ||
      record.fields['Unique ID From Engagements'] ||
      record.fields['Unique ID'];
    return Array.isArray(uniqueIdValue) ? uniqueIdValue[0] : uniqueIdValue;
  }).filter(Boolean) as string[];
  
  console.log(`📊 Encontradas ${airtableIds.length} propiedades en Airtable (Reno In Progress)\n`);
  
  if (airtableIds.length === 0) {
    console.log('⚠️  No hay propiedades para corregir');
    return;
  }
  
  // 2. Verificar cuáles están en Supabase y su fase actual
  const { data: supabaseProperties } = await supabase
    .from('properties')
    .select('id, reno_phase, "Set Up Status"')
    .in('id', airtableIds);
  
  const propertiesToFix: Array<{ id: string; currentPhase: string | null }> = [];
  
  (supabaseProperties || []).forEach(prop => {
    if (prop.reno_phase !== 'reno-in-progress') {
      propertiesToFix.push({
        id: prop.id,
        currentPhase: prop.reno_phase,
      });
    }
  });
  
  console.log(`📋 Propiedades que necesitan corrección: ${propertiesToFix.length}\n`);
  
  if (propertiesToFix.length > 0) {
    console.log('🔧 Corrigiendo fases...\n');
    
    const idsToFix = propertiesToFix.map(p => p.id);
    
    const { error: updateError } = await supabase
      .from('properties')
      .update({ 
        reno_phase: 'reno-in-progress',
        'Set Up Status': 'Reno in progress',
        updated_at: new Date().toISOString()
      })
      .in('id', idsToFix);
    
    if (updateError) {
      console.error('❌ Error actualizando fases:', updateError);
    } else {
      console.log(`✅ Corregidas ${idsToFix.length} propiedades a fase 'reno-in-progress'\n`);
      
      // Mostrar algunas como ejemplo
      propertiesToFix.slice(0, 10).forEach(p => {
        console.log(`   ✅ ${p.id}: ${p.currentPhase || 'NULL'} → reno-in-progress`);
      });
      if (propertiesToFix.length > 10) {
        console.log(`   ... y ${propertiesToFix.length - 10} más`);
      }
    }
  } else {
    console.log('✅ Todas las propiedades ya están en la fase correcta');
  }
  
  // 3. Verificar propiedades que faltan en Supabase
  const supabaseIds = (supabaseProperties || []).map(p => p.id);
  const missingInSupabase = airtableIds.filter(id => !supabaseIds.includes(id));
  
  if (missingInSupabase.length > 0) {
    console.log(`\n⚠️  Propiedades en Airtable pero NO en Supabase: ${missingInSupabase.length}`);
    missingInSupabase.slice(0, 10).forEach(id => {
      console.log(`   - ${id}`);
    });
    if (missingInSupabase.length > 10) {
      console.log(`   ... y ${missingInSupabase.length - 10} más`);
    }
    console.log('\n💡 Estas propiedades necesitan ser sincronizadas desde Airtable');
  }
}

async function main() {
  const propertyId = process.argv[2];
  
  if (propertyId) {
    await searchProperty(propertyId);
  } else {
    await fixRenoInProgressPhases();
  }
}

main().catch(console.error);
