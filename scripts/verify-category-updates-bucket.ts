/**
 * Script para verificar que el bucket category-updates existe y está configurado correctamente
 * Ejecutar con: npx tsx scripts/verify-category-updates-bucket.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyBucket() {
  console.log('🔍 Verificando bucket category-updates...\n');

  try {
    // Intentar listar buckets (puede requerir permisos especiales)
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.log('⚠️  No se pudo listar buckets (puede requerir permisos especiales)');
      console.log('   Error:', listError.message);
      console.log('\n📝 Verificación alternativa: Intentando subir un archivo de prueba...\n');
      
      // Intentar subir un archivo de prueba
      const testFile = new Blob(['test'], { type: 'text/plain' });
      const testPath = 'test-verification.txt';
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('category-updates')
        .upload(testPath, testFile, {
          contentType: 'text/plain',
          upsert: true,
        });
      
      if (uploadError) {
        console.error('❌ Error al subir archivo de prueba:', uploadError.message);
        console.error('\n📋 Posibles causas:');
        console.error('   1. El bucket "category-updates" no existe');
        console.error('   2. El nombre del bucket no coincide exactamente');
        console.error('   3. Falta permisos para escribir en el bucket');
        console.error('\n✅ Solución:');
        console.error('   1. Ve a Supabase Dashboard → Storage');
        console.error('   2. Crea un bucket llamado exactamente: category-updates');
        console.error('   3. Márcalo como "Public bucket"');
        console.error('   4. Verifica las políticas de acceso');
        return false;
      }
      
      // Si la subida funcionó, eliminar el archivo de prueba
      await supabase.storage.from('category-updates').remove([testPath]);
      console.log('✅ Bucket encontrado y funcionando correctamente!');
      return true;
    }
    
    // Si pudimos listar buckets, buscar el nuestro
    const bucket = buckets?.find(b => b.name === 'category-updates');
    
    if (!bucket) {
      console.error('❌ Bucket "category-updates" no encontrado');
      console.log('\n📋 Buckets disponibles:');
      buckets?.forEach(b => {
        console.log(`   - ${b.name} (${b.public ? 'Público' : 'Privado'})`);
      });
      console.log('\n✅ Solución:');
      console.log('   1. Ve a Supabase Dashboard → Storage');
      console.log('   2. Crea un bucket llamado exactamente: category-updates');
      console.log('   3. Márcalo como "Public bucket"');
      return false;
    }
    
    console.log('✅ Bucket encontrado:');
    console.log(`   Nombre: ${bucket.name}`);
    console.log(`   Público: ${bucket.public ? 'Sí ✅' : 'No ❌'}`);
    console.log(`   Creado: ${bucket.created_at}`);
    
    if (!bucket.public) {
      console.log('\n⚠️  ADVERTENCIA: El bucket no está marcado como público');
      console.log('   Las imágenes pueden no ser accesibles en los emails');
      console.log('\n✅ Solución:');
      console.log('   1. Ve a Supabase Dashboard → Storage → category-updates');
      console.log('   2. Edita el bucket y marca "Public bucket"');
    }
    
    // Intentar subir un archivo de prueba
    console.log('\n🧪 Probando subida de archivo...');
    const testFile = new Blob(['test'], { type: 'text/plain' });
    const testPath = 'test-verification.txt';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('category-updates')
      .upload(testPath, testFile, {
        contentType: 'text/plain',
        upsert: true,
      });
    
    if (uploadError) {
      console.error('❌ Error al subir archivo de prueba:', uploadError.message);
      console.error('\n📋 Posibles causas:');
      console.error('   1. Falta permisos para escribir en el bucket');
      console.error('   2. Las políticas de acceso no están configuradas correctamente');
      return false;
    }
    
    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('category-updates')
      .getPublicUrl(testPath);
    
    console.log('✅ Subida exitosa!');
    console.log(`   URL pública: ${publicUrl}`);
    
    // Eliminar archivo de prueba
    await supabase.storage.from('category-updates').remove([testPath]);
    console.log('✅ Archivo de prueba eliminado');
    
    console.log('\n✅ Todo está configurado correctamente!');
    return true;
    
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    return false;
  }
}

verifyBucket().then(success => {
  process.exit(success ? 0 : 1);
});
