/**
 * Diagnóstico: Initial check de una propiedad - fotos y datos en Supabase
 * Uso: npx tsx scripts/diagnose-initial-check-photos.ts <propertyId o Unique ID>
 * Ejemplo: npx tsx scripts/diagnose-initial-check-photos.ts SP-NIU-O3C-005809
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function diagnose(identifier: string) {
  const supabase = createAdminClient();

  console.log('\n🔍 Diagnóstico Initial Check – propiedad:', identifier, '\n');

  // 1. Buscar propiedad
  let property: { id: string; address: string | null } | null = null;
  const { data: byId } = await supabase.from('properties').select('id, address').eq('id', identifier).maybeSingle();
  if (byId) property = byId as any;
  if (!property) {
    const { data: byUnique } = await supabase
      .from('properties')
      .select('id, address')
      .eq('Unique ID From Engagements', identifier)
      .maybeSingle();
    if (byUnique) property = byUnique as any;
  }

  if (!property) {
    console.error('❌ Propiedad no encontrada:', identifier);
    process.exit(1);
  }

  console.log('✅ Propiedad:', property.id, '|', property.address || 'N/A', '\n');

  // 2. Inspecciones initial
  const { data: inspections, error: inspErr } = await supabase
    .from('property_inspections')
    .select('id, inspection_type, inspection_status, created_at, completed_at')
    .eq('property_id', property.id)
    .eq('inspection_type', 'initial')
    .order('created_at', { ascending: false });

  if (inspErr) {
    console.error('❌ Error inspecciones:', inspErr);
    process.exit(1);
  }

  if (!inspections?.length) {
    console.log('ℹ️  No hay inspecciones de tipo "initial" para esta propiedad.');
    process.exit(0);
  }

  console.log('📋 Inspecciones initial (más reciente primero):', inspections.length);
  inspections.forEach((i, idx) => {
    console.log(`   ${idx + 1}. ${i.id} | status: ${i.inspection_status ?? 'null'} | created: ${i.created_at} | completed: ${i.completed_at ?? 'null'}`);
  });
  const latest = inspections[0];
  console.log('\n📌 Usando la más reciente:', latest.id, '\n');

  // 3. Zonas
  const { data: zones, error: zonesErr } = await supabase
    .from('inspection_zones')
    .select('id, zone_type, zone_name')
    .eq('inspection_id', latest.id)
    .order('created_at', { ascending: true });

  if (zonesErr) {
    console.error('❌ Error zonas:', zonesErr);
    process.exit(1);
  }

  console.log('📍 Zonas:', zones?.length ?? 0);
  (zones || []).forEach((z) => console.log(`   - ${z.zone_type} | ${z.zone_name} (${z.id})`));
  console.log('');

  const zoneIds = (zones || []).map((z) => z.id);

  // 4. Elementos (todos los de esta inspección)
  const { data: elements, error: elErr } = await supabase
    .from('inspection_elements')
    .select('id, zone_id, element_name, condition, image_urls, video_urls, notes')
    .in('zone_id', zoneIds)
    .order('created_at', { ascending: true });

  if (elErr) {
    console.error('❌ Error elementos:', elErr);
    process.exit(1);
  }

  console.log('📦 Elementos totales:', elements?.length ?? 0);

  const withPhotos = (elements || []).filter((e) => e.image_urls && e.image_urls.length > 0);
  const withVideos = (elements || []).filter((e) => e.video_urls && e.video_urls.length > 0);
  const fotosElements = (elements || []).filter((e) => e.element_name?.startsWith('fotos-'));

  console.log('   - Con image_urls:', withPhotos.length);
  console.log('   - Con video_urls:', withVideos.length);
  console.log('   - Elementos fotos-*:', fotosElements.length);

  if (fotosElements.length > 0) {
    console.log('\n📸 Detalle elementos fotos-*:');
    fotosElements.forEach((e) => {
      const urls = e.image_urls || [];
      const vids = e.video_urls || [];
      console.log(`   - ${e.element_name} (zone: ${e.zone_id})`);
      console.log(`     image_urls: ${urls.length} | video_urls: ${vids.length}`);
      if (urls.length > 0) console.log(`     primeras URLs: ${urls.slice(0, 2).join(', ')}${urls.length > 2 ? '...' : ''}`);
      if (vids.length > 0) console.log(`     primeros videos: ${vids.slice(0, 2).join(', ')}${vids.length > 2 ? '...' : ''}`);
    });
  }

  if (withPhotos.length === 0 && withVideos.length === 0) {
    console.log('\n⚠️  Ningún elemento tiene image_urls ni video_urls.');
    console.log('   Posibles causas:');
    console.log('   1) En móvil la subida a Storage falló (red, timeout, RLS).');
    console.log('   2) El guardado se hizo antes de que terminara la subida.');
    console.log('   3) Las fotos se quedaron en base64 y el código solo persiste URLs (no base64).');
  }

  console.log('\n✅ Diagnóstico terminado.\n');
}

const id = process.argv[2];
if (!id) {
  console.error('Uso: npx tsx scripts/diagnose-initial-check-photos.ts <propertyId o Unique ID>');
  process.exit(1);
}

diagnose(id).then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
