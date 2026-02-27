#!/usr/bin/env tsx
/**
 * 1. Sincroniza todas las fases desde Airtable → Supabase
 * 2. Extrae categorías (vía webhook n8n) para propiedades en reno-in-progress
 *    que tengan budget_pdf_url pero no tengan categorías dinámicas
 *
 * Uso: npx tsx scripts/sync-and-extract-categories.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Cargar .env antes de importar módulos que usan process.env
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch {
  console.warn('⚠️  No se pudo cargar .env.local');
}
try {
  const envPath = resolve(process.cwd(), '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch {
  // .env opcional
}

async function main() {
  console.log('🚀 Sync Airtable → Supabase + extracción de categorías\n');
  console.log('='.repeat(60));

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_AIRTABLE_API_KEY',
    'NEXT_PUBLIC_AIRTABLE_BASE_ID',
  ];
  const missing = requiredEnvVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error('❌ Faltan variables de entorno:', missing.join(', '));
    process.exit(1);
  }

  // --- 1. Sync Airtable → Supabase ---
  console.log('\n📋 PASO 1: Sincronización Airtable → Supabase\n');
  const { syncAllPhasesFromAirtable } = await import('../lib/airtable/sync-all-phases');
  const syncResult = await syncAllPhasesFromAirtable();

  if (syncResult.success) {
    console.log('\n✅ Sync completado');
    console.log(`   Creadas: ${syncResult.totalCreated}`);
    console.log(`   Actualizadas: ${syncResult.totalUpdated}`);
    console.log(`   Errores: ${syncResult.totalErrors}`);
  } else {
    console.log('\n⚠️  Sync terminó con errores');
    console.log(`   Creadas: ${syncResult.totalCreated}`);
    console.log(`   Actualizadas: ${syncResult.totalUpdated}`);
    console.log(`   Errores: ${syncResult.totalErrors}`);
  }

  // Resumen: propiedades en nuestra plataforma que no están en ninguna view de Airtable
  const phasesWithDetails = syncResult.phases.filter((p) => p.details?.length);
  const syncedIds = new Set<string>();
  for (const p of phasesWithDetails) {
    for (const d of p.details) {
      const m = d.match(/^(Updated|Created):\s+([A-Za-z0-9-]+)/);
      if (m) syncedIds.add(m[2]);
    }
  }
  console.log(`\n   Propiedades tocadas en este sync: ${syncedIds.size}`);

  // --- 2. Extracción de categorías para reno-in-progress sin categorías ---
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 PASO 2: Extracción de categorías (presupuestos sin categorías)\n');

  const { createAdminClient } = await import('../lib/supabase/admin');
  const { callN8nCategoriesWebhook, prepareWebhookPayload } = await import(
    '../lib/n8n/webhook-caller'
  );

  const supabase = createAdminClient();

  const selectProps =
    'id, name, address, budget_pdf_url, reno_phase, "Unique ID From Engagements", "Client Name", "Client email", renovation_type, area_cluster';

  const { data: renoProps, error: fetchErr } = await supabase
    .from('properties')
    .select(selectProps)
    .eq('reno_phase', 'reno-in-progress')
    .not('budget_pdf_url', 'is', null);

  if (fetchErr) {
    console.error('❌ Error listando propiedades reno-in-progress:', fetchErr.message);
    process.exit(1);
  }

  if (!renoProps?.length) {
    console.log('   No hay propiedades en reno-in-progress con budget_pdf_url.');
    process.exit(0);
  }

  const withoutCategories: typeof renoProps = [];
  for (const prop of renoProps) {
    const { data: cats } = await supabase
      .from('property_dynamic_categories')
      .select('id')
      .eq('property_id', prop.id)
      .limit(1);
    if (!cats?.length) {
      withoutCategories.push(prop);
    }
  }

  console.log(`   Propiedades reno-in-progress con presupuesto: ${renoProps.length}`);
  console.log(`   Sin categorías (se enviarán al webhook): ${withoutCategories.length}\n`);

  if (withoutCategories.length === 0) {
    console.log('   ✅ Todas tienen categorías. Nada que extraer.');
    process.exit(0);
  }

  let ok = 0;
  let fail = 0;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let i = 0; i < withoutCategories.length; i++) {
    const prop = withoutCategories[i];
    const payload = prepareWebhookPayload(prop as any);
    if (!payload) {
      console.log(`   ⏭️  ${prop.id}: sin budget_pdf_url válido, omitido`);
      continue;
    }
    process.stdout.write(`   [${i + 1}/${withoutCategories.length}] ${prop.id} ... `);
    try {
      const success = await callN8nCategoriesWebhook(payload);
      if (success) {
        ok++;
        console.log('OK');
      } else {
        fail++;
        console.log('FALLO');
      }
    } catch (e: any) {
      fail++;
      console.log('FALLO', e?.message || e);
    }
    if (i < withoutCategories.length - 1) {
      await sleep(1500);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Extracción terminada: ${ok} OK, ${fail} fallos`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
