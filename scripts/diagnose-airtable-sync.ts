/**
 * Script para diagnosticar problemas de sincronización entre Airtable y Supabase
 * Verifica propiedades específicas y cuenta propiedades mal ubicadas o faltantes
 * 
 * Uso: npx tsx scripts/diagnose-airtable-sync.ts [PROPERTY_ID]
 * Ejemplo: npx tsx scripts/diagnose-airtable-sync.ts SP-RZ2-NQB005312
 */

import { loadEnvConfig } from '@next/env';
import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const AIRTABLE_BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || '';
const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY || '';
const AIRTABLE_TABLE_ID = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_ID || 'tblY1XqJYJYJYJYJ';
const AIRTABLE_VIEW_ID_RENO_IN_PROGRESS = 'viwQUOrLzUrScuU4k';

interface AirtableProperty {
  id: string;
  fields: {
    'UNIQUEID (from Engagements)'?: string;
    'Unique ID (From Engagements)'?: string;
    'Set Up Status'?: string;
    'Address'?: string;
    [key: string]: any;
  };
}

function getAirtableBase() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error('Missing Airtable credentials. Check NEXT_PUBLIC_AIRTABLE_API_KEY and NEXT_PUBLIC_AIRTABLE_BASE_ID');
  }
  return new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
}

async function fetchPropertiesFromAirtable(viewId: string): Promise<AirtableProperty[]> {
  const base = getAirtableBase();
  const records: AirtableProperty[] = [];

  try {
    await base(AIRTABLE_TABLE_ID)
      .select({
        view: viewId,
      })
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach((record) => {
          records.push({
            id: record.id,
            fields: record.fields as any,
          });
        });
        fetchNextPage();
      });

    return records;
  } catch (error: any) {
    console.error('Error fetching from Airtable:', error);
    throw error;
  }
}

async function diagnoseProperty(propertyId: string) {
  const supabase = createAdminClient();
  
  console.log(`\n🔍 Diagnóstico para propiedad: ${propertyId}\n`);
  
  // 1. Buscar en Supabase
  const { data: supabaseProperty, error: supabaseError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (supabaseError) {
    if (supabaseError.code === 'PGRST116') {
      console.log('❌ NO encontrada en Supabase');
    } else {
      console.error('❌ Error buscando en Supabase:', supabaseError);
    }
  } else {
    console.log('✅ Encontrada en Supabase:');
    console.log(`   ID: ${supabaseProperty.id}`);
    console.log(`   Address: ${supabaseProperty.address || 'N/A'}`);
    console.log(`   reno_phase: ${supabaseProperty.reno_phase || 'NULL'}`);
    console.log(`   Set Up Status: ${supabaseProperty['Set Up Status'] || 'NULL'}`);
    console.log(`   airtable_property_id: ${supabaseProperty.airtable_property_id || 'NULL'}`);
  }

  // 2. Buscar en Airtable (todas las views)
  const base = getAirtableBase();
  let foundInAirtable = false;
  let airtableRecord: AirtableProperty | null = null;

  try {
    // Buscar en la tabla completa
    const records = await base(AIRTABLE_TABLE_ID)
      .select({
        filterByFormula: `{UNIQUEID (from Engagements)} = "${propertyId}"`,
      })
      .firstPage();

    if (records.length > 0) {
      foundInAirtable = true;
      airtableRecord = {
        id: records[0].id,
        fields: records[0].fields as any,
      };
      
      console.log('\n✅ Encontrada en Airtable:');
      console.log(`   Record ID: ${airtableRecord.id}`);
      console.log(`   Address: ${airtableRecord.fields['Address'] || 'N/A'}`);
      console.log(`   Set Up Status: ${airtableRecord.fields['Set Up Status'] || 'NULL'}`);
      
      // Verificar en qué views está
      console.log('\n📋 Verificando en qué views está:');
      
      // Check Reno In Progress view
      const renoInProgressRecords = await base(AIRTABLE_TABLE_ID)
        .select({
          view: AIRTABLE_VIEW_ID_RENO_IN_PROGRESS,
          filterByFormula: `{UNIQUEID (from Engagements)} = "${propertyId}"`,
        })
        .firstPage();
      
      console.log(`   - Reno In Progress view: ${renoInProgressRecords.length > 0 ? '✅ SÍ' : '❌ NO'}`);
    } else {
      console.log('\n❌ NO encontrada en Airtable');
    }
  } catch (error: any) {
    console.error('❌ Error buscando en Airtable:', error.message);
  }

  // 3. Comparar y diagnosticar
  console.log('\n📊 Diagnóstico:');
  
  if (!foundInAirtable && !supabaseProperty) {
    console.log('   ⚠️  Propiedad no existe ni en Airtable ni en Supabase');
  } else if (foundInAirtable && !supabaseProperty) {
    console.log('   ❌ FALTA MIGRAR: Está en Airtable pero NO en Supabase');
  } else if (!foundInAirtable && supabaseProperty) {
    console.log('   ⚠️  Está en Supabase pero NO en Airtable (puede ser normal si fue eliminada)');
  } else {
    // Ambos existen, comparar fase
    const airtableSetUpStatus = airtableRecord?.fields['Set Up Status'] || '';
    const supabasePhase = supabaseProperty?.reno_phase || '';
    const supabaseSetUpStatus = supabaseProperty?.['Set Up Status'] || '';
    
    const shouldBeInRenoInProgress = 
      airtableSetUpStatus?.toLowerCase().includes('reno in progress') ||
      airtableSetUpStatus?.toLowerCase().includes('obras en proceso');
    
    if (shouldBeInRenoInProgress && supabasePhase !== 'reno-in-progress') {
      console.log('   ❌ MAL UBICADA: En Airtable está en "Reno in progress" pero en Supabase está en:', supabasePhase || 'NULL');
    } else if (!shouldBeInRenoInProgress && supabasePhase === 'reno-in-progress') {
      console.log('   ⚠️  En Supabase está en "reno-in-progress" pero en Airtable Set Up Status es:', airtableSetUpStatus);
    } else {
      console.log('   ✅ Sincronización correcta');
    }
  }
}

async function countMisplacedProperties() {
  const supabase = createAdminClient();
  
  console.log('\n📊 Contando propiedades mal ubicadas y faltantes...\n');
  
  // 1. Obtener todas las propiedades de Airtable en "Reno In Progress"
  console.log('1️⃣ Obteniendo propiedades de Airtable (Reno In Progress view)...');
  const airtableProperties = await fetchPropertiesFromAirtable(AIRTABLE_VIEW_ID_RENO_IN_PROGRESS);
  console.log(`   ✅ Encontradas ${airtableProperties.length} propiedades en Airtable\n`);
  
  // Extraer Unique IDs
  const airtableUniqueIds = airtableProperties.map(p => {
    const uniqueId = 
      p.fields['UNIQUEID (from Engagements)'] ||
      p.fields['Unique ID (From Engagements)'] ||
      p.fields['Unique ID From Engagements'] ||
      p.fields['Unique ID'];
    return Array.isArray(uniqueId) ? uniqueId[0] : uniqueId;
  }).filter(Boolean) as string[];
  
  console.log(`   Unique IDs encontrados: ${airtableUniqueIds.length}`);
  if (airtableUniqueIds.length > 0) {
    console.log(`   Ejemplos: ${airtableUniqueIds.slice(0, 3).join(', ')}...`);
  }
  
  // 2. Buscar estas propiedades en Supabase
  console.log('\n2️⃣ Buscando en Supabase...');
  let supabaseProperties: any[] = [];
  
  if (airtableUniqueIds.length > 0) {
    const { data, error } = await supabase
      .from('properties')
      .select('id, reno_phase, "Set Up Status", address')
      .in('id', airtableUniqueIds);
    
    if (error) {
      console.error('   ❌ Error buscando en Supabase:', error);
    } else {
      supabaseProperties = data || [];
      console.log(`   ✅ Encontradas ${supabaseProperties.length} propiedades en Supabase`);
    }
  }
  
  // 3. Analizar diferencias
  console.log('\n3️⃣ Analizando diferencias...\n');
  
  const supabasePropertyIds = new Set(supabaseProperties.map(p => p.id));
  const missingInSupabase: string[] = [];
  const misplacedInSupabase: Array<{ id: string; airtableStatus: string; supabasePhase: string }> = [];
  const correctlyPlaced: number[] = [];
  
  airtableProperties.forEach(airtableProp => {
    const uniqueId = 
      airtableProp.fields['UNIQUEID (from Engagements)'] ||
      airtableProp.fields['Unique ID (From Engagements)'] ||
      airtableProp.fields['Unique ID From Engagements'] ||
      airtableProp.fields['Unique ID'];
    const uniqueIdValue = Array.isArray(uniqueId) ? uniqueId[0] : uniqueId;
    
    if (!uniqueIdValue) return;
    
    const setUpStatus = airtableProp.fields['Set Up Status'] || '';
    const shouldBeInRenoInProgress = 
      setUpStatus?.toLowerCase().includes('reno in progress') ||
      setUpStatus?.toLowerCase().includes('obras en proceso');
    
    if (!supabasePropertyIds.has(uniqueIdValue)) {
      missingInSupabase.push(uniqueIdValue);
    } else {
      const supabaseProp = supabaseProperties.find(p => p.id === uniqueIdValue);
      if (supabaseProp) {
        if (shouldBeInRenoInProgress && supabaseProp.reno_phase !== 'reno-in-progress') {
          misplacedInSupabase.push({
            id: uniqueIdValue,
            airtableStatus: setUpStatus,
            supabasePhase: supabaseProp.reno_phase || 'NULL',
          });
        } else if (shouldBeInRenoInProgress && supabaseProp.reno_phase === 'reno-in-progress') {
          correctlyPlaced.push(1);
        }
      }
    }
  });
  
  // 4. Mostrar resultados
  console.log('📊 RESULTADOS:\n');
  console.log(`   ✅ Correctamente ubicadas: ${correctlyPlaced.length}`);
  console.log(`   ❌ Faltan migrar (en Airtable pero NO en Supabase): ${missingInSupabase.length}`);
  console.log(`   ⚠️  Mal ubicadas (en Airtable "Reno in progress" pero en Supabase otra fase): ${misplacedInSupabase.length}\n`);
  
  if (missingInSupabase.length > 0) {
    console.log('📋 Propiedades que faltan migrar (primeras 10):');
    missingInSupabase.slice(0, 10).forEach((id, i) => {
      console.log(`   ${i + 1}. ${id}`);
    });
    if (missingInSupabase.length > 10) {
      console.log(`   ... y ${missingInSupabase.length - 10} más`);
    }
    console.log('');
  }
  
  if (misplacedInSupabase.length > 0) {
    console.log('📋 Propiedades mal ubicadas (primeras 10):');
    misplacedInSupabase.slice(0, 10).forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.id}`);
      console.log(`      Airtable: "${item.airtableStatus}"`);
      console.log(`      Supabase: "${item.supabasePhase}"`);
    });
    if (misplacedInSupabase.length > 10) {
      console.log(`   ... y ${misplacedInSupabase.length - 10} más`);
    }
    console.log('');
  }
  
  return {
    totalInAirtable: airtableProperties.length,
    correctlyPlaced: correctlyPlaced.length,
    missingInSupabase: missingInSupabase.length,
    misplacedInSupabase: misplacedInSupabase.length,
    missingIds: missingInSupabase,
    misplacedIds: misplacedInSupabase.map(m => m.id),
  };
}

async function main() {
  const propertyId = process.argv[2];
  
  if (propertyId) {
    // Diagnóstico de propiedad específica
    await diagnoseProperty(propertyId);
  } else {
    // Análisis completo
    const results = await countMisplacedProperties();
    
    console.log('\n✅ Diagnóstico completado\n');
    console.log('Resumen:');
    console.log(`   Total en Airtable (Reno In Progress): ${results.totalInAirtable}`);
    console.log(`   Correctamente ubicadas: ${results.correctlyPlaced}`);
    console.log(`   Faltan migrar: ${results.missingInSupabase}`);
    console.log(`   Mal ubicadas: ${results.misplacedInSupabase}\n`);
  }
}

main().catch(console.error);
