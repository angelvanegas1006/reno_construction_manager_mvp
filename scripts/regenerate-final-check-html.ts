#!/usr/bin/env tsx
/**
 * Script para regenerar el HTML del final check de una propiedad
 * Uso: npx tsx scripts/regenerate-final-check-html.ts SP-V4P-KDH-005658
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';

loadEnvConfig(process.cwd());
import { generateChecklistHTML } from '../lib/html/checklist-html-generator';
import { translations } from '../lib/i18n/translations';
import { convertSupabaseToChecklist } from '../lib/supabase/checklist-converter';

async function main() {
  const propertyId = process.argv[2] || 'SP-V4P-KDH-005658';
  const checklistType = 'reno_final';
  const inspectionType = 'final';

  console.log(`🔍 Regenerando HTML del final check para propiedad ${propertyId}...\n`);

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

    // 2. Obtener la inspección del tipo correcto
    const { data: inspection, error: inspectionError } = await supabase
      .from('property_inspections')
      .select('id, inspection_type, inspection_status')
      .eq('property_id', propertyId)
      .eq('inspection_type', inspectionType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inspectionError) {
      console.error('❌ Error obteniendo inspección:', inspectionError.message);
      process.exit(1);
    }

    if (!inspection) {
      console.error(`❌ No se encontró inspección del tipo ${inspectionType} para esta propiedad`);
      process.exit(1);
    }

    console.log(`✅ Inspección encontrada:`, {
      id: inspection.id,
      inspection_type: inspection.inspection_type,
      inspection_status: inspection.inspection_status,
    });

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

    const zoneIds = zones?.map(z => z.id) || [];
    const { data: elements, error: elementsError } = await supabase
      .from('inspection_elements')
      .select('*')
      .in('zone_id', zoneIds.length > 0 ? zoneIds : ['00000000-0000-0000-0000-000000000000']);

    if (elementsError) {
      console.error('❌ Error obteniendo elementos:', elementsError.message);
      process.exit(1);
    }

    console.log(`✅ Datos obtenidos: ${zones?.length || 0} zonas, ${elements?.length || 0} elementos`);

    let fullChecklist: any;

    if (elements && elements.length > 0) {
      // 4a. Hay elementos: convertir desde Supabase
      const checklistData = convertSupabaseToChecklist(
        zones || [],
        elements,
        property.bedrooms || null,
        property.bathrooms || null
      );
      fullChecklist = {
        propertyId,
        checklistType,
        sections: checklistData.sections || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      // 4b. Sin elementos: intentar recuperar fotos desde Storage
      console.log('\n⚠️ 0 elementos en BD. Buscando fotos en Storage...');
      const basePath = `${propertyId}/${inspection.id}`;
      const { data: storageFiles } = await supabase.storage
        .from('inspection-images')
        .list(basePath, { limit: 500 });

      const SECTION_TO_ZONE: Record<string, string> = {
        entorno: 'entorno-zonas-comunes',
        distribucion: 'estado-general',
        entrada: 'entrada-pasillos',
        dormitorio: 'habitaciones',
        salon: 'salon',
        bano: 'banos',
        cocina: 'cocina',
        exterior: 'exteriores',
      };

      const sections: Record<string, any> = {};
      let totalPhotos = 0;

      if (storageFiles?.length) {
        for (const item of storageFiles) {
          if (item.id && item.name) {
            const zoneId = item.name;
            const zone = zones?.find((z: any) => z.id === zoneId);
            const zoneType = zone?.zone_type || 'entorno';
            const sectionId = SECTION_TO_ZONE[zoneType] || 'entorno-zonas-comunes';

            const { data: zoneFiles } = await supabase.storage
              .from('inspection-images')
              .list(`${basePath}/${zoneId}`, { limit: 200 });

            const photos: { data: string }[] = [];
            if (zoneFiles) {
              for (const f of zoneFiles) {
                if (f.name && /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name)) {
                  const { data: urlData } = supabase.storage
                    .from('inspection-images')
                    .getPublicUrl(`${basePath}/${zoneId}/${f.name}`);
                  photos.push({ data: urlData.publicUrl });
                  totalPhotos++;
                }
              }
            }

            if (photos.length > 0) {
              if (!sections[sectionId]) {
                sections[sectionId] = { id: sectionId, uploadZones: [], questions: [], dynamicItems: [] };
              }
              const uploadZone = {
                id: `fotos-${zoneId}`,
                photos: photos.map(p => ({ id: crypto.randomUUID(), name: 'photo', size: 0, type: 'image/jpeg', data: p.data, uploadedAt: new Date().toISOString() })),
                videos: [],
              };
              if (sectionId === 'habitaciones' || sectionId === 'banos') {
                const idx = (sections[sectionId].dynamicItems?.length || 0) + 1;
                sections[sectionId].dynamicItems = sections[sectionId].dynamicItems || [];
                sections[sectionId].dynamicItems.push({ id: `${sectionId}-${idx}`, uploadZone, questions: [] });
              } else {
                sections[sectionId].uploadZones = sections[sectionId].uploadZones || [];
                sections[sectionId].uploadZones.push(uploadZone);
              }
            }
          }
        }
      }

      if (totalPhotos > 0) {
        console.log(`✅ Recuperadas ${totalPhotos} fotos desde Storage`);
      } else {
        console.log('⚠️ No hay fotos en Storage. Se generará HTML vacío.');
      }

      fullChecklist = {
        propertyId,
        checklistType,
        sections,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // 5. Generar HTML
    console.log('\n📄 Generando HTML...');
    const htmlContent = await generateChecklistHTML(
      fullChecklist,
      {
        address: property.address || propertyId,
        propertyId,
        renovatorName: property['Renovator name'] || undefined,
      },
      translations.es,
      'final'
    );

    // 6. Subir a Storage
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
    const storagePath = `${propertyId}/final/checklist.html`;

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

    console.log('\n✅ HTML del final check regenerado exitosamente!');
    console.log(`   URL: ${htmlUrl}`);
  } catch (error: any) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

main();


