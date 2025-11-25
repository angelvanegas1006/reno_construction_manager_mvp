#!/usr/bin/env tsx
/**
 * Script para sincronizar pics_urls de TODAS las propiedades existentes en Supabase
 * desde Airtable, independientemente de su fase
 * Este script obtiene las pics_urls directamente de la tabla Properties de Airtable
 * Uso: npm run sync:all-pics-urls
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

import Airtable from 'airtable';
import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  console.log('🔄 Sincronizando pics_urls de todas las propiedades desde Airtable...\n');

  const requiredEnvVars = [
    'NEXT_PUBLIC_AIRTABLE_API_KEY',
    'NEXT_PUBLIC_AIRTABLE_BASE_ID',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
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
    const { data: allProperties, error: fetchError } = await supabase
      .from('properties')
      .select('id, "Unique ID From Engagements", address')
      .not('id', 'is', null);

    if (fetchError) {
      console.error('❌ Error obteniendo propiedades:', fetchError);
      process.exit(1);
    }

    if (!allProperties || allProperties.length === 0) {
      console.log('⚠️  No se encontraron propiedades en Supabase');
      process.exit(0);
    }

    console.log(`📋 Encontradas ${allProperties.length} propiedades en Supabase\n`);

    // Obtener todas las transacciones de Airtable para obtener el Unique ID From Engagements
    // y luego obtener las pics_urls de la tabla Properties relacionada
    console.log('📥 Obteniendo transacciones de Airtable...\n');
    
    const transactionsTable = base('tblmX19OTsj3cTHmA'); // Transactions table
    const picsUrlsMap = new Map<string, string[]>(); // Map: Unique ID From Engagements -> pics_urls[]
    const propertiesCache = new Map<string, any>(); // Cache de Properties para evitar múltiples llamadas
    
    let transactionCount = 0;
    const propertiesIdsToFetch = new Set<string>();

    // Primera pasada: obtener todos los links a Properties
    await transactionsTable
      .select({
        // Obtener todos los campos
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach((record) => {
          transactionCount++;
          
          // Obtener Unique ID From Engagements
          const uniqueIdValue = 
            record.fields['UNIQUEID (from Engagements)'] ||
            record.fields['Unique ID (From Engagements)'] ||
            record.fields['Unique ID From Engagements'];
          
          const uniqueId = Array.isArray(uniqueIdValue) ? uniqueIdValue[0] : uniqueIdValue;
          
          // Obtener links a Properties
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

    console.log(`📥 Procesadas ${transactionCount} transacciones`);
    console.log(`📥 Encontrados ${propertiesIdsToFetch.size} links únicos a Properties\n`);

    // Segunda pasada: obtener las pics_urls de Properties
    console.log('📥 Obteniendo pics_urls de Properties...\n');
    
    const propertiesTable = base('Properties');
    const propertiesIdsArray = Array.from(propertiesIdsToFetch);
    
    // Procesar en lotes de 50 (límite de Airtable)
    for (let i = 0; i < propertiesIdsArray.length; i += 50) {
      const batch = propertiesIdsArray.slice(i, i + 50);
      const formula = `OR(${batch.map(id => `RECORD_ID() = "${id}"`).join(', ')})`;
      
      await propertiesTable
        .select({
          filterByFormula: formula,
        })
        .eachPage((records, fetchNextPage) => {
          records.forEach((record) => {
            const allFields = record.fields;
            
            // Buscar el campo de pics_urls
            const picsField = 
              allFields['pics_url'] ||
              allFields['Pics URLs'] ||
              allFields['Pics URLs:'] ||
              allFields['pics_urls'] ||
              allFields['Pics'] ||
              allFields['Photos URLs'] ||
              allFields['Photos'] ||
              allFields['fldq1FLXBToYEY9W3'] ||
              Object.keys(allFields).find(key => {
                const lowerKey = key.toLowerCase();
                return (lowerKey.includes('pic') || lowerKey.includes('photo')) && 
                       (lowerKey.includes('url') || lowerKey.includes('link'));
              }) ? allFields[Object.keys(allFields).find(key => {
                const lowerKey = key.toLowerCase();
                return (lowerKey.includes('pic') || lowerKey.includes('photo')) && 
                       (lowerKey.includes('url') || lowerKey.includes('link'));
              })!] : null;

            if (picsField) {
              let urls: string[] = [];
              
              // Si es un string (comma-separated URLs)
              if (typeof picsField === 'string') {
                urls = picsField
                  .split(',')
                  .map(url => url.trim())
                  .filter(url => url.startsWith('http://') || url.startsWith('https://'));
              }
              // Si es un array
              else if (Array.isArray(picsField)) {
                urls = picsField
                  .map(item => {
                    if (typeof item === 'object' && item.url) {
                      return item.url;
                    }
                    if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
                      return item;
                    }
                    return null;
                  })
                  .filter((url): url is string => url !== null && url.length > 0);
              }

              if (urls.length > 0) {
                propertiesCache.set(record.id, urls);
              }
            }
          });
          fetchNextPage();
        });
    }

    // Tercera pasada: mapear Properties IDs a Unique IDs From Engagements
    console.log('📥 Mapeando Properties a Unique IDs...\n');
    
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
          if (Array.isArray(propertiesLinks)) {
            propertiesLinks.forEach((linkId: string) => {
              if (typeof linkId === 'string') {
                const picsUrls = propertiesCache.get(linkId);
                if (picsUrls && picsUrls.length > 0) {
                  picsUrlsMap.set(uniqueId, picsUrls);
                }
              }
            });
          }
        });
        fetchNextPage();
      });

    console.log(`✅ Encontradas ${picsUrlsMap.size} propiedades con pics_urls mapeadas\n`);

    // Actualizar propiedades en Supabase
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let notFound = 0;

    for (const property of allProperties) {
      const uniqueId = property['Unique ID From Engagements'] as string | undefined;
      
      if (!uniqueId) {
        notFound++;
        continue;
      }

      const picsUrls = picsUrlsMap.get(uniqueId);

      if (picsUrls && picsUrls.length > 0) {
        // Verificar si ya tiene pics_urls
        const { data: currentProperty } = await supabase
          .from('properties')
          .select('pics_urls')
          .eq('id', property.id)
          .single();

        const currentPicsUrls = currentProperty?.pics_urls || [];
        const hasPicsUrls = Array.isArray(currentPicsUrls) && currentPicsUrls.length > 0;

        // Solo actualizar si no tiene pics_urls (según la lógica: solo insertar si no existe)
        if (!hasPicsUrls) {
          const { error: updateError } = await supabase
            .from('properties')
            .update({ 
              pics_urls: picsUrls,
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
        notFound++;
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   - Actualizadas: ${updated}`);
    console.log(`   - Omitidas (ya tenían pics_urls): ${skipped}`);
    console.log(`   - Sin pics_urls en Airtable: ${notFound}`);
    console.log(`   - Errores: ${errors}`);
    console.log(`   - Total procesadas: ${allProperties.length}`);

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

