/**
 * Persist Airtable attachment files to Supabase Storage.
 *
 * Airtable attachment URLs are temporary (expire after a few hours).
 * This module downloads each file and re-uploads it to a public Supabase
 * Storage bucket so the URL never expires.
 */

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "airtable-attachments";
const CONCURRENCY = 5;
const DOWNLOAD_TIMEOUT_MS = 30_000;

export interface AttachmentMeta {
  url: string;
  filename: string;
  type: string;
  size?: number;
}

function getSupabaseStorageBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";
  return `${url}/storage/v1/object/public/`;
}

export function isAlreadyPersisted(url: string): boolean {
  const base = getSupabaseStorageBaseUrl();
  if (!base) return false;
  return url.startsWith(base);
}

function sanitiseFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

/**
 * Download a file from a remote URL with a timeout.
 * Returns the ArrayBuffer and detected content-type, or null on failure.
 */
async function downloadFile(
  sourceUrl: string
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    const res = await fetch(sourceUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(
        `[persist-attachment] Download failed ${res.status} for ${sourceUrl.slice(0, 120)}`
      );
      return null;
    }

    const buffer = await res.arrayBuffer();
    const contentType =
      res.headers.get("content-type") || "application/octet-stream";
    return { buffer, contentType };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn(
        `[persist-attachment] Download timed out for ${sourceUrl.slice(0, 120)}`
      );
    } else {
      console.warn(
        `[persist-attachment] Download error for ${sourceUrl.slice(0, 120)}: ${err?.message}`
      );
    }
    return null;
  }
}

/**
 * Persist a single remote file to Supabase Storage and return the public URL.
 * If the file already exists at the target path it returns the existing public URL
 * without re-downloading.
 */
export async function persistAttachment(
  storagePath: string,
  sourceUrl: string,
  supabase?: ReturnType<typeof createAdminClient>
): Promise<string | null> {
  const client = supabase ?? createAdminClient();

  if (isAlreadyPersisted(sourceUrl)) return sourceUrl;

  const { data: existing } = client.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  // Check if file already exists by trying to download a HEAD-like request
  // We rely on a list call scoped to the folder instead (cheaper).
  const folder = storagePath.substring(0, storagePath.lastIndexOf("/"));
  const fileName = storagePath.substring(storagePath.lastIndexOf("/") + 1);
  const { data: listed } = await client.storage
    .from(BUCKET)
    .list(folder, { limit: 1000 });

  if (listed?.some((f) => f.name === fileName)) {
    return existing.publicUrl;
  }

  const downloaded = await downloadFile(sourceUrl);
  if (!downloaded) return null;

  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(storagePath, downloaded.buffer, {
      contentType: downloaded.contentType,
      upsert: false,
    });

  if (uploadError) {
    // If the file was uploaded by a concurrent process, treat as success
    if (
      uploadError.message?.includes("already exists") ||
      uploadError.message?.includes("Duplicate")
    ) {
      return existing.publicUrl;
    }
    console.warn(
      `[persist-attachment] Upload error for ${storagePath}: ${uploadError.message}`
    );
    return null;
  }

  return existing.publicUrl;
}

/**
 * Build a deterministic storage path for an attachment.
 */
function buildPath(
  entityType: "projects" | "properties",
  entityId: string,
  fieldName: string,
  filename: string
): string {
  return `${entityType}/${entityId}/${fieldName}/${sanitiseFilename(filename)}`;
}

/**
 * Process an array of AttachmentMeta objects: persist each one that is not
 * already in Supabase Storage and return the updated array with permanent URLs.
 */
export async function persistAttachmentArray(
  attachments: AttachmentMeta[] | null | undefined,
  entityType: "projects" | "properties",
  entityId: string,
  fieldName: string,
  supabase?: ReturnType<typeof createAdminClient>
): Promise<AttachmentMeta[] | null> {
  if (!attachments || attachments.length === 0) return attachments ?? null;

  const client = supabase ?? createAdminClient();
  const results: AttachmentMeta[] = [];

  // Process in batches of CONCURRENCY
  for (let i = 0; i < attachments.length; i += CONCURRENCY) {
    const batch = attachments.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (att) => {
        if (isAlreadyPersisted(att.url)) return att;

        const path = buildPath(entityType, entityId, fieldName, att.filename);
        const newUrl = await persistAttachment(path, att.url, client);

        if (newUrl) {
          return { ...att, url: newUrl };
        }
        // Fallback: keep the temporary Airtable URL
        return att;
      })
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Persist a comma-separated URL string (used by budget_pdf_url and
 * renovator_contract_doc_url in the properties table).
 * Returns the updated comma-separated string with permanent URLs.
 */
export async function persistUrlString(
  urlString: string | null | undefined,
  entityId: string,
  fieldName: string,
  supabase?: ReturnType<typeof createAdminClient>
): Promise<string | null> {
  if (!urlString) return urlString ?? null;

  const urls = urlString
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("http://") || s.startsWith("https://"));

  if (urls.length === 0) return urlString;

  const client = supabase ?? createAdminClient();
  const persisted: string[] = [];

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (url, idx) => {
        if (isAlreadyPersisted(url)) return url;

        const ext = url.split(".").pop()?.split("?")[0] || "pdf";
        const filename = `file_${i + idx + 1}.${sanitiseFilename(ext)}`;
        const path = buildPath("properties", entityId, fieldName, filename);
        const newUrl = await persistAttachment(path, url, client);
        return newUrl ?? url;
      })
    );
    persisted.push(...batchResults);
  }

  return persisted.join(",");
}

/**
 * Persist an array of plain URL strings (used by pics_urls in properties).
 * Returns the updated array with permanent URLs.
 */
export async function persistUrlArray(
  urls: string[] | null | undefined,
  entityId: string,
  fieldName: string,
  supabase?: ReturnType<typeof createAdminClient>
): Promise<string[] | null> {
  if (!urls || urls.length === 0) return urls ?? null;

  const client = supabase ?? createAdminClient();
  const results: string[] = [];

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (url, idx) => {
        if (isAlreadyPersisted(url)) return url;

        const ext =
          url
            .split("/")
            .pop()
            ?.split("?")[0]
            ?.split(".")
            .pop() || "jpg";
        const filename = `pic_${i + idx + 1}.${sanitiseFilename(ext)}`;
        const path = buildPath("properties", entityId, fieldName, filename);
        const newUrl = await persistAttachment(path, url, client);
        return newUrl ?? url;
      })
    );
    results.push(...batchResults);
  }

  return results;
}
