/**
 * Verifica proyectos en Supabase y el enlace properties -> project_id.
 * Uso: npx tsx scripts/verify-projects-and-properties-link.ts
 */

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log("=== Proyectos en Supabase ===\n");

  const { data: projects, error: e1 } = await supabase
    .from("projects")
    .select("id, name, airtable_project_id, reno_phase")
    .order("name");

  if (e1) {
    console.error("Error leyendo projects:", e1.message);
    process.exit(1);
  }

  const total = projects?.length ?? 0;
  const withPhase = projects?.filter((p) => p.reno_phase != null) ?? [];
  const withoutPhase = projects?.filter((p) => p.reno_phase == null) ?? [];

  console.log(`Total proyectos: ${total}`);
  console.log(`  Con reno_phase: ${withPhase.length}`);
  console.log(`  Sin reno_phase (se muestran como reno-in-progress): ${withoutPhase.length}\n`);

  if ((projects?.length ?? 0) > 0) {
    console.log("Primeros 10 proyectos:");
    (projects ?? []).slice(0, 10).forEach((p) => {
      console.log(`  - ${p.name ?? "(sin nombre)"} | reno_phase: ${p.reno_phase ?? "null"} | id: ${p.id}`);
    });
  }

  console.log("\n=== Propiedades: airtable_properties_record_id y project_id ===\n");

  const { count: countWithAirtablePropId, error: eAirtable } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .not("airtable_properties_record_id", "is", null);

  if (eAirtable) {
    console.warn("(airtable_properties_record_id puede no existir en la tabla):", eAirtable.message);
  } else {
    console.log(`Propiedades con airtable_properties_record_id rellenado: ${countWithAirtablePropId ?? 0}`);
  }

  const { data: propsWithProject, error: e2 } = await supabase
    .from("properties")
    .select("id, address, type, project_id")
    .not("project_id", "is", null);

  const { data: propsWithoutProject, error: e3 } = await supabase
    .from("properties")
    .select("id, address, type, project_id")
    .is("project_id", null);

  if (e2 || e3) {
    console.error("Error leyendo properties:", e2?.message ?? e3?.message);
    process.exit(1);
  }

  const withProject = propsWithProject?.length ?? 0;
  const totalProps =
    (propsWithProject?.length ?? 0) + (propsWithoutProject?.length ?? 0);

  console.log(`Total propiedades (aproximado): ${totalProps}`);
  console.log(`  Con project_id asignado: ${withProject}`);
  console.log(
    `  Sin project_id: ${propsWithoutProject?.length ?? 0} (incluye Unit, Building, etc.)\n`
  );

  const projectWipNewBuild = (propsWithProject ?? []).filter((p) =>
    ["Project", "WIP", "New Build"].includes(String(p.type ?? "").trim())
  );
  const otherWithProject = (propsWithProject ?? []).filter(
    (p) => !["Project", "WIP", "New Build"].includes(String(p.type ?? "").trim())
  );

  console.log(
    `  De las con project_id: tipo Project/WIP/New Build: ${projectWipNewBuild.length}, otros tipos: ${otherWithProject.length}\n`
  );

  if (withProject > 0) {
    console.log("Ejemplos de propiedades con project_id:");
    (propsWithProject ?? []).slice(0, 5).forEach((p) => {
      console.log(`  - ${p.address ?? p.id} | type: ${p.type} | project_id: ${p.project_id}`);
    });
  }

  console.log("\n=== Conteo por proyecto (proyectos con al menos 1 propiedad) ===\n");

  const { data: counts, error: e4 } = await supabase
    .from("properties")
    .select("project_id")
    .not("project_id", "is", null);

  if (e4) {
    console.error("Error:", e4.message);
    process.exit(1);
  }

  const byProject = new Map<string, number>();
  (counts ?? []).forEach((r: { project_id: string | null }) => {
    if (r.project_id) {
      byProject.set(r.project_id, (byProject.get(r.project_id) ?? 0) + 1);
    }
  });

  const projectIds = Array.from(byProject.keys());
  if (projectIds.length > 0) {
    const { data: names } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    const nameMap = new Map((names ?? []).map((r) => [r.id, r.name]));
    console.log(`Proyectos con al menos una propiedad vinculada: ${projectIds.length}\n`);
    Array.from(byProject.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([id, count]) => {
        console.log(`  - ${nameMap.get(id) ?? id}: ${count} propiedad(es)`);
      });
  } else {
    console.log(
      "Ninguna propiedad tiene project_id. Posibles causas:\n" +
        "  - En Airtable, la tabla de propiedades/transactions no tiene un campo 'Project', 'Project Name' o 'Projects' (linked to Projects).\n" +
        "  - El sync de propiedades no está leyendo ese campo (revisar mapAirtablePropertyToSupabase y nombres de campo en Airtable).\n" +
        "  - Las propiedades no son tipo Project/WIP/New Build."
    );
  }

  console.log("\n--- Fin del informe ---");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
