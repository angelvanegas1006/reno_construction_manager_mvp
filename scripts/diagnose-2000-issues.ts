/**
 * Diagnóstico: ver qué está pasando cuando hay 2000+ registros.
 * Cuenta propiedades por fase/tipo, proyectos, y detecta posibles causas de problemas.
 * Uso: npx tsx scripts/diagnose-2000-issues.ts
 */

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log("=== Diagnóstico 2000+ registros ===\n");

  // 1) Total propiedades (sin traer todas las filas)
  const { count: totalProps, error: eCount } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .neq("reno_phase", "orphaned");

  if (eCount) {
    console.error("Error contando properties:", eCount.message);
  } else {
    console.log(`Total propiedades (excl. orphaned): ${totalProps ?? 0}`);
  }

  // 2) Conteo por reno_phase (usando RPC o múltiples counts)
  const phases = [
    "upcoming-settlements",
    "initial-check",
    "reno-budget-renovator",
    "reno-budget-client",
    "reno-budget-start",
    "reno-budget",
    "upcoming",
    "reno-in-progress",
    "furnishing",
    "final-check",
    "cleaning",
    "done",
    "orphaned",
  ] as const;

  console.log("\n--- Propiedades por reno_phase ---");
  const phaseCounts: Record<string, number> = {};
  for (const phase of phases) {
    const { count } = await supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("reno_phase", phase);
    phaseCounts[phase] = count ?? 0;
  }
  Object.entries(phaseCounts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .forEach(([phase, n]) => console.log(`  ${phase}: ${n}`));

  // 3) Conteo por type (Property type)
  console.log("\n--- Propiedades por type ---");
  const { data: typesData } = await supabase
    .from("properties")
    .select("type")
    .neq("reno_phase", "orphaned");

  const typeCounts: Record<string, number> = {};
  (typesData ?? []).forEach((r: { type: string | null }) => {
    const t = r.type ?? "null";
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  });
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, n]) => console.log(`  ${type}: ${n}`));

  // 4) Proyectos
  const { count: totalProjects } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true });
  console.log(`\nTotal proyectos: ${totalProjects ?? 0}`);

  // 5) Propiedades con project_id
  const { count: withProjectId } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .not("project_id", "is", null);
  console.log(`Propiedades con project_id: ${withProjectId ?? 0}`);

  // 6) Límite por defecto de Supabase (PostgREST)
  console.log("\n--- Comportamiento del front ---");
  console.log(
    "  Supabase/PostgREST devuelve por defecto hasta 1000 filas por request."
  );
  console.log(
    "  Si hay más de 1000 propiedades, el kanban solo verá las primeras 1000 (orden por created_at desc)."
  );
  if ((totalProps ?? 0) > 1000) {
    console.log(
      `  Tienes ${totalProps} propiedades: el front está recibiendo solo 1000 a menos que se use .range() o paginación.`
    );
  }

  // 7) Cuántas devuelve realmente una query sin range
  const { data: sample, error: eSample } = await supabase
    .from("properties")
    .select("id")
    .neq("reno_phase", "orphaned")
    .order("created_at", { ascending: false });

  console.log(
    `\n  Query sin .range(): devuelve ${sample?.length ?? 0} filas (error: ${eSample?.message ?? "ninguno"}).`
  );

  console.log("\n--- Fin diagnóstico ---");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
