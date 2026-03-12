#!/usr/bin/env tsx
/**
 * One-time migration script: convert existing Airtable attachment URLs
 * stored in Supabase into permanent Supabase Storage URLs.
 *
 * This script:
 *  1. Ensures the "airtable-attachments" bucket exists (creates it if missing).
 *  2. Reads all projects with attachment fields that still point to Airtable/S3.
 *  3. Reads all properties with pics_urls, budget_pdf_url, or
 *     renovator_contract_doc_url that still point to Airtable/S3.
 *  4. Downloads each file and uploads it to Supabase Storage.
 *  5. Updates the database row with the permanent URL.
 *
 * Usage:
 *   npx tsx scripts/migrate-airtable-attachments.ts
 *
 * Env: requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
try {
  const envPath = resolve(process.cwd(), ".env.local");
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = value;
    }
  });
} catch {
  console.warn("⚠️  Could not load .env.local, using system env vars");
}

import { createAdminClient } from "../lib/supabase/admin";
import {
  isAlreadyPersisted,
  persistAttachmentArray,
  persistUrlString,
  persistUrlArray,
  type AttachmentMeta,
} from "../lib/airtable/persist-attachment";

const BUCKET = "airtable-attachments";

async function ensureBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) {
    console.log(`✅ Bucket "${BUCKET}" already exists`);
    return;
  }
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 50 * 1024 * 1024, // 50 MB
  });
  if (error) {
    console.error(`❌ Failed to create bucket: ${error.message}`);
    process.exit(1);
  }
  console.log(`✅ Created bucket "${BUCKET}" (public)`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hasAirtableUrl(url: string): boolean {
  if (!url) return false;
  if (isAlreadyPersisted(url)) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

function attachmentArrayHasAirtableUrls(
  arr: AttachmentMeta[] | null | undefined
): boolean {
  if (!arr || !Array.isArray(arr)) return false;
  return arr.some((a) => hasAirtableUrl(a.url));
}

function urlStringHasAirtableUrls(str: string | null | undefined): boolean {
  if (!str) return false;
  return str
    .split(",")
    .some((u) => hasAirtableUrl(u.trim()));
}

function urlArrayHasAirtableUrls(arr: string[] | null | undefined): boolean {
  if (!arr || !Array.isArray(arr)) return false;
  return arr.some((u) => hasAirtableUrl(u));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔄 Migrating Airtable attachment URLs to Supabase Storage...\n");

  const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length) {
    console.error("❌ Missing env vars:", missing.join(", "));
    process.exit(1);
  }

  const supabase = createAdminClient();

  // 1. Ensure bucket
  await ensureBucket(supabase);

  let totalMigrated = 0;
  let totalErrors = 0;

  // ── 2. Projects ────────────────────────────────────────────────────────────
  const PROJECT_ATTACHMENT_FIELDS = [
    "draft_plan",
    "technical_project_doc",
    "final_plan",
    "license_attachment",
  ] as const;

  console.log("\n📁 Processing projects...");

  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select(
      `id, name, airtable_project_id, ${PROJECT_ATTACHMENT_FIELDS.join(", ")}`
    );

  if (projErr) {
    console.error("❌ Error fetching projects:", projErr.message);
  } else {
    const toMigrate = (projects ?? []).filter((p: any) =>
      PROJECT_ATTACHMENT_FIELDS.some((f) =>
        attachmentArrayHasAirtableUrls(p[f])
      )
    );
    console.log(
      `   Found ${toMigrate.length} projects with Airtable attachment URLs`
    );

    for (const proj of toMigrate) {
      const entityId = (proj as any).airtable_project_id || (proj as any).id;
      const updates: Record<string, any> = {};
      let changed = false;

      for (const field of PROJECT_ATTACHMENT_FIELDS) {
        const arr = (proj as any)[field] as AttachmentMeta[] | null;
        if (!attachmentArrayHasAirtableUrls(arr)) continue;

        try {
          const persisted = await persistAttachmentArray(
            arr,
            "projects",
            entityId,
            field,
            supabase
          );
          if (persisted) {
            updates[field] = persisted;
            changed = true;
            totalMigrated++;
          }
        } catch (err: any) {
          console.warn(
            `   ⚠️ ${(proj as any).name} / ${field}: ${err?.message}`
          );
          totalErrors++;
        }
      }

      if (changed) {
        const { error: upErr } = await supabase
          .from("projects")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", (proj as any).id);
        if (upErr) {
          console.warn(
            `   ⚠️ Update failed for project ${(proj as any).id}: ${upErr.message}`
          );
          totalErrors++;
        } else {
          console.log(`   ✅ ${(proj as any).name}`);
        }
      }
    }
  }

  // ── 3. Properties ──────────────────────────────────────────────────────────
  console.log("\n📁 Processing properties...");

  const PAGE_SIZE = 500;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: props, error: propsErr } = await supabase
      .from("properties")
      .select("id, address, pics_urls, budget_pdf_url, renovator_contract_doc_url")
      .range(offset, offset + PAGE_SIZE - 1);

    if (propsErr) {
      console.error("❌ Error fetching properties:", propsErr.message);
      break;
    }

    if (!props || props.length === 0) {
      hasMore = false;
      break;
    }

    for (const prop of props) {
      const propAny = prop as any;
      const updates: Record<string, any> = {};
      let changed = false;

      // pics_urls (text[])
      if (urlArrayHasAirtableUrls(propAny.pics_urls)) {
        try {
          const persisted = await persistUrlArray(
            propAny.pics_urls,
            propAny.id,
            "pics_urls",
            supabase
          );
          if (persisted) {
            updates.pics_urls = persisted;
            changed = true;
            totalMigrated++;
          }
        } catch (err: any) {
          console.warn(
            `   ⚠️ pics_urls for ${propAny.id}: ${err?.message}`
          );
          totalErrors++;
        }
      }

      // budget_pdf_url (csv string)
      if (urlStringHasAirtableUrls(propAny.budget_pdf_url)) {
        try {
          const persisted = await persistUrlString(
            propAny.budget_pdf_url,
            propAny.id,
            "budget_pdf",
            supabase
          );
          if (persisted) {
            updates.budget_pdf_url = persisted;
            changed = true;
            totalMigrated++;
          }
        } catch (err: any) {
          console.warn(
            `   ⚠️ budget_pdf_url for ${propAny.id}: ${err?.message}`
          );
          totalErrors++;
        }
      }

      // renovator_contract_doc_url (csv string)
      if (urlStringHasAirtableUrls(propAny.renovator_contract_doc_url)) {
        try {
          const persisted = await persistUrlString(
            propAny.renovator_contract_doc_url,
            propAny.id,
            "renovator_contract_doc",
            supabase
          );
          if (persisted) {
            updates.renovator_contract_doc_url = persisted;
            changed = true;
            totalMigrated++;
          }
        } catch (err: any) {
          console.warn(
            `   ⚠️ renovator_contract_doc_url for ${propAny.id}: ${err?.message}`
          );
          totalErrors++;
        }
      }

      if (changed) {
        const { error: upErr } = await supabase
          .from("properties")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", propAny.id);
        if (upErr) {
          console.warn(
            `   ⚠️ Update failed for property ${propAny.id}: ${upErr.message}`
          );
          totalErrors++;
        } else {
          console.log(
            `   ✅ ${propAny.address || propAny.id}`
          );
        }
      }
    }

    offset += PAGE_SIZE;
    if (props.length < PAGE_SIZE) hasMore = false;
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(50));
  console.log(`✅ Migration complete`);
  console.log(`   Fields migrated: ${totalMigrated}`);
  console.log(`   Errors: ${totalErrors}`);
}

main().catch((e) => {
  console.error("❌ Unexpected error:", e);
  process.exit(1);
});
