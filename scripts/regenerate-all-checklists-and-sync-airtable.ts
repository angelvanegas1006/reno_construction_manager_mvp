#!/usr/bin/env tsx
/**
 * Regenera el HTML de todos los Initial y Final checks con el diseño actual,
 * sube a Storage, actualiza property_inspections.pdf_url y envía la URL pública
 * del selector (una por propiedad) a Airtable con la base URL de Vistral.
 *
 * Uso:
 *   npx tsx scripts/regenerate-all-checklists-and-sync-airtable.ts
 *   npx tsx scripts/regenerate-all-checklists-and-sync-airtable.ts --dry-run
 *   npx tsx scripts/regenerate-all-checklists-and-sync-airtable.ts --base-url https://app.vistral.io
 *
 * Variables de entorno:
 *   NEXT_PUBLIC_APP_URL  Base URL pública (ej. https://dev.vistral.io). Por defecto: https://dev.vistral.io
 *   NEXT_PUBLIC_AIRTABLE_API_KEY, NEXT_PUBLIC_AIRTABLE_BASE_ID  Para actualizar Airtable
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateChecklistHTML } from '@/lib/html/checklist-html-generator';
import { translations } from '@/lib/i18n/translations';
import { convertSupabaseToChecklist } from '@/lib/supabase/checklist-converter';
import {
  findTransactionsRecordIdByUniqueId,
  updateAirtableWithRetry,
} from '@/lib/airtable/client';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const AIRTABLE_TABLE = 'Transactions';
const AIRTABLE_FIELD_RENO_CHECKLIST_FORM = 'fldBOpKEktOI2GnZK';
const STORAGE_BUCKET = 'checklists';

function getBaseUrl(): string {
  const arg = process.argv.find((a) => a.startsWith('--base-url='));
  if (arg) {
    const url = arg.split('=')[1]?.trim();
    if (url) return url.startsWith('http') ? url : `https://${url}`;
  }
  const env =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    'https://dev.vistral.io';
  return env.startsWith('http') ? env : `https://${env}`;
}

function generateChecklistPublicSelectorUrl(propertyId: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/checklist-public/${propertyId}`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const baseUrl = getBaseUrl();

  console.log('\n📋 Regenerar todos los checklists y sincronizar URL a Airtable\n');
  console.log(`   Base URL (Vistral): ${baseUrl}`);
  console.log(`   Selector: ${baseUrl}/checklist-public/{propertyId}\n`);
  if (dryRun) {
    console.log('   🔍 Modo dry-run: no se subirá a Storage ni se actualizará Airtable.\n');
  }

  const supabase = createAdminClient();

  // 1. Inspecciones completadas (initial o final)
  const { data: inspections, error: inspError } = await supabase
    .from('property_inspections')
    .select('id, property_id, inspection_type')
    .or('inspection_status.eq.completed,completed_at.not.is.null');

  if (inspError) {
    console.error('❌ Error leyendo inspecciones:', inspError.message);
    process.exit(1);
  }

  const list = (inspections || []).filter(
    (r) => r.inspection_type === 'initial' || r.inspection_type === 'final'
  );
  if (list.length === 0) {
    console.log('No hay inspecciones completadas (initial/final).');
    process.exit(0);
  }

  const examplePropertyId = list[0].property_id;
  const exampleSelectorUrl = generateChecklistPublicSelectorUrl(examplePropertyId, baseUrl);
  console.log(`   Inspecciones a regenerar: ${list.length}`);
  console.log(`\n📎 Ejemplo de link público (selector) con URL Vistral:`);
  console.log(`   ${exampleSelectorUrl}\n`);

  let htmlOk = 0;
  let htmlFail = 0;

  for (const row of list) {
    const propertyId = row.property_id;
    const inspectionType = row.inspection_type as 'initial' | 'final';
    const checklistType = inspectionType === 'initial' ? 'reno_initial' : 'reno_final';

    try {
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (propError || !property) {
        console.warn(`⏭️  ${propertyId} (${inspectionType}): propiedad no encontrada`);
        htmlFail++;
        continue;
      }

      const { data: zones, error: zonesError } = await supabase
        .from('inspection_zones')
        .select('*')
        .eq('inspection_id', row.id)
        .order('created_at', { ascending: true });

      if (zonesError || !zones?.length) {
        console.warn(`⏭️  ${propertyId} (${inspectionType}): sin zonas`);
        htmlFail++;
        continue;
      }

      const zoneIds = zones.map((z) => z.id);
      const { data: elements, error: elementsError } = await supabase
        .from('inspection_elements')
        .select('*')
        .in('zone_id', zoneIds);

      if (elementsError) {
        console.warn(`⏭️  ${propertyId} (${inspectionType}): error elementos`, elementsError.message);
        htmlFail++;
        continue;
      }

      const checklistData = convertSupabaseToChecklist(
        zones,
        elements || [],
        property.bedrooms ?? null,
        property.bathrooms ?? null
      );

      const fullChecklist = {
        propertyId,
        checklistType,
        sections: checklistData.sections || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const htmlContent = await generateChecklistHTML(
        fullChecklist,
        {
          address: property.address || propertyId,
          propertyId,
          renovatorName: (property as any)['Renovator name'] || undefined,
        },
        translations.es,
        inspectionType
      );

      if (!dryRun) {
        const buffer = Buffer.from(htmlContent, 'utf-8');
        const storagePath = `${propertyId}/${inspectionType}/checklist.html`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, buffer, {
            contentType: 'text/html',
            upsert: true,
          });

        if (uploadError) {
          console.warn(`❌ ${propertyId} (${inspectionType}): upload`, uploadError.message);
          htmlFail++;
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);
        const htmlUrl = publicUrlData.publicUrl;

        const { error: updateError } = await supabase
          .from('property_inspections')
          .update({ pdf_url: htmlUrl })
          .eq('id', row.id);

        if (updateError) {
          console.warn(`⚠️ ${propertyId} (${inspectionType}): no se actualizó pdf_url`);
        }
      }

      htmlOk++;
      console.log(`   ✅ ${propertyId} (${inspectionType})`);
    } catch (e: any) {
      console.warn(`❌ ${propertyId} (${inspectionType}):`, e?.message || e);
      htmlFail++;
    }
  }

  console.log(`\n   HTML: ${htmlOk} ok, ${htmlFail} fallos\n`);

  // 2. Actualizar Airtable con la URL del selector (una por propiedad)
  const propertyIds = [...new Set(list.map((r) => r.property_id).filter(Boolean))] as string[];

  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('id, "Unique ID From Engagements"')
    .in('id', propertyIds);

  if (propError) {
    console.error('❌ Error leyendo propiedades:', propError.message);
    process.exit(1);
  }

  let airtableOk = 0;
  let airtableSkip = 0;
  let airtableErr = 0;

  for (const p of properties || []) {
    const uniqueId = p['Unique ID From Engagements'];
    if (!uniqueId) {
      airtableSkip++;
      continue;
    }

    const recordId = await findTransactionsRecordIdByUniqueId(uniqueId);
    if (!recordId) {
      airtableSkip++;
      continue;
    }

    const selectorUrl = generateChecklistPublicSelectorUrl(p.id, baseUrl);

    if (dryRun) {
      console.log(`   [dry-run] Airtable ${p.id} → ${selectorUrl}`);
      airtableOk++;
      continue;
    }

    const success = await updateAirtableWithRetry(AIRTABLE_TABLE, recordId, {
      [AIRTABLE_FIELD_RENO_CHECKLIST_FORM]: selectorUrl,
    });

    if (success) {
      airtableOk++;
      console.log(`   ✅ Airtable ${p.id} → ${selectorUrl}`);
    } else {
      airtableErr++;
    }
  }

  console.log('\n--- Resumen ---');
  console.log(`   HTML regenerados: ${htmlOk} ok, ${htmlFail} fallos`);
  console.log(`   Airtable actualizados: ${airtableOk}`);
  console.log(`   Airtable omitidos: ${airtableSkip}`);
  if (airtableErr > 0) console.log(`   Airtable errores: ${airtableErr}`);

  if (propertyIds.length > 0) {
    const exampleId = propertyIds[0];
    const exampleUrl = generateChecklistPublicSelectorUrl(exampleId, baseUrl);
    console.log('\n📎 Ejemplo de link público (primera propiedad):');
    console.log(`   ${exampleUrl}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
