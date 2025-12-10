/**
 * Script para verificar y crear/resetear usuario en Supabase
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

async function verifyUser() {
  const email = 'dev@vistral.com';
  const password = 'TempPassword123!';
  
  console.log(`🔍 Verificando usuario: ${email}\n`);
  
  const supabase = createAdminClient();
  
  // Buscar usuario existente
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listando usuarios:', listError);
    return;
  }
  
  const user = users?.users?.find(u => u.email === email);
  
  if (!user) {
    console.log('⚠️  Usuario no encontrado. Creando...');
    
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
  } else {
    console.log('✅ Usuario encontrado:', user.id);
    console.log('📧 Email:', user.email);
    console.log('📅 Creado:', user.created_at);
    
    // Resetear contraseña usando generateLink para forzar el cambio
    console.log('\n🔄 Reseteando contraseña...');
    
    // Primero intentar actualizar directamente
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password }
    );
    
    if (updateError) {
      console.error('❌ Error reseteando contraseña:', updateError);
      console.log('⚠️  Intentando método alternativo...');
      
      // Método alternativo: eliminar y recrear el usuario
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error('❌ Error eliminando usuario:', deleteError);
      } else {
        console.log('✅ Usuario eliminado, recreando...');
        
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: 'Dev User' },
        });
        
        if (createError) {
          console.error('❌ Error recreando usuario:', createError);
        } else {
          console.log('✅ Usuario recreado:', newUser.user.id);
          
          // Asignar rol
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
        }
      }
    } else {
      console.log('✅ Contraseña reseteada');
    }
    
    // Verificar rol
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (roleData) {
      console.log('✅ Rol actual:', roleData.role);
    } else {
      console.log('⚠️  No tiene rol asignado. Asignando construction_manager...');
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
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
    }
  }
  
  console.log('\n📝 Credenciales:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
}

verifyUser()
  .then(() => {
    console.log('\n✨ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

