/**
 * Script para regenerar el HTML del checklist (initial o final) de una vivienda.
 * Uso: npx tsx scripts/regenerate-checklist-html.ts SP-NIU-O3C-005809 final
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateChecklistHTML } from '@/lib/html/checklist-html-generator';
import { translations } from '@/lib/i18n/translations';
import { convertSupabaseToChecklist } from '@/lib/supabase/checklist-converter';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function regenerateChecklistHTML(propertyIdentifier: string, type: 'initial' | 'final') {
  const supabase = createAdminClient();

  console.log(`\nRegenerando HTML del check ${type} para: ${propertyIdentifier}\n`);

  const { data: byUniqueId } = await supabase
    .from('properties')
    .select('id, name, address, property_unique_id, bedrooms, bathrooms, drive_folder_url, "Renovator name"')
    .eq('property_unique_id', propertyIdentifier)
    .single();

  const { data: byId } = await supabase
    .from('properties')
    .select('id, name, address, property_unique_id, bedrooms, bathrooms, drive_folder_url, "Renovator name"')
    .eq('id', propertyIdentifier)
    .single();

  const property = byUniqueId ?? byId;
  if (!property) {
    console.log(`No se encontro la propiedad: ${propertyIdentifier}`);
    return;
  }

  const propertyId = property.id;
  console.log(`Propiedad encontrada: ${property.name || property.property_unique_id} (id: ${propertyId})\n`);

  const { data: inspection, error: inspError } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, inspection_status')
    .eq('property_id', propertyId)
    .eq('inspection_type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inspError) {
    console.error('Error al buscar inspeccion:', inspError);
    return;
  }

  if (!inspection) {
    console.log(`No hay inspeccion ${type} para esta propiedad. Crea primero el checklist desde la app.`);
    return;
  }

  console.log(`Inspeccion encontrada: ${inspection.id}\n`);

  const { data: zones } = await supabase
    .from('inspection_zones')
    .select('*')
    .eq('inspection_id', inspection.id)
    .order('created_at', { ascending: true });

  const zoneIds = zones?.map((z) => z.id) || [];
  const { data: elements } = await supabase
    .from('inspection_elements')
    .select('*')
    .in('zone_id', zoneIds.length > 0 ? zoneIds : ['00000000-0000-0000-0000-000000000000']);

  const checklistData = convertSupabaseToChecklist(
    zones || [],
    elements || [],
    property.bedrooms || null,
    property.bathrooms || null
  );

  const fullChecklist = {
    propertyId,
    checklistType: type === 'initial' ? 'reno_initial' : 'reno_final',
    sections: checklistData.sections || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const propertyInfo = {
    address: property.address || propertyId,
    propertyId,
    renovatorName: property['Renovator name'] || undefined,
    driveFolderUrl: property.drive_folder_url || undefined,
  };

  const htmlContent = await generateChecklistHTML(
    fullChecklist,
    propertyInfo,
    translations.es,
    type
  );

  const storagePath = `${propertyId}/${type}/checklist.html`;
  await supabase.storage.from('checklists').remove([storagePath]);

  const htmlBuffer = Buffer.from(htmlContent, 'utf-8');
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('checklists')
    .upload(storagePath, htmlBuffer, {
      contentType: 'text/html',
      upsert: true,
    });

  if (uploadError) {
    console.error('Error subiendo HTML:', uploadError);
    return;
  }

  const { data: publicUrlData } = supabase.storage.from('checklists').getPublicUrl(uploadData.path);
  const htmlUrl = publicUrlData.publicUrl;

  await supabase
    .from('property_inspections')
    .update({ pdf_url: htmlUrl })
    .eq('id', inspection.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dev.vistral.io';
  const publicUrl = `${appUrl}/checklist-public/${propertyId}/${type}`;

  console.log(`HTML regenerado correctamente.`);
  console.log(`  URL publica: ${publicUrl}`);
  console.log(`  Storage: ${htmlUrl}\n`);
}

const propertyIdentifier = process.argv[2] || 'SP-NIU-O3C-005809';
const type = (process.argv[3] || 'final') as 'initial' | 'final';
if (type !== 'initial' && type !== 'final') {
  console.error('Tipo debe ser "initial" o "final"');
  process.exit(1);
}
regenerateChecklistHTML(propertyIdentifier, type).catch(console.error);
