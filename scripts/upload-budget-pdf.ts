/**
 * Script para subir un PDF de presupuesto a Supabase Storage y actualizar budget_pdf_url
 * Ejecutar con: npx tsx scripts/upload-budget-pdf.ts SP-TJP-JXR-005643 /ruta/al/archivo.pdf
 * O: npx tsx scripts/upload-budget-pdf.ts SP-TJP-JXR-005643
 * (si el archivo está en el directorio actual como "proxy-pdf (1) (1).pdf")
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { loadEnvConfig } from '@next/env';
import { resolve } from 'path';
import * as fs from 'fs';
import * as path from 'path';

// Cargar variables de entorno
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function uploadBudgetPDF(propertyId: string, pdfPath: string) {
  console.log(`📄 Subiendo PDF de presupuesto para la propiedad: ${propertyId}\n`);

  try {
    // 1. Verificar que el archivo existe
    if (!fs.existsSync(pdfPath)) {
      console.error(`❌ Error: El archivo no existe en: ${pdfPath}`);
      return false;
    }

    // 2. Leer el archivo PDF
    console.log(`📖 Leyendo archivo: ${pdfPath}`);
    const pdfBuffer = fs.readFileSync(pdfPath);
    const fileStats = fs.statSync(pdfPath);
    console.log(`✅ Archivo leído: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB\n`);

    // 3. Determinar el bucket (usar checklists que ya existe y se usa para PDFs)
    const BUCKET_NAME = 'checklists';
    const fileName = path.basename(pdfPath);
    // Usar un path específico para budgets dentro del bucket checklists
    const storagePath = `budgets/${propertyId}/${fileName}`;

    console.log(`📤 Subiendo a Supabase Storage...`);
    console.log(`   Bucket: ${BUCKET_NAME}`);
    console.log(`   Path: ${storagePath}\n`);

    // 4. Subir el PDF a Supabase Storage (usar admin client para evitar problemas de RLS)
    const supabase = createAdminClient();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Sobrescribir si ya existe
      });

    if (uploadError) {
      console.error('❌ Error al subir el PDF:', uploadError.message);
      
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket')) {
        console.error(`\n⚠️  El bucket '${BUCKET_NAME}' no existe.`);
        console.error(`   Por favor créalo en Supabase Dashboard → Storage → New bucket → Nombre: "${BUCKET_NAME}" → Público`);
      } else if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('RLS')) {
        console.error(`\n⚠️  Error de Row Level Security.`);
        console.error(`   Por favor ejecuta las políticas RLS para el bucket '${BUCKET_NAME}'`);
      }
      
      return false;
    }

    console.log(`✅ PDF subido exitosamente\n`);

    // 5. Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    console.log(`🔗 URL pública: ${publicUrl}\n`);

    // 6. Actualizar budget_pdf_url en la tabla properties
    console.log(`💾 Actualizando budget_pdf_url en Supabase...`);
    const { error: updateError } = await supabase
      .from('properties')
      .update({ budget_pdf_url: publicUrl })
      .eq('id', propertyId);

    if (updateError) {
      console.error('❌ Error al actualizar budget_pdf_url:', updateError.message);
      return false;
    }

    console.log(`✅ budget_pdf_url actualizado correctamente\n`);
    console.log(`✅ Proceso completado exitosamente!`);
    console.log(`\n📋 Resumen:`);
    console.log(`   Propiedad: ${propertyId}`);
    console.log(`   URL del PDF: ${publicUrl}`);
    console.log(`\n💡 Ahora puedes extraer las categorías usando el botón "Extraer información del PDF" en la propiedad.`);

    return true;

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    return false;
  }
}

// Obtener argumentos de línea de comandos
const propertyId = process.argv[2];
let pdfPath = process.argv[3];

if (!propertyId) {
  console.error('❌ Error: Debes proporcionar el ID de la propiedad');
  console.log('Uso: npx tsx scripts/upload-budget-pdf.ts SP-TJP-JXR-005643 /ruta/al/archivo.pdf');
  console.log('O: npx tsx scripts/upload-budget-pdf.ts SP-TJP-JXR-005643');
  console.log('   (si el archivo está en el directorio actual como "proxy-pdf (1) (1).pdf")');
  process.exit(1);
}

// Si no se proporciona la ruta, buscar el archivo en varias ubicaciones comunes
if (!pdfPath) {
  const possibleNames = [
    'proxy-pdf (1) (1).pdf',
    'proxy-pdf.pdf',
    'proxy-pdf(1)(1).pdf',
  ];
  
  const searchPaths = [
    process.cwd(), // Directorio actual del proyecto
    path.join(process.cwd(), '..'), // Directorio padre
    path.join(process.cwd(), '../..'), // Dos niveles arriba
    path.join(process.env.HOME || '', 'Desktop'), // Escritorio
    path.join(process.env.HOME || '', 'Downloads'), // Descargas
  ];
  
  let found = false;
  for (const searchPath of searchPaths) {
    for (const name of possibleNames) {
      const fullPath = path.resolve(searchPath, name);
      if (fs.existsSync(fullPath)) {
        pdfPath = fullPath;
        found = true;
        console.log(`✅ Archivo encontrado en: ${fullPath}\n`);
        break;
      }
    }
    if (found) break;
  }
  
  if (!pdfPath) {
    console.error('❌ Error: No se encontró el archivo PDF');
    console.log('Archivos buscados en:');
    searchPaths.forEach(sp => console.log(`   - ${sp}`));
    console.log('\nNombres buscados:');
    possibleNames.forEach(name => console.log(`   - ${name}`));
    console.log('\nPor favor proporciona la ruta completa al archivo PDF como segundo argumento:');
    console.log('   npx tsx scripts/upload-budget-pdf.ts SP-TJP-JXR-005643 "/ruta/completa/al/archivo.pdf"');
    process.exit(1);
  }
}

// Resolver la ruta absoluta
pdfPath = path.resolve(pdfPath);

uploadBudgetPDF(propertyId, pdfPath).then(success => {
  process.exit(success ? 0 : 1);
});
