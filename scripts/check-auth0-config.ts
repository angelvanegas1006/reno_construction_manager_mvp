/**
 * Script para verificar la configuración de Auth0
 */

const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
const namespace = process.env.NEXT_PUBLIC_AUTH0_NAMESPACE;

console.log("\n🔍 Verificando configuración de Auth0...\n");

console.log("Variables de entorno:");
console.log("  NEXT_PUBLIC_AUTH0_DOMAIN:", domain || "❌ NO CONFIGURADO");
console.log("  NEXT_PUBLIC_AUTH0_CLIENT_ID:", clientId || "❌ NO CONFIGURADO");
console.log("  NEXT_PUBLIC_AUTH0_NAMESPACE:", namespace || "⚠️  No configurado (opcional)");

if (!domain || !clientId) {
  console.error("\n❌ ERROR: Faltan variables de entorno requeridas");
  process.exit(1);
}

console.log("\n✅ Variables de entorno configuradas");

console.log("\n📋 Configuración esperada en Auth0 Dashboard:\n");

console.log("1. Tipo de Aplicación:");
console.log("   ✅ DEBE ser: 'Single Page Application'");
console.log("   ❌ NO debe ser: 'Regular Web Application'\n");

console.log("2. URLs configuradas:");
console.log("   Allowed Callback URLs:");
console.log("     http://localhost:3000/auth/callback");
console.log("     https://dev.vistral.io/auth/callback");
console.log("     (o tu dominio de producción)\n");

console.log("   Allowed Logout URLs:");
console.log("     http://localhost:3000");
console.log("     https://dev.vistral.io\n");

console.log("   Allowed Web Origins:");
console.log("     http://localhost:3000");
console.log("     https://dev.vistral.io\n");

console.log("3. Grant Types habilitados:");
console.log("   ✅ Authorization Code");
console.log("   ✅ Refresh Token\n");

console.log("4. Application Login URI (opcional):");
console.log("   http://localhost:3000/login\n");

console.log("🔗 URL de autorización que se generará:");
const redirectUri = "http://localhost:3000/auth/callback";
const authUrl = `https://${domain}/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid profile email`;
console.log(`   ${authUrl}\n`);

console.log("💡 Si el error persiste:");
console.log("   1. Verifica que el tipo de aplicación sea 'Single Page Application'");
console.log("   2. Verifica que las URLs coincidan EXACTAMENTE (incluyendo http/https)");
console.log("   3. Verifica que los Grant Types estén habilitados");
console.log("   4. Revisa los logs de Auth0 Dashboard → Monitoring → Logs\n");

