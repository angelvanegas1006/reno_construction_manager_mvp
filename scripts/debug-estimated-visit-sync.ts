#!/usr/bin/env tsx
/**
 * Script para debuggear la sincronización de Estimated Visit Date a Airtable
 * Uso: tsx scripts/debug-estimated-visit-sync.ts "C. Calvario, 41, 2º-A, Algezares (Murcia)"
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { findRecordByPropertyId, updateAirtableWithRetry } from '@/lib/airtable/client';

// Cargar variables de entorno
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

async function debugEstimatedVisitSync(address?: string) {
  console.log('🔍 Debugging Estimated Visit Date sync to Airtable\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL');
    console.error('   Required: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const tableName = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Transactions';

  try {
    // 1. Buscar la propiedad en Supabase
    let query = supabase
      .from('properties')
      .select('id, address, "Estimated Visit Date", airtable_property_id, "Unique ID From Engagements", reno_phase, "Set Up Status"');

    if (address) {
      query = query.ilike('address', `%${address}%`);
    }

    const { data: properties, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching properties:', fetchError);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('⚠️  No se encontraron propiedades');
      if (address) {
        console.log(`   Buscando por: "${address}"`);
      }
      return;
    }

    console.log(`✅ Encontradas ${properties.length} propiedad(es)\n`);

    for (const property of properties) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 Propiedad: ${property.address || property.id}`);
      console.log(`   ID Supabase: ${property.id}`);
      console.log(`   Fase: ${property.reno_phase || 'N/A'}`);
      console.log(`   Set Up Status: ${property['Set Up Status'] || 'N/A'}`);
      console.log(`   Estimated Visit Date (Supabase): ${property['Estimated Visit Date'] || 'No definida'}`);
      console.log(`   Airtable Property ID: ${property.airtable_property_id || 'N/A'}`);
      console.log(`   Unique ID From Engagements: ${property['Unique ID From Engagements'] || 'N/A'}`);

      const airtablePropertyId = property.airtable_property_id || property['Unique ID From Engagements'];
      
      if (!airtablePropertyId) {
        console.log('   ⚠️  No hay Airtable ID disponible para esta propiedad');
        continue;
      }

      if (!property['Estimated Visit Date']) {
        console.log('   ⚠️  No hay Estimated Visit Date en Supabase');
        continue;
      }

      // 2. Buscar el registro en Airtable
      console.log(`\n   🔍 Buscando registro en Airtable...`);
      console.log(`   Tabla: ${tableName}`);
      console.log(`   Airtable Property ID: ${airtablePropertyId}`);

      // Si airtable_property_id empieza con "rec", es un record ID directo
      let recordId: string | null = null;
      
      if (airtablePropertyId.startsWith('rec')) {
        recordId = airtablePropertyId;
        console.log(`   ✅ Es un record ID directo: ${recordId}`);
      } else {
        console.log(`   🔍 Buscando record ID por Property ID...`);
        recordId = await findRecordByPropertyId(tableName, airtablePropertyId);
        
        if (!recordId) {
          console.log('   ❌ No se encontró el registro en Airtable');
          console.log('   💡 Verifica que:');
          console.log('      - El Property ID existe en Airtable');
          console.log('      - El nombre de la tabla sea correcto (Transactions)');
          console.log('      - El campo de búsqueda tenga el valor correcto');
          continue;
        }

        console.log(`   ✅ Record ID encontrado: ${recordId}`);
      }

      // 3. Intentar actualizar
      console.log(`\n   📤 Intentando actualizar Airtable...`);
      console.log(`   Field ID: fldIhqPOAFL52MMBn`);
      console.log(`   Valor: ${property['Estimated Visit Date']}`);

      if (!property['Estimated Visit Date']) {
        console.log('   ⚠️ La propiedad no tiene Estimated Visit Date. No se puede sincronizar.');
        continue;
      }

      const estimatedVisitDate = property['Estimated Visit Date'];
      if (!estimatedVisitDate) {
        console.log('   ⚠️ La propiedad no tiene Estimated Visit Date. No se puede sincronizar.');
        continue;
      }

      // Type assertion después de verificar que no es null
      const visitDateString = estimatedVisitDate as string;

      const syncSuccess = await (updateAirtableWithRetry as any)(tableName, recordId, {
        'fldIhqPOAFL52MMBn': visitDateString,
      });

      if (syncSuccess) {
        console.log('   ✅ Sincronización exitosa');
      } else {
        console.log('   ❌ La sincronización falló');
        console.log('   💡 Verifica:');
        console.log('      - Que el field ID fldIhqPOAFL52MMBn sea correcto');
        console.log('      - Que el formato de la fecha sea correcto (YYYY-MM-DD)');
        console.log('      - Que tengas permisos para actualizar el registro');
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error: any) {
    console.error('❌ Error durante el debug:', error);
    console.error('Stack:', error?.stack);
  }
}

// Ejecutar
const address = process.argv[2];
debugEstimatedVisitSync(address).then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

