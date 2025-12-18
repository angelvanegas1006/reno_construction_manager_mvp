#!/usr/bin/env tsx
/**
 * Script para verificar si los archivos HTML de checklists realmente existen en Storage
 */

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  console.log('🔍 Verificando archivos HTML en Storage...\n');

  const supabase = createAdminClient();

  try {
    // Buscar inspecciones completadas con pdf_url
    const { data: inspections, error } = await supabase
      .from('property_inspections')
      .select('property_id, inspection_type, pdf_url, completed_at')
      .eq('inspection_status', 'completed')
      .not('pdf_url', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error al obtener inspecciones:', error);
      process.exit(1);
    }

    if (!inspections || inspections.length === 0) {
      console.log('⚠️ No se encontraron checklists finalizados.');
      return;
    }

    console.log(`📋 Verificando ${inspections.length} checklists...\n`);

    const validChecklists: any[] = [];

    for (const inspection of inspections) {
      const type = inspection.inspection_type === 'initial' ? 'initial' : 'final';
      const path = `${inspection.property_id}/${type}/checklist.html`;
      
      // Verificar si el archivo existe en Storage
      const { data: files, error: listError } = await supabase.storage
        .from('checklists')
        .list(`${inspection.property_id}/${type}`, {
          limit: 1,
          search: 'checklist.html'
        });

      const exists = !listError && files && files.length > 0;

      console.log(`📄 ${inspection.property_id} (${type}):`);
      console.log(`   Existe en Storage: ${exists ? '✅' : '❌'}`);
      console.log(`   PDF URL en BD: ${inspection.pdf_url?.substring(0, 80)}...`);
      
      if (exists) {
        const publicUrl = `https://dev.vistral.io/checklist-public/${inspection.property_id}/${type}`;
        validChecklists.push({
          propertyId: inspection.property_id,
          type,
          publicUrl
        });
        console.log(`   ✅ Link público: ${publicUrl}`);
      } else {
        console.log(`   ⚠️ Archivo no encontrado en Storage`);
      }
      console.log('');
    }

    if (validChecklists.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ CHECKLISTS VÁLIDOS ENCONTRADOS: ${validChecklists.length}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      validChecklists.forEach((checklist, index) => {
        console.log(`${index + 1}. ${checklist.publicUrl}`);
      });
      
      console.log('\n📋 LINK DE PRUEBA RECOMENDADO:');
      console.log(`   ${validChecklists[0].publicUrl}\n`);
    } else {
      console.log('⚠️ No se encontraron checklists con archivos HTML válidos en Storage.');
      console.log('💡 Necesitas finalizar un checklist para generar el HTML.\n');
    }

  } catch (error: any) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

main();




