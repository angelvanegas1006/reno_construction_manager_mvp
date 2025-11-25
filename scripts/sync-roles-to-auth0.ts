/**
 * Script para sincronizar roles de Supabase a Auth0
 * 
 * Ejecutar: npm run sync:roles-to-auth0
 */

import { getAuth0ManagementClient } from '../lib/auth0/management-client';

async function main() {
  console.log('🔄 Sincronizando roles de Supabase a Auth0...\n');

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

