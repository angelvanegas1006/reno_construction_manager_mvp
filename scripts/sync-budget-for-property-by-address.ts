#!/usr/bin/env tsx
/**
 * Sincroniza budget_pdf_url desde Airtable para UNA propiedad buscada por dirección o Unique ID.
 * Trae todos los presupuestos asociados (TECH - Budget Attachment (URLs) y campos similares).
 *
 * Uso:
 *   npx tsx scripts/sync-budget-for-property-by-address.ts "C. Las Viñas, 18, Portal 6, 2º-C, Madridejos"
 *   npx tsx scripts/sync-budget-for-property-by-address.ts "Las Viñas"
 *   npx tsx scripts/sync-budget-for-property-by-address.ts SP-KHU-MV3-004409
 *   npx tsx scripts/sync-budget-for-property-by-address.ts "Madridejos" --extract-categories   # + disparar extracción categorías
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { findTransactionsRecordIdByUniqueId } from '@/lib/airtable/client';
import Airtable from 'airtable';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const BUDGET_ATTACHMENT_FIELD_ID = 'fldVOO4zqx5HUzIjz';

function getAirtableBase() {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) return null;
  return new Airtable({ apiKey }).base(baseId);
}

function extractBudgetUrls(budgetField: any): string[] {
  const urls: string[] = [];
  if (budgetField == null) return urls;
  if (typeof budgetField === 'string') {
    budgetField
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0 && (s.startsWith('http://') || s.startsWith('https://')))
      .forEach((u: string) => urls.push(u));
    return urls;
  }
  if (Array.isArray(budgetField)) {
    budgetField.forEach((item: any) => {
      if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
        urls.push(item.trim());
      } else if (item && typeof item === 'object' && item.url) {
        urls.push(String(item.url).trim());
      }
    });
  }
  return urls.filter((u) => u.length > 0);
}

async function main() {
  const arg = process.argv[2];
  if (!arg || arg.trim().length === 0) {
    console.error('Uso: npx tsx scripts/sync-budget-for-property-by-address.ts "<dirección o Unique ID>"');
    process.exit(1);
  }

  const search = arg.trim();
  const supabase = createAdminClient();
  const base = getAirtableBase();

  if (!base) {
    console.error('❌ No se pudo inicializar Airtable. Verifica NEXT_PUBLIC_AIRTABLE_API_KEY y NEXT_PUBLIC_AIRTABLE_BASE_ID.');
    process.exit(1);
  }

  console.log('🔍 Buscando propiedad:', search, '\n');

  // 1. Buscar propiedad en Supabase por id, Unique ID o dirección (ilike)
  const isLikelyId = /^[A-Z]{2}-[A-Z0-9]{3}-[A-Z0-9]{3}-[0-9]{6}$/i.test(search);
  let property: { id: string; address: string | null; 'Unique ID From Engagements': string | null; budget_pdf_url: string | null } | null = null;

  if (isLikelyId) {
    const { data: byId } = await supabase
      .from('properties')
      .select('id, address, "Unique ID From Engagements", budget_pdf_url')
      .eq('id', search)
      .maybeSingle();
    if (byId) property = byId as any;
    if (!property) {
      const { data: byUniqueId } = await supabase
        .from('properties')
        .select('id, address, "Unique ID From Engagements", budget_pdf_url')
        .eq('Unique ID From Engagements', search)
        .maybeSingle();
      if (byUniqueId) property = byUniqueId as any;
    }
  }

  if (!property) {
    const { data: list } = await supabase
      .from('properties')
      .select('id, address, "Unique ID From Engagements", budget_pdf_url')
      .ilike('address', `%${search}%`)
      .limit(10);
    if (list && list.length === 1) {
      property = list[0] as any;
    } else if (list && list.length > 1) {
      console.log('⚠️  Varias propiedades coinciden con la dirección. Mostrando primeras 10:\n');
      list.forEach((p: any, i: number) => {
        console.log(`   ${i + 1}. ${p.id} - ${p.address} (Unique ID: ${p['Unique ID From Engagements'] || 'N/A'})`);
      });
      console.log('\nUsa un Unique ID o una dirección más específica.');
      process.exit(1);
    }
  }

  if (!property) {
    console.error('❌ No se encontró ninguna propiedad en Supabase para:', search);
    process.exit(1);
  }

  const uniqueId = property['Unique ID From Engagements'] || property.id;
  console.log('✅ Propiedad encontrada en Supabase:');
  console.log('   ID:', property.id);
  console.log('   Dirección:', property.address);
  console.log('   Unique ID From Engagements:', uniqueId);
  console.log('   budget_pdf_url actual:', property.budget_pdf_url ? `${property.budget_pdf_url.substring(0, 60)}...` : '(vacío)\n');

  // 2. Buscar record en Airtable Transactions
  const transactionsRecordId = await findTransactionsRecordIdByUniqueId(uniqueId);
  if (!transactionsRecordId) {
    console.error('❌ No se encontró registro en Airtable Transactions para Unique ID:', uniqueId);
    console.log('   Comprueba que el Unique ID coincida exactamente con el de Airtable.');
    process.exit(1);
  }
  console.log('✅ Registro Airtable Transactions:', transactionsRecordId, '\n');

  // 3. Obtener el record y todos los campos que puedan ser budget/attachment
  const record = await base('Transactions').find(transactionsRecordId);
  const fieldKeys = Object.keys(record.fields);

  const budgetFieldNames = fieldKeys.filter(
    (k) =>
      k === 'TECH - Budget Attachment (URLs)' ||
      k === BUDGET_ATTACHMENT_FIELD_ID ||
      (k.toLowerCase().includes('budget') && (k.toLowerCase().includes('attachment') || k.toLowerCase().includes('url')))
  );

  let allUrls: string[] = [];
  const checkedFields: string[] = [BUDGET_ATTACHMENT_FIELD_ID, ...budgetFieldNames.filter((k) => k !== BUDGET_ATTACHMENT_FIELD_ID)];

  for (const fieldKey of checkedFields) {
    const value = record.fields[fieldKey];
    if (value == null) continue;
    const urls = extractBudgetUrls(value);
    if (urls.length > 0) {
      console.log(`   Campo "${fieldKey}": ${urls.length} URL(s)`);
      urls.forEach((u, i) => console.log(`      ${i + 1}. ${u.substring(0, 80)}${u.length > 80 ? '...' : ''}`));
      allUrls.push(...urls);
    }
  }

  const uniqueUrls = [...new Set(allUrls)];
  if (uniqueUrls.length === 0) {
    console.log('⚠️  No se encontraron URLs de presupuesto en Airtable para este registro.');
    console.log('   Campos revisados:', checkedFields.join(', '));
    console.log('   Lista de campos del registro:', fieldKeys.filter((k) => k.toLowerCase().includes('budget') || k.toLowerCase().includes('attachment') || k.toLowerCase().includes('pdf')).join(', ') || '(ninguno relacionado)');
    process.exit(1);
  }

  const budgetPdfUrlValue = uniqueUrls.join(',');
  console.log('\n📄 Total URLs de presupuesto a guardar:', uniqueUrls.length);

  // 4. Actualizar Supabase
  const { error: updateError } = await supabase
    .from('properties')
    .update({ budget_pdf_url: budgetPdfUrlValue, updated_at: new Date().toISOString() })
    .eq('id', property.id);

  if (updateError) {
    console.error('❌ Error actualizando Supabase:', updateError.message);
    process.exit(1);
  }

  console.log('✅ budget_pdf_url actualizado en Supabase.');

  // 5. Opcional: disparar extracción de categorías (n8n) para el primer presupuesto
  const extractArg = process.argv[3];
  if (extractArg === '--extract-categories' || extractArg === '--categorias') {
    const firstUrl = uniqueUrls[0];
    const payload = {
      budget_pdf_url: firstUrl,
      property_id: property.id,
      unique_id: uniqueId,
      property_name: null,
      address: property.address || null,
      client_name: null,
      client_email: null,
      renovation_type: null,
      area_cluster: null,
      budget_index: 1,
    };
    console.log('\n📤 Disparando extracción de categorías (n8n)...');
    try {
      const res = await fetch('https://n8n.prod.prophero.com/webhook/send_categories_cursor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        console.log('✅ Extracción de categorías disparada correctamente.');
      } else {
        console.warn('⚠️  Respuesta n8n:', res.status, await res.text());
      }
    } catch (e: any) {
      console.warn('⚠️  No se pudo disparar categorías:', e?.message || e);
    }
  } else {
    console.log('\n💡 Para extraer categorías ejecuta con: --extract-categories o --categorias');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
