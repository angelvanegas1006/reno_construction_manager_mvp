/**
 * Script para diagnosticar sincronización de propiedades entre Airtable y Supabase
 * Verifica propiedades faltantes, mal ubicadas y datos faltantes
 */

import { loadEnvConfig } from '@next/env';
import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';

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

function extractUniqueId(record: any): string | null {
  const uniqueIdValue = 
    record.fields['UNIQUEID (from Engagements)'] ||
    record.fields['Unique ID (From Engagements)'] ||
    record.fields['Unique ID From Engagements'] ||
    record.fields['Unique ID'];
  
  if (Array.isArray(uniqueIdValue)) {
    return uniqueIdValue[0] || null;
  }
  return uniqueIdValue || null;
}

function getSetUpStatus(record: any): string | null {
  return record.fields['Set Up Status'] || 
         record.fields['Set up status'] || 
         null;
}

async function diagnoseProperty(propertyId: string) {
  const supabase = createAdminClient();
  
  console.log(`\n🔍 Diagnóstico de propiedad: ${propertyId}\n`);
  
  // 1. Buscar en Supabase
  const { data: supabaseProperty, error: supabaseError } = await supabase
    .from('properties')
    .select('id, reno_phase, "Set Up Status", budget_pdf_url, airtable_property_id, address')
    .eq('id', propertyId)
    .single();
  
  if (supabaseError && supabaseError.code !== 'PGRST116') {
    console.error(`❌ Error buscando en Supabase: ${supabaseError.message}`);
    return;
  }
  
  if (!supabaseProperty) {
    console.log(`❌ NO encontrada en Supabase`);
  } else {
    console.log(`✅ Encontrada en Supabase:`);
    console.log(`   ID: ${supabaseProperty.id}`);
    console.log(`   Address: ${supabaseProperty.address || 'N/A'}`);
    console.log(`   reno_phase: ${supabaseProperty.reno_phase || 'NULL'}`);
    console.log(`   Set Up Status: ${supabaseProperty['Set Up Status'] || 'NULL'}`);
    console.log(`   budget_pdf_url: ${supabaseProperty.budget_pdf_url || 'NULL'}`);
    console.log(`   airtable_property_id: ${supabaseProperty.airtable_property_id || 'NULL'}`);
    
    // Verificar categorías dinámicas
    const { data: categories } = await supabase
      .from('property_dynamic_categories')
      .select('id, category_name, percentage, budget_index')
      .eq('property_id', propertyId);
    
    console.log(`   Categorías dinámicas: ${categories?.length || 0}`);
    if (categories && categories.length > 0) {
      const avgProgress = Math.round(
        categories.reduce((sum, cat) => sum + (cat.percentage || 0), 0) / categories.length
      );
      console.log(`   Progreso promedio: ${avgProgress}%`);
      console.log(`   Categorías:`);
      categories.forEach(cat => {
        console.log(`      - ${cat.category_name}: ${cat.percentage || 0}% (budget_index: ${cat.budget_index || 'NULL'})`);
      });
    }
  }
  
  // 2. Buscar en Airtable
  console.log(`\n🔍 Buscando en Airtable...\n`);
  
  let foundInAirtable = false;
  let airtableRecord: any = null;
  let foundPhase: string | null = null;
  
  for (const viewConfig of PHASE_VIEWS) {
    const records = await fetchPropertiesFromView(viewConfig.viewId);
    
    for (const record of records) {
      const uniqueId = extractUniqueId(record);
      
      if (uniqueId === propertyId) {
        foundInAirtable = true;
        airtableRecord = record;
        foundPhase = viewConfig.phase;
        console.log(`✅ ENCONTRADA en Airtable:`);
        console.log(`   View: ${viewConfig.description} (${viewConfig.phase})`);
        console.log(`   Record ID: ${record.id}`);
        console.log(`   Set Up Status: ${getSetUpStatus(record) || 'N/A'}`);
        console.log(`   Address: ${record.fields['Address'] || 'N/A'}`);
        
        // Verificar budget PDF URL en Airtable
        const budgetPdfUrl = record.fields['Budget PDF URL'] || 
                            record.fields['Budget PDF'] ||
                            record.fields['budget_pdf_url'] ||
                            null;
        console.log(`   Budget PDF URL: ${budgetPdfUrl || 'NULL'}`);
        break;
      }
    }
    
    if (foundInAirtable) break;
  }
  
  if (!foundInAirtable) {
    console.log(`❌ NO encontrada en ninguna view de Airtable`);
  }
  
  // 3. Comparar y diagnosticar
  if (supabaseProperty && airtableRecord) {
    console.log(`\n📊 COMPARACIÓN:\n`);
    
    const airtableStatus = getSetUpStatus(airtableRecord);
    const supabaseStatus = supabaseProperty['Set Up Status'];
    const supabasePhase = supabaseProperty.reno_phase;
    
    const budgetPdfUrlAirtable = airtableRecord.fields['Budget PDF URL'] || 
                                 airtableRecord.fields['Budget PDF'] ||
                                 airtableRecord.fields['budget_pdf_url'] ||
                                 null;
    
    console.log(`   Fase en Airtable: ${foundPhase}`);
    console.log(`   Fase en Supabase: ${supabasePhase || 'NULL'}`);
    console.log(`   Set Up Status en Airtable: ${airtableStatus || 'NULL'}`);
    console.log(`   Set Up Status en Supabase: ${supabaseStatus || 'NULL'}`);
    
    if (foundPhase !== supabasePhase) {
      console.log(`   ⚠️  FASE INCORRECTA: Debería estar en '${foundPhase}' pero está en '${supabasePhase}'`);
    }
    
    if (budgetPdfUrlAirtable && !supabaseProperty.budget_pdf_url) {
      console.log(`   ⚠️  FALTA budget_pdf_url en Supabase (existe en Airtable)`);
    }
    
    if (!budgetPdfUrlAirtable && !supabaseProperty.budget_pdf_url) {
      console.log(`   ⚠️  NO tiene budget_pdf_url ni en Airtable ni en Supabase`);
    }
  } else if (supabaseProperty && !foundInAirtable) {
    console.log(`\n⚠️  Existe en Supabase pero NO en Airtable`);
  } else if (!supabaseProperty && foundInAirtable) {
    console.log(`\n⚠️  Existe en Airtable pero NO en Supabase - necesita sincronización`);
  }
}

async function countMissingAndMisplaced() {
  const supabase = createAdminClient();
  
  console.log(`\n📊 Analizando todas las propiedades de Airtable...\n`);
  
  // 1. Obtener todas las propiedades de todas las views de Airtable
  const allAirtableProperties = new Map<string, { record: any; phase: string; viewDescription: string }>();
  
  for (const viewConfig of PHASE_VIEWS) {
    const records = await fetchPropertiesFromView(viewConfig.viewId);
    
    for (const record of records) {
      const uniqueId = extractUniqueId(record);
      if (uniqueId) {
        allAirtableProperties.set(uniqueId, {
          record,
          phase: viewConfig.phase,
          viewDescription: viewConfig.description,
        });
      }
    }
  }
  
  console.log(`✅ Total propiedades en Airtable (todas las fases): ${allAirtableProperties.size}\n`);
  
  // 2. Obtener todas las propiedades de Supabase
  const { data: allSupabaseProperties } = await supabase
    .from('properties')
    .select('id, reno_phase, "Set Up Status", budget_pdf_url');
  
  const supabaseMap = new Map(
    (allSupabaseProperties || []).map(p => [p.id, p])
  );
  
  console.log(`✅ Total propiedades en Supabase: ${supabaseMap.size}\n`);
  
  // 3. Encontrar propiedades en Airtable pero NO en Supabase
  const missingInSupabase: Array<{ id: string; phase: string; viewDescription: string }> = [];
  
  for (const [uniqueId, { phase, viewDescription }] of allAirtableProperties.entries()) {
    if (!supabaseMap.has(uniqueId)) {
      missingInSupabase.push({ id: uniqueId, phase, viewDescription });
    }
  }
  
  console.log(`❌ Propiedades en Airtable pero NO en Supabase: ${missingInSupabase.length}`);
  if (missingInSupabase.length > 0) {
    console.log(`\n   Primeras 20:`);
    missingInSupabase.slice(0, 20).forEach(p => {
      console.log(`      - ${p.id} (${p.viewDescription})`);
    });
    if (missingInSupabase.length > 20) {
      console.log(`      ... y ${missingInSupabase.length - 20} más`);
    }
  }
  
  // 4. Encontrar propiedades en fase incorrecta
  const misplacedProperties: Array<{ id: string; airtablePhase: string; supabasePhase: string }> = [];
  
  for (const [uniqueId, { phase: airtablePhase }] of allAirtableProperties.entries()) {
    const supabaseProperty = supabaseMap.get(uniqueId);
    if (supabaseProperty && supabaseProperty.reno_phase !== airtablePhase) {
      misplacedProperties.push({
        id: uniqueId,
        airtablePhase,
        supabasePhase: supabaseProperty.reno_phase || 'NULL',
      });
    }
  }
  
  console.log(`\n⚠️  Propiedades en fase INCORRECTA: ${misplacedProperties.length}`);
  if (misplacedProperties.length > 0) {
    console.log(`\n   Primeras 20:`);
    misplacedProperties.slice(0, 20).forEach(p => {
      console.log(`      - ${p.id}: Airtable=${p.airtablePhase}, Supabase=${p.supabasePhase}`);
    });
    if (misplacedProperties.length > 20) {
      console.log(`      ... y ${misplacedProperties.length - 20} más`);
    }
  }
  
  // 5. Encontrar propiedades sin budget_pdf_url en Supabase pero que deberían tenerlo
  const withoutBudgetPdf: Array<{ id: string; phase: string }> = [];
  
  for (const [uniqueId, { phase }] of allAirtableProperties.entries()) {
    const supabaseProperty = supabaseMap.get(uniqueId);
    if (supabaseProperty && !supabaseProperty.budget_pdf_url) {
      // Solo contar las que están en fases que requieren budget
      if (['reno-in-progress', 'furnishing', 'final-check', 'cleaning'].includes(phase)) {
        withoutBudgetPdf.push({ id: uniqueId, phase });
      }
    }
  }
  
  console.log(`\n⚠️  Propiedades sin budget_pdf_url (en fases que lo requieren): ${withoutBudgetPdf.length}`);
  if (withoutBudgetPdf.length > 0) {
    console.log(`\n   Primeras 20:`);
    withoutBudgetPdf.slice(0, 20).forEach(p => {
      console.log(`      - ${p.id} (${p.phase})`);
    });
    if (withoutBudgetPdf.length > 20) {
      console.log(`      ... y ${withoutBudgetPdf.length - 20} más`);
    }
  }
  
  // 6. Resumen final
  console.log(`\n📊 RESUMEN FINAL:\n`);
  console.log(`   Total en Airtable: ${allAirtableProperties.size}`);
  console.log(`   Total en Supabase: ${supabaseMap.size}`);
  console.log(`   Faltantes en Supabase: ${missingInSupabase.length}`);
  console.log(`   En fase incorrecta: ${misplacedProperties.length}`);
  console.log(`   Sin budget_pdf_url: ${withoutBudgetPdf.length}`);
  
  return {
    totalAirtable: allAirtableProperties.size,
    totalSupabase: supabaseMap.size,
    missingInSupabase: missingInSupabase.length,
    misplaced: misplacedProperties.length,
    withoutBudgetPdf: withoutBudgetPdf.length,
  };
}

async function main() {
  const propertyId = process.argv[2];
  
  if (propertyId) {
    await diagnoseProperty(propertyId);
  } else {
    await countMissingAndMisplaced();
  }
}

main().catch(console.error);
