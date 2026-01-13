#!/usr/bin/env tsx
/**
 * Script para verificar y regenerar el checklist HTML de una propiedad
 * 
 * Uso: tsx scripts/verify-and-regenerate-checklist.ts SP-NIU-O3C-005809 initial
 */

import { loadEnvConfig } from '@next/env';
import { createClient } from '../lib/supabase/client';
import { createAdminClient } from '../lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const propertyId = process.argv[2];
const checklistTypeArg = process.argv[3] || 'initial'; // 'initial' o 'final'

if (!propertyId) {
  console.error('❌ Debes proporcionar un Property ID');
  console.log('\nUso:');
  console.log('  tsx scripts/verify-and-regenerate-checklist.ts SP-NIU-O3C-005809 initial');
  process.exit(1);
}

const checklistType = checklistTypeArg === 'initial' ? 'reno_initial' : 'reno_final';
const inspectionType = checklistTypeArg === 'initial' ? 'initial' : 'final';

async function main() {
  console.log(`🔍 Verificando checklist para propiedad: ${propertyId} (${checklistTypeArg})\n`);

  const supabase = createClient();
  const adminSupabase = createAdminClient();

  // 1. Verificar si existe la propiedad
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id, address, bedrooms, bathrooms, "Renovator name"')
    .eq('id', propertyId)
    .single();

  if (propertyError || !property) {
    console.error(`❌ Propiedad no encontrada: ${propertyError?.message || 'No existe'}`);
    process.exit(1);
  }

  console.log(`✅ Propiedad encontrada: ${property.address || propertyId}\n`);

  // 2. Verificar si existe una inspección completada
  const { data: inspection, error: inspectionError } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, inspection_status, pdf_url, completed_at')
    .eq('property_id', propertyId)
    .eq('inspection_type', inspectionType)
    .eq('inspection_status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inspectionError) {
    console.error(`❌ Error buscando inspección: ${inspectionError.message}`);
    process.exit(1);
  }

  if (!inspection) {
    console.log(`⚠️  No se encontró una inspección completada de tipo "${inspectionType}"`);
    console.log(`   El checklist HTML solo se genera cuando se completa una inspección.`);
    console.log(`   Por favor, completa el checklist primero en la aplicación.\n`);
    process.exit(1);
  }

  console.log(`✅ Inspección encontrada:`);
  console.log(`   ID: ${inspection.id}`);
  console.log(`   Tipo: ${inspection.inspection_type}`);
  console.log(`   Estado: ${inspection.inspection_status}`);
  console.log(`   PDF URL: ${inspection.pdf_url || 'No configurada'}\n`);

  // 3. Verificar si el archivo existe en Storage
  const storagePath = `${propertyId}/${checklistTypeArg}/checklist.html`;
  console.log(`🔍 Verificando archivo en Storage: ${storagePath}...`);

  const { data: files, error: listError } = await adminSupabase.storage
    .from('checklists')
    .list(`${propertyId}/${checklistTypeArg}`, {
      limit: 1,
      search: 'checklist.html'
    });

  const fileExists = !listError && files && files.length > 0;

  if (fileExists) {
    console.log(`✅ Archivo existe en Storage\n`);
    
    // Obtener URL pública
    const { data: publicUrlData } = adminSupabase.storage
      .from('checklists')
      .getPublicUrl(storagePath);

    if (publicUrlData?.publicUrl) {
      console.log(`📄 URL pública: ${publicUrlData.publicUrl}\n`);
      
      // Verificar que la URL sea accesible
      try {
        const response = await fetch(publicUrlData.publicUrl);
        if (response.ok) {
          console.log(`✅ El archivo es accesible públicamente\n`);
        } else {
          console.log(`⚠️  El archivo existe pero no es accesible (${response.status})\n`);
        }
      } catch (error: any) {
        console.log(`⚠️  Error verificando accesibilidad: ${error.message}\n`);
      }
    }
  } else {
    console.log(`❌ Archivo NO existe en Storage\n`);
    console.log(`💡 Necesitas regenerar el checklist HTML.`);
    console.log(`   Puedes usar el endpoint: POST /api/regenerate-checklist-html`);
    console.log(`   O ejecutar: npm run generate:checklist-html -- ${propertyId} ${checklistTypeArg}\n`);
  }

  // 4. Verificar que la URL en la BD coincida con Storage
  if (inspection.pdf_url) {
    const expectedUrl = `https://kqqobbxjyrdputngvxrf.supabase.co/storage/v1/object/public/checklists/${storagePath}`;
    
    if (inspection.pdf_url === expectedUrl) {
      console.log(`✅ La URL en la BD coincide con Storage\n`);
    } else {
      console.log(`⚠️  La URL en la BD no coincide:`);
      console.log(`   BD: ${inspection.pdf_url}`);
      console.log(`   Esperada: ${expectedUrl}\n`);
      
      if (fileExists) {
        console.log(`💡 Actualizando URL en la BD...`);
        const { error: updateError } = await supabase
          .from('property_inspections')
          .update({ pdf_url: expectedUrl })
          .eq('id', inspection.id);

        if (updateError) {
          console.error(`❌ Error actualizando URL: ${updateError.message}\n`);
        } else {
          console.log(`✅ URL actualizada en la BD\n`);
        }
      }
    }
  } else if (fileExists) {
    console.log(`💡 Actualizando URL en la BD...`);
    const { data: publicUrlData } = adminSupabase.storage
      .from('checklists')
      .getPublicUrl(storagePath);

    if (publicUrlData?.publicUrl) {
      const { error: updateError } = await supabase
        .from('property_inspections')
        .update({ pdf_url: publicUrlData.publicUrl })
        .eq('id', inspection.id);

      if (updateError) {
        console.error(`❌ Error actualizando URL: ${updateError.message}\n`);
      } else {
        console.log(`✅ URL guardada en la BD: ${publicUrlData.publicUrl}\n`);
      }
    }
  }

  console.log(`\n📋 Resumen:`);
  console.log(`   Propiedad: ${property.address || propertyId}`);
  console.log(`   Inspección: ${inspection.id} (${inspection.inspection_type})`);
  console.log(`   Archivo en Storage: ${fileExists ? '✅ Existe' : '❌ No existe'}`);
  console.log(`   URL en BD: ${inspection.pdf_url ? '✅ Configurada' : '❌ No configurada'}`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

