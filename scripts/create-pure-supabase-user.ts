/**
 * Script para crear un usuario PURO en Supabase (sin Auth0)
 * Esto garantiza que el usuario tenga contraseña y pueda usar email/password
 * 
 * Ejecutar con: npx tsx scripts/create-pure-supabase-user.ts
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
import type { Database } from '@/lib/supabase/types';

const EMAIL = 'angel.vanegas@prophero.com';
const PASSWORD = 'TempPassword123!';
const ROLE: Database['public']['Enums']['app_role'] = 'construction_manager';

async function createPureSupabaseUser() {
  console.log(`🔧 Creando usuario PURO en Supabase: ${EMAIL}\n`);

  const supabase = createAdminClient();

  // Buscar y eliminar TODOS los usuarios con este email
  console.log('🔍 Buscando usuarios existentes...');
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listando usuarios:', listError);
    process.exit(1);
  }

  const existingUsers = users?.users?.filter(u => u.email === EMAIL) || [];

  if (existingUsers.length > 0) {
    console.log(`⚠️  Encontrados ${existingUsers.length} usuario(s) existente(s), eliminando...`);
    
    for (const user of existingUsers) {
      console.log(`   Eliminando usuario: ${user.id}`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error(`   ❌ Error eliminando usuario ${user.id}:`, deleteError);
      } else {
        console.log(`   ✅ Usuario eliminado: ${user.id}`);
      }
    }

    // Esperar un momento para que Supabase procese las eliminaciones
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Crear usuario NUEVO con contraseña explícita
  console.log('\n👤 Creando nuevo usuario con contraseña...');
  
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD, // Contraseña explícita
    email_confirm: true,
    user_metadata: {
      name: 'Angel Vanegas',
      // NO incluir auth0_user para que sea un usuario puro de Supabase
    },
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
  });

  if (createError) {
    console.error('❌ Error creando usuario:', createError);
    console.error('   Detalles:', JSON.stringify(createError, null, 2));
    process.exit(1);
  }

  if (!newUser.user) {
    console.error('❌ No se pudo crear el usuario');
    process.exit(1);
  }

  console.log(`✅ Usuario creado: ${newUser.user.id}`);

  // Verificar que tiene contraseña
  console.log('\n🔍 Verificando usuario creado...');
  const { data: verifyUsers } = await supabase.auth.admin.listUsers();
  const verifyUser = verifyUsers?.users?.find(u => u.email === EMAIL);
  
  if (verifyUser) {
    console.log(`   ID: ${verifyUser.id}`);
    console.log(`   Email: ${verifyUser.email}`);
    console.log(`   Email confirmado: ${verifyUser.email_confirmed_at ? '✅ Sí' : '❌ No'}`);
    console.log(`   Tiene contraseña: ${verifyUser.encrypted_password ? '✅ Sí' : '❌ No'}`);
    console.log(`   Provider: ${verifyUser.app_metadata?.provider || 'N/A'}`);
    console.log(`   Providers: ${JSON.stringify(verifyUser.app_metadata?.providers || [])}`);
    console.log(`   Metadata: ${JSON.stringify(verifyUser.user_metadata)}`);
    
    if (!verifyUser.encrypted_password) {
      console.error('\n❌ ERROR: El usuario NO tiene contraseña después de crearlo.');
      console.error('   Esto puede ser un problema de configuración de Supabase.');
      console.error('   Intenta crear el usuario manualmente desde el Dashboard de Supabase.');
      process.exit(1);
    }
  } else {
    console.error('❌ No se pudo verificar el usuario después de crearlo');
    process.exit(1);
  }

  // Asignar rol
  console.log('\n👤 Asignando rol...');
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({
      user_id: newUser.user.id,
      role: ROLE,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (roleError) {
    console.error('❌ Error asignando rol:', roleError);
    process.exit(1);
  }

  console.log(`✅ Rol asignado: ${ROLE}`);

  console.log('\n✨ Proceso completado!');
  console.log(`\n📝 Credenciales:`);
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`   Rol: ${ROLE}`);
  console.log(`\n💡 Ahora deberías poder iniciar sesión con email/password.`);
  console.log(`   Si aún no funciona, crea el usuario manualmente desde:`);
  console.log(`   https://app.supabase.com/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}/auth/users`);
}

// Ejecutar
createPureSupabaseUser()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

