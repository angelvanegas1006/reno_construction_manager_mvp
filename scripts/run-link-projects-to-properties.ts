/**
 * Ejecuta solo el paso de enlace properties.project_id desde Airtable Projects "Properties linked"
 * y muestra conteos antes/después para diagnosticar por qué project_id está vacío.
 *
 * Uso: npx tsx scripts/run-link-projects-to-properties.ts
 *
 * Requiere: migración 024 (airtable_properties_record_id en properties),
 *           AIRTABLE_PROJECTS_TABLE_ID y credenciales Airtable/Supabase en .env
 */

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { linkPropertiesToProjectsFromAirtable } from "@/lib/airtable/sync-projects";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log("=== Diagnóstico: enlace properties.project_id desde Airtable ===\n");

  const count = async (col: string, notNull: boolean) => {
    const q = supabase.from("properties").select("id", { count: "exact", head: true });
    const r = notNull ? q.not(col, "is", null) : q.is(col, null);
    const { count: n, error } = await r;
    if (error) return { n: null as number | null, error: error.message };
    return { n: n ?? 0, error: null };
  };

  const beforeAirtable = await count("airtable_properties_record_id", true);
  const beforeProject = await count("project_id", true);

  if (beforeAirtable.error) {
    console.log("airtable_properties_record_id:", beforeAirtable.error, "(¿migración 024 aplicada?)");
  } else {
    console.log("Antes del enlace:");
    console.log("  Propiedades con airtable_properties_record_id:", beforeAirtable.n);
    console.log("  Propiedades con project_id:", beforeProject.n);
  }
  console.log("");

  console.log("Ejecutando linkPropertiesToProjectsFromAirtable()...");
  const result = await linkPropertiesToProjectsFromAirtable();
  console.log("Resultado: linked =", result.linked, ", errors =", result.errors);
  console.log("");

  const afterProject = await count("project_id", true);
  console.log("Después del enlace:");
  console.log("  Propiedades con project_id:", afterProject.n);

  if ((beforeAirtable.n ?? 0) === 0) {
    console.log("\n⚠️  Ninguna propiedad tiene airtable_properties_record_id.");
    console.log("   Para que project_id se rellene:");
    console.log("   1. Las vistas de Airtable (tabla tblmX19OTsj3cTHmA) deben incluir la columna que enlaza a la tabla Properties (p. ej. 'Properties' o 'Property').");
    console.log("   2. Ejecutar un sync completo: npm run sync:all-phases");
  }
  if (result.linked === 0 && (beforeAirtable.n ?? 0) > 0) {
    console.log("\n⚠️  Hay propiedades con airtable_properties_record_id pero el enlace no actualizó ninguna.");
    console.log("   Revisar que en Airtable (tabla Projects) el campo 'Properties linked' tenga los mismos record IDs que airtable_properties_record_id en Supabase.");
  }

  console.log("\n--- Fin ---");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
