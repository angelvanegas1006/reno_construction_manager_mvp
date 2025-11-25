#!/usr/bin/env tsx
/**
 * Script para verificar el estado del campo Technical construction en Supabase
 * y compararlo con Airtable
 * Uso: npm run check:technical-construction
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
  console.log('🔍 Verificando Technical construction en Supabase...\n');

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

    // Contar propiedades con y sin Technical construction
    const withTechnical = supabaseProperties.filter(p => p['Technical construction']).length;
    const withoutTechnical = supabaseProperties.length - withTechnical;

    console.log(`📊 Estadísticas:`);
    console.log(`   - Con Technical construction: ${withTechnical}`);
    console.log(`   - Sin Technical construction: ${withoutTechnical}\n`);

    // Obtener propiedades de Airtable para comparar
    console.log('📥 Obteniendo propiedades de Airtable...\n');
    
    const transactionsTable = base('tblmX19OTsj3cTHmA');
    const airtableMap = new Map<string, { technicalConstructor: string | null; address: string }>();

    await transactionsTable
      .select({
        // Obtener todos los campos
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach((record) => {
          const uniqueIdValue = 
            record.fields['UNIQUEID (from Engagements)'] ||
            record.fields['Unique ID (From Engagements)'] ||
            record.fields['Unique ID From Engagements'];
          
          const uniqueId = Array.isArray(uniqueIdValue) ? uniqueIdValue[0] : uniqueIdValue;
          
          if (!uniqueId) return;

          // Obtener Technical Constructor desde Properties relacionada
          const propertiesLinks = record.fields['Properties'];
          let technicalConstructor: string | null = null;
          
          if (Array.isArray(propertiesLinks) && propertiesLinks.length > 0) {
            // Por ahora solo guardamos el link, luego lo buscaremos
            airtableMap.set(uniqueId, {
              technicalConstructor: null, // Se actualizará después
              address: (record.fields['Address'] as string) || '',
            });
          } else {
            airtableMap.set(uniqueId, {
              technicalConstructor: null,
              address: (record.fields['Address'] as string) || '',
            });
          }
        });
        fetchNextPage();
      });

    // Obtener Technical Constructor de Properties
    console.log('📥 Obteniendo Technical Constructor de Properties...\n');
    
    const propertiesTable = base('Properties');
    const propertiesIdsToFetch = new Set<string>();
    
    // Primero, obtener todos los links a Properties de las transacciones
    await transactionsTable
      .select({
        // Obtener todos los campos
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach((record) => {
          const propertiesLinks = record.fields['Properties'];
          if (Array.isArray(propertiesLinks)) {
            propertiesLinks.forEach((linkId: string) => {
              if (typeof linkId === 'string') {
                propertiesIdsToFetch.add(linkId);
              }
            });
          }
        });
        fetchNextPage();
      });

    // Obtener Technical Constructor de Properties
    const propertiesMap = new Map<string, string | null>();
    const propertiesIdsArray = Array.from(propertiesIdsToFetch);
    
    for (let i = 0; i < propertiesIdsArray.length; i += 50) {
      const batch = propertiesIdsArray.slice(i, i + 50);
      const formula = `OR(${batch.map(id => `RECORD_ID() = "${id}"`).join(', ')})`;
      
      await propertiesTable
        .select({
          filterByFormula: formula,
        })
        .eachPage((records, fetchNextPage) => {
          records.forEach((record) => {
            const technicalConstructor = record.fields['Technical Constructor'] || 
                                       record.fields['Technical construction'] ||
                                       null;
            propertiesMap.set(record.id, technicalConstructor ? String(technicalConstructor) : null);
          });
          fetchNextPage();
        });
    }

    // Mapear Technical Constructor a las transacciones
    await transactionsTable
      .select({
        // Obtener todos los campos
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach((record) => {
          const uniqueIdValue = 
            record.fields['UNIQUEID (from Engagements)'] ||
            record.fields['Unique ID (From Engagements)'] ||
            record.fields['Unique ID From Engagements'];
          
          const uniqueId = Array.isArray(uniqueIdValue) ? uniqueIdValue[0] : uniqueIdValue;
          if (!uniqueId) return;
          
          const propertiesLinks = record.fields['Properties'];
          if (Array.isArray(propertiesLinks) && propertiesLinks.length > 0) {
            const firstPropertyId = propertiesLinks[0];
            const technicalConstructor = propertiesMap.get(firstPropertyId);
            if (airtableMap.has(uniqueId)) {
              airtableMap.set(uniqueId, {
                ...airtableMap.get(uniqueId)!,
                technicalConstructor: technicalConstructor || null,
              });
            }
          }
        });
        fetchNextPage();
      });

    console.log(`📥 Procesadas ${airtableMap.size} propiedades de Airtable\n`);

    // Comparar y encontrar diferencias
    let needsUpdate = 0;
    let matches = 0;
    const toUpdate: Array<{ id: string; address: string; supabase: string | null; airtable: string | null }> = [];

    supabaseProperties.forEach((property) => {
      const uniqueId = property['Unique ID From Engagements'] || property.id;
      const airtableData = airtableMap.get(uniqueId);
      
      if (airtableData) {
        const supabaseValue = property['Technical construction'];
        const airtableValue = airtableData.technicalConstructor;
        
        if (supabaseValue !== airtableValue) {
          needsUpdate++;
          toUpdate.push({
            id: property.id,
            address: property.address || 'N/A',
            supabase: supabaseValue,
            airtable: airtableValue,
          });
        } else {
          matches++;
        }
      }
    });

    console.log(`📊 Comparación:`);
    console.log(`   - Coinciden: ${matches}`);
    console.log(`   - Necesitan actualización: ${needsUpdate}\n`);

    if (needsUpdate > 0) {
      console.log(`📝 Propiedades que necesitan actualización (primeras 10):`);
      toUpdate.slice(0, 10).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.id}`);
        console.log(`      Dirección: ${item.address}`);
        console.log(`      Supabase: ${item.supabase || 'null'}`);
        console.log(`      Airtable: ${item.airtable || 'null'}`);
        console.log('');
      });
      if (needsUpdate > 10) {
        console.log(`   ... y ${needsUpdate - 10} más\n`);
      }
    }

    console.log(`\n💡 Para actualizar, ejecuta la sincronización de todas las fases:`);
    console.log(`   npm run sync:upcoming-settlements`);
    console.log(`   npm run sync:initial-check`);
    console.log(`   npm run sync:reno-in-progress`);
    console.log(`   npm run sync:furnishing-cleaning`);
    console.log(`   npm run sync:final-check`);

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

