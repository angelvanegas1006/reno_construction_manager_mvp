/**
 * Script para verificar el rol de un usuario en Supabase
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

async function checkUserRole() {
  const email = 'dev@vistral.com';
  
  console.log(`🔍 Verificando rol de usuario: ${email}\n`);
  
  const supabase = createAdminClient();
  
  // Buscar usuario
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === email);
  
  if (!user) {
    console.error('❌ Usuario no encontrado');
    return;
  }
  
  console.log('✅ Usuario encontrado:', user.id);
  console.log('📧 Email:', user.email);
  
  // Verificar rol
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (roleError) {
    console.error('❌ Error obteniendo rol:', roleError);
    console.log('\n⚠️  El usuario NO tiene rol asignado. Asignando construction_manager...');
    
    const { error: upsertError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: 'construction_manager',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });
    
    if (upsertError) {
      console.error('❌ Error asignando rol:', upsertError);
    } else {
      console.log('✅ Rol asignado: construction_manager');
    }
  } else {
    console.log('✅ Rol actual:', roleData.role);
    
    if (roleData.role !== 'construction_manager' && roleData.role !== 'admin') {
      console.log('\n⚠️  El rol no es construction_manager ni admin. Actualizando...');
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({
          role: 'construction_manager',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      
      if (updateError) {
        console.error('❌ Error actualizando rol:', updateError);
      } else {
        console.log('✅ Rol actualizado a: construction_manager');
      }
    }
  }
}

checkUserRole()
  .then(() => {
    console.log('\n✨ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

