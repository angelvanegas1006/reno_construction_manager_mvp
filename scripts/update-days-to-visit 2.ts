#!/usr/bin/env tsx
/**
 * Script para actualizar el campo days_to_visit en todas las propiedades desde Airtable
 * Ejecutar con: npx tsx scripts/update-days-to-visit.ts
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';
import Airtable from 'airtable';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA'; // Properties table

function getAirtableBase() {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    throw new Error('Missing Airtable credentials. Set NEXT_PUBLIC_AIRTABLE_API_KEY and NEXT_PUBLIC_AIRTABLE_BASE_ID');
  }

  return new Airtable({ apiKey }).base(baseId);
}

async function main() {
  console.log('🚀 Iniciando actualización de days_to_visit desde Airtable...\n');

  const supabase = createAdminClient();
  const base = getAirtableBase();

  try {
    // Obtener todas las propiedades de Supabase
    const { data: supabaseProperties, error: supabaseError } = await supabase
      .from('properties')
      .select('id, "Unique ID From Engagements", days_to_visit');

    if (supabaseError) {
      throw new Error(`Error obteniendo propiedades de Supabase: ${supabaseError.message}`);
    }

    if (!supabaseProperties || supabaseProperties.length === 0) {
      console.log('⚠️  No se encontraron propiedades en Supabase.');
      return;
    }

    console.log(`📊 Propiedades encontradas en Supabase: ${supabaseProperties.length}\n`);

    // Obtener todas las propiedades de Airtable
    console.log('📥 Obteniendo propiedades de Airtable...');
    const airtableRecords: any[] = [];
    
    // No especificar campos específicos para obtener todos los campos disponibles
    await base(AIRTABLE_TABLE_ID).select().eachPage((records, fetchNextPage) => {
      records.forEach(record => {
        // Buscar Unique ID con diferentes variaciones del nombre
        const uniqueIdValue = 
          record.fields['UNIQUEID (from Engagements)'] ||
          record.fields['Unique ID (From Engagements)'] ||
          record.fields['Unique ID From Engagements'] ||
          record.fields['Unique ID'];
        
        // Extraer el primer elemento si es array
        const uniqueId = Array.isArray(uniqueIdValue) ? uniqueIdValue[0] : uniqueIdValue;
        
        // Buscar Days to visit con variaciones
        const daysToVisitValue = 
          record.fields['Days to visit'] ||
          record.fields['Days to Visit'] ||
          record.fields['days_to_visit'];
        
        if (uniqueId) {
          airtableRecords.push({
            uniqueId: uniqueId,
            daysToVisit: daysToVisitValue,
          });
        }
      });
      fetchNextPage();
    });

    console.log(`📊 Propiedades encontradas en Airtable: ${airtableRecords.length}\n`);

    // Crear mapa de Unique ID -> Days to visit desde Airtable
    const daysToVisitMap = new Map<string, number | null>();
    airtableRecords.forEach(record => {
      if (record.uniqueId) {
        const value = record.daysToVisit;
        if (value !== null && value !== undefined) {
          const num = typeof value === 'number' ? value : parseInt(String(value), 10);
          daysToVisitMap.set(record.uniqueId, isNaN(num) ? null : num);
        } else {
          daysToVisitMap.set(record.uniqueId, null);
        }
      }
    });

    console.log(`📊 Valores únicos mapeados desde Airtable: ${daysToVisitMap.size}\n`);

    // Actualizar propiedades en Supabase
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const property of supabaseProperties) {
      const uniqueId = property['Unique ID From Engagements'] || property.id;
      const airtableDaysToVisit = daysToVisitMap.get(uniqueId);

      // Solo actualizar si hay un valor en Airtable (puede ser null) y es diferente al de Supabase
      if (airtableDaysToVisit !== undefined) {
        const currentValue = property.days_to_visit;
        
        // Comparar valores (manejar null correctamente)
        const valuesDiffer = (currentValue === null && airtableDaysToVisit !== null) ||
                            (currentValue !== null && airtableDaysToVisit === null) ||
                            (currentValue !== null && airtableDaysToVisit !== null && currentValue !== airtableDaysToVisit);
        
        if (valuesDiffer) {
          const { error: updateError } = await supabase
            .from('properties')
            .update({ 
              days_to_visit: airtableDaysToVisit,
              updated_at: new Date().toISOString()
            })
            .eq('id', property.id);

          if (updateError) {
            console.error(`❌ Error actualizando ${property.id}:`, updateError.message);
            errors++;
          } else {
            updated++;
            if (updated % 10 === 0) {
              console.log(`✅ Actualizadas ${updated} propiedades...`);
            }
          }
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   - Actualizadas: ${updated}`);
    console.log(`   - Sin cambios/Omitidas: ${skipped}`);
    console.log(`   - Errores: ${errors}`);
    console.log(`   - Total procesadas: ${supabaseProperties.length}`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

