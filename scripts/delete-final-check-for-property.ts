/**
 * Borra el check final de una propiedad para poder hacer pruebas desde cero.
 * Elimina la(s) inspección(es) final(es) en property_inspections; CASCADE borra zones y elements.
 *
 * Uso: npx tsx scripts/delete-final-check-for-property.ts [propertyId]
 * Ejemplo: npx tsx scripts/delete-final-check-for-property.ts SP-NIU-O3C-005809
 */

import { loadEnvConfig } from "@next/env";
import { createAdminClient } from "@/lib/supabase/admin";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const PROPERTY_ID = process.argv[2] || "SP-NIU-O3C-005809";

async function main() {
  const supabase = createAdminClient();

  console.log(`\n🔍 Buscando inspección(es) final(es) para propiedad: ${PROPERTY_ID}\n`);

  const { data: inspections, error: listError } = await supabase
    .from("property_inspections")
    .select("id, inspection_type, inspection_status, created_at, completed_at")
    .eq("property_id", PROPERTY_ID)
    .eq("inspection_type", "final");

  if (listError) {
    console.error("❌ Error listando inspecciones:", listError.message);
    process.exit(1);
  }

  if (!inspections || inspections.length === 0) {
    console.log("ℹ️ No hay inspección final para esta propiedad. Nada que borrar.");
    process.exit(0);
  }

  console.log(`📋 Inspecciones finales encontradas: ${inspections.length}`);
  inspections.forEach((i, idx) => {
    console.log(`   ${idx + 1}. ID: ${i.id} | status: ${i.inspection_status || "N/A"} | created: ${i.created_at}`);
  });

  const ids = inspections.map((i) => i.id);

  const { error: deleteError } = await supabase
    .from("property_inspections")
    .delete()
    .in("id", ids);

  if (deleteError) {
    console.error("❌ Error borrando inspecciones:", deleteError.message);
    process.exit(1);
  }

  console.log(`\n✅ Check final borrado correctamente (${inspections.length} inspección(es)). Zonas y elementos eliminados por CASCADE.\n`);
}

main();
