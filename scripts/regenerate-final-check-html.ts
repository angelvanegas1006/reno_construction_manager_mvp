#!/usr/bin/env tsx
/**
 * Script para regenerar el HTML del final check de una propiedad y opcionalmente enviar a Airtable.
 * Uso:
 *   Por ID:    npx tsx scripts/regenerate-final-check-html.ts SP-V4P-KDH-005658
 *   Por dirección: npx tsx scripts/regenerate-final-check-html.ts "Tr. Toledo 4 Es:1 Pl:02 Pt:E, Camarena, Toledo"
 *   Con sync:  npx tsx scripts/regenerate-final-check-html.ts "dirección o id" --sync-airtable
 *
 * IMPORTANTE: Cargar .env antes de cualquier import que use Supabase/Airtable.
 * No importar desde lib/airtable/initial-check-sync porque arrastra "use client" y lib/supabase/client.ts,
 * que exige variables del navegador y falla al ejecutar el script con tsx.
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createAdminClient } from '../lib/supabase/admin';
import Airtable from 'airtable';
import { generateChecklistHTML } from '../lib/html/checklist-html-generator';
import { translations } from '../lib/i18n/translations';
import { convertSupabaseToChecklist } from '../lib/supabase/checklist-converter';
import { findTransactionsRecordIdByUniqueId } from '../lib/airtable/transactions-lookup';

/** URL pública del selector Initial/Final (misma lógica que initial-check-sync, sin importar ese módulo). */
function getChecklistPublicSelectorUrl(propertyId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://dev.vistral.io';
  const publicBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  return `${publicBaseUrl.replace(/\/$/, '')}/checklist-public/${propertyId}`;
}

async function main() {
  const rawArg = process.argv[2] || 'SP-V4P-KDH-005658';
  const syncAirtable = process.argv.includes('--sync-airtable');
  const checklistType = 'reno_final';
  const inspectionType = 'final';

  const supabase = createAdminClient();

  // Resolver propiedad por ID o por dirección (si el argumento parece una dirección: contiene coma o no es UUID)
  const looksLikeAddress = rawArg.includes(',') || rawArg.includes('Tr.') || !/^[a-zA-Z0-9-]{20,}$/.test(rawArg);
  let property: any;

  if (looksLikeAddress) {
    console.log(`🔍 Buscando propiedad por dirección: "${rawArg}"...\n`);
    const { data: list, error } = await supabase
      .from('properties')
      .select('*')
      .ilike('address', `%${rawArg.trim()}%`)
      .limit(2);
    if (error || !list?.length) {
      console.error('❌ No se encontró propiedad con esa dirección.');
      process.exit(1);
    }
    if (list.length > 1) {
      console.warn('⚠️ Varias propiedades coinciden; usando la primera.');
    }
    property = list[0];
  } else {
    const { data: p, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', rawArg)
      .single();
    if (propError || !p) {
      console.error('❌ Error obteniendo propiedad:', propError?.message);
      process.exit(1);
    }
    property = p;
  }

  const propertyId = property.id;
  console.log(`🔍 Regenerando HTML del final check para: ${property.address || propertyId}\n`);

  try {

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

    // 9. Opcional: enviar a Airtable (Reno checklist form + Final check date)
    if (syncAirtable) {
      const uniqueId = property['Unique ID From Engagements'] || property.id;
      const recordId = await findTransactionsRecordIdByUniqueId(uniqueId);
      if (!recordId) {
        console.warn('⚠️ No se encontró registro en Airtable Transactions para esta propiedad. No se actualiza Airtable.');
      } else {
        const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
        const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
        if (!apiKey || !baseId) {
          console.warn('⚠️ Airtable no configurado (NEXT_PUBLIC_AIRTABLE_*). No se actualiza Airtable.');
        } else {
          const base = new Airtable({ apiKey }).base(baseId);
          const checklistPublicUrl = getChecklistPublicSelectorUrl(propertyId);
          const todayDate = new Date().toISOString().split('T')[0];
          await base('Transactions').update(recordId, {
            'fldBOpKEktOI2GnZK': checklistPublicUrl,
            'fldZzAfXzfURkdGZI': todayDate,
          });
          console.log('✅ Airtable actualizado (Reno checklist form + Final check date)');
        }
      }
    }

    console.log('\n✅ HTML del final check regenerado exitosamente!');
    console.log(`   URL: ${htmlUrl}`);
  } catch (error: any) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

main();


