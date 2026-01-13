#!/usr/bin/env tsx
/**
 * Script para verificar que los datos de Airtable estén correctamente sincronizados en Supabase
 * Compara campos importantes entre Airtable y Supabase para detectar discrepancias
 * 
 * Uso: npx tsx scripts/verify-airtable-supabase-sync.ts [propertyId]
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import Airtable from 'airtable';
import { createAdminClient } from '../lib/supabase/admin';

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_AIRTABLE_API_KEY o NEXT_PUBLIC_AIRTABLE_BASE_ID');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);
const tableName = 'Transactions';

// Campos importantes a verificar
const IMPORTANT_FIELDS = [
  { airtable: 'Address', supabase: 'address', type: 'string' },
  { airtable: 'Type', supabase: 'type', type: 'string' },
  { airtable: 'Required reno', supabase: 'renovation_type', type: 'string' },
  { airtable: 'Set up status', supabase: 'Set Up Status', type: 'string' },
  { airtable: 'Area Cluster', supabase: 'area_cluster', type: 'string' },
  { airtable: 'Technical construction', supabase: 'Technical construction', type: 'string' },
  { airtable: 'Renovator Name', supabase: 'Renovator name', type: 'string' },
  { airtable: 'Est. visit date', supabase: 'Estimated Visit Date', type: 'date' },
  { airtable: 'Est. reno start date', supabase: 'start_date', type: 'date' },
  { airtable: 'Est. reno end date', supabase: 'estimated_end_date', type: 'date' },
  { airtable: 'Days to Start Reno (Since RSD)', supabase: 'Days to Start Reno (Since RSD)', type: 'number' },
  { airtable: 'Reno Duration', supabase: 'Reno Duration', type: 'number' },
  { airtable: 'Days to Property Ready', supabase: 'Days to Property Ready', type: 'number' },
];

interface ComparisonResult {
  propertyId: string;
  address: string;
  discrepancies: Array<{
    field: string;
    airtableValue: any;
    supabaseValue: any;
    match: boolean;
  }>;
  missingInSupabase: boolean;
  missingInAirtable: boolean;
}

function normalizeValue(value: any, type: string): any {
  if (value === null || value === undefined) return null;
  
  if (type === 'date') {
    if (typeof value === 'string') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0]; // YYYY-MM-DD
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  }
  
  if (type === 'number') {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? null : num;
  }
  
  // Para strings, normalizar arrays
  if (Array.isArray(value)) {
    return value[0] || null;
  }
  
  return String(value).trim() || null;
}

function getFieldValue(fields: any, fieldName: string, alternatives?: string[]): any {
  let value = fields[fieldName];
  if (value === undefined && alternatives) {
    for (const alt of alternatives) {
      if (fields[alt] !== undefined) {
        value = fields[alt];
        break;
      }
    }
  }
  return value;
}

async function compareProperty(
  airtableRecord: any,
  supabaseProperty: any
): Promise<ComparisonResult> {
  const fields = airtableRecord.fields;
  const uniqueId = 
    fields['UNIQUEID (from Engagements)'] ||
    fields['Unique ID (From Engagements)'] ||
    fields['Unique ID From Engagements'] ||
    fields['Unique ID'];
  
  const propertyId = Array.isArray(uniqueId) ? uniqueId[0] : uniqueId;
  const address = getFieldValue(fields, 'Address') || propertyId;
  
  const discrepancies: ComparisonResult['discrepancies'] = [];
  
  for (const fieldConfig of IMPORTANT_FIELDS) {
    // Obtener valor de Airtable
    const airtableValue = getFieldValue(
      fields,
      fieldConfig.airtable,
      [
        fieldConfig.airtable,
        fieldConfig.airtable.toLowerCase(),
        fieldConfig.airtable.toUpperCase(),
      ]
    );
    
    // Obtener valor de Supabase
    const supabaseValue = supabaseProperty?.[fieldConfig.supabase];
    
    // Normalizar valores
    const normalizedAirtable = normalizeValue(airtableValue, fieldConfig.type);
    const normalizedSupabase = normalizeValue(supabaseValue, fieldConfig.type);
    
    // Comparar
    const match = normalizedAirtable === normalizedSupabase;
    
    if (!match) {
      discrepancies.push({
        field: fieldConfig.supabase,
        airtableValue: normalizedAirtable,
        supabaseValue: normalizedSupabase,
        match: false,
      });
    }
  }
  
  return {
    propertyId,
    address: Array.isArray(address) ? address[0] : address,
    discrepancies,
    missingInSupabase: !supabaseProperty,
    missingInAirtable: false,
  };
}

async function verifySync(propertyIdFilter?: string) {
  console.log('🔍 Verificando sincronización Airtable ↔ Supabase\n');
  console.log('='.repeat(80));
  
  const supabase = createAdminClient();
  
  // Obtener todas las propiedades de Supabase
  const { data: supabaseProperties, error: supabaseError } = await supabase
    .from('properties')
    .select('*');
  
  if (supabaseError) {
    console.error('❌ Error obteniendo propiedades de Supabase:', supabaseError);
    process.exit(1);
  }
  
  const supabaseMap = new Map(
    supabaseProperties?.map(p => [p.id, p]) || []
  );
  
  console.log(`📊 Propiedades en Supabase: ${supabaseProperties?.length || 0}\n`);
  
  // Obtener propiedades de Airtable
  const airtableProperties: any[] = [];
  const filter = propertyIdFilter 
    ? { filterByFormula: `{Unique ID (From Engagements)} = "${propertyIdFilter}"` }
    : {};
  
  await base(tableName)
    .select({
      ...filter,
      maxRecords: propertyIdFilter ? 1 : 100, // Limitar a 100 si no hay filtro
    })
    .eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach((record) => {
        airtableProperties.push(record);
      });
      fetchNextPage();
    });
  
  console.log(`📊 Propiedades en Airtable (muestra): ${airtableProperties.length}\n`);
  
  // Comparar propiedades
  const results: ComparisonResult[] = [];
  
  for (const airtableRecord of airtableProperties) {
    const fields = airtableRecord.fields;
    const uniqueId = 
      fields['UNIQUEID (from Engagements)'] ||
      fields['Unique ID (From Engagements)'] ||
      fields['Unique ID From Engagements'] ||
      fields['Unique ID'];
    
    const propertyId = Array.isArray(uniqueId) ? uniqueId[0] : uniqueId;
    
    if (!propertyId) continue;
    
    const supabaseProperty = supabaseMap.get(propertyId);
    const comparison = await compareProperty(airtableRecord, supabaseProperty);
    results.push(comparison);
  }
  
  // Analizar resultados
  const withDiscrepancies = results.filter(r => r.discrepancies.length > 0 || r.missingInSupabase);
  const perfectMatches = results.filter(r => r.discrepancies.length === 0 && !r.missingInSupabase);
  
  console.log('\n📊 RESUMEN DE VERIFICACIÓN:\n');
  console.log(`   ✅ Propiedades sincronizadas correctamente: ${perfectMatches.length}`);
  console.log(`   ⚠️  Propiedades con discrepancias: ${withDiscrepancies.length}`);
  console.log(`   📋 Total verificadas: ${results.length}\n`);
  
  if (withDiscrepancies.length > 0) {
    console.log('⚠️  PROPIEDADES CON DISCREPANCIAS:\n');
    
    withDiscrepancies.slice(0, 10).forEach((result, idx) => {
      console.log(`\n${idx + 1}. ${result.address || result.propertyId} (${result.propertyId})`);
      
      if (result.missingInSupabase) {
        console.log('   ❌ NO EXISTE EN SUPABASE');
      } else if (result.discrepancies.length > 0) {
        console.log('   ⚠️  Campos con diferencias:');
        result.discrepancies.forEach(d => {
          console.log(`      - ${d.field}:`);
          console.log(`        Airtable: ${d.airtableValue ?? 'NULL'}`);
          console.log(`        Supabase: ${d.supabaseValue ?? 'NULL'}`);
        });
      }
    });
    
    if (withDiscrepancies.length > 10) {
      console.log(`\n   ... y ${withDiscrepancies.length - 10} más`);
    }
  } else {
    console.log('✅ Todas las propiedades verificadas están correctamente sincronizadas\n');
  }
  
  // Verificar propiedades en Supabase que no están en Airtable (muestra)
  if (!propertyIdFilter) {
    const supabaseOnly = Array.from(supabaseMap.keys()).filter(
      id => !airtableProperties.some(ar => {
        const fields = ar.fields;
        const uniqueId = 
          fields['UNIQUEID (from Engagements)'] ||
          fields['Unique ID (From Engagements)'] ||
          fields['Unique ID From Engagements'] ||
          fields['Unique ID'];
        return (Array.isArray(uniqueId) ? uniqueId[0] : uniqueId) === id;
      })
    );
    
    if (supabaseOnly.length > 0) {
      console.log(`\n⚠️  Propiedades en Supabase que NO están en la muestra de Airtable: ${supabaseOnly.length}`);
      console.log('   (Esto es normal si hay más de 100 propiedades en Airtable)\n');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Verificación completada\n');
}

const propertyId = process.argv[2];

verifySync(propertyId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
