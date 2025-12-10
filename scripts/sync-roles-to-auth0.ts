/**
 * Script para sincronizar roles de Supabase a Auth0
 * 
 * Ejecutar: npm run sync:roles-to-auth0
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.warn('⚠️  No se pudo cargar .env.local, usando variables de entorno del sistema');
}

import { getAuth0ManagementClient } from '../lib/auth0/management-client';

async function main() {
  console.log('🔄 Sincronizando roles de Supabase a Auth0...\n');

  // Debug: Verificar variables de entorno
  console.log('🔍 Verificando variables de entorno:');
  console.log('  AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN || '❌ No configurado');
  console.log('  NEXT_PUBLIC_AUTH0_DOMAIN:', process.env.NEXT_PUBLIC_AUTH0_DOMAIN || '❌ No configurado');
  console.log('  AUTH0_MANAGEMENT_CLIENT_ID:', process.env.AUTH0_MANAGEMENT_CLIENT_ID ? '✅ Configurado' : '❌ No configurado');
  console.log('  AUTH0_MANAGEMENT_CLIENT_SECRET:', process.env.AUTH0_MANAGEMENT_CLIENT_SECRET ? '✅ Configurado' : '❌ No configurado');
  console.log('');

  try {
    const auth0Client = getAuth0ManagementClient();
    const roles = await auth0Client.syncRolesFromSupabase();

    console.log('\n✅ Roles sincronizados exitosamente:');
    roles.forEach(role => {
      console.log(`  - ${role.name}: ${role.description || 'Sin descripción'}`);
    });

    console.log('\n🎉 ¡Sincronización completada!');
  } catch (error: any) {
    console.error('\n❌ Error sincronizando roles:', error.message);
    process.exit(1);
  }
}

main();










