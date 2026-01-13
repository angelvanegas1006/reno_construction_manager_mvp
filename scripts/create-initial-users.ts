/**
 * Script para crear usuarios iniciales en Auth0 y Supabase
 * 
 * Ejecutar con: npm run create:users
 * 
 * Crea:
 * - 3 usuarios con rol construction_manager
 * - 6 usuarios con rol foreman
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

import { getAuth0ManagementClient } from '@/lib/auth0/management-client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';

// Función para sincronizar rol directamente usando admin client
async function syncRoleToSupabase(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  role: Database['public']['Enums']['app_role']
): Promise<void> {
  try {
    const { error: upsertError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: role,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error(`[syncRoleToSupabase] ❌ Error syncing role:`, upsertError);
      throw upsertError;
    } else {
      console.log(`[syncRoleToSupabase] ✅ Role synced: ${role} for user ${userId}`);
    }
  } catch (err) {
    console.error(`[syncRoleToSupabase] ❌ Unexpected error:`, err);
    throw err;
  }
}

// Mapeo de nombres de foreman a emails
const FOREMAN_MAPPING: Record<string, string> = {
  'Raúl': 'raul.pedros@prophero.com',
  'Miguel Pertusa': 'miguel.pertusa@prophero.com',
  'Elier Claudio': 'elier.claudio@prophero.com',
  'Victor Maestre': 'victor.maestre@prophero.com',
  'Renée Jimenez': 'tania.jimenez@prophero.com',
  'Jonnathan': 'jonnathan.pomares@prophero.com',
};

// Construction managers
const CONSTRUCTION_MANAGERS = [
  { email: 'david.bayarri@prophero.com', name: 'David Bayarri' },
  { email: 'manuel.gomez@prophero.com', name: 'Manuel Gomez' },
  { email: 'angel.vanegas@prophero.com', name: 'Angel Vanegas' },
  { email: 'dev@vistral.com', name: 'Dev User' },
];

// Password temporal para todos los usuarios
const TEMP_PASSWORD = 'TempPassword123!';

async function createUsers() {
  console.log('🚀 Iniciando creación de usuarios...\n');

  // Verificar variables de entorno requeridas
  const requiredSupabaseVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missingSupabaseVars = requiredSupabaseVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingSupabaseVars.length > 0) {
    console.error('❌ Faltan variables de entorno de Supabase:');
    missingSupabaseVars.forEach((varName) => console.error(`   - ${varName}`));
    process.exit(1);
  }

  // Verificar variables de Auth0 (opcionales pero recomendadas)
  const auth0Vars = [
    'AUTH0_DOMAIN',
    'AUTH0_MANAGEMENT_CLIENT_ID',
    'AUTH0_MANAGEMENT_CLIENT_SECRET',
  ];

  const missingAuth0Vars = auth0Vars.filter(
    (varName) => !process.env[varName]
  );

  const useAuth0 = missingAuth0Vars.length === 0;
  
  if (!useAuth0) {
    console.warn('⚠️  Variables de Auth0 no configuradas. Solo se crearán usuarios en Supabase.');
    console.warn('   Variables faltantes:');
    missingAuth0Vars.forEach((varName) => console.warn(`   - ${varName}`));
  }

  const auth0Client = useAuth0 ? getAuth0ManagementClient() : null;
  const supabase = createAdminClient();

  // Primero, asegurarnos de que el rol construction_manager existe en Auth0
  if (useAuth0 && auth0Client) {
    console.log('📋 Sincronizando roles en Auth0...');
    try {
      await auth0Client.syncRolesFromSupabase();
      console.log('✅ Roles sincronizados en Auth0');
    } catch (error: any) {
      console.error('❌ Error sincronizando roles:', error.message);
    }
  }

  // Crear construction managers
  console.log('\n👷 Creando Construction Managers...');
  for (const cm of CONSTRUCTION_MANAGERS) {
    try {
      let auth0UserId: string | null = null;
      
      // Crear/actualizar en Auth0 si está configurado
      if (useAuth0 && auth0Client) {
        const existingUser = await auth0Client.getUserByEmail(cm.email);
        
        if (existingUser) {
          console.log(`⚠️  Usuario ${cm.email} ya existe en Auth0, actualizando rol...`);
          await auth0Client.assignRoleToUser(existingUser.user_id, 'construction_manager');
          auth0UserId = existingUser.user_id;
          console.log(`✅ Rol actualizado en Auth0 para ${cm.email}`);
        } else {
          const auth0User = await auth0Client.createUser({
            email: cm.email,
            password: TEMP_PASSWORD,
            name: cm.name,
            role: 'construction_manager',
          });
          auth0UserId = auth0User.user_id;
          console.log(`✅ Usuario creado en Auth0: ${cm.email}`);
        }
      }
      
      // Crear/actualizar en Supabase
      const { data: supabaseUsers } = await supabase.auth.admin.listUsers();
      const supabaseUser = supabaseUsers?.users?.find(u => u.email === cm.email);
      
      if (!supabaseUser) {
        const { data: newUser, error } = await supabase.auth.admin.createUser({
          email: cm.email,
          password: TEMP_PASSWORD,
          email_confirm: true,
          user_metadata: { name: cm.name },
        });
        
        if (error) {
          console.error(`❌ Error creando usuario en Supabase: ${cm.email}`, error);
          continue;
        }
        
        // Asignar rol en Supabase
        await syncRoleToSupabase(supabase, newUser.user.id, 'construction_manager');
        console.log(`✅ Usuario creado en Supabase: ${cm.email}`);
      } else {
        // Actualizar rol en Supabase
        await syncRoleToSupabase(supabase, supabaseUser.id, 'construction_manager');
        console.log(`✅ Rol actualizado en Supabase: ${cm.email}`);
      }
    } catch (error: any) {
      console.error(`❌ Error creando construction manager ${cm.email}:`, error.message);
    }
  }

  // Crear foreman
  console.log('\n🔨 Creando Foreman...');
  for (const [name, email] of Object.entries(FOREMAN_MAPPING)) {
    try {
      let auth0UserId: string | null = null;
      
      // Crear/actualizar en Auth0 si está configurado
      if (useAuth0 && auth0Client) {
        const existingUser = await auth0Client.getUserByEmail(email);
        
        if (existingUser) {
          console.log(`⚠️  Usuario ${email} ya existe en Auth0, actualizando rol...`);
          await auth0Client.assignRoleToUser(existingUser.user_id, 'foreman');
          auth0UserId = existingUser.user_id;
          console.log(`✅ Rol actualizado en Auth0 para ${email}`);
        } else {
          const auth0User = await auth0Client.createUser({
            email: email,
            password: TEMP_PASSWORD,
            name: name,
            role: 'foreman',
          });
          auth0UserId = auth0User.user_id;
          console.log(`✅ Usuario creado en Auth0: ${email}`);
        }
      }
      
      // Crear/actualizar en Supabase
      const { data: supabaseUsers } = await supabase.auth.admin.listUsers();
      const supabaseUser = supabaseUsers?.users?.find(u => u.email === email);
      
      if (!supabaseUser) {
        const { data: newUser, error } = await supabase.auth.admin.createUser({
          email: email,
          password: TEMP_PASSWORD,
          email_confirm: true,
          user_metadata: { name: name },
        });
        
        if (error) {
          console.error(`❌ Error creando usuario en Supabase: ${email}`, error);
          continue;
        }
        
        // Asignar rol en Supabase
        await syncRoleToSupabase(supabase, newUser.user.id, 'foreman');
        console.log(`✅ Usuario creado en Supabase: ${email}`);
      } else {
        // Actualizar rol en Supabase
        await syncRoleToSupabase(supabase, supabaseUser.id, 'foreman');
        console.log(`✅ Rol actualizado en Supabase: ${email}`);
      }
    } catch (error: any) {
      console.error(`❌ Error creando foreman ${email}:`, error.message);
    }
  }

  console.log('\n✅ Proceso completado!');
  console.log('\n📝 Nota: Todos los usuarios tienen password temporal:', TEMP_PASSWORD);
  console.log('   Los usuarios deberán cambiar su password al iniciar sesión por primera vez.');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createUsers()
    .then(() => {
      console.log('\n✨ Script finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    });
}

export { createUsers, FOREMAN_MAPPING, CONSTRUCTION_MANAGERS };

