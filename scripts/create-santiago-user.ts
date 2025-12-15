/**
 * Script para crear usuario Santiago Figueiredo para settlements
 * Ejecutar con: npx tsx scripts/create-santiago-user.ts
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

const EMAIL = 'santiagofigueiredo@prophero.com';
const PASSWORD = 'santi123*';

async function createSantiagoUser() {
  console.log(`🔧 Creando usuario: ${EMAIL}\n`);

  const supabase = createAdminClient();

  // Buscar usuarios existentes con este email
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
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      name: 'Santiago Figueiredo',
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
  const { data: verifyUsers } = await supabase.auth.admin.listUsers();
  const verifyUser = verifyUsers?.users?.find(u => u.email === EMAIL);
  
  if (verifyUser) {
    console.log(`   Tiene contraseña: ${verifyUser.encrypted_password ? '✅ Sí' : '❌ No'}`);
  }

  // Asignar rol settlements_analyst
  // Nota: settlements_analyst no está en el enum de Supabase, así que usaremos el sistema de localStorage
  // Pero podemos crear un registro en user_roles con un rol temporal o usar 'user' como base
  console.log('\n👤 Configurando acceso...');
  console.log('   ⚠️  Nota: settlements_analyst se manejará con localStorage');
  console.log('   El usuario puede iniciar sesión y luego se establecerá el rol en localStorage');

  console.log('\n✨ Proceso completado!');
  console.log(`\n📝 Credenciales:`);
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`\n💡 Para usar settlements:`);
  console.log(`   1. Inicia sesión con estas credenciales`);
  console.log(`   2. En la consola del navegador ejecuta: localStorage.setItem("userRole", "settlements_analyst")`);
  console.log(`   3. Recarga la página`);
  console.log(`   4. Ve a: http://localhost:3000/settlements/kanban`);
}

// Ejecutar
createSantiagoUser()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

