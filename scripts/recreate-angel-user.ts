/**
 * Script para recrear completamente el usuario angel.vanegas@prophero.com con contraseña
 * 
 * Ejecutar con: npx tsx scripts/recreate-angel-user.ts
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

async function recreateUser() {
  console.log(`🔧 Recreando usuario: ${EMAIL}\n`);

  const supabase = createAdminClient();

  // Buscar usuario existente
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listando usuarios:', listError);
    process.exit(1);
  }

  const existingUser = users?.users?.find(u => u.email === EMAIL);

  if (existingUser) {
    console.log(`⚠️  Usuario existente encontrado: ${existingUser.id}`);
    console.log(`   Eliminando usuario existente...`);
    
    // Eliminar usuario existente
    const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
    
    if (deleteError) {
      console.error('❌ Error eliminando usuario:', deleteError);
      console.log('   Intentando actualizar en su lugar...');
      
      // Si no se puede eliminar, intentar actualizar
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: PASSWORD,
          email_confirm: true,
          user_metadata: {
            name: 'Angel Vanegas',
          },
        }
      );

      if (updateError) {
        console.error('❌ Error actualizando usuario:', updateError);
        process.exit(1);
      }

      console.log('✅ Usuario actualizado');
      
      // Asignar rol
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: existingUser.id,
          role: ROLE,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (roleError) {
        console.error('❌ Error asignando rol:', roleError);
      } else {
        console.log(`✅ Rol asignado: ${ROLE}`);
      }

      console.log('\n✨ Proceso completado!');
      console.log(`\n📝 Credenciales:`);
      console.log(`   Email: ${EMAIL}`);
      console.log(`   Password: ${PASSWORD}`);
      return;
    }

    console.log('✅ Usuario eliminado');
  }

  // Crear nuevo usuario con contraseña
  console.log('\n👤 Creando nuevo usuario con contraseña...');
  
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      name: 'Angel Vanegas',
    },
  });

  if (createError) {
    console.error('❌ Error creando usuario:', createError);
    process.exit(1);
  }

  if (!newUser.user) {
    console.error('❌ No se pudo crear el usuario');
    process.exit(1);
  }

  console.log(`✅ Usuario creado: ${newUser.user.id}`);

  // Verificar que tiene contraseña
  const { data: verifyUsers } = await supabase.auth.admin.listUsers();
  const verifyUser = verifyUsers?.users?.find(u => u.email === EMAIL);
  
  if (verifyUser) {
    console.log(`   Tiene contraseña: ${verifyUser.encrypted_password ? '✅ Sí' : '❌ No'}`);
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
  console.log(`\n💡 Ahora deberías poder iniciar sesión con email/password.`);
}

// Ejecutar
recreateUser()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

