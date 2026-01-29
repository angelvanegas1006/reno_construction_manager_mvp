/**
 * Verifica por qué no aparecen viviendas en la fase Amoblamiento (furnishing).
 * Ejecutar con: npx tsx scripts/verify-furnishing-phase.ts
 *
 * 1. Lee la vista de Furnishing en Airtable y muestra cuántos registros hay.
 * 2. Muestra cuántas propiedades tienen reno_phase = 'furnishing' en Supabase.
 * 3. Ayuda a comprobar si el View ID es el correcto para tu vista "Amoblamiento".
 */

import { loadEnvConfig } from '@next/env';
import { fetchPropertiesFromAirtable } from '../lib/airtable/sync-from-airtable';
import { createAdminClient } from '../lib/supabase/admin';

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const FURNISHING_VIEW_ID = 'viw9NDUaeGIQDvugU';

async function main() {
  const projectDir = process.cwd();
  loadEnvConfig(projectDir);

  console.log('🔍 Verificación fase Amoblamiento (Furnishing)\n');
  console.log('View ID configurado en el código:', FURNISHING_VIEW_ID);
  console.log('(En Airtable: abre la vista "Amoblamiento", URL termina en .../viwXXXX → ese es el View ID)\n');

  try {
    // 1. Airtable: cuántos registros devuelve la vista Furnishing
    console.log('1️⃣ Leyendo vista Furnishing en Airtable...');
    const records = await fetchPropertiesFromAirtable(AIRTABLE_TABLE_ID, FURNISHING_VIEW_ID);
    console.log(`   Registros en la vista: ${records.length}`);

    if (records.length === 0) {
      console.log('\n   ⚠️ La vista devuelve 0 registros. Posibles causas:');
      console.log('   - El View ID no es el de tu vista "Amoblamiento".');
      console.log('   - En Airtable: vista → clic derecho → "Copy link to view" → la URL tiene el ID (viw...).');
      console.log('   - O los filtros de la vista no incluyen ninguna propiedad.');
    } else {
      const uniqueIds = records
        .map((r) => {
          const v =
            r.fields['UNIQUEID (from Engagements)'] ??
            r.fields['Unique ID (From Engagements)'] ??
            r.fields['Unique ID From Engagements'] ??
            r.fields['Unique ID'];
          return Array.isArray(v) ? v[0] : v;
        })
        .filter(Boolean);
      console.log('   Unique IDs (muestra):', uniqueIds.slice(0, 5).join(', '));
      if (uniqueIds.length > 5) console.log('   ... y', uniqueIds.length - 5, 'más');
    }

    // 2. Supabase: cuántas propiedades tienen reno_phase = 'furnishing'
    console.log('\n2️⃣ Propiedades en Supabase con reno_phase = "furnishing"...');
    const supabase = createAdminClient();
    const { data: furnishingProps, error } = await supabase
      .from('properties')
      .select('id, address, "Unique ID From Engagements", reno_phase, "Set Up Status"')
      .eq('reno_phase', 'furnishing');

    if (error) {
      console.log('   Error:', error.message);
    } else {
      console.log(`   Total: ${furnishingProps?.length ?? 0}`);
      if (furnishingProps && furnishingProps.length > 0) {
        furnishingProps.slice(0, 3).forEach((p: any) => {
          console.log(`   - ${p.address ?? p.id} (${p['Unique ID From Engagements'] ?? p.id})`);
        });
      } else {
        console.log('   Ninguna propiedad tiene reno_phase = "furnishing".');
        console.log('   Ejecuta el sync: npm run sync:all-phases');
      }
    }

    console.log('\n📌 Resumen:');
    if (records.length === 0) {
      console.log('   Airtable vista Furnishing devuelve 0 registros → revisa el View ID en lib/airtable/sync-unified.ts (FURNISHING_VIEW_ID).');
    } else if ((furnishingProps?.length ?? 0) === 0) {
      console.log('   Airtable tiene registros pero Supabase tiene 0 en furnishing → ejecuta: npm run sync:all-phases');
    } else {
      console.log('   Todo coherente. Si en la app no ves la columna, revisa filtros del Kanban o caché.');
    }
  } catch (e: any) {
    console.error('Error:', e?.message ?? e);
    process.exit(1);
  }
}

main();
