#!/usr/bin/env tsx
/**
 * Script para encontrar propiedades con checklists finalizados
 * que tienen HTML generado y pueden ser accedidos públicamente
 */

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  console.log('🔍 Buscando propiedades con checklists finalizados...\n');

  const supabase = createAdminClient();

  try {
    // Buscar inspecciones completadas con pdf_url (que contiene la URL del HTML)
    const { data: inspections, error } = await supabase
      .from('property_inspections')
      .select('property_id, inspection_type, pdf_url, completed_at')
      .eq('inspection_status', 'completed')
      .not('pdf_url', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error al obtener inspecciones:', error);
      process.exit(1);
    }

    if (!inspections || inspections.length === 0) {
      console.log('⚠️ No se encontraron checklists finalizados con HTML generado.');
      console.log('💡 Necesitas finalizar un checklist primero para generar el HTML.\n');
      return;
    }

    console.log(`✅ Se encontraron ${inspections.length} checklists finalizados:\n`);

    inspections.forEach((inspection, index) => {
      const type = inspection.inspection_type === 'initial' ? 'initial' : 'final';
      const publicUrl = `https://dev.vistral.io/checklist-public/${inspection.property_id}/${type}`;
      
      console.log(`${index + 1}. Propiedad: ${inspection.property_id}`);
      console.log(`   Tipo: ${inspection.inspection_type === 'initial' ? 'Inicial' : 'Final'}`);
      console.log(`   Completado: ${inspection.completed_at ? new Date(inspection.completed_at).toLocaleString('es-ES') : 'N/A'}`);
      console.log(`   Link público: ${publicUrl}`);
      console.log(`   URL Storage: ${inspection.pdf_url?.substring(0, 80)}...`);
      console.log('');
    });

    // Mostrar el primer link como ejemplo
    if (inspections.length > 0) {
      const first = inspections[0];
      const type = first.inspection_type === 'initial' ? 'initial' : 'final';
      const publicUrl = `https://dev.vistral.io/checklist-public/${first.property_id}/${type}`;
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 LINK DE PRUEBA RECOMENDADO:');
      console.log(`   ${publicUrl}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

  } catch (error: any) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

main();


