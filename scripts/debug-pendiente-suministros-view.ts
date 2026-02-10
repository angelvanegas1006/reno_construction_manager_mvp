#!/usr/bin/env tsx
/**
 * Script para diagnosticar la vista "Pendiente de Suministros" en Airtable.
 * Comprueba si la vista devuelve registros y con qué campos.
 *
 * Uso: npx tsx scripts/debug-pendiente-suministros-view.ts
 *
 * Requiere: .env con NEXT_PUBLIC_AIRTABLE_API_KEY y NEXT_PUBLIC_AIRTABLE_BASE_ID
 */

import { loadEnvConfig } from '@next/env';
import { fetchPropertiesFromAirtable } from '../lib/airtable/sync-from-airtable';

const AIRTABLE_TABLE_ID = 'tblmX19OTsj3cTHmA';
const PENDIENTE_SUMINISTROS_VIEW_ID = 'viwCFzKrVQSCc23zc';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  console.log('\n🔍 Diagnóstico vista "Pendiente de Suministros"\n');
  console.log('  Table ID:', AIRTABLE_TABLE_ID);
  console.log('  View ID:', PENDIENTE_SUMINISTROS_VIEW_ID);
  console.log('');

  if (!process.env.NEXT_PUBLIC_AIRTABLE_API_KEY || !process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID) {
    console.error('❌ Faltan NEXT_PUBLIC_AIRTABLE_API_KEY o NEXT_PUBLIC_AIRTABLE_BASE_ID en .env');
    process.exit(1);
  }

  try {
    const records = await fetchPropertiesFromAirtable(AIRTABLE_TABLE_ID, PENDIENTE_SUMINISTROS_VIEW_ID);

    console.log('✅ Respuesta de Airtable:', records.length, 'registros\n');

    if (records.length === 0) {
      console.log('⚠️  La vista no devuelve ningún registro. Posibles causas:');
      console.log('   1. La vista está vacía (no hay filas con Set Up Status = "Utilities activation")');
      console.log('   2. Los filtros de la vista excluyen todos los registros');
      console.log('   3. La vista pertenece a OTRA tabla: entonces el View ID es correcto pero');
      console.log('      esta tabla (', AIRTABLE_TABLE_ID, ') no contiene esa vista.');
      console.log('      En Airtable, cada vista pertenece a una tabla. El sync usa la misma');
      console.log('      tabla para todas las fases; si "Pendiente de Suministros" está en');
      console.log('      otra tabla, hay que usar el tableId de esa tabla para esta vista.\n');
      process.exit(0);
    }

    let withUniqueId = 0;
    let withoutUniqueId = 0;
    records.forEach((r) => {
      const u =
        r.fields['UNIQUEID (from Engagements)'] ??
        r.fields['Unique ID (From Engagements)'] ??
        r.fields['Unique ID From Engagements'] ??
        r.fields['Unique ID'];
      const uniqueId = Array.isArray(u) ? u[0] : u;
      if (uniqueId) withUniqueId++;
      else withoutUniqueId++;
    });

    console.log('  Con Unique ID (se sincronizarían):', withUniqueId);
    console.log('  Sin Unique ID (se omiten en sync):', withoutUniqueId);
    console.log('');

    console.log('  Primeros 5 registros:');
    records.slice(0, 5).forEach((r, i) => {
      const u =
        r.fields['UNIQUEID (from Engagements)'] ??
        r.fields['Unique ID (From Engagements)'] ??
        r.fields['Unique ID From Engagements'] ??
        r.fields['Unique ID'];
      const uniqueId = Array.isArray(u) ? u[0] : u;
      const setUpStatus = r.fields['Set Up Status'] ?? r.fields['Set up status'] ?? '-';
      const address = r.fields['Address'] ?? r.fields['address'] ?? '-';
      console.log(`    ${i + 1}. Unique ID: ${uniqueId || '(vacío)'} | Set Up Status: ${setUpStatus} | Address: ${String(address).slice(0, 40)}...`);
    });

    console.log('\n✅ Si ves registros con Unique ID, el sync debería llevarlos a Pendiente de Suministros.');
    console.log('   Si tras el sync no aparecen, puede que tengan mayor prioridad en otra vista (p. ej. Cleaning).\n');
  } catch (error: any) {
    console.error('\n❌ Error al leer la vista:\n', error.message);
    if (error.statusCode === 404 || error.message?.toLowerCase().includes('not found')) {
      console.log('\n💡 La vista no existe en esta tabla. Comprueba:');
      console.log('   1. Que el View ID sea correcto (viwCFzKrVQSCc23zc). En Airtable, abre la vista');
      console.log('      y revisa la URL: .../tblXXX/viwYYY → viwYYY es el View ID.');
      console.log('   2. Que la vista esté en la MISMA tabla que el resto de fases (Revisión Inicial,');
      console.log('      Final Check, Cleaning, etc.). Si está en otra tabla, hay que usar su tableId.\n');
    }
    process.exit(1);
  }
}

main();
