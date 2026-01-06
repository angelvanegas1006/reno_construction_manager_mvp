/**
 * Script de diagnóstico para verificar problemas de sincronización Airtable <> Supabase
 * 
 * Este script:
 * 1. Cuenta propiedades en cada fase en Supabase
 * 2. Verifica que las vistas de Airtable estén usando los IDs correctos
 * 3. Identifica propiedades que podrían estar en múltiples fases
 * 4. Compara conteos entre Airtable y Supabase
 */

import Airtable from 'airtable';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchPropertiesFromAirtable } from '@/lib/airtable/sync-from-airtable';

// Configuración de vistas según documentación
const PHASE_VIEWS = {
  'upcoming-settlements': {
    viewId: 'viwpYQ0hsSSdFrSD1',
    description: 'Upcoming Settlements (Upcoming Reno)',
  },
  'reno-budget': {
    viewId: 'viwKS3iOiyX5iu5zP',
    description: 'Upcoming Reno Budget',
  },
  'initial-check': {
    viewId: 'viwFZZ5S3VFCfYP6g',
    description: 'Initial Check',
  },
  'reno-in-progress': {
    viewId: 'viwQUOrLzUrScuU4k',
    description: 'Reno In Progress',
  },
  'furnishing-cleaning': {
    viewId: 'viw9NDUaeGIQDvugU',
    description: 'Furnishing & Cleaning',
  },
  'final-check': {
    viewId: 'viwnDG5TY6wjZhBL2',
    description: 'Final Check',
  },
};

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';

function getAirtableBase() {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    throw new Error('Airtable credentials not configured');
  }

  return new Airtable({ apiKey }).base(baseId);
}

async function countPropertiesInSupabasePhase(phase: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('reno_phase', phase);

  if (error) {
    console.error(`Error counting properties in phase ${phase}:`, error);
    return 0;
  }

  return count || 0;
}

async function countPropertiesInAirtableView(viewId: string): Promise<number> {
  try {
    const base = getAirtableBase();
    let count = 0;

    await base(AIRTABLE_TABLE_ID)
      .select({
        view: viewId,
        fields: ['Unique ID (From Engagements)'], // Solo necesitamos contar
      })
      .eachPage(() => {
        count++;
      });

    return count;
  } catch (error: any) {
    console.error(`Error counting properties in view ${viewId}:`, error.message);
    return -1; // -1 indica error
  }
}

async function getPropertyIdsFromAirtableView(viewId: string): Promise<Set<string>> {
  const propertyIds = new Set<string>();
  
  try {
    const records = await fetchPropertiesFromAirtable(AIRTABLE_TABLE_ID, viewId);
    
    records.forEach((record) => {
      const uniqueIdValue = 
        record.fields['UNIQUEID (from Engagements)'] ||
        record.fields['Unique ID (From Engagements)'] ||
        record.fields['Unique ID From Engagements'] ||
        record.fields['Unique ID'];
      
      const uniqueId = Array.isArray(uniqueIdValue) 
        ? uniqueIdValue[0] 
        : uniqueIdValue;
      
      if (uniqueId) {
        propertyIds.add(uniqueId);
      }
    });
  } catch (error: any) {
    console.error(`Error fetching properties from view ${viewId}:`, error.message);
  }
  
  return propertyIds;
}

async function getPropertyIdsFromSupabasePhase(phase: string): Promise<Set<string>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('reno_phase', phase);

  if (error) {
    console.error(`Error fetching properties from phase ${phase}:`, error);
    return new Set();
  }

  return new Set(data?.map(p => p.id) || []);
}

async function main() {
  console.log('🔍 Diagnóstico de Sincronización Airtable <> Supabase\n');
  console.log('='.repeat(80));
  console.log('Comparación de conteos por fase\n');
  console.log('='.repeat(80));

  const results: Array<{
    phase: string;
    description: string;
    viewId: string;
    supabaseCount: number;
    airtableCount: number;
    difference: number;
    status: string;
  }> = [];

  // Contar propiedades en cada fase
  for (const [phase, config] of Object.entries(PHASE_VIEWS)) {
    console.log(`\n📊 Analizando fase: ${phase} (${config.description})`);
    console.log(`   View ID: ${config.viewId}`);

    const supabaseCount = await countPropertiesInSupabasePhase(phase);
    const airtableCount = await countPropertiesInAirtableView(config.viewId);
    const difference = airtableCount - supabaseCount;
    
    let status = '✅';
    if (airtableCount === -1) {
      status = '❌ ERROR';
    } else if (Math.abs(difference) > 0) {
      status = '⚠️  DESFASE';
    }

    results.push({
      phase,
      description: config.description,
      viewId: config.viewId,
      supabaseCount,
      airtableCount,
      difference,
      status,
    });

    console.log(`   Supabase: ${supabaseCount} propiedades`);
    console.log(`   Airtable: ${airtableCount === -1 ? 'ERROR' : airtableCount} propiedades`);
    console.log(`   Diferencia: ${difference > 0 ? '+' : ''}${difference}`);
    console.log(`   Estado: ${status}`);
  }

  // Resumen
  console.log('\n' + '='.repeat(80));
  console.log('📋 RESUMEN DE RESULTADOS');
  console.log('='.repeat(80));
  console.log('\nFase\t\t\t\t\tSupabase\tAirtable\tDiferencia\tEstado');
  console.log('-'.repeat(80));
  
  results.forEach(r => {
    const phaseName = r.phase.padEnd(30);
    const supabase = String(r.supabaseCount).padStart(8);
    const airtable = r.airtableCount === -1 ? 'ERROR'.padStart(8) : String(r.airtableCount).padStart(8);
    const diff = r.difference > 0 ? `+${r.difference}` : String(r.difference);
    const diffPadded = diff.padStart(10);
    console.log(`${phaseName}\t${supabase}\t${airtable}\t${diffPadded}\t${r.status}`);
  });

  // Verificar solapamientos (propiedades que aparecen en múltiples vistas)
  console.log('\n' + '='.repeat(80));
  console.log('🔍 Verificando solapamientos entre vistas de Airtable');
  console.log('='.repeat(80));

  const allViewPropertyIds: Record<string, Set<string>> = {};
  
  for (const [phase, config] of Object.entries(PHASE_VIEWS)) {
    console.log(`\n📥 Obteniendo IDs de vista: ${phase}...`);
    const ids = await getPropertyIdsFromAirtableView(config.viewId);
    allViewPropertyIds[phase] = ids;
    console.log(`   ✅ Encontrados ${ids.size} IDs únicos`);
  }

  // Buscar solapamientos
  const overlaps: Array<{
    propertyId: string;
    phases: string[];
  }> = [];

  const allPropertyIds = new Set<string>();
  Object.values(allViewPropertyIds).forEach(ids => {
    ids.forEach(id => allPropertyIds.add(id));
  });

  for (const propertyId of allPropertyIds) {
    const phases: string[] = [];
    for (const [phase, ids] of Object.entries(allViewPropertyIds)) {
      if (ids.has(propertyId)) {
        phases.push(phase);
      }
    }
    if (phases.length > 1) {
      overlaps.push({ propertyId, phases });
    }
  }

  if (overlaps.length > 0) {
    console.log(`\n⚠️  Se encontraron ${overlaps.length} propiedades que aparecen en múltiples vistas:`);
    overlaps.slice(0, 10).forEach(overlap => {
      console.log(`   - ${overlap.propertyId}: ${overlap.phases.join(', ')}`);
    });
    if (overlaps.length > 10) {
      console.log(`   ... y ${overlaps.length - 10} más`);
    }
  } else {
    console.log('\n✅ No se encontraron solapamientos entre vistas');
  }

  // Verificar propiedades en Supabase que no están en ninguna vista
  console.log('\n' + '='.repeat(80));
  console.log('🔍 Verificando propiedades en Supabase que no están en ninguna vista');
  console.log('='.repeat(80));

  const allAirtableIds = new Set<string>();
  Object.values(allViewPropertyIds).forEach(ids => {
    ids.forEach(id => allAirtableIds.add(id));
  });

  const supabaseIdsByPhase: Record<string, Set<string>> = {};
  for (const phase of Object.keys(PHASE_VIEWS)) {
    supabaseIdsByPhase[phase] = await getPropertyIdsFromSupabasePhase(phase);
  }

  const allSupabaseIds = new Set<string>();
  Object.values(supabaseIdsByPhase).forEach(ids => {
    ids.forEach(id => allSupabaseIds.add(id));
  });

  const notInAirtable: string[] = [];
  for (const supabaseId of allSupabaseIds) {
    if (!allAirtableIds.has(supabaseId)) {
      notInAirtable.push(supabaseId);
    }
  }

  if (notInAirtable.length > 0) {
    console.log(`\n⚠️  Se encontraron ${notInAirtable.length} propiedades en Supabase que NO están en ninguna vista de Airtable:`);
    notInAirtable.slice(0, 10).forEach(id => {
      console.log(`   - ${id}`);
    });
    if (notInAirtable.length > 10) {
      console.log(`   ... y ${notInAirtable.length - 10} más`);
    }
  } else {
    console.log('\n✅ Todas las propiedades en Supabase están en alguna vista de Airtable');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Diagnóstico completado');
  console.log('='.repeat(80));
}

main().catch(console.error);

