#!/usr/bin/env tsx
/**
 * Script de diagnóstico para el HTML del final check sin imágenes
 * Uso: npx tsx scripts/diagnose-final-check-html.ts SP-NIU-O3C-005809
 *
 * Verifica:
 * 1. Inspección final
 * 2. Zonas de la inspección
 * 3. Elementos con image_urls en Supabase
 * 4. Resultado de convertSupabaseToChecklist (fotos por sección)
 * 5. Imágenes que llegarían al HTML (simulación de collectSectionImages)
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';
import { convertSupabaseToChecklist } from '../lib/supabase/checklist-converter';
import type { ChecklistSection } from '../lib/checklist-storage';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

/** Cuenta fotos con photo.data en una sección (simula collectSectionImages) */
function countPhotosInSection(section: ChecklistSection): number {
  let count = 0;

  if (section.uploadZones) {
    for (const zone of section.uploadZones) {
      if (zone.photos) {
        for (const photo of zone.photos) {
          if (photo.data) count++;
        }
      }
    }
  }

  if (section.questions) {
    for (const q of section.questions) {
      if (q.photos) {
        for (const photo of q.photos) {
          if (photo.data) count++;
        }
      }
    }
  }

  const itemCategories = [
    'carpentryItems',
    'climatizationItems',
    'storageItems',
    'appliancesItems',
    'securityItems',
    'systemsItems',
  ];
  for (const key of itemCategories) {
    const items = (section as any)[key];
    if (!items || !Array.isArray(items)) continue;
    for (const item of items) {
      if (item.photos) {
        for (const photo of item.photos) {
          if (photo.data) count++;
        }
      }
      if (item.units) {
        for (const unit of item.units) {
          if (unit.photos) {
            for (const photo of unit.photos) {
              if (photo.data) count++;
            }
          }
        }
      }
    }
  }

  if (section.dynamicItems) {
    for (const di of section.dynamicItems) {
      if (di.uploadZone?.photos) {
        for (const photo of di.uploadZone.photos) {
          if (photo.data) count++;
        }
      }
      if (di.questions) {
        for (const q of di.questions) {
          if (q.photos) {
            for (const photo of q.photos) {
              if (photo.data) count++;
            }
          }
        }
      }
      if (di.carpentryItems) {
        for (const item of di.carpentryItems) {
          if (item.photos) {
            for (const photo of item.photos) {
              if (photo.data) count++;
            }
          }
          if (item.units) {
            for (const unit of item.units) {
              if (unit.photos) {
                for (const photo of unit.photos) {
                  if (photo.data) count++;
                }
              }
            }
          }
        }
      }
      if (di.climatizationItems) {
        for (const item of di.climatizationItems) {
          if (item.photos) {
            for (const photo of item.photos) {
              if (photo.data) count++;
            }
          }
          if (item.units) {
            for (const unit of item.units) {
              if (unit.photos) {
                for (const photo of unit.photos) {
                  if (photo.data) count++;
                }
              }
            }
          }
        }
      }
      if (di.mobiliario?.question?.photos) {
        for (const photo of di.mobiliario.question.photos) {
          if (photo.data) count++;
        }
      }
    }
  }

  return count;
}

async function main() {
  const propertyId = process.argv[2] || 'SP-NIU-O3C-005809';
  const inspectionType = 'final';

  console.log('\n🔍 Diagnóstico HTML Final Check - Propiedad ' + propertyId + '\n');
  console.log('='.repeat(60));

  const supabase = createAdminClient();

  const { data: inspection, error: inspectionError } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, inspection_status, created_at, completed_at, pdf_url')
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
    console.error('❌ No se encontró inspección del tipo ' + inspectionType);
    process.exit(1);
  }

  console.log('\n📋 1. INSPECCIÓN FINAL');
  console.log('   ID: ' + inspection.id);
  console.log('   Status: ' + inspection.inspection_status);
  console.log('   PDF/HTML URL: ' + ((inspection as any).pdf_url || '(ninguna)'));

  const { data: zones, error: zonesError } = await supabase
    .from('inspection_zones')
    .select('id, zone_name, zone_type, created_at')
    .eq('inspection_id', inspection.id)
    .order('created_at', { ascending: true });

  if (zonesError) {
    console.error('❌ Error obteniendo zonas:', zonesError.message);
    process.exit(1);
  }

  console.log('\n📂 2. ZONAS');
  console.log('   Total: ' + (zones?.length || 0));
  if (zones && zones.length > 0) {
    zones.forEach((z, i) => {
      console.log('   ' + (i + 1) + '. ' + (z.zone_name || z.zone_type) + ' (' + z.zone_type + ') - ' + z.id);
    });
  }

  const zoneIds = zones?.map(z => z.id) || [];
  const { data: elements, error: elementsError } = await supabase
    .from('inspection_elements')
    .select('id, element_name, zone_id, image_urls, video_urls')
    .in('zone_id', zoneIds.length > 0 ? zoneIds : ['00000000-0000-0000-0000-000000000000']);

  if (elementsError) {
    console.error('❌ Error obteniendo elementos:', elementsError.message);
    process.exit(1);
  }

  const elementsWithPhotos = elements?.filter(
    (e: any) => e.image_urls && Array.isArray(e.image_urls) && e.image_urls.length > 0
  ) || [];
  const totalPhotosInDb = elementsWithPhotos.reduce(
    (sum: number, e: any) => sum + (e.image_urls?.length || 0),
    0
  );

  console.log('\n📸 3. ELEMENTOS CON FOTOS EN SUPABASE');
  console.log('   Total elementos: ' + (elements?.length || 0));
  console.log('   Elementos con image_urls: ' + elementsWithPhotos.length);
  console.log('   Total fotos (image_urls): ' + totalPhotosInDb);

  if (elementsWithPhotos.length > 0) {
    console.log('\n   Detalle por elemento:');
    elementsWithPhotos.forEach((el: any) => {
      const zone = zones?.find(z => z.id === el.zone_id);
      const zoneName = zone?.zone_name || zone?.zone_type || el.zone_id;
      const sampleUrl = el.image_urls?.[0]?.substring?.(0, 60) || '';
      console.log('   - ' + el.element_name + ' (zona: ' + zoneName + '): ' + el.image_urls.length + ' fotos');
      console.log('     Sample: ' + sampleUrl + '...');
    });
  } else {
    console.log('\n   ⚠️ NINGÚN elemento tiene image_urls. Las fotos no se guardaron en Supabase.');
  }

  const { data: property } = await supabase
    .from('properties')
    .select('bedrooms, bathrooms, address')
    .eq('id', propertyId)
    .single();

  const checklistData = convertSupabaseToChecklist(
    zones || [],
    elements || [],
    property?.bedrooms ?? null,
    property?.bathrooms ?? null
  );

  console.log('\n📦 4. RESULTADO DE convertSupabaseToChecklist');
  const sections = checklistData.sections || {};
  const sectionIds = Object.keys(sections);
  console.log('   Secciones: ' + (sectionIds.join(', ') || '(ninguna)'));

  let totalPhotosConverted = 0;
  for (const sectionId of sectionIds) {
    const section = sections[sectionId];
    const count = countPhotosInSection(section);
    totalPhotosConverted += count;
    if (count > 0 || sectionId === 'habitaciones' || sectionId === 'banos') {
      console.log('   - ' + sectionId + ': ' + count + ' fotos');
    }
  }

  console.log('   Total fotos en checklist convertido: ' + totalPhotosConverted);

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN');
  console.log('='.repeat(60));

  if (totalPhotosInDb === 0) {
    console.log('\n❌ CAUSA PROBABLE: Los elementos en inspection_elements tienen image_urls vacíos.');
    console.log('   Las fotos no se guardaron correctamente al hacer save/finalize.');
    console.log('   Posibles causas:');
    console.log('   - Fallo en uploadFilesToStorage (RLS, cuota, red)');
    console.log('   - updateFileWithMap no actualizó sectionToSave antes de convertir');
    console.log('   - Fotos en base64 no se subieron antes del upsert');
  } else if (totalPhotosConverted === 0) {
    console.log('\n❌ CAUSA PROBABLE: convertSupabaseToChecklist no mapea correctamente image_urls a fotos.');
    console.log('   Hay fotos en Supabase pero no llegan al checklist convertido.');
    console.log('   Revisar emparejamiento element_name ↔ uploadZone.id en secciones dinámicas.');
  } else if (totalPhotosConverted > 0) {
    console.log('\n✅ Hay fotos en el checklist convertido. El HTML debería mostrarlas.');
    console.log('   Si el HTML sigue sin imágenes, verificar generateChecklistHTML / collectSectionImages.');
  }

  console.log('\n');
}

main().catch(console.error);
