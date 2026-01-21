/**
 * Script para comparar propiedades entre Airtable y Supabase
 * Verifica diferencias en conteos por fase y busca propiedades específicas
 * 
 * Uso: npx tsx scripts/compare-airtable-reno-phases.ts [PROPERTY_ID]
 * Ejemplo: npx tsx scripts/compare-airtable-reno-phases.ts SP-RZ2-NQB005312
 */

import { loadEnvConfig } from '@next/env';
import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || 'appT59F8wolMDKZeG';
const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';

// Configuración de vistas por fase
const PHASE_VIEWS = [
  { phase: 'upcoming-settlements', viewId: 'viwpYQ0hsSSdFrSD1', description: 'Upcoming Settlements' },
  { phase: 'initial-check', viewId: 'viwFZZ5S3VFCfYP6g', description: 'Initial Check' },
  { phase: 'reno-budget', viewId: 'viwKS3iOiyX5iu5zP', description: 'Upcoming Reno Budget' },
  { phase: 'reno-in-progress', viewId: 'viwQUOrLzUrScuU4k', description: 'Reno In Progress' },
  { phase: 'furnishing', viewId: 'viw9NDUaeGIQDvugU', description: 'Furnishing' },
  { phase: 'final-check', viewId: 'viwnDG5TY6wjZhBL2', description: 'Final Check' },
  { phase: 'cleaning', viewId: 'viwLajczYxzQd4UvU', description: 'Cleaning' },
];

function getAirtableBase() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error('Missing Airtable credentials');
  }
  return new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
}

async function fetchPropertiesFromView(viewId: string): Promise<any[]> {
  const base = getAirtableBase();
  const records: any[] = [];
  
  try {
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
  } catch (error: any) {
    console.error(`Error fetching from view ${viewId}:`, error.message);
  }
  
  return records;
}

async function searchPropertyInAirtable(propertyId: string) {
  const base = getAirtableBase();
  const records: any[] = [];
  
  console.log(`\n🔍 Buscando "${propertyId}" en Airtable...\n`);
  
  // Buscar en todas las views
  for (const viewConfig of PHASE_VIEWS) {
    try {
      const viewRecords = await fetchPropertiesFromView(viewConfig.viewId);
      
      for (const record of viewRecords) {
        const uniqueIdValue = 
          record.fields['UNIQUEID (from Engagements)'] ||
          record.fields['Unique ID (From Engagements)'] ||
          record.fields['Unique ID From Engagements'] ||
          record.fields['Unique ID'];
        
        const uniqueId = Array.isArray(uniqueIdValue) ? uniqueIdValue[0] : uniqueIdValue;
        
        if (uniqueId === propertyId) {
          console.log(`✅ ENCONTRADA en view "${viewConfig.description}" (${viewConfig.phase})`);
          console.log(`   Record ID: ${record.id}`);
          console.log(`   Address: ${record.fields['Address'] || 'N/A'}`);
          console.log(`   Set Up Status: ${record.fields['Set Up Status'] || record.fields['Set up status'] || 'N/A'}`);
          console.log(`   Stage: ${record.fields['Stage'] || 'N/A'}`);
          return { found: true, record, phase: viewConfig.phase, viewId: viewConfig.viewId };
        }
      }
    } catch (error: any) {
      console.warn(`⚠️  Error buscando en view ${viewConfig.description}:`, error.message);
    }
  }
  
  // Si no se encontró en views, buscar directamente en la tabla
  console.log(`\n🔍 Buscando directamente en la tabla Transactions...\n`);
  
  const fieldNames = [
    'UNIQUEID (from Engagements)',
    'Unique ID (From Engagements)', 
    'Unique ID From Engagements',
    'Unique ID'
  ];
  
  for (const fieldName of fieldNames) {
    try {
      await base(AIRTABLE_TABLE_ID)
        .select({
          filterByFormula: `{${fieldName}} = "${propertyId}"`,
          maxRecords: 1,
        })
        .eachPage((pageRecords) => {
          pageRecords.forEach((record) => {
            records.push({
              id: record.id,
              fields: record.fields,
            });
          });
        });
      
      if (records.length > 0) break;
    } catch (error: any) {
      // Continuar con el siguiente campo
    }
  }
  
  if (records.length > 0) {
    const record = records[0];
    console.log(`✅ ENCONTRADA directamente en la tabla`);
    console.log(`   Record ID: ${record.id}`);
    console.log(`   Address: ${record.fields['Address'] || 'N/A'}`);
    console.log(`   Set Up Status: ${record.fields['Set Up Status'] || record.fields['Set up status'] || 'N/A'}`);
    console.log(`   Stage: ${record.fields['Stage'] || 'N/A'}`);
    
    // Verificar en qué views aparece
    console.log(`\n📋 Verificando en qué views aparece...\n`);
    for (const viewConfig of PHASE_VIEWS) {
      const viewRecords = await fetchPropertiesFromView(viewConfig.viewId);
      const foundInView = viewRecords.some(r => r.id === record.id);
      console.log(`   ${viewConfig.description}: ${foundInView ? '✅ SÍ' : '❌ NO'}`);
    }
    
    return { found: true, record, phase: null, viewId: null };
  }
  
  console.log(`❌ NO encontrada en Airtable`);
  return { found: false, record: null, phase: null, viewId: null };
}

async function comparePhases() {
  const supabase = createAdminClient();
  
  console.log('\n📊 Comparando fases entre Airtable y Supabase...\n');
  
  const comparison: Array<{
    phase: string;
    airtableCount: number;
    supabaseCount: number;
    difference: number;
    airtableIds: string[];
    supabaseIds: string[];
  }> = [];
  
  // 1. Obtener conteos de Airtable por view
  console.log('1️⃣ Obteniendo propiedades de Airtable por fase...\n');
  
  for (const viewConfig of PHASE_VIEWS) {
    const airtableRecords = await fetchPropertiesFromView(viewConfig.viewId);
    
    const airtableIds = airtableRecords.map(record => {
      const uniqueIdValue = 
        record.fields['UNIQUEID (from Engagements)'] ||
        record.fields['Unique ID (From Engagements)'] ||
        record.fields['Unique ID From Engagements'] ||
        record.fields['Unique ID'];
      return Array.isArray(uniqueIdValue) ? uniqueIdValue[0] : uniqueIdValue;
    }).filter(Boolean) as string[];
    
    // 2. Obtener conteos de Supabase por fase
    const { data: supabaseProperties } = await supabase
      .from('properties')
      .select('id, reno_phase')
      .eq('reno_phase', viewConfig.phase);
    
    const supabaseIds = (supabaseProperties || []).map(p => p.id);
    
    const difference = airtableIds.length - supabaseIds.length;
    
    comparison.push({
      phase: viewConfig.phase,
      airtableCount: airtableIds.length,
      supabaseCount: supabaseIds.length,
      difference,
      airtableIds,
      supabaseIds,
    });
    
    console.log(`   ${viewConfig.description} (${viewConfig.phase}):`);
    console.log(`      Airtable: ${airtableIds.length}`);
    console.log(`      Supabase: ${supabaseIds.length}`);
    console.log(`      Diferencia: ${difference > 0 ? '+' : ''}${difference}\n`);
  }
  
  // 3. Encontrar propiedades en Airtable pero no en Supabase
  console.log('\n2️⃣ Propiedades en Airtable pero NO en Supabase:\n');
  
  for (const comp of comparison) {
    if (comp.difference > 0) {
      const missingInSupabase = comp.airtableIds.filter(id => !comp.supabaseIds.includes(id));
      if (missingInSupabase.length > 0) {
        console.log(`   ${comp.phase} (${missingInSupabase.length} faltantes):`);
        missingInSupabase.slice(0, 10).forEach(id => {
          console.log(`      - ${id}`);
        });
        if (missingInSupabase.length > 10) {
          console.log(`      ... y ${missingInSupabase.length - 10} más`);
        }
        console.log('');
      }
    }
  }
  
  // 4. Encontrar propiedades en Supabase pero no en Airtable
  console.log('\n3️⃣ Propiedades en Supabase pero NO en Airtable:\n');
  
  for (const comp of comparison) {
    if (comp.difference < 0) {
      const missingInAirtable = comp.supabaseIds.filter(id => !comp.airtableIds.includes(id));
      if (missingInAirtable.length > 0) {
        console.log(`   ${comp.phase} (${missingInAirtable.length} extras):`);
        missingInAirtable.slice(0, 10).forEach(id => {
          console.log(`      - ${id}`);
        });
        if (missingInAirtable.length > 10) {
          console.log(`      ... y ${missingInAirtable.length - 10} más`);
        }
        console.log('');
      }
    }
  }
  
  // 5. Resumen total
  const totalAirtable = comparison.reduce((sum, c) => sum + c.airtableCount, 0);
  const totalSupabase = comparison.reduce((sum, c) => sum + c.supabaseCount, 0);
  
  console.log('\n📊 RESUMEN TOTAL:\n');
  console.log(`   Total en Airtable (todas las fases): ${totalAirtable}`);
  console.log(`   Total en Supabase (todas las fases): ${totalSupabase}`);
  console.log(`   Diferencia total: ${totalAirtable - totalSupabase}\n`);
  
  return comparison;
}

async function main() {
  const propertyId = process.argv[2];
  
  if (propertyId) {
    // Buscar propiedad específica
    await searchPropertyInAirtable(propertyId);
  } else {
    // Comparar todas las fases
    await comparePhases();
  }
}

main().catch(console.error);
