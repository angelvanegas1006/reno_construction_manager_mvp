#!/usr/bin/env tsx
/**
 * Script para actualizar Technical construction en Supabase desde Airtable
 * Solo actualiza propiedades que tienen Technical Constructor disponible en Airtable
 * Uso: npm run update:technical-construction
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.warn('⚠️  No se pudo cargar .env.local, usando variables de entorno del sistema');
}

import { createAdminClient } from '../lib/supabase/admin';
import Airtable from 'airtable';

async function main() {
  console.log('🔄 Actualizando Technical construction desde Airtable...\n');

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_AIRTABLE_API_KEY',
    'NEXT_PUBLIC_AIRTABLE_BASE_ID',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error('❌ Faltan variables de entorno:');
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    process.exit(1);
  }

  const supabase = createAdminClient();
  const base = new Airtable({ apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY! })
    .base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);

  try {
    // Obtener todas las propiedades de Supabase
    const { data: supabaseProperties, error: fetchError } = await supabase
      .from('properties')
      .select('id, address, "Technical construction", "Unique ID From Engagements"')
      .not('id', 'is', null);

    if (fetchError) {
      console.error('❌ Error obteniendo propiedades de Supabase:', fetchError);
      process.exit(1);
    }

    if (!supabaseProperties || supabaseProperties.length === 0) {
      console.log('⚠️  No se encontraron propiedades en Supabase');
      process.exit(0);
    }

    console.log(`📋 Encontradas ${supabaseProperties.length} propiedades en Supabase\n`);

    // Obtener Technical construction directamente de Transactions en Airtable
    // El campo está en Transactions con field ID fldtTmer8awVKDx7Y
    console.log('📥 Obteniendo Technical construction directamente de Transactions en Airtable...\n');
    
    const transactionsTable = base('tblmX19OTsj3cTHmA');
    
    // Mapa: Unique ID -> Technical construction
    const technicalConstructorMap = new Map<string, string | null>();

    // Obtener Technical construction directamente de Transactions
    await transactionsTable
      .select({
        // Obtener todos los campos para incluir Technical construction (field ID: fldtTmer8awVKDx7Y)
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach((record) => {
          const uniqueIdValue = 
            record.fields['UNIQUEID (from Engagements)'] ||
            record.fields['Unique ID (From Engagements)'] ||
            record.fields['Unique ID From Engagements'];
          
          const uniqueId = Array.isArray(uniqueIdValue) ? uniqueIdValue[0] : uniqueIdValue;
          if (!uniqueId) return;

          // Buscar Technical construction por field ID primero, luego por nombre
          const technicalConstruction = record.fields['fldtTmer8awVKDx7Y'] || 
                                       record.fields['Technical construction'] ||
                                       record.fields['Technical Constructor'] ||
                                       null;
          
          if (technicalConstruction !== null && technicalConstruction !== undefined) {
            technicalConstructorMap.set(uniqueId, String(technicalConstruction));
          }
        });
        fetchNextPage();
      });

    console.log(`✅ Mapeadas ${technicalConstructorMap.size} propiedades con Technical construction desde Transactions\n`);

    // Actualizar propiedades en Supabase
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const property of supabaseProperties) {
      const uniqueId = property['Unique ID From Engagements'] || property.id;
      const airtableTechnicalConstructor = technicalConstructorMap.get(uniqueId);

      // Solo actualizar si hay un valor en Airtable (no null) y es diferente al de Supabase
      if (airtableTechnicalConstructor !== undefined && airtableTechnicalConstructor !== null) {
        const currentValue = property['Technical construction'];
        
        if (airtableTechnicalConstructor !== currentValue) {
          const { error: updateError } = await supabase
            .from('properties')
            .update({ 
              'Technical construction': airtableTechnicalConstructor,
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

