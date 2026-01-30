/**
 * Script para verificar la configuración de Airtable
 */

import Airtable from 'airtable';

async function main() {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
  const tableName = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Properties';
  const webhookSecret = process.env.AIRTABLE_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

  console.log("\n🔍 Verificando configuración de Airtable...\n");

  // Verificar variables de entorno
  console.log("📋 Variables de entorno:");
  console.log("  NEXT_PUBLIC_AIRTABLE_API_KEY:", apiKey ? `${apiKey.substring(0, 10)}...` : "❌ NO CONFIGURADO");
  console.log("  NEXT_PUBLIC_AIRTABLE_BASE_ID:", baseId || "❌ NO CONFIGURADO");
  console.log("  NEXT_PUBLIC_AIRTABLE_TABLE_NAME:", tableName || "⚠️  Usando valor por defecto: Properties");
  console.log("  AIRTABLE_WEBHOOK_SECRET:", webhookSecret ? "✅ Configurado" : "⚠️  No configurado (opcional pero recomendado)");
  console.log("  NEXT_PUBLIC_APP_URL / VERCEL_URL:", appUrl || "⚠️  No configurado (necesario para webhooks)");

  if (!apiKey || !baseId) {
    console.error("\n❌ ERROR: Faltan variables de entorno requeridas");
    console.error("   Necesitas configurar:");
    console.error("   - NEXT_PUBLIC_AIRTABLE_API_KEY");
    console.error("   - NEXT_PUBLIC_AIRTABLE_BASE_ID");
    process.exit(1);
  }

  console.log("\n✅ Variables de entorno básicas configuradas");

  // Intentar conectar con Airtable
  console.log("\n🔌 Intentando conectar con Airtable...");

  try {
    const base = new Airtable({ apiKey }).base(baseId);
    
    // Verificar que la base existe y podemos acceder
    console.log("  Base ID:", baseId);
    
    // Listar todas las tablas disponibles
    console.log("\n📊 Listando tablas disponibles en la base...");
    
    try {
      // Intentar acceder a la tabla principal
      const table = base(tableName);
      
      // Hacer una consulta simple para verificar acceso
      const records = await table.select({
        maxRecords: 1,
      }).firstPage();
    
    console.log(`  ✅ Tabla "${tableName}" encontrada y accesible`);
    console.log(`  📈 Total de registros (primeros 100): ${records.length}`);
    
    if (records.length > 0) {
      const firstRecord = records[0];
      console.log("\n  📝 Ejemplo de registro (primeros campos):");
      const fields = Object.keys(firstRecord.fields).slice(0, 5);
      fields.forEach(field => {
        const value = firstRecord.fields[field];
        const displayValue = typeof value === 'string' && value.length > 50 
          ? value.substring(0, 50) + '...' 
          : value;
        console.log(`     - ${field}: ${displayValue}`);
      });
    }
    
  } catch (tableError: any) {
    console.error(`  ❌ Error accediendo a la tabla "${tableName}":`, tableError.message);
    console.error("\n  💡 Posibles causas:");
    console.error("     - El nombre de la tabla es incorrecto");
    console.error("     - No tienes permisos para acceder a esta tabla");
    console.error("     - La tabla no existe en esta base");
    console.error("\n  🔍 Intentando listar todas las tablas disponibles...");
    
    // Intentar listar tablas usando la API (esto puede no funcionar directamente)
    // Airtable no tiene una API directa para listar tablas, pero podemos intentar
    // acceder a tablas comunes
    const commonTableNames = ['Properties', 'Transactions', 'Users', 'Visits'];
    console.log("\n  📋 Tablas comunes a verificar:");
    for (const commonTable of commonTableNames) {
      try {
        const testTable = base(commonTable);
        await testTable.select({ maxRecords: 1 }).firstPage();
        console.log(`     ✅ "${commonTable}" - Accesible`);
      } catch {
        console.log(`     ❌ "${commonTable}" - No accesible o no existe`);
      }
    }
  }
  
  // Verificar webhook configuration
  console.log("\n🔗 Configuración de Webhooks:");
  if (webhookSecret) {
    console.log("  ✅ AIRTABLE_WEBHOOK_SECRET configurado");
  } else {
    console.log("  ⚠️  AIRTABLE_WEBHOOK_SECRET no configurado (recomendado para seguridad)");
  }
  
  if (appUrl) {
    const webhookUrl = appUrl.startsWith('http') 
      ? `${appUrl}/api/webhooks/airtable`
      : `https://${appUrl}/api/webhooks/airtable`;
    console.log("  ✅ URL del webhook:", webhookUrl);
  } else {
    console.log("  ⚠️  NEXT_PUBLIC_APP_URL o VERCEL_URL no configurado");
    console.log("     Necesario para configurar webhooks automáticamente");
  }
  
  console.log("\n✅ Verificación completada exitosamente");
  
} catch (error: any) {
  console.error("\n❌ ERROR al conectar con Airtable:");
  console.error("   Mensaje:", error.message);
  
  if (error.statusCode === 401) {
    console.error("\n   🔐 Error de autenticación:");
    console.error("      - Verifica que NEXT_PUBLIC_AIRTABLE_API_KEY sea correcta");
    console.error("      - Verifica que la API key tenga permisos para acceder a esta base");
    console.error("      - La API key debe empezar con 'pat' (Personal Access Token)");
  } else if (error.statusCode === 404) {
    console.error("\n   📦 Base no encontrada:");
    console.error("      - Verifica que NEXT_PUBLIC_AIRTABLE_BASE_ID sea correcto");
    console.error("      - El Base ID debe empezar con 'app'");
    console.error("      - Verifica que tengas acceso a esta base en Airtable");
  } else if (error.statusCode === 403) {
    console.error("\n   🚫 Permisos insuficientes:");
    console.error("      - Verifica que tu API key tenga permisos para leer esta base");
    console.error("      - Verifica que tengas acceso a esta base en Airtable");
  } else {
    console.error("\n   💡 Otros posibles problemas:");
    console.error("      - Verifica tu conexión a internet");
    console.error("      - Verifica que Airtable esté disponible");
    console.error("      - Revisa los logs de error para más detalles");
  }
  
  process.exit(1);
}

console.log("\n📋 Resumen de configuración:\n");
console.log("✅ Variables requeridas:");
console.log("   - NEXT_PUBLIC_AIRTABLE_API_KEY: ✅");
console.log("   - NEXT_PUBLIC_AIRTABLE_BASE_ID: ✅");
console.log("   - NEXT_PUBLIC_AIRTABLE_TABLE_NAME: ✅");

if (!webhookSecret) {
  console.log("\n⚠️  Variables opcionales (recomendadas):");
  console.log("   - AIRTABLE_WEBHOOK_SECRET: ❌ No configurado");
}

if (!appUrl) {
  console.log("   - NEXT_PUBLIC_APP_URL / VERCEL_URL: ❌ No configurado");
}

  console.log("\n💡 Próximos pasos:");
  if (!webhookSecret || !appUrl) {
    console.log("   1. Configura AIRTABLE_WEBHOOK_SECRET para seguridad");
    console.log("   2. Configura NEXT_PUBLIC_APP_URL o VERCEL_URL para webhooks");
  } else {
    console.log("   ✅ Configuración completa!");
    console.log("   Puedes configurar webhooks automáticamente con:");
    console.log("   npm run setup:airtable-webhook");
  }

  console.log("\n");
}

main().catch((error) => {
  console.error("Error inesperado:", error);
  process.exit(1);
});

