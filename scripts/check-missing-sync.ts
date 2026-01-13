/**
 * Script para verificar por qué algunas propiedades con fecha en Airtable no se sincronizan
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import Airtable from 'airtable';
import { createAdminClient } from '../lib/supabase/admin';

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

// Vistas de Airtable (copiadas de sync-unified.ts)
const PHASE_VIEWS = [
  { phase: 'cleaning', viewId: 'viwLajczYxzQd4UvU', description: 'Cleaning' },
  { phase: 'final-check', viewId: 'viwnDG5TY6wjZhBL2', description: 'Final Check' },
  { phase: 'furnishing', viewId: 'viw9NDUaeGIQDvugU', description: 'Furnishing' },
  { phase: 'reno-in-progress', viewId: 'viwQUOrLzUrScuU4k', description: 'Reno In Progress' },
  { phase: 'reno-budget', viewId: 'viwKS3iOiyX5iu5zP', description: 'Upcoming Reno Budget' },
  { phase: 'initial-check', viewId: 'viwFZZ5S3VFCfYP6g', description: 'Initial Check' },
  { phase: 'upcoming-settlements', viewId: 'viwpYQ0hsSSdFrSD1', description: 'Upcoming Settlements' },
];

async function checkMissingSync() {
  console.log('🔍 Verificando propiedades con fecha en Airtable que no están en Supabase...\n');

  const supabase = createAdminClient();

  // Obtener propiedades de Supabase
  const { data: supabaseProperties } = await supabase
    .from('properties')
    .select('id, address, "Unique ID From Engagements", Est_reno_start_date');

  const supabaseMap = new Map(
    supabaseProperties?.map(p => [p['Unique ID From Engagements'], p]) || []
  );

  // Obtener todas las propiedades de todas las vistas
  const propertiesInViews = new Set<string>();
  
  for (const phaseConfig of PHASE_VIEWS) {
    try {
      let count = 0;
      await base(tableName)
        .select({
          view: phaseConfig.viewId,
        })
        .eachPage((pageRecords, fetchNextPage) => {
          pageRecords.forEach((record) => {
            count++;
            const uniqueIdValue = 
              record.fields['UNIQUEID (from Engagements)'] ||
              record.fields['Unique ID (From Engagements)'] ||
              record.fields['Unique ID From Engagements'] ||
              record.fields['Unique ID'];
            
            const uniqueId = Array.isArray(uniqueIdValue) 
              ? uniqueIdValue[0] 
              : uniqueIdValue;
            
            if (uniqueId) {
              propertiesInViews.add(uniqueId);
            }
          });
          fetchNextPage();
        });
      
      console.log(`✅ Vista "${phaseConfig.description}": ${count} propiedades`);
    } catch (error: any) {
      console.error(`❌ Error en vista "${phaseConfig.description}":`, error.message);
    }
  }

  console.log(`\n📊 Total propiedades únicas en todas las vistas: ${propertiesInViews.size}\n`);

  // Buscar propiedades con fecha en Airtable que no están sincronizadas
  const airtableWithDate: Array<{
    uniqueId: string;
    address?: string;
    date: string;
    inViews: boolean;
    inSupabase: boolean;
    supabaseDate: string | null;
  }> = [];

  await base(tableName)
    .select({
      maxRecords: 500,
    })
    .eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach((record) => {
        const fields = record.fields;
        
        // Buscar el campo
        let dateValue: any = fields[fieldId];
        if (dateValue === undefined || dateValue === null) {
          for (const name of fieldNames) {
            if (fields[name] !== undefined && fields[name] !== null) {
              dateValue = fields[name];
              break;
            }
          }
        }

        if (!dateValue) return;

        // Formatear fecha
        let formattedDate: string | null = null;
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toISOString().split('T')[0];
          }
        } catch (e) {
          return;
        }

        // Obtener Unique ID
        const uniqueIdValue = 
          fields['UNIQUEID (from Engagements)'] ||
          fields['Unique ID (From Engagements)'] ||
          fields['Unique ID From Engagements'] ||
          fields['Unique ID'];
        
        const uniqueId = Array.isArray(uniqueIdValue) 
          ? uniqueIdValue[0] 
          : uniqueIdValue;

        if (uniqueId && formattedDate) {
          const inViews = propertiesInViews.has(uniqueId);
          const supabaseProp = supabaseMap.get(uniqueId);
          const inSupabase = !!supabaseProp;
          const supabaseDate = supabaseProp?.Est_reno_start_date || null;

          // Solo mostrar las que tienen problema
          if (!inViews || !inSupabase || supabaseDate !== formattedDate) {
            airtableWithDate.push({
              uniqueId,
              address: fields['Address'] as string || undefined,
              date: formattedDate,
              inViews,
              inSupabase,
              supabaseDate
            });
          }
        }
      });
      fetchNextPage();
    });

  console.log(`📊 Propiedades con fecha en Airtable que necesitan sincronización: ${airtableWithDate.length}\n`);

  const notInViews = airtableWithDate.filter(p => !p.inViews);
  const notInSupabase = airtableWithDate.filter(p => !p.inSupabase);
  const differentDate = airtableWithDate.filter(p => p.inSupabase && p.supabaseDate !== p.date);

  console.log(`   - No están en ninguna vista: ${notInViews.length}`);
  console.log(`   - No están en Supabase: ${notInSupabase.length}`);
  console.log(`   - Tienen fecha diferente: ${differentDate.length}\n`);

  if (notInViews.length > 0) {
    console.log('⚠️  Propiedades con fecha que NO están en ninguna vista (primeras 5):\n');
    notInViews.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.address || p.uniqueId}: ${p.date}`);
    });
  }

  if (differentDate.length > 0) {
    console.log('\n⚠️  Propiedades con fecha diferente (primeras 5):\n');
    differentDate.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.address || p.uniqueId}:`);
      console.log(`      - Airtable: ${p.date}`);
      console.log(`      - Supabase: ${p.supabaseDate || 'null'}`);
    });
  }

  if (notInSupabase.length > 0 && notInSupabase.length <= 10) {
    console.log('\n⚠️  Propiedades con fecha que NO están en Supabase:\n');
    notInSupabase.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.address || p.uniqueId}: ${p.date}`);
    });
  }
}

checkMissingSync()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

