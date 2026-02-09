/**
 * Borra el final check de una propiedad para poder probar de nuevo.
 * Uso: npx tsx scripts/reset-final-check-for-property.ts SP-NIU-O3C-005809
 *
 * Busca la propiedad por id, Unique ID From Engagements, property_unique_id o address.
 * Elimina la inspección final (CASCADE borra zones y elements) y pone ready_for_commercialization = NULL.
 */

import { loadEnvConfig } from "@next/env";
import { createAdminClient } from "@/lib/supabase/admin";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error("Uso: npx tsx scripts/reset-final-check-for-property.ts <id|unique_id|address>");
    process.exit(1);
  }

  const supabase = createAdminClient();

  // 1. Buscar propiedad: por id (UUID), Unique ID From Engagements, property_unique_id o address
  let propertyId: string | null = null;
  let property: Record<string, unknown> | null = null;

  // ¿Parece UUID?
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidLike.test(identifier)) {
    const { data, error } = await supabase
      .from("properties")
      .select("id, address, reno_phase, \"Unique ID From Engagements\", property_unique_id")
      .eq("id", identifier)
      .maybeSingle();
    if (!error && data) {
      propertyId = data.id as string;
      property = data as Record<string, unknown>;
    }
  }

  if (!propertyId) {
    const { data: byUniqueId, error: e1 } = await supabase
      .from("properties")
      .select("id, address, reno_phase, \"Unique ID From Engagements\", property_unique_id")
      .eq("Unique ID From Engagements", identifier)
      .maybeSingle();
    if (!e1 && byUniqueId) {
      propertyId = byUniqueId.id as string;
      property = byUniqueId as Record<string, unknown>;
    }
  }

  if (!propertyId) {
    const { data: byPropUniqueId, error: e2 } = await supabase
      .from("properties")
      .select("id, address, reno_phase, \"Unique ID From Engagements\", property_unique_id")
      .eq("property_unique_id", identifier)
      .maybeSingle();
    if (!e2 && byPropUniqueId) {
      propertyId = byPropUniqueId.id as string;
      property = byPropUniqueId as Record<string, unknown>;
    }
  }

  if (!propertyId) {
    const { data: byAddress, error: e3 } = await supabase
      .from("properties")
      .select("id, address, reno_phase, \"Unique ID From Engagements\", property_unique_id")
      .ilike("address", `%${identifier}%`)
      .limit(1)
      .maybeSingle();
    if (!e3 && byAddress) {
      propertyId = byAddress.id as string;
      property = byAddress as Record<string, unknown>;
    }
  }

  if (!propertyId || !property) {
    console.error("❌ No se encontró ninguna propiedad con:", identifier);
    process.exit(1);
  }

  console.log("✅ Propiedad encontrada:");
  console.log("   ID:", propertyId);
  console.log("   Address:", property.address ?? "N/A");
  console.log("   reno_phase:", property.reno_phase ?? "NULL");
  console.log("   Unique ID From Engagements:", property["Unique ID From Engagements"] ?? "NULL");

  // 2. Obtener inspección final antes de borrar
  const { data: finalInspections, error: listError } = await supabase
    .from("property_inspections")
    .select("id, inspection_type, inspection_status, completed_at, created_at")
    .eq("property_id", propertyId)
    .eq("inspection_type", "final");

  if (listError) {
    console.error("❌ Error listando inspecciones finales:", listError.message);
    process.exit(1);
  }

  const count = finalInspections?.length ?? 0;
  if (count === 0) {
    console.log("\n⚠️ No había ninguna inspección final para esta propiedad. Nada que borrar.");
    // Aun así resetear ready_for_commercialization por si acaso
  } else {
    console.log("\n🗑️ Borrando", count, "inspección(es) final(es)...");
    const { error: delError } = await supabase
      .from("property_inspections")
      .delete()
      .eq("property_id", propertyId)
      .eq("inspection_type", "final");
    if (delError) {
      console.error("❌ Error borrando inspecciones:", delError.message);
      process.exit(1);
    }
    console.log("✅ Inspecciones finales borradas (zonas y elementos se borran en cascada).");
  }

  // 3. Poner ready_for_commercialization = NULL
  const { error: updateError } = await supabase
    .from("properties")
    .update({ ready_for_commercialization: null })
    .eq("id", propertyId);
  if (updateError) {
    console.warn("⚠️ No se pudo actualizar ready_for_commercialization:", updateError.message);
  } else {
    console.log("✅ ready_for_commercialization puesto a NULL.");
  }

  console.log("\n✅ Listo. Puedes abrir el final check de esta propiedad y probar de nuevo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
