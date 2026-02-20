/**
 * Diagnóstico exhaustivo: sincronización proyectos ↔ propiedades.
 *
 * Comprueba:
 * 1. Conteos en Supabase (properties con/sin project_id, airtable_property_id, airtable_properties_record_id).
 * 2. Proyectos en Supabase (totales, orphaned, no orphaned).
 * 3. Qué devuelve Airtable para un proyecto de ejemplo (IDs enlazados).
 * 4. Cuántos de esos IDs coinciden en Supabase por airtable_property_id y por airtable_properties_record_id.
 *
 * Uso: npm run diagnose:projects-properties
 * Requiere: .env con Airtable y Supabase.
 */

import { loadEnvConfig } from "@next/env";
import Airtable from "airtable";
import { createClient } from "@supabase/supabase-js";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const airtableKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const airtableBaseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
  const projectsTableId = process.env.AIRTABLE_PROJECTS_TABLE_ID;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  DIAGNÓSTICO: Sincronización Proyectos ↔ Propiedades");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // ─── 1. Supabase: proyectos ─────────────────────────────────────────────
  console.log("1. PROYECTOS EN SUPABASE");
  console.log("────────────────────────");

  const { data: allProjects, error: eProj } = await supabase
    .from("projects")
    .select("id, name, airtable_project_id, reno_phase");

  if (eProj) {
    console.error("   Error:", eProj.message);
  } else {
    const total = allProjects?.length ?? 0;
    const orphaned = (allProjects ?? []).filter((p) => p.reno_phase === "orphaned").length;
    const notOrphaned = total - orphaned;
    console.log(`   Total proyectos: ${total}`);
    console.log(`   No orphaned (visibles en Kanban): ${notOrphaned}`);
    console.log(`   Orphaned (no en vista Airtable): ${orphaned}`);
  }

  // ─── 2. Supabase: propiedades ───────────────────────────────────────────
  console.log("\n2. PROPIEDADES EN SUPABASE (IDs de Airtable)");
  console.log("─────────────────────────────────────────────");

  const { count: totalProps } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true });
  const { count: withProjectId } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .not("project_id", "is", null);
  const { count: withAirtablePropId } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .not("airtable_property_id", "is", null);
  const { count: withAirtablePropRecordId } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .not("airtable_properties_record_id", "is", null);

  console.log(`   Total propiedades: ${totalProps ?? 0}`);
  console.log(`   Con project_id asignado: ${withProjectId ?? 0}`);
  console.log(`   Con airtable_property_id (Transaction ID): ${withAirtablePropId ?? 0}`);
  console.log(`   Con airtable_properties_record_id (Property ID): ${withAirtablePropRecordId ?? 0}`);

  console.log("\n   Resumen enlace:");
  console.log(
    `   - Propiedades con project_id asignado: ${withProjectId ?? 0} (estas se muestran vinculadas al proyecto en el Kanban)`
  );
  console.log(
    `   - Propiedades con airtable_property_id (Transaction ID): ${withAirtablePropId ?? 0} (necesario si Projects enlaza a Transactions)`
  );
  console.log(
    `   - Propiedades con airtable_properties_record_id (Property ID): ${withAirtablePropRecordId ?? 0} (necesario si Projects enlaza a Properties)`
  );

  // ─── 3. Airtable: muestra de un proyecto y sus IDs enlazados ───────────
  if (airtableKey && airtableBaseId && projectsTableId) {
    console.log("\n3. AIRTABLE: Proyectos y campo de enlace");
    console.log("────────────────────────────────────────");

    const base = new Airtable({ apiKey: airtableKey }).base(airtableBaseId);

    try {
      // No especificar fields para evitar "Unknown field name" (Projects usa "Project Name", no "Name")
      const records = await base(projectsTableId)
        .select({ maxRecords: 5 })
        .all();

      console.log(`   Proyectos leídos (primeros 5): ${records.length}`);

      for (let i = 0; i < records.length; i++) {
        const rec = records[i] as any;
        const f = rec.fields ?? {};
        const name = f["Project Name"] ?? f["Name"] ?? f["name"] ?? rec.id;
        const linkedByPropLink =
          Array.isArray(f["Properties linked"]) && f["Properties linked"].length > 0
            ? f["Properties linked"]
            : [];
        const linkedByProperties =
          Array.isArray(f["Properties"]) && f["Properties"].length > 0 ? f["Properties"] : [];
        const linkedByTransactions =
          Array.isArray(f["Transactions"]) && f["Transactions"].length > 0 ? f["Transactions"] : [];
        const linkedIds =
          linkedByPropLink.length > 0
            ? linkedByPropLink
            : linkedByProperties.length > 0
              ? linkedByProperties
              : linkedByTransactions;
        const source =
          linkedByPropLink.length > 0
            ? "Properties linked"
            : linkedByProperties.length > 0
              ? "Properties"
              : linkedByTransactions.length > 0
                ? "Transactions"
                : "ninguno";

        console.log(`\n   Proyecto ${i + 1}: ${name} (Airtable ID: ${rec.id})`);
        console.log(`   Campo con enlaces: "${source}" | Cantidad de IDs: ${linkedIds.length}`);
        if (linkedIds.length > 0) {
          console.log(`   Primeros 3 IDs: ${linkedIds.slice(0, 3).join(", ")}`);

          // Comprobar cuántos de esos IDs existen en Supabase
          const ids = linkedIds.slice(0, 50).filter((x: unknown) => typeof x === "string") as string[];
          if (ids.length > 0) {
            const { data: byPropId } = await supabase
              .from("properties")
              .select("id")
              .in("airtable_property_id", ids);
            const { data: byPropRecordId } = await supabase
              .from("properties")
              .select("id")
              .in("airtable_properties_record_id", ids);
            console.log(
              `   En Supabase: ${byPropId?.length ?? 0} coinciden por airtable_property_id, ${byPropRecordId?.length ?? 0} por airtable_properties_record_id`
            );
          }
        }
      }
    } catch (err: any) {
      console.error("   Error leyendo Airtable:", err?.message ?? err);
    }
  } else {
    console.log("\n3. AIRTABLE: omitido (falta AIRTABLE_PROJECTS_TABLE_ID o credenciales)");
  }

  // ─── 4. Flujo esperado y posibles fallos ───────────────────────────────
  console.log("\n4. FLUJO Y POSIBLES FALLOS");
  console.log("───────────────────────────");
  console.log(`
  Flujo actual:
  a) Sync proyectos: lee tabla Projects; marca orphaned los que no están en la vista.
  b) Sync propiedades (sync unificado): lee tabla Transactions (tblmX19OTsj3cTHmA).
     - Guarda airtable_property_id = record.id (Transaction ID).
     - Guarda airtable_properties_record_id = primer ID del link "Properties" (Property ID).
     - project_id: se asigna vía "Project name" (fldYKVjNcqyR6ZSvN) lookup de Transactions.
       Se busca el nombre en projects.name (normalizado) y se asigna el id del proyecto.
  c) Ya NO se usa linkPropertiesToProjectsFromAirtable (eliminado para evitar lentitud).

  Si project_id no se asigna:
  - Verificar que Transactions tenga "Project name" rellenado en los registros.
  - El nombre debe coincidir con projects.name en Supabase (insensible a mayúsculas).
  - Solo proyectos NO orphaned están en el mapa project_name → id.
`);

  console.log("\n--- Fin del diagnóstico ---\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
