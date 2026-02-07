/**
 * Sincroniza solo la tabla projects desde Airtable (usa la vista configurada en AIRTABLE_PROJECTS_VIEW_ID)
 * y luego enlaza properties.project_id desde "Properties linked".
 *
 * Útil cuando has cambiado la vista de proyectos en Airtable y quieres actualizar sin lanzar el sync completo.
 *
 * Uso: npm run sync:projects
 */

import { loadEnvConfig } from "@next/env";
import { syncProjectsFromAirtable, linkPropertiesToProjectsFromAirtable } from "@/lib/airtable/sync-projects";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
  console.log("🚀 Sync de proyectos desde Airtable...\n");

  try {
    const projectsResult = await syncProjectsFromAirtable();

    if (projectsResult.skipped) {
      console.log("⚠️  Sync de proyectos omitido (AIRTABLE_PROJECTS_TABLE_ID no configurado).");
      process.exit(0);
      return;
    }

    console.log(`   Proyectos creados: ${projectsResult.created}`);
    console.log(`   Proyectos actualizados: ${projectsResult.updated}`);
    console.log(`   Errores: ${projectsResult.errors}\n`);

    console.log("🔗 Enlazando propiedades a proyectos...");
    const linkResult = await linkPropertiesToProjectsFromAirtable();
    console.log(`   Propiedades enlazadas: ${linkResult.linked}`);
    console.log(`   Errores: ${linkResult.errors}\n`);

    console.log("✅ Sync de proyectos completado.");
    process.exit(0);
  } catch (error: unknown) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
