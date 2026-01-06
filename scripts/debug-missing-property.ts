/**
 * Script para debuggear por qué una propiedad no se sincronizó
 * Ejecutar con: tsx scripts/debug-missing-property.ts <recordId>
 */

import { loadEnvConfig } from '@next/env';
import Airtable from 'airtable';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || 'appT59F8wolMDKZeG';
const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';

// Configuración de vistas
const PHASE_VIEWS = [
  { phase: 'cleaning', viewId: 'viwLajczYxzQd4UvU', description: 'Cleaning' },
  { phase: 'final-check', viewId: 'viwnDG5TY6wjZhBL2', description: 'Final Check' },
  { phase: 'furnishing', viewId: 'viw9NDUaeGIQDvugU', description: 'Furnishing' },
  { phase: 'reno-in-progress', viewId: 'viwQUOrLzUrScuU4k', description: 'Reno In Progress' },
  { phase: 'reno-budget', viewId: 'viwKS3iOiyX5iu5zP', description: 'Upcoming Reno Budget' },
  { phase: 'initial-check', viewId: 'viwFZZ5S3VFCfYP6g', description: 'Initial Check' },
  { phase: 'upcoming-settlements', viewId: 'viwpYQ0hsSSdFrSD1', description: 'Upcoming Settlements' },
];

async function debugProperty(recordId: string) {
  if (!AIRTABLE_API_KEY) {
    console.error('❌ NEXT_PUBLIC_AIRTABLE_API_KEY no está configurada');
    console.error('   Verifica que las variables de entorno estén cargadas correctamente');
    process.exit(1);
  }

  const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
  const table = base(AIRTABLE_TABLE_ID);

  console.log(`\n🔍 Buscando record: ${recordId}\n`);

  try {
    // Intentar obtener el record directamente
    const record = await table.find(recordId);
    
    console.log('✅ Record encontrado en Airtable');
    console.log('\n📋 Campos del record:');
    console.log(JSON.stringify(record.fields, null, 2));

    // Verificar campos clave para sincronización
    const uniqueIdValue = 
      record.fields['UNIQUEID (from Engagements)'] ||
      record.fields['Unique ID (From Engagements)'] ||
      record.fields['Unique ID From Engagements'] ||
      record.fields['Unique ID'];

    const uniqueId = Array.isArray(uniqueIdValue) ? uniqueIdValue[0] : uniqueIdValue;

    console.log('\n🔑 Unique ID (From Engagements):', uniqueId || '❌ NO ENCONTRADO');

    if (!uniqueId) {
      console.log('\n⚠️  PROBLEMA: El record no tiene "Unique ID (From Engagements)"');
      console.log('   Este campo es REQUERIDO para la sincronización.');
      console.log('   Sin este campo, la propiedad será ignorada durante el sync.');
      return;
    }

    // Verificar en qué vistas aparece
    console.log('\n🔍 Verificando en qué vistas aparece este record...\n');

    for (const viewConfig of PHASE_VIEWS) {
      try {
        const records: any[] = [];
        await table
          .select({
            view: viewConfig.viewId,
            filterByFormula: `{Record ID} = '${recordId}'`,
          })
          .eachPage((pageRecords, fetchNextPage) => {
            pageRecords.forEach((r) => records.push(r));
            fetchNextPage();
          });

        if (records.length > 0) {
          console.log(`✅ ${viewConfig.description} (${viewConfig.phase}): SÍ aparece`);
        } else {
          console.log(`❌ ${viewConfig.description} (${viewConfig.phase}): NO aparece`);
        }
      } catch (error: any) {
        console.log(`⚠️  ${viewConfig.description}: Error al verificar - ${error.message}`);
      }
    }

    // Verificar campos que podrían filtrar la propiedad
    console.log('\n📊 Verificación de campos de filtro:');
    console.log(`   Stage: ${record.fields['Stage'] || 'N/A'}`);
    console.log(`   Set Up Status: ${record.fields['Set Up Status'] || 'N/A'}`);
    console.log(`   Type: ${record.fields['Type'] || 'N/A'}`);
    console.log(`   Test Flag: ${record.fields['Test Flag'] || 'N/A'}`);
    console.log(`   Country: ${record.fields['Country'] || 'N/A'}`);
    console.log(`   Already Tenanted: ${record.fields['Already Tenanted'] || 'N/A'}`);
    console.log(`   Real settlement date: ${record.fields['Real settlement date'] || 'N/A'}`);

    // Verificar si está en Supabase
    console.log('\n🔍 Verificando en Supabase...');
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    const { data: supabaseProperty, error: supabaseError } = await supabase
      .from('properties')
      .select('id, address, reno_phase, "Set Up Status", airtable_property_id')
      .or(`id.eq.${uniqueId},airtable_property_id.eq.${recordId}`)
      .maybeSingle();

    if (supabaseProperty) {
      console.log('✅ Propiedad encontrada en Supabase:');
      console.log(`   ID: ${supabaseProperty.id}`);
      console.log(`   Address: ${supabaseProperty.address}`);
      console.log(`   Phase: ${supabaseProperty.reno_phase}`);
      console.log(`   Set Up Status: ${supabaseProperty['Set Up Status']}`);
      console.log(`   Airtable Property ID: ${supabaseProperty.airtable_property_id}`);
    } else {
      console.log('❌ Propiedad NO encontrada en Supabase');
      if (supabaseError) {
        console.log(`   Error: ${supabaseError.message}`);
      }
    }

  } catch (error: any) {
    if (error.error === 'NOT_FOUND') {
      console.log('❌ Record NO encontrado en Airtable');
      console.log(`   Error: ${error.message}`);
      console.log('\n💡 Posibles razones:');
      console.log('   1. El Record ID no existe en la tabla Transactions');
      console.log('   2. El Record ID pertenece a otra tabla (Properties, Engagements, etc.)');
      console.log('   3. El Record ID fue eliminado');
    } else {
      console.error('❌ Error al buscar record:', error);
    }
  }
}

// Obtener recordId de los argumentos
const recordId = process.argv[2];

if (!recordId) {
  console.error('❌ Por favor proporciona un Record ID');
  console.log('   Uso: tsx scripts/debug-missing-property.ts <recordId>');
  console.log('   Ejemplo: tsx scripts/debug-missing-property.ts recSILwFOJdg4lnpS');
  process.exit(1);
}

debugProperty(recordId)
  .then(() => {
    console.log('\n✅ Debug completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

