/**
 * Script para establecer contraseña usando el método de reset de Supabase
 * 
 * Ejecutar con: npx tsx scripts/set-password-via-reset.ts
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

async function setPasswordViaReset() {
  console.log(`🔧 Estableciendo contraseña para: ${EMAIL}\n`);

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

  // Generar link de reset de contraseña
  console.log('\n🔗 Generando link de reset de contraseña...');
  
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: EMAIL,
  });

  if (linkError) {
    console.error('❌ Error generando link:', linkError);
    process.exit(1);
  }

  console.log('✅ Link generado');
  console.log(`   Link: ${linkData.properties.action_link}`);

  // Extraer el token del link
  const url = new URL(linkData.properties.action_link);
  const token = url.searchParams.get('token');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  if (!token || !tokenHash) {
    console.error('❌ No se pudo extraer el token del link');
    process.exit(1);
  }

  console.log('\n🔑 Usando el token para establecer la contraseña...');
  console.log('   (Esto requiere usar la API de Supabase directamente)');

  // Nota: No podemos usar el token directamente desde aquí porque necesitamos
  // hacer la llamada desde el cliente. Pero podemos mostrar las instrucciones.
  
  console.log('\n📝 INSTRUCCIONES:');
  console.log('   1. Copia este link y ábrelo en tu navegador:');
  console.log(`   ${linkData.properties.action_link}`);
  console.log('\n   2. O usa este token manualmente:');
  console.log(`   Token: ${token.substring(0, 20)}...`);
  console.log(`   Token Hash: ${tokenHash.substring(0, 20)}...`);
  
  console.log('\n💡 Alternativa: Usa Auth0');
  console.log('   Como este usuario puede haber sido creado con Auth0,');
  console.log('   la mejor opción es usar el botón "Continuar con Auth0"');
  console.log('   en la página de login.');

  console.log('\n✨ Proceso completado!');
}

// Ejecutar
setPasswordViaReset()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

