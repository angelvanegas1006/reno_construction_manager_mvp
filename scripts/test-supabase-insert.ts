#!/usr/bin/env tsx
/**
 * Script para probar la inserción de categorías dinámicas en Supabase
 * Verifica que la autenticación y la inserción funcionen correctamente
 * Uso: npm run test:supabase-insert
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testInsert() {
  console.log('🧪 Probando inserción de categoría en Supabase...\n');

  // Verificar variables de entorno
  if (!SUPABASE_URL) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL no está configurado');
    process.exit(1);
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurado');
    console.error('\n💡 Asegúrate de tener esta variable en tu .env.local:');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui\n');
    process.exit(1);
  }

  console.log('✅ Variables de entorno encontradas:');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
  console.log('');

  // Extraer el project ID de la URL
  const urlMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!urlMatch) {
    console.error('❌ URL de Supabase inválida:', SUPABASE_URL);
    process.exit(1);
  }

  const projectId = urlMatch[1];
  const restUrl = `${SUPABASE_URL}/rest/v1/property_dynamic_categories`;

  console.log('📡 Configuración del request:');
  console.log(`   URL: ${restUrl}`);
  console.log('');

  // Buscar una propiedad de prueba
  const testPropertyId = 'SP-Q4X-HPS-003953'; // La que usamos antes

  // Datos de prueba
  const testCategory = {
    property_id: testPropertyId,
    category_name: `TEST CATEGORY ${Date.now()}`,
    activities_text: 'Esta es una categoría de prueba generada automáticamente',
    percentage: null,
  };

  console.log('📤 Intentando insertar categoría de prueba:');
  console.log(JSON.stringify(testCategory, null, 2));
  console.log('');

  try {
    const response = await fetch(restUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(testCategory),
    });

    console.log(`📊 Respuesta del servidor:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));
    console.log('');

    const responseText = await response.text();
    console.log(`📄 Body de la respuesta:`);
    console.log(responseText);
    console.log('');

    if (!response.ok) {
      console.error('❌ Error en la inserción');
      
      if (response.status === 401) {
        console.error('\n🔐 ERROR 401: Problema de autenticación');
        console.error('\n💡 Posibles causas:');
        console.error('   1. El SUPABASE_SERVICE_ROLE_KEY es incorrecto');
        console.error('   2. Estás usando el ANON KEY en lugar del SERVICE ROLE KEY');
        console.error('   3. El header Authorization no está configurado correctamente');
        console.error('\n📝 Verifica en tu .env.local:');
        console.error('   - Debe ser SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_SUPABASE_ANON_KEY)');
        console.error('   - El formato debe ser: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
        console.error('\n🔗 Para obtener el Service Role Key:');
        console.error('   1. Ve a Supabase Dashboard → Settings → API');
        console.error('   2. Busca "service_role" key (NO el "anon" key)');
        console.error('   3. Cópialo y pégalo en tu .env.local');
      } else if (response.status === 404) {
        console.error('\n❌ ERROR 404: Tabla no encontrada');
        console.error('   Verifica que la tabla property_dynamic_categories existe en Supabase');
      } else if (response.status === 400) {
        console.error('\n❌ ERROR 400: Bad Request');
        console.error('   Verifica que los datos del body sean correctos');
        console.error('   Revisa el mensaje de error arriba');
      }
      
      process.exit(1);
    }

    const responseData = JSON.parse(responseText);
    console.log('✅ Inserción exitosa!');
    console.log('\n📋 Categoría insertada:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('\n💡 Ahora puedes usar esta misma configuración en n8n:');
    console.log(`   URL: ${restUrl}`);
    console.log(`   Headers:`);
    console.log(`     apikey: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
    console.log(`     Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
    console.log(`     Content-Type: application/json`);
    console.log(`     Prefer: return=representation`);

  } catch (error: any) {
    console.error('\n❌ Error al hacer la petición:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testInsert().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});






