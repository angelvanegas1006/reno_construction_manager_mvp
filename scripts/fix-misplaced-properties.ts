/**
 * Script para corregir propiedades que están en fase incorrecta
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

// Mapeo de fase a "Set Up Status"
const PHASE_TO_SET_UP_STATUS: Record<string, string> = {
  'upcoming-settlements': 'Upcoming settlement',
  'initial-check': 'Initial check',
  'reno-budget': 'Upcoming reno budget',
  'reno-in-progress': 'Reno in progress',
  'furnishing': 'Furnishing',
  'final-check': 'Final check',
  'cleaning': 'Cleaning',
};

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

async function fixMisplacedProperties() {
  const supabase = createAdminClient();
  
  console.log(`\n🔧 Corrigiendo propiedades en fase incorrecta...\n`);
  
  // 1. Obtener todas las propiedades de todas las views de Airtable
  const allAirtableProperties = new Map<string, { record: any; phase: string; viewDescription: string }>();
  
  for (const viewConfig of PHASE_VIEWS) {
    console.log(`📋 Obteniendo propiedades de ${viewConfig.description}...`);
    try {
      const records = await fetchPropertiesFromView(viewConfig.viewId);
      console.log(`   ✅ Obtenidas ${records.length} propiedades`);
      
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
    } catch (error: any) {
      console.error(`   ❌ Error obteniendo ${viewConfig.description}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Total propiedades en Airtable: ${allAirtableProperties.size}\n`);
  
  // 2. Obtener todas las propiedades de Supabase
  const { data: allSupabaseProperties } = await supabase
    .from('properties')
    .select('id, reno_phase, "Set Up Status"');
  
  const supabaseMap = new Map(
    (allSupabaseProperties || []).map(p => [p.id, p])
  );
  
  console.log(`✅ Total propiedades en Supabase: ${supabaseMap.size}\n`);
  
  // 3. Encontrar propiedades en fase incorrecta
  const misplacedProperties: Array<{ 
    id: string; 
    airtablePhase: string; 
    supabasePhase: string;
    viewDescription: string;
  }> = [];
  
  for (const [uniqueId, { phase: airtablePhase, viewDescription }] of allAirtableProperties.entries()) {
    const supabaseProperty = supabaseMap.get(uniqueId);
    if (supabaseProperty && supabaseProperty.reno_phase !== airtablePhase) {
      misplacedProperties.push({
        id: uniqueId,
        airtablePhase,
        supabasePhase: supabaseProperty.reno_phase || 'NULL',
        viewDescription,
      });
    }
  }
  
  console.log(`⚠️  Propiedades en fase incorrecta: ${misplacedProperties.length}\n`);
  
  if (misplacedProperties.length === 0) {
    console.log(`✅ Todas las propiedades están en la fase correcta!`);
    return;
  }
  
  // 4. Corregir cada propiedad
  let corrected = 0;
  let errors = 0;
  
  console.log(`\n🔧 Corrigiendo ${misplacedProperties.length} propiedades...\n`);
  
  for (let i = 0; i < misplacedProperties.length; i++) {
    const prop = misplacedProperties[i];
    const setUpStatus = PHASE_TO_SET_UP_STATUS[prop.airtablePhase] || prop.airtablePhase;
    
    console.log(`[${i + 1}/${misplacedProperties.length}] 🔧 ${prop.id}: ${prop.supabasePhase} → ${prop.airtablePhase}`);
    
    try {
      const { error: updateError } = await supabase
        .from('properties')
        .update({ 
          reno_phase: prop.airtablePhase,
          'Set Up Status': setUpStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', prop.id);
      
      if (updateError) {
        console.error(`   ❌ Error: ${updateError.message}`);
        errors++;
      } else {
        console.log(`   ✅ Corregida`);
        corrected++;
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      errors++;
    }
    
    // Pequeña pausa para no sobrecargar la base de datos
    if (i < misplacedProperties.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n📊 RESUMEN:`);
  console.log(`   Total propiedades a corregir: ${misplacedProperties.length}`);
  console.log(`   ✅ Corregidas: ${corrected}`);
  console.log(`   ❌ Errores: ${errors}`);
  
  // 5. Mostrar detalles de las corregidas
  if (corrected > 0) {
    console.log(`\n✅ Propiedades corregidas:`);
    misplacedProperties.slice(0, 20).forEach(p => {
      console.log(`   - ${p.id}: ${p.supabasePhase} → ${p.airtablePhase}`);
    });
    if (misplacedProperties.length > 20) {
      console.log(`   ... y ${misplacedProperties.length - 20} más`);
    }
  }
}

async function syncMissingProperties() {
  const supabase = createAdminClient();
  
  console.log(`\n🔄 Sincronizando propiedades faltantes...\n`);
  
  // Obtener todas las propiedades de Airtable
  const allAirtableProperties = new Map<string, { record: any; phase: string }>();
  
  for (const viewConfig of PHASE_VIEWS) {
    const records = await fetchPropertiesFromView(viewConfig.viewId);
    for (const record of records) {
      const uniqueId = extractUniqueId(record);
      if (uniqueId) {
        allAirtableProperties.set(uniqueId, { record, phase: viewConfig.phase });
      }
    }
  }
  
  // Obtener todas las propiedades de Supabase
  const { data: allSupabaseProperties } = await supabase
    .from('properties')
    .select('id');
  
  const supabaseIds = new Set((allSupabaseProperties || []).map(p => p.id));
  
  // Encontrar faltantes
  const missingProperties: Array<{ id: string; phase: string; record: any }> = [];
  
  for (const [uniqueId, { phase, record }] of allAirtableProperties.entries()) {
    if (!supabaseIds.has(uniqueId)) {
      missingProperties.push({ id: uniqueId, phase, record });
    }
  }
  
  console.log(`⚠️  Propiedades faltantes en Supabase: ${missingProperties.length}\n`);
  
  if (missingProperties.length === 0) {
    console.log(`✅ No hay propiedades faltantes!`);
    return;
  }
  
  // Nota: Para sincronizar propiedades faltantes necesitaríamos usar syncPropertiesFromAirtable
  // Por ahora solo mostramos cuáles faltan
  console.log(`Propiedades que necesitan sincronización:`);
  missingProperties.forEach(p => {
    console.log(`   - ${p.id} (${p.phase})`);
  });
  
  console.log(`\n💡 Estas propiedades necesitan ser sincronizadas usando syncPropertiesFromAirtable`);
}

async function main() {
  console.log(`\n🚀 Iniciando corrección de sincronización...\n`);
  
  // 1. Corregir propiedades en fase incorrecta
  await fixMisplacedProperties();
  
  // 2. Mostrar propiedades faltantes (no las sincronizamos automáticamente por seguridad)
  await syncMissingProperties();
  
  console.log(`\n✅ Proceso completado!\n`);
}

main().catch(console.error);
