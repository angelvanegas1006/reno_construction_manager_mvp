#!/usr/bin/env tsx
/**
 * Regenera el HTML recuperando fotos desde Storage cuando inspection_elements está vacío.
 * Las fotos se suben a propertyId/inspectionId/zoneId/ - este script las lista y construye el checklist.
 * Uso: npx tsx scripts/regenerate-html-from-storage.ts SP-NIU-O3C-005809
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '../lib/supabase/admin';
import { generateChecklistHTML } from '../lib/html/checklist-html-generator';
import { translations } from '../lib/i18n/translations';
import type { ChecklistData, ChecklistSection, ChecklistUploadZone } from '../lib/checklist-storage';

loadEnvConfig(process.cwd());

const BUCKET = 'inspection-images';

async function main() {
  const propertyId = process.argv[2] || 'SP-NIU-O3C-005809';
  const supabase = createAdminClient();

  console.log(`\n🔍 Regenerando HTML desde Storage - ${propertyId}\n`);

  const { data: property } = await supabase
    .from('properties')
    .select('address, bedrooms, bathrooms, "Renovator name"')
    .eq('id', propertyId)
    .single();

  const { data: inspection } = await supabase
    .from('property_inspections')
    .select('id')
    .eq('property_id', propertyId)
    .eq('inspection_type', 'final')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!inspection) {
    console.error('❌ No hay inspección final');
    process.exit(1);
  }

  const { data: zones } = await supabase
    .from('inspection_zones')
    .select('id, zone_name, zone_type')
    .eq('inspection_id', inspection.id)
    .order('created_at', { ascending: true });

  const basePath = `${propertyId}/${inspection.id}`;
  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list(basePath, { limit: 1000 });

  if (error) {
    console.warn('⚠️ No se pudo listar Storage:', error.message);
  }

  const zoneIdToName: Record<string, string> = {};
  zones?.forEach((z: any) => { zoneIdToName[z.id] = z.zone_name || z.zone_type || z.id; });

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

  const sections: Record<string, ChecklistSection> = {};
  let totalPhotos = 0;

  if (files && files.length > 0) {
    for (const item of files) {
      if (item.id && item.name) {
        const zoneId = item.name;
        const zone = zones?.find((z: any) => z.id === zoneId);
        const zoneType = zone?.zone_type || 'entorno';
        const sectionId = SECTION_TO_ZONE[zoneType] || 'entorno-zonas-comunes';

        const { data: zoneFiles } = await supabase.storage
          .from(BUCKET)
          .list(`${basePath}/${zoneId}`, { limit: 200 });

        const photos: { data: string }[] = [];
        if (zoneFiles) {
          for (const f of zoneFiles) {
            if (f.name && /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name)) {
              const { data: urlData } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(`${basePath}/${zoneId}/${f.name}`);
              photos.push({ data: urlData.publicUrl });
              totalPhotos++;
            }
          }
        }

        if (photos.length > 0) {
          if (!sections[sectionId]) {
            sections[sectionId] = {
              id: sectionId,
              uploadZones: [],
              questions: [],
              dynamicItems: [],
            };
          }
          const uploadZone: ChecklistUploadZone = {
            id: `fotos-${zoneId}`,
            photos: photos.map(p => ({ id: crypto.randomUUID(), name: 'photo', size: 0, type: 'image/jpeg', data: p.data, uploadedAt: new Date().toISOString() })),
            videos: [],
          };
          if (sectionId === 'habitaciones' || sectionId === 'banos') {
            const idx = (sections[sectionId].dynamicItems?.length || 0) + 1;
            if (!sections[sectionId].dynamicItems) sections[sectionId].dynamicItems = [];
            sections[sectionId].dynamicItems!.push({
              id: `${sectionId}-${idx}`,
              uploadZone,
              questions: [],
            });
          } else {
            sections[sectionId].uploadZones = sections[sectionId].uploadZones || [];
            sections[sectionId].uploadZones!.push(uploadZone);
          }
        }
      }
    }
  }

  if (totalPhotos === 0) {
    console.log('⚠️ No hay fotos en Storage para esta inspección.');
    console.log('   Las fotos no se subieron o el guardado falló antes de subirlas.');
    console.log('   Completa el checklist de nuevo y guarda cada sección antes de finalizar.\n');
    process.exit(1);
  }

  console.log(`✅ Encontradas ${totalPhotos} fotos en Storage\n`);

  const fullChecklist: ChecklistData = {
    propertyId,
    checklistType: 'reno_final',
    sections,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const htmlContent = await generateChecklistHTML(
    fullChecklist,
    {
      address: property?.address || propertyId,
      propertyId,
      renovatorName: property?.['Renovator name'] || undefined,
    },
    translations.es,
    'final'
  );

  const storagePath = `${propertyId}/final/checklist.html`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('checklists')
    .upload(storagePath, Buffer.from(htmlContent, 'utf-8'), {
      contentType: 'text/html',
      upsert: true,
    });

  if (uploadError) {
    console.error('❌ Error subiendo HTML:', uploadError.message);
    process.exit(1);
  }

  const { data: urlData } = supabase.storage.from('checklists').getPublicUrl(uploadData.path);
  const htmlUrl = urlData.publicUrl;

  await supabase
    .from('property_inspections')
    .update({ pdf_url: htmlUrl })
    .eq('id', inspection.id);

  console.log('✅ HTML regenerado y subido');
  console.log(`   URL: ${htmlUrl}\n`);
}

main().catch(console.error);
