import { createAdminClient } from '@/lib/supabase/admin';

const EMAIL = process.argv[2] || 'miguel.pertusa@prophero.com';

async function checkUserStatus() {
  console.log(`🔍 Verificando estado del usuario: ${EMAIL}\n`);

  const supabase = createAdminClient();

  // Buscar usuario
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listando usuarios:', listError);
    process.exit(1);
  }

  const user = users?.users?.find(u => u.email?.toLowerCase() === EMAIL.toLowerCase());

  if (!user) {
    console.error(`❌ Usuario ${EMAIL} no encontrado`);
    process.exit(1);
  }

  console.log(`✅ Usuario encontrado:\n`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Nombre: ${user.user_metadata?.name || 'No especificado'}`);
  console.log(`   Email confirmado: ${user.email_confirmed_at ? '✅ Sí' : '❌ No'}`);
  console.log(`   Creado: ${user.created_at}`);
  console.log(`   Última actualización: ${user.updated_at}`);
  console.log(`   Último sign in: ${user.last_sign_in_at || 'Nunca'}`);
  
  // Estado de desactivación
  console.log(`\n🔒 Estado de Usuario:`);
  console.log(`   Desactivado (banned): ${user.banned ? '❌ SÍ - Usuario desactivado' : '✅ NO - Usuario activo'}`);
  
  if (user.banned) {
    console.log(`\n⚠️  Este usuario está DESACTIVADO y no puede iniciar sesión.`);
  } else {
    console.log(`\n✅ Este usuario está ACTIVO y puede iniciar sesión.`);
  }

  // Verificar rol
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleError) {
    console.log(`\n⚠️  No se pudo obtener el rol:`, roleError.message);
  } else {
    console.log(`\n👤 Rol asignado: ${roleData?.role || 'No asignado'}`);
  }

  // Verificar si tiene metadata de Auth0
  const isAuth0User = user.user_metadata?.auth0_user === true;
  console.log(`\n🔐 Tipo de usuario:`);
  console.log(`   Auth0 user: ${isAuth0User ? '✅ Sí' : '❌ No'}`);
  
  if (isAuth0User) {
    console.log(`\n💡 Este usuario fue creado con Auth0.`);
  }

  console.log(`\n✅ Verificación completada\n`);
}

checkUserStatus().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
