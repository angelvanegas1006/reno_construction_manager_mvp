/**
 * Script para verificar y corregir el usuario angel.vanegas@prophero.com
 * 
 * Ejecutar con: tsx scripts/fix-angel-user.ts
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
const PASSWORD = 'TempPassword123!'; // Con exclamación como en el script
const ROLE: Database['public']['Enums']['app_role'] = 'construction_manager';

async function fixUser() {
  console.log(`🔧 Verificando y corrigiendo usuario: ${EMAIL}\n`);

  const supabase = createAdminClient();

  // Buscar usuario existente
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listando usuarios:', listError);
    process.exit(1);
  }

  const existingUser = users?.users?.find(u => u.email === EMAIL);

  if (existingUser) {
    console.log(`✅ Usuario encontrado: ${existingUser.id}`);
    console.log(`   Email: ${existingUser.email}`);
    console.log(`   Email confirmado: ${existingUser.email_confirmed_at ? 'Sí' : 'No'}`);
    console.log(`   Creado: ${existingUser.created_at}`);
    console.log(`   Metadata:`, existingUser.user_metadata);

    // Actualizar contraseña
    console.log('\n🔑 Actualizando contraseña...');
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: PASSWORD,
        email_confirm: true,
      }
    );

    if (updateError) {
      console.error('❌ Error actualizando contraseña:', updateError);
      process.exit(1);
    }

    console.log('✅ Contraseña actualizada correctamente');
  } else {
    console.log('⚠️  Usuario no encontrado, creando nuevo usuario...');
    
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
  }

  // Obtener el usuario (ya sea existente o recién creado)
  const { data: finalUsers } = await supabase.auth.admin.listUsers();
  const finalUser = finalUsers?.users?.find(u => u.email === EMAIL);

  if (!finalUser) {
    console.error('❌ No se pudo encontrar el usuario después de crear/actualizar');
    process.exit(1);
  }

  // Asignar rol
  console.log('\n👤 Asignando rol...');
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({
      user_id: finalUser.id,
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
  console.log(`\n📝 Credenciales de acceso:`);
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`   Rol: ${ROLE}`);
  console.log(`\n💡 Nota: La contraseña tiene una exclamación (!) al final`);
}

// Ejecutar
fixUser()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

