#!/usr/bin/env tsx
/**
 * Script para verificar que todas las propiedades tienen start_date sincronizado desde Airtable
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';
import Airtable from 'airtable';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const tableName = 'Transactions'; // El campo está en Transactions según el usuario

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno de Airtable');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);
const FIELD_ID = 'fldCnB9pCmpG5khiH'; // Field ID de "Reno Start Date"

async function verifyStartDateSync() {
  console.log('\n🔍 Verificando sincronización de start_date (Reno Start Date)...\n');
  
  const supabase = createAdminClient();
  
  // 1. Obtener todas las propiedades de Supabase
  const { data: supabaseProperties, error: supabaseError } = await supabase
    .from('properties')
    .select('id, address, start_date, "Unique ID From Engagements"')
    .order('id');
  
  if (supabaseError) {
    console.error('❌ Error obteniendo propiedades de Supabase:', supabaseError);
    process.exit(1);
  }
  
  console.log(`✅ Propiedades en Supabase: ${supabaseProperties?.length || 0}\n`);
  
  // 2. Obtener todas las propiedades de Airtable con Reno Start Date
  console.log('📥 Obteniendo propiedades de Airtable...');
  const airtableProperties: Map<string, { uniqueId: string; startDate: string | null; address: string }> = new Map();
  
  try {
    const records = await base(tableName).select({
      fields: ['UNIQUEID (from Engagements)', FIELD_ID, 'Address'],
      maxRecords: 10000,
    }).all();
    
    console.log(`✅ Propiedades en Airtable: ${records.length}\n`);
    
    records.forEach((record: any) => {
      const uniqueId = record.fields['UNIQUEID (from Engagements)'];
      // Usar el field ID directamente
      const startDate = record.fields[FIELD_ID] || null;
      const address = record.fields['Address'] || '';
      
      if (uniqueId) {
        airtableProperties.set(uniqueId, {
          uniqueId,
          startDate: startDate ? new Date(startDate).toISOString().split('T')[0] : null,
          address,
        });
      }
    });
  } catch (error: any) {
    console.error('❌ Error obteniendo propiedades de Airtable:', error.message);
    process.exit(1);
  }
  
  // 3. Comparar y encontrar discrepancias
  console.log('🔍 Comparando datos...\n');
  
  const missingInSupabase: Array<{ id: string; address: string; airtableDate: string }> = [];
  const missingInAirtable: Array<{ id: string; address: string; supabaseDate: string }> = [];
  const differentDates: Array<{ id: string; address: string; supabaseDate: string | null; airtableDate: string | null }> = [];
  const correct: number[] = [];
  
  supabaseProperties?.forEach((prop) => {
    const uniqueId = prop['Unique ID From Engagements'] || prop.id;
    const airtableData = airtableProperties.get(uniqueId);
    const supabaseDate = prop.start_date;
    
    if (!airtableData) {
      // Propiedad en Supabase pero no en Airtable (o sin Unique ID)
      if (supabaseDate) {
        missingInAirtable.push({
          id: prop.id,
          address: prop.address || 'Sin dirección',
          supabaseDate,
        });
      }
      return;
    }
    
    const airtableDate = airtableData.startDate;
    
    // Normalizar fechas para comparación
    const supabaseDateNormalized = supabaseDate ? new Date(supabaseDate).toISOString().split('T')[0] : null;
    const airtableDateNormalized = airtableDate ? new Date(airtableDate).toISOString().split('T')[0] : null;
    
    if (supabaseDateNormalized === airtableDateNormalized) {
      correct.push(1);
    } else if (!supabaseDate && airtableDate) {
      // Falta en Supabase pero existe en Airtable
      missingInSupabase.push({
        id: prop.id,
        address: prop.address || 'Sin dirección',
        airtableDate: airtableDateNormalized!,
      });
    } else if (supabaseDate && !airtableDate) {
      // Existe en Supabase pero no en Airtable
      missingInAirtable.push({
        id: prop.id,
        address: prop.address || 'Sin dirección',
        supabaseDate: supabaseDateNormalized!,
      });
    } else if (supabaseDate && airtableDate && supabaseDateNormalized !== airtableDateNormalized) {
      // Fechas diferentes
      differentDates.push({
        id: prop.id,
        address: prop.address || 'Sin dirección',
        supabaseDate: supabaseDateNormalized,
        airtableDate: airtableDateNormalized,
      });
    }
  });
  
  // 4. Mostrar resultados
  console.log('📊 Resultados de la verificación:\n');
  console.log(`✅ Propiedades con start_date correcto: ${correct.length}`);
  console.log(`⚠️  Propiedades con start_date faltante en Supabase (existe en Airtable): ${missingInSupabase.length}`);
  console.log(`⚠️  Propiedades con start_date en Supabase pero no en Airtable: ${missingInAirtable.length}`);
  console.log(`⚠️  Propiedades con fechas diferentes: ${differentDates.length}\n`);
  
  if (missingInSupabase.length > 0) {
    console.log('📋 Propiedades que necesitan sincronización (faltante en Supabase):');
    missingInSupabase.slice(0, 10).forEach((prop, index) => {
      console.log(`   ${index + 1}. ${prop.id} - ${prop.address}`);
      console.log(`      Airtable: ${prop.airtableDate}`);
      console.log(`      Supabase: (vacío)`);
    });
    if (missingInSupabase.length > 10) {
      console.log(`   ... y ${missingInSupabase.length - 10} más`);
    }
    console.log('');
  }
  
  if (differentDates.length > 0) {
    console.log('📋 Propiedades con fechas diferentes:');
    differentDates.slice(0, 10).forEach((prop, index) => {
      console.log(`   ${index + 1}. ${prop.id} - ${prop.address}`);
      console.log(`      Supabase: ${prop.supabaseDate || '(vacío)'}`);
      console.log(`      Airtable: ${prop.airtableDate || '(vacío)'}`);
    });
    if (differentDates.length > 10) {
      console.log(`   ... y ${differentDates.length - 10} más`);
    }
    console.log('');
  }
  
  // 5. Estadísticas de Airtable
  const airtableWithDate = Array.from(airtableProperties.values()).filter(p => p.startDate !== null).length;
  const airtableWithoutDate = airtableProperties.size - airtableWithDate;
  
  console.log('📊 Estadísticas de Airtable:');
  console.log(`   Total propiedades: ${airtableProperties.size}`);
  console.log(`   Con Reno Start Date: ${airtableWithDate}`);
  console.log(`   Sin Reno Start Date: ${airtableWithoutDate}\n`);
  
  // 6. Recomendaciones
  if (missingInSupabase.length > 0 || differentDates.length > 0) {
    console.log('💡 Recomendaciones:');
    if (missingInSupabase.length > 0) {
      console.log(`   - Ejecutar el cron job de sincronización para actualizar ${missingInSupabase.length} propiedades`);
    }
    if (differentDates.length > 0) {
      console.log(`   - Revisar las ${differentDates.length} propiedades con fechas diferentes`);
      console.log(`   - Airtable es la fuente de verdad, se actualizarán en Supabase al ejecutar el cron job`);
    }
    console.log('');
  } else {
    console.log('✅ Todas las propiedades están sincronizadas correctamente!\n');
  }
}

verifyStartDateSync().catch(console.error);

