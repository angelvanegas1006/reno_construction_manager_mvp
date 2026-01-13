/**
 * Script para depurar propiedades específicas que tienen fecha en Airtable pero no en Supabase
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
const fieldId = 'fldPX58nQYf9HsTRE';
const fieldNames = ['Est. reno start date', 'Est. Reno Start Date', 'Estimated Reno Start Date', 'Estimated reno start date'];

// Propiedades específicas a verificar
const propertiesToCheck = [
  'C. Peña Ciclista Muñoz, Segundo H, Bloque 1, Vicar, Almería',
  'Calle La Loma, 107, esc2, 1º -4, Torrevieja',
  'C. Peña Ciclista Muñoz, Bajo C, Bloque 2, Vicar, Almería'
];

async function debugProperties() {
  console.log('🔍 Depurando propiedades específicas...\n');

  const supabase = createAdminClient();

  // Buscar en Airtable
  for (const address of propertiesToCheck) {
    console.log(`\n📋 Verificando: ${address}\n`);
    
    try {
      const records = await base(tableName)
        .select({
          filterByFormula: `{Address} = "${address}"`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length === 0) {
        console.log('   ❌ No encontrada en Airtable');
        continue;
      }

      const record = records[0];
      const fields = record.fields;

      // Buscar el campo
      let dateValue: any = fields[fieldId];
      if (dateValue === undefined || dateValue === null) {
        for (const name of fieldNames) {
          if (fields[name] !== undefined && fields[name] !== null) {
            dateValue = fields[name];
            console.log(`   ✅ Campo encontrado por nombre: "${name}"`);
            break;
          }
        }
      } else {
        console.log(`   ✅ Campo encontrado por Field ID: ${fieldId}`);
      }

      console.log(`   📅 Valor en Airtable: ${dateValue || 'null'}`);

      // Obtener Unique ID
      const uniqueIdValue = 
        fields['UNIQUEID (from Engagements)'] ||
        fields['Unique ID (From Engagements)'] ||
        fields['Unique ID From Engagements'] ||
        fields['Unique ID'];
      
      const uniqueId = Array.isArray(uniqueIdValue) 
        ? uniqueIdValue[0] 
        : uniqueIdValue;

      console.log(`   🆔 Unique ID: ${uniqueId || 'NO ENCONTRADO'}`);

      if (!uniqueId) {
        console.log('   ⚠️  No se puede verificar en Supabase sin Unique ID');
        continue;
      }

      // Verificar en Supabase
      const { data: supabaseProp, error } = await supabase
        .from('properties')
        .select('id, address, "Unique ID From Engagements", Est_reno_start_date')
        .eq('Unique ID From Engagements', uniqueId)
        .single();

      if (error || !supabaseProp) {
        console.log(`   ❌ No encontrada en Supabase: ${error?.message || 'No existe'}`);
        continue;
      }

      console.log(`   ✅ Encontrada en Supabase`);
      console.log(`   📅 Valor en Supabase: ${supabaseProp.Est_reno_start_date || 'null'}`);

      // Probar el mapeo
      const airtableProperty = {
        id: record.id,
        fields: fields
      };

      const mapped = mapAirtableToSupabase(airtableProperty);
      console.log(`   🔄 Valor después del mapeo: ${mapped.Est_reno_start_date || 'null'}`);

      if (mapped.Est_reno_start_date !== supabaseProp.Est_reno_start_date) {
        console.log(`   ⚠️  DISCREPANCIA: El mapeo produce "${mapped.Est_reno_start_date}" pero Supabase tiene "${supabaseProp.Est_reno_start_date || 'null'}"`);
      }

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
}

debugProperties()
  .then(() => {
    console.log('\n✅ Depuración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

