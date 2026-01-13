#!/usr/bin/env tsx
/**
 * Script para verificar si un archivo HTML de checklist existe en Storage
 * Uso: tsx scripts/verify-checklist-file.ts <propertyId> <type>
 * Ejemplo: tsx scripts/verify-checklist-file.ts SP-TJP-JXR-005643 initial
 */

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  const propertyId = process.argv[2];
  const type = process.argv[3] || 'initial';

  if (!propertyId) {
    console.error('❌ Uso: tsx scripts/verify-checklist-file.ts <propertyId> <type>');
    console.error('   Ejemplo: tsx scripts/verify-checklist-file.ts SP-TJP-JXR-005643 initial');
    process.exit(1);
  }

  console.log(`🔍 Verificando archivo HTML del checklist...\n`);
  console.log(`   Property ID: ${propertyId}`);
  console.log(`   Tipo: ${type}\n`);

  const supabase = createAdminClient();

  // 1. Verificar bucket
  console.log('📦 Verificando bucket "checklists"...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('❌ Error listando buckets:', bucketsError.message);
    process.exit(1);
  }

  const checklistsBucket = buckets?.find(b => b.name === 'checklists');
  if (!checklistsBucket) {
    console.error('❌ Bucket "checklists" no encontrado');
    console.log('\n✅ Solución:');
    console.log('   1. Ve a Supabase Dashboard → Storage → Buckets');
    console.log('   2. Crea un bucket llamado "checklists"');
    console.log('   3. Márcalo como "Public bucket"');
    process.exit(1);
  }

  console.log(`✅ Bucket encontrado: ${checklistsBucket.name}`);
  console.log(`   Público: ${checklistsBucket.public ? 'Sí ✅' : 'No ❌'}`);
  
  if (!checklistsBucket.public) {
    console.log('\n⚠️  ADVERTENCIA: El bucket NO es público');
    console.log('   Esto puede causar errores 400/403 al acceder a los archivos');
    console.log('   Solución: Ve a Storage → checklists → Settings → Marca "Public bucket"');
  }

  // 2. Verificar archivo
  const filePath = `${propertyId}/${type}/checklist.html`;
  console.log(`\n📄 Verificando archivo: ${filePath}...`);

  const { data: files, error: listError } = await supabase.storage
    .from('checklists')
    .list(`${propertyId}/${type}`);

  if (listError) {
    console.error('❌ Error listando directorio:', listError.message);
    
    if (listError.message?.includes('not found') || listError.statusCode === '404') {
      console.log('\n⚠️  El directorio no existe');
      console.log('   Esto significa que el checklist no se ha finalizado o el archivo no se subió');
    }
    process.exit(1);
  }

  if (!files || files.length === 0) {
    console.log('❌ No se encontraron archivos en el directorio');
    console.log(`   Path: ${propertyId}/${type}/`);
    console.log('\n⚠️  El checklist puede no haber sido finalizado correctamente');
    process.exit(1);
  }

  console.log(`✅ Archivos encontrados en el directorio:`);
  files.forEach(file => {
    console.log(`   - ${file.name} (${file.metadata?.size || 0} bytes)`);
  });

  const htmlFile = files.find(f => f.name === 'checklist.html');
  if (!htmlFile) {
    console.log('\n❌ El archivo checklist.html NO existe');
    console.log(`   Path esperado: ${filePath}`);
    console.log('\n⚠️  El checklist puede no haber sido finalizado correctamente');
    process.exit(1);
  }

  console.log(`\n✅ Archivo checklist.html encontrado:`);
  console.log(`   Nombre: ${htmlFile.name}`);
  console.log(`   Tamaño: ${htmlFile.metadata?.size || 0} bytes`);
  console.log(`   Creado: ${htmlFile.created_at}`);
  console.log(`   Actualizado: ${htmlFile.updated_at}`);

  // 3. Intentar descargar el archivo
  console.log(`\n📥 Intentando descargar el archivo...`);
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('checklists')
    .download(filePath);

  if (downloadError) {
    console.error('❌ Error descargando archivo:', downloadError.message);
    console.error(`   Código: ${downloadError.statusCode}`);
    
    if (downloadError.message?.includes('row-level security') || downloadError.message?.includes('RLS')) {
      console.log('\n⚠️  Error de Row Level Security');
      console.log('   Solución: Ejecuta las políticas SQL en Supabase Dashboard → SQL Editor');
      console.log('   Ver: docs/SUPABASE_STORAGE_POLICIES.md');
    }
    process.exit(1);
  }

  if (fileData) {
    const htmlContent = await fileData.text();
    console.log(`✅ Archivo descargado exitosamente`);
    console.log(`   Tamaño del contenido: ${htmlContent.length} caracteres`);
    console.log(`   Primeros 100 caracteres: ${htmlContent.substring(0, 100)}...`);
  }

  // 4. Generar URL pública
  const { data: publicUrlData } = supabase.storage
    .from('checklists')
    .getPublicUrl(filePath);

  console.log(`\n🔗 URL pública:`);
  console.log(`   ${publicUrlData.publicUrl}`);

  console.log(`\n✅ Verificación completada exitosamente!`);
}

main().catch((error) => {
  console.error('❌ Error inesperado:', error);
  process.exit(1);
});
