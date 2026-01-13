#!/usr/bin/env tsx
/**
 * Script para generar HTML de checklist para una propiedad existente
 * Uso: npx tsx scripts/generate-checklist-html.ts SP-V4P-KDH-005658 initial
 */

import { createAdminClient } from '../lib/supabase/admin';
import { generateChecklistHTML } from '../lib/html/checklist-html-generator';
import { translations } from '../lib/i18n/translations';
import { convertSupabaseToChecklist } from '../lib/supabase/checklist-converter';
import * as fs from 'fs';

async function main() {
  const propertyId = process.argv[2];
  const checklistTypeArg = process.argv[3] || 'initial';

  if (!propertyId) {
    console.error('❌ Por favor proporciona un Property ID');
    console.error('   Uso: npx tsx scripts/generate-checklist-html.ts SP-V4P-KDH-005658 initial');
    process.exit(1);
  }

  const checklistType = checklistTypeArg === 'initial' ? 'reno_initial' : 'reno_final';
  const inspectionType = checklistTypeArg === 'initial' ? 'initial' : 'final';

  console.log(`🔍 Generando HTML para propiedad ${propertyId} (${checklistTypeArg})...\n`);

  const supabase = createAdminClient();

  try {
    // 1. Obtener la propiedad
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
      console.error('❌ Error obteniendo propiedad:', propError?.message);
      process.exit(1);
    }

    console.log(`✅ Propiedad encontrada: ${property.address || propertyId}`);

    // 2. Obtener la inspección
    const { data: inspection, error: inspError } = await supabase
      .from('property_inspections')
      .select('id, inspection_type, inspection_status')
      .eq('property_id', propertyId)
      .eq('inspection_type', inspectionType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inspError) {
      console.error('❌ Error obteniendo inspección:', inspError.message);
      process.exit(1);
    }

    if (!inspection) {
      console.error(`❌ No se encontró inspección ${inspectionType} para esta propiedad`);
      process.exit(1);
    }

    console.log(`✅ Inspección encontrada: ${inspection.id}`);

    // 3. Obtener zonas y elementos
    const { data: zones, error: zonesError } = await supabase
      .from('inspection_zones')
      .select('*')
      .eq('inspection_id', inspection.id)
      .order('created_at', { ascending: true });

    if (zonesError) {
      console.error('❌ Error obteniendo zonas:', zonesError.message);
      process.exit(1);
    }

    // Obtener elementos a través de las zonas
    const zoneIds = zones?.map(z => z.id) || [];
    const { data: elements, error: elementsError } = await supabase
      .from('inspection_elements')
      .select('*')
      .in('zone_id', zoneIds.length > 0 ? zoneIds : ['00000000-0000-0000-0000-000000000000']); // Usar un UUID inválido si no hay zonas para evitar error

    if (elementsError) {
      console.error('❌ Error obteniendo elementos:', elementsError.message);
      process.exit(1);
    }

    console.log(`✅ Datos obtenidos: ${zones?.length || 0} zonas, ${elements?.length || 0} elementos`);

    // 4. Convertir a formato ChecklistData
    const checklistData = convertSupabaseToChecklist(
      zones || [],
      elements || [],
      property.bedrooms || null,
      property.bathrooms || null
    );

    const fullChecklist = {
      propertyId,
      checklistType,
      sections: checklistData.sections || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 5. Generar HTML
    console.log('\n📄 Generando HTML...');
    const htmlContent = await generateChecklistHTML(
      fullChecklist,
      {
        address: property.address || propertyId,
        propertyId,
        renovatorName: property['Renovator name'] || undefined,
      },
      translations.es
    );

    // 6. Subir a Storage
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
    const storagePath = `${propertyId}/${checklistTypeArg}/checklist.html`;

    console.log(`📤 Subiendo HTML a Storage: ${storagePath}...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('checklists')
      .upload(storagePath, htmlBuffer, {
        contentType: 'text/html',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Error subiendo HTML:', uploadError.message);
      process.exit(1);
    }

    // 7. Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('checklists')
      .getPublicUrl(uploadData.path);

    const htmlUrl = publicUrlData.publicUrl;
    console.log(`✅ HTML subido: ${htmlUrl}`);

    // 8. Actualizar inspección con URL
    const { error: updateError } = await supabase
      .from('property_inspections')
      .update({ pdf_url: htmlUrl })
      .eq('id', inspection.id);

    if (updateError) {
      console.error('⚠️ Error actualizando inspección:', updateError.message);
    } else {
      console.log('✅ URL del HTML guardada en inspección');
    }

    // 9. Generar link público
    const publicUrl = `https://dev.vistral.io/checklist-public/${propertyId}/${checklistTypeArg}`;
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ HTML GENERADO EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 Link público: ${publicUrl}`);
    console.log(`📄 URL Storage: ${htmlUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 10. Guardar localmente también
    const localPath = `./test-html-${propertyId}-${checklistTypeArg}-${Date.now()}.html`;
    fs.writeFileSync(localPath, htmlBuffer);
    console.log(`💾 HTML guardado localmente en: ${localPath}\n`);

  } catch (error: any) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

main();





