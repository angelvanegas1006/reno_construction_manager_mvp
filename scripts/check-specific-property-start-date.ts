#!/usr/bin/env tsx
/**
 * Script para verificar start_date de una propiedad específica en Airtable y Supabase
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';
import Airtable from 'airtable';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const propertyUniqueId = process.argv[2] || 'SP-ORF-EM8-005810';
const FIELD_ID = 'fldCnB9pCmpG5khiH';

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const tableName = 'Transactions';

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno de Airtable');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

async function checkSpecificProperty() {
  console.log(`\n🔍 Verificando start_date para: ${propertyUniqueId}\n`);
  
  const supabase = createAdminClient();
  
  // 1. Verificar en Supabase
  const { data: supabaseProp, error: supabaseError } = await supabase
    .from('properties')
    .select('id, address, start_date, "Unique ID From Engagements", reno_phase')
    .eq('id', propertyUniqueId)
    .single();
  
  if (supabaseError) {
    console.error('❌ Error obteniendo propiedad de Supabase:', supabaseError);
    return;
  }
  
  if (!supabaseProp) {
    console.error(`❌ Propiedad ${propertyUniqueId} no encontrada en Supabase`);
    return;
  }
  
  console.log('📊 En Supabase:');
  console.log(`   ID: ${supabaseProp.id}`);
  console.log(`   Dirección: ${supabaseProp.address || 'N/A'}`);
  console.log(`   Fase: ${supabaseProp.reno_phase || 'N/A'}`);
  console.log(`   start_date: ${supabaseProp.start_date || '(vacío)'}\n`);
  
  // 2. Verificar en Airtable
  try {
    const records = await base(tableName).select({
      filterByFormula: `{UNIQUEID (from Engagements)} = "${propertyUniqueId}"`,
      fields: ['UNIQUEID (from Engagements)', FIELD_ID, 'Address'],
      maxRecords: 1,
    }).firstPage();
    
    if (records.length === 0) {
      console.log('⚠️  Propiedad no encontrada en Airtable (tabla Transactions)');
      return;
    }
    
    const record = records[0];
    const airtableStartDate = record.fields[FIELD_ID] || null;
    
    console.log('📊 En Airtable:');
    console.log(`   Unique ID: ${record.fields['UNIQUEID (from Engagements)'] || 'N/A'}`);
    console.log(`   Address: ${record.fields['Address'] || 'N/A'}`);
    console.log(`   Campo por ID (${FIELD_ID}): ${airtableStartDate || '(vacío)'}`);
    if (airtableStartDate) {
      console.log(`   Tipo: ${typeof airtableStartDate}`);
      console.log(`   Valor formateado: ${new Date(airtableStartDate).toISOString().split('T')[0]}`);
    }
    console.log('');
    
    // 3. Comparar
    const supabaseDate = supabaseProp.start_date ? new Date(supabaseProp.start_date).toISOString().split('T')[0] : null;
    const airtableDate = airtableStartDate ? new Date(airtableStartDate).toISOString().split('T')[0] : null;
    
    console.log('🔍 Comparación:');
    if (supabaseDate === airtableDate) {
      console.log(`   ✅ Sincronizado correctamente: ${supabaseDate || '(ambos vacíos)'}`);
    } else if (!supabaseDate && airtableDate) {
      console.log(`   ⚠️  Falta en Supabase (existe en Airtable): ${airtableDate}`);
      console.log(`   💡 Ejecutar el cron job de sincronización para actualizar`);
    } else if (supabaseDate && !airtableDate) {
      console.log(`   ⚠️  Existe en Supabase pero no en Airtable: ${supabaseDate}`);
    } else {
      console.log(`   ⚠️  Fechas diferentes:`);
      console.log(`      Supabase: ${supabaseDate}`);
      console.log(`      Airtable: ${airtableDate}`);
    }
    console.log('');
    
  } catch (error: any) {
    console.error('❌ Error obteniendo propiedad de Airtable:', error.message);
    if (error.error) {
      console.error('   Detalles:', JSON.stringify(error.error, null, 2));
    }
  }
}

checkSpecificProperty().catch(console.error);

