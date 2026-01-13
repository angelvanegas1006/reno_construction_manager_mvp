/**
 * Script para forzar la actualización del campo Est_reno_start_date en propiedades específicas
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import Airtable from 'airtable';
import { createAdminClient } from '../lib/supabase/admin';
import { mapAirtableToSupabase } from '../lib/airtable/sync-from-airtable';

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);
const tableName = 'Transactions';
const fieldNames = ['Est. reno start date', 'Est. Reno Start Date', 'Estimated Reno Start Date', 'Estimated reno start date'];

const propertiesToUpdate = [
  { uniqueId: 'SP-IC1-0MI-004227', address: 'C. Peña Ciclista Muñoz, Segundo H, Bloque 1, Vicar, Almería' },
  { uniqueId: 'SP-RZ2-NQB-005312', address: 'Calle La Loma, 107, esc2, 1º -4, Torrevieja' },
  { uniqueId: 'SP-R9H-QMJ-004335', address: 'C. Peña Ciclista Muñoz, Bajo C, Bloque 2, Vicar, Almería' },
];

async function forceUpdate() {
  console.log('🔄 Forzando actualización de Est_reno_start_date...\n');

  const supabase = createAdminClient();

  for (const prop of propertiesToUpdate) {
    console.log(`\n📋 Procesando: ${prop.address}`);

    try {
      // Buscar en Airtable por dirección
      const records = await base(tableName)
        .select({
          filterByFormula: `{Address} = "${prop.address}"`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length === 0) {
        console.log('   ❌ No encontrada en Airtable');
        continue;
      }

      const record = records[0];
      const airtableProperty = {
        id: record.id,
        fields: record.fields
      };

      // Mapear
      const mapped = mapAirtableToSupabase(airtableProperty);
      console.log(`   📅 Est_reno_start_date mapeado: ${mapped.Est_reno_start_date || 'null'}`);

      // Actualizar en Supabase
      const { error, data } = await supabase
        .from('properties')
        .update({
          Est_reno_start_date: mapped.Est_reno_start_date
        })
        .eq('Unique ID From Engagements', prop.uniqueId)
        .select()
        .single();

      if (error) {
        console.log(`   ❌ Error al actualizar: ${error.message}`);
      } else {
        console.log(`   ✅ Actualizado correctamente`);
        console.log(`   📅 Valor en Supabase ahora: ${data?.Est_reno_start_date || 'null'}`);
      }

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n✅ Proceso completado');
}

forceUpdate()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

