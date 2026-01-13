import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { convertSupabaseToChecklist } from '@/lib/supabase/checklist-converter';
import { ChecklistData } from '@/lib/checklist-storage';
import { generateChecklistPDF } from '@/lib/pdf/checklist-pdf-generator';
import { translations } from '@/lib/i18n/translations';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Cargar variables de entorno
const projectDir = process.cwd();
loadEnvConfig(projectDir);
dotenv.config({ path: path.join(projectDir, '.env.local') });
dotenv.config({ path: path.join(projectDir, '.env') });

async function testPDFGeneration() {
  const supabase = createAdminClient();
  
  // Buscar propiedad por ID único
  const propertyUniqueId = 'SP-V4P-KDH-005658';
  
  console.log(`🔍 Buscando propiedad con ID: ${propertyUniqueId}`);
  
  // Buscar por Unique ID From Engagements primero
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('id, address, "Unique ID From Engagements", "Renovator name", bedrooms, bathrooms')
    .or(`"Unique ID From Engagements".eq.${propertyUniqueId},id.eq.${propertyUniqueId}`)
    .single();

  if (propertyError || !property) {
    console.error('❌ Propiedad no encontrada:', propertyError);
    return;
  }

  console.log('✅ Propiedad encontrada:', {
    id: property.id,
    address: property.address,
    uniqueId: property['Unique ID From Engagements'],
  });

  const propertyId = property.id;

  // Buscar inspecciones completadas
  console.log('\n🔍 Buscando inspecciones completadas...');
  
  const { data: inspections, error: inspectionsError } = await supabase
    .from('property_inspections')
    .select('id, inspection_status, completed_at, pdf_url')
    .eq('property_id', propertyId)
    .eq('inspection_status', 'completed')
    .order('completed_at', { ascending: false });

  if (inspectionsError) {
    console.error('❌ Error buscando inspecciones:', inspectionsError);
    return;
  }

  if (!inspections || inspections.length === 0) {
    console.log('⚠️ No se encontraron inspecciones completadas. Buscando cualquier inspección...');
    
    const { data: allInspections } = await supabase
      .from('property_inspections')
      .select('id, inspection_status, completed_at, pdf_url')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (allInspections && allInspections.length > 0) {
      console.log('📋 Inspecciones encontradas:');
      allInspections.forEach((insp, idx) => {
        console.log(`  ${idx + 1}. ID: ${insp.id}, Status: ${insp.inspection_status}, Completed: ${insp.completed_at || 'No'}, PDF: ${insp.pdf_url || 'No'}`);
      });
      
      // Usar la primera inspección aunque no esté completada
      const inspection = allInspections[0];
      console.log(`\n📄 Usando inspección: ${inspection.id}`);
      
      // Cargar zonas y elementos
      const { data: zones } = await supabase
        .from('inspection_zones')
        .select('*')
        .eq('inspection_id', inspection.id);

      const { data: elements } = await supabase
        .from('inspection_elements')
        .select('*')
        .in('zone_id', zones?.map(z => z.id) || []);

      if (zones && elements && zones.length > 0 && elements.length > 0) {
        console.log(`✅ Encontradas ${zones.length} zonas y ${elements.length} elementos`);
        
        // Determinar tipo de checklist basado en zonas
        const hasInitialZones = zones.some(z => z.zone_type === 'entorno-zonas-comunes' || z.zone_type === 'estado-general');
        const checklistType: 'reno_initial' | 'reno_final' = hasInitialZones ? 'reno_initial' : 'reno_final';
        
        console.log(`📋 Tipo de checklist detectado: ${checklistType}`);
        
        // Convertir a formato ChecklistData
        const checklistData = convertSupabaseToChecklist(
          zones,
          elements,
          property.bedrooms,
          property.bathrooms
        );

        // Crear ChecklistData completo
        const fullChecklist: ChecklistData = {
          propertyId,
          checklistType,
          sections: checklistData.sections || {},
          completedAt: inspection.completed_at || new Date().toISOString(),
          createdAt: checklistData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        console.log(`\n📊 Checklist convertido:`, {
          sectionsCount: Object.keys(fullChecklist.sections).length,
          sections: Object.keys(fullChecklist.sections),
        });

        // Generar y subir PDF
        try {
          console.log('\n📄 Generando PDF...');
          
          // Generar PDF
          const pdfBlob = await generateChecklistPDF(
            fullChecklist,
            {
              address: property.address || propertyId,
              propertyId,
              renovatorName: property['Renovator name'] || undefined,
            },
            translations.es
          );
          
          // Convertir blob a Buffer para Node.js
          const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
          
          // Subir a Supabase Storage usando admin client
          const checklistTypeForPath = checklistType === 'reno_initial' ? 'initial' : 'final';
          const storagePath = `${propertyId}/${checklistTypeForPath}/checklist.pdf`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('checklists')
            .upload(storagePath, pdfBuffer, {
              contentType: 'application/pdf',
              upsert: true,
            });
          
          if (uploadError) {
            throw uploadError;
          }
          
          // Obtener URL pública
          const { data: publicUrlData } = supabase.storage
            .from('checklists')
            .getPublicUrl(uploadData.path);
          
          const pdfUrl = publicUrlData.publicUrl;
          console.log(`✅ PDF generado y subido: ${pdfUrl}`);

          // Actualizar inspección con URL del PDF
          const { error: updateError } = await supabase
            .from('property_inspections')
            .update({ pdf_url: pdfUrl })
            .eq('id', inspection.id);

          if (updateError) {
            console.error('❌ Error actualizando inspección:', updateError);
          } else {
            console.log('✅ URL del PDF guardada en inspección');
          }

          // Si la inspección no está completada, completarla primero
          if (inspection.inspection_status !== 'completed') {
            console.log('\n🔄 Completando inspección...');
            const { error: completeError } = await supabase
              .from('property_inspections')
              .update({ 
                inspection_status: 'completed',
                completed_at: new Date().toISOString(),
              })
              .eq('id', inspection.id);

            if (completeError) {
              console.error('❌ Error completando inspección:', completeError);
            } else {
              console.log('✅ Inspección completada');
            }
          }

          // Guardar PDF localmente también para fácil acceso
          const localPath = `./test-pdf-${propertyId}-${Date.now()}.pdf`;
          fs.writeFileSync(localPath, pdfBuffer);
          console.log(`💾 PDF guardado localmente en: ${localPath}`);
          
          // Nota: Airtable se actualizará automáticamente cuando se complete el checklist desde la app

          console.log(`\n✅ Proceso completado!`);
          console.log(`📄 URL del PDF: ${pdfUrl}`);
          console.log(`🔗 Link para ver en la app: /reno/construction-manager/property/${propertyId}/checklist/pdf?type=${checklistType}`);
          
        } catch (pdfError: any) {
          console.error('❌ Error generando PDF:', pdfError);
          console.error('Stack:', pdfError.stack);
        }
      } else {
        console.log('⚠️ No se encontraron zonas o elementos para esta inspección');
      }
    } else {
      console.log('❌ No se encontraron inspecciones para esta propiedad');
    }
    return;
  }

  console.log(`✅ Encontradas ${inspections.length} inspecciones completadas`);
  
  // Usar la primera inspección completada
  const inspection = inspections[0];
  console.log(`\n📄 Usando inspección: ${inspection.id}`);
  console.log(`   PDF actual: ${inspection.pdf_url || 'No tiene'}`);

  // Cargar zonas y elementos
  const { data: zones } = await supabase
    .from('inspection_zones')
    .select('*')
    .eq('inspection_id', inspection.id);

  const { data: elements } = await supabase
    .from('inspection_elements')
    .select('*')
    .in('zone_id', zones?.map(z => z.id) || []);

  if (!zones || !elements || zones.length === 0 || elements.length === 0) {
    console.log('❌ No se encontraron zonas o elementos');
    return;
  }

  console.log(`✅ Encontradas ${zones.length} zonas y ${elements.length} elementos`);

  // Determinar tipo de checklist
  const hasInitialZones = zones.some(z => z.zone_type === 'entorno-zonas-comunes' || z.zone_type === 'estado-general');
  const checklistType: 'reno_initial' | 'reno_final' = hasInitialZones ? 'reno_initial' : 'reno_final';
  
  console.log(`📋 Tipo de checklist detectado: ${checklistType}`);

  // Convertir a formato ChecklistData
  const checklistData = convertSupabaseToChecklist(
    zones,
    elements,
    property.bedrooms,
    property.bathrooms
  );

  // Crear ChecklistData completo
  const fullChecklist: ChecklistData = {
    propertyId,
    checklistType,
    sections: checklistData.sections || {},
    completedAt: inspection.completed_at || new Date().toISOString(),
    createdAt: checklistData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log(`\n📊 Checklist convertido:`, {
    sectionsCount: Object.keys(fullChecklist.sections).length,
    sections: Object.keys(fullChecklist.sections),
  });

  // Generar y subir HTML estático
  try {
    console.log('\n📄 Generando HTML estático...');
    
    // Importar el generador de HTML
    const { generateChecklistHTML } = await import('../lib/html/checklist-html-generator');
    
    // Generar HTML
    const htmlContent = await generateChecklistHTML(
      fullChecklist,
      {
        address: property.address || propertyId,
        propertyId,
        renovatorName: property['Renovator name'] || undefined,
      },
      translations.es
    );
    
    // Convertir HTML a Buffer para Node.js
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
    
    // Subir a Supabase Storage usando admin client
    const checklistTypeForPath = checklistType === 'reno_initial' ? 'initial' : 'final';
    const storagePath = `${propertyId}/${checklistTypeForPath}/checklist.html`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('checklists')
      .upload(storagePath, htmlBuffer, {
        contentType: 'text/html',
        upsert: true,
      });
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('checklists')
      .getPublicUrl(uploadData.path);
    
    const htmlUrl = publicUrlData.publicUrl;
    console.log(`✅ HTML generado y subido: ${htmlUrl}`);

    // Actualizar inspección con URL del HTML (mantenemos el campo pdf_url por compatibilidad)
    const { error: updateError } = await supabase
      .from('property_inspections')
      .update({ pdf_url: htmlUrl })
      .eq('id', inspection.id);

    if (updateError) {
      console.error('❌ Error actualizando inspección:', updateError);
    } else {
      console.log('✅ URL del HTML guardada en inspección');
    }

    // Guardar HTML localmente también para fácil acceso
    const localPath = `./test-html-${propertyId}-${Date.now()}.html`;
    fs.writeFileSync(localPath, htmlBuffer);
    console.log(`💾 HTML guardado localmente en: ${localPath}`);
    
    // Nota: Airtable se actualizará automáticamente cuando se complete el checklist desde la app

    console.log(`\n✅ Proceso completado!`);
    console.log(`📄 URL del HTML: ${htmlUrl}`);
    console.log(`🔗 Link para ver en la app: /reno/construction-manager/property/${propertyId}/checklist/pdf?type=${checklistType}`);
    
  } catch (htmlError: any) {
    console.error('❌ Error generando HTML:', htmlError);
    console.error('Stack:', htmlError.stack);
  }
}

testPDFGeneration().catch(console.error);

