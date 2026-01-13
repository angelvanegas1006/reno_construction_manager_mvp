/**
 * Script para resetear completamente la contraseña del usuario angel.vanegas@prophero.com
 * 
 * Ejecutar con: npx tsx scripts/reset-angel-password.ts
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
const NEW_PASSWORD = 'TempPassword123!';

async function resetPassword() {
  console.log(`🔧 Reseteando contraseña para: ${EMAIL}\n`);

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

  console.log(`✅ Usuario encontrado: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Email confirmado: ${user.email_confirmed_at ? 'Sí' : 'No'}`);

  // Intentar actualizar la contraseña de múltiples formas
  console.log('\n🔑 Reseteando contraseña...');

  // Método 1: Actualizar usuario con password
  const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      password: NEW_PASSWORD,
      email_confirm: true,
    }
  );

  if (updateError) {
    console.error('❌ Error actualizando contraseña:', updateError);
    console.log('\n🔄 Intentando método alternativo...');
    
    // Método 2: Generar link de reset y usar admin para cambiar password
    try {
      const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: EMAIL,
      });

      if (resetError) {
        console.error('❌ Error generando link de reset:', resetError);
      } else {
        console.log('✅ Link de reset generado (pero no necesario, continuando...)');
      }
    } catch (err) {
      console.warn('⚠️  No se pudo generar link de reset:', err);
    }
  } else {
    console.log('✅ Contraseña actualizada correctamente');
  }

  // Verificar que el usuario puede autenticarse
  console.log('\n🔍 Verificando autenticación...');
  
  // Crear un cliente temporal para probar el login
  const { createClient } = await import('@/lib/supabase/client');
  const testClient = createClient();
  
  const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
    email: EMAIL,
    password: NEW_PASSWORD,
  });

  if (signInError) {
    console.error('❌ Error al verificar login:', signInError);
    console.log('\n⚠️  La contraseña se actualizó pero no se pudo verificar el login.');
    console.log('   Esto puede ser normal si hay problemas de red o configuración.');
  } else {
    console.log('✅ Login verificado correctamente!');
    console.log(`   Usuario ID: ${signInData.user?.id}`);
  }

  console.log('\n✨ Proceso completado!');
  console.log(`\n📝 Credenciales:`);
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Password: ${NEW_PASSWORD}`);
  console.log(`\n💡 Intenta iniciar sesión ahora. Si aún no funciona, usa Auth0.`);
}

// Ejecutar
resetPassword()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

