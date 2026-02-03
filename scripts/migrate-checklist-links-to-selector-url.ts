#!/usr/bin/env tsx
/**
 * Migración: actualizar en Airtable el campo "Reno checklist form" con la URL
 * única del selector (/checklist-public/{propertyId}) para todas las propiedades
 * que tienen al menos una inspección completada (initial o final).
 *
 * Uso:
 *   npx tsx scripts/migrate-checklist-links-to-selector-url.ts
 *   npx tsx scripts/migrate-checklist-links-to-selector-url.ts --dry-run
 *
 * Requiere: NEXT_PUBLIC_APP_URL o VERCEL_URL, NEXT_PUBLIC_AIRTABLE_API_KEY, NEXT_PUBLIC_AIRTABLE_BASE_ID
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  findTransactionsRecordIdByUniqueId,
  updateAirtableWithRetry,
} from '@/lib/airtable/client';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const AIRTABLE_TABLE = 'Transactions';
const AIRTABLE_FIELD_RENO_CHECKLIST_FORM = 'fldBOpKEktOI2GnZK';

function generateChecklistPublicSelectorUrl(propertyId: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    'https://dev.vistral.io';
  const publicBaseUrl = baseUrl.startsWith('http')
    ? baseUrl
    : `https://${baseUrl}`;
  return `${publicBaseUrl}/checklist-public/${propertyId}`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('🔍 Modo dry-run: no se actualizará Airtable.\n');
  }

  if (
    !process.env.NEXT_PUBLIC_AIRTABLE_API_KEY ||
    !process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID
  ) {
    console.error(
      '❌ Faltan NEXT_PUBLIC_AIRTABLE_API_KEY o NEXT_PUBLIC_AIRTABLE_BASE_ID'
    );
    process.exit(1);
  }

  const supabase = createAdminClient();

  // 1. Obtener property_ids distintos con al menos una inspección completada
  const { data: inspections, error: inspError } = await supabase
    .from('property_inspections')
    .select('property_id')
    .or('inspection_status.eq.completed,completed_at.not.is.null');

  if (inspError) {
    console.error('❌ Error leyendo inspecciones:', inspError.message);
    process.exit(1);
  }

  const propertyIds = [
    ...new Set((inspections || []).map((r) => r.property_id).filter(Boolean)),
  ] as string[];

  if (propertyIds.length === 0) {
    console.log('No hay propiedades con inspecciones completadas.');
    process.exit(0);
  }

  console.log(
    `📋 Propiedades con al menos una inspección completada: ${propertyIds.length}\n`
  );

  // 2. Obtener Unique ID From Engagements para cada propiedad
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('id, "Unique ID From Engagements"')
    .in('id', propertyIds);

  if (propError) {
    console.error('❌ Error leyendo propiedades:', propError.message);
    process.exit(1);
  }

  const propertyIdToUniqueId = new Map<string, string>();
  for (const p of properties || []) {
    const uniqueId = p['Unique ID From Engagements'];
    if (uniqueId) {
      propertyIdToUniqueId.set(p.id, uniqueId);
    }
  }

  let updated = 0;
  let skippedNoUniqueId = 0;
  let skippedNoAirtableRecord = 0;
  let errors = 0;

  for (const propertyId of propertyIds) {
    const uniqueId = propertyIdToUniqueId.get(propertyId);
    if (!uniqueId) {
      skippedNoUniqueId++;
      console.log(`⏭️  ${propertyId}: sin Unique ID From Engagements`);
      continue;
    }

    const recordId = await findTransactionsRecordIdByUniqueId(uniqueId);
    if (!recordId) {
      skippedNoAirtableRecord++;
      console.log(`⏭️  ${propertyId}: sin registro en Airtable Transactions`);
      continue;
    }

    const selectorUrl = generateChecklistPublicSelectorUrl(propertyId);

    if (dryRun) {
      console.log(
        `[dry-run] ${propertyId} → Airtable record ${recordId} → ${selectorUrl}`
      );
      updated++;
      continue;
    }

    const success = await updateAirtableWithRetry(
      AIRTABLE_TABLE,
      recordId,
      { [AIRTABLE_FIELD_RENO_CHECKLIST_FORM]: selectorUrl }
    );

    if (success) {
      updated++;
      console.log(`✅ ${propertyId} → ${selectorUrl}`);
    } else {
      errors++;
      console.error(`❌ ${propertyId}: fallo al actualizar Airtable`);
    }
  }

  console.log('\n--- Resumen ---');
  console.log(`Actualizados en Airtable: ${updated}`);
  console.log(`Omitidos (sin Unique ID): ${skippedNoUniqueId}`);
  console.log(`Omitidos (sin registro Airtable): ${skippedNoAirtableRecord}`);
  if (errors > 0) {
    console.log(`Errores: ${errors}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
