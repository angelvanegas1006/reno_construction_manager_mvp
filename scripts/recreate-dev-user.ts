/**
 * Script para eliminar y recrear el usuario dev@vistral.com con contraseña correcta
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
  console.warn('⚠️  No se pudo cargar .env.local');
}

import { createAdminClient } from '@/lib/supabase/admin';

async function recreateUser() {
  const email = 'dev@vistral.com';
  const password = 'TempPassword123!';
  
  console.log(`🔄 Recreando usuario: ${email}\n`);
  
  const supabase = createAdminClient();
  
  // Buscar usuario existente
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === email);
  
  if (user) {
    console.log('🗑️  Eliminando usuario existente...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('❌ Error eliminando usuario:', deleteError);
      return;
    }
    
    console.log('✅ Usuario eliminado');
    
    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Crear usuario nuevo con contraseña
  console.log('\n➕ Creando usuario nuevo...');
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Dev User' },
  });
  
  if (createError) {
    console.error('❌ Error creando usuario:', createError);
    return;
  }
  
  console.log('✅ Usuario creado:', newUser.user.id);
  
  // Asignar rol
  console.log('\n📋 Asignando rol...');
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({
      user_id: newUser.user.id,
      role: 'construction_manager',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });
  
  if (roleError) {
    console.error('❌ Error asignando rol:', roleError);
  } else {
    console.log('✅ Rol asignado: construction_manager');
  }
  
  console.log('\n📝 Credenciales:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log('\n✨ Usuario recreado exitosamente');
}

recreateUser()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

