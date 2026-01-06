/**
 * Script para verificar el estado del usuario angel.vanegas@prophero.com
 * 
 * Ejecutar con: npx tsx scripts/check-angel-user.ts
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

import { createAdminClient } from '@/lib/supabase/admin';

const EMAIL = 'angel.vanegas@prophero.com';

async function checkUser() {
  console.log(`🔍 Verificando estado del usuario: ${EMAIL}\n`);

  const supabase = createAdminClient();

  // Buscar usuario
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listando usuarios:', listError);
    process.exit(1);
  }

  const user = users?.users?.find(u => u.email === EMAIL);

  if (!user) {
    console.error(`❌ Usuario ${EMAIL} no encontrado`);
    process.exit(1);
  }

  console.log(`✅ Usuario encontrado:\n`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Email confirmado: ${user.email_confirmed_at ? '✅ Sí' : '❌ No'}`);
  console.log(`   Creado: ${user.created_at}`);
  console.log(`   Última actualización: ${user.updated_at}`);
  console.log(`   Último sign in: ${user.last_sign_in_at || 'Nunca'}`);
  console.log(`   Tiene contraseña: ${user.encrypted_password ? '✅ Sí' : '❌ No'}`);
  console.log(`   Metadata:`, JSON.stringify(user.user_metadata, null, 2));
  console.log(`   App metadata:`, JSON.stringify(user.app_metadata, null, 2));

  // Verificar rol
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError) {
    console.log(`\n⚠️  No se pudo obtener el rol:`, roleError.message);
  } else {
    console.log(`\n✅ Rol asignado: ${roleData?.role || 'No asignado'}`);
  }

  // Verificar si tiene metadata de Auth0
  const isAuth0User = user.user_metadata?.auth0_user === true;
  console.log(`\n🔐 Tipo de usuario:`);
  console.log(`   Auth0 user: ${isAuth0User ? '✅ Sí' : '❌ No'}`);
  
  if (isAuth0User) {
    console.log(`\n💡 Este usuario fue creado con Auth0.`);
    console.log(`   Para iniciar sesión, usa el botón "Continuar con Auth0"`);
    console.log(`   en lugar de email/password.`);
  } else if (!user.encrypted_password) {
    console.log(`\n⚠️  Este usuario NO tiene contraseña en Supabase.`);
    console.log(`   Necesitas usar Auth0 o resetear la contraseña.`);
  } else {
    console.log(`\n✅ Este usuario tiene contraseña y puede usar email/password.`);
  }
}

// Ejecutar
checkUser()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

