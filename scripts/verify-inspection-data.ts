#!/usr/bin/env tsx
/**
 * Script para verificar los datos de una inspección
 * Uso: npx tsx scripts/verify-inspection-data.ts <propertyId> <type>
 */

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  const propertyId = process.argv[2];
  const inspectionTypeArg = process.argv[3] || 'initial';

  if (!propertyId) {
    console.error('❌ Por favor proporciona un Property ID');
    console.error('   Uso: npx tsx scripts/verify-inspection-data.ts SP-ORF-EM8-005810 initial');
    process.exit(1);
  }

  const inspectionType = inspectionTypeArg === 'initial' ? 'initial' : 'final';

  console.log(`🔍 Verificando datos de inspección para propiedad ${propertyId} (${inspectionType})...\n`);

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

    console.log(`✅ Propiedad encontrada: ${property.address || propertyId}\n`);

    // 2. Obtener la inspección
    const { data: inspection, error: inspError } = await supabase
      .from('property_inspections')
      .select('*')
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

    console.log(`✅ Inspección encontrada:`);
    console.log(`   ID: ${inspection.id}`);
    console.log(`   Tipo: ${inspection.inspection_type}`);
    console.log(`   Estado: ${inspection.inspection_status}`);
    console.log(`   Creada: ${inspection.created_at}`);
    console.log(`   Completada: ${inspection.completed_at || 'No completada'}\n`);

    // 3. Obtener zonas
    const { data: zones, error: zonesError } = await supabase
      .from('inspection_zones')
      .select('*')
      .eq('inspection_id', inspection.id)
      .order('created_at', { ascending: true });

    if (zonesError) {
      console.error('❌ Error obteniendo zonas:', zonesError.message);
      process.exit(1);
    }

    console.log(`📂 Zonas encontradas: ${zones?.length || 0}`);
    if (zones && zones.length > 0) {
      zones.forEach((zone, index) => {
        console.log(`   ${index + 1}. ${zone.zone_name} (${zone.zone_type}) - ID: ${zone.id}`);
      });
    } else {
      console.log('   ⚠️ No hay zonas guardadas para esta inspección');
    }
    console.log('');

    // 4. Obtener elementos
    const zoneIds = zones?.map(z => z.id) || [];
    let elements: any[] = [];
    
    if (zoneIds.length > 0) {
      const { data: elementsData, error: elementsError } = await supabase
        .from('inspection_elements')
        .select('*')
        .in('zone_id', zoneIds)
        .order('created_at', { ascending: true });

      if (elementsError) {
        console.error('❌ Error obteniendo elementos:', elementsError.message);
      } else {
        elements = elementsData || [];
      }
    }

    console.log(`📋 Elementos encontrados: ${elements.length}`);
    if (elements.length > 0) {
      // Agrupar por zona
      const elementsByZone = elements.reduce((acc, elem) => {
        const zoneName = zones?.find(z => z.id === elem.zone_id)?.zone_name || 'Unknown';
        if (!acc[zoneName]) acc[zoneName] = [];
        acc[zoneName].push(elem);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(elementsByZone).forEach(([zoneName, zoneElements]) => {
        console.log(`   📁 ${zoneName}: ${zoneElements.length} elementos`);
        zoneElements.slice(0, 5).forEach((elem, idx) => {
          const hasPhotos = elem.image_urls && elem.image_urls.length > 0;
          const hasVideos = elem.video_urls && elem.video_urls.length > 0;
          const hasNotes = !!elem.notes;
          console.log(`      ${idx + 1}. ${elem.element_name} ${hasPhotos ? '📷' : ''} ${hasVideos ? '🎥' : ''} ${hasNotes ? '📝' : ''}`);
        });
        if (zoneElements.length > 5) {
          console.log(`      ... y ${zoneElements.length - 5} más`);
        }
      });

      // Contar fotos y videos
      const totalPhotos = elements.reduce((sum, elem) => sum + (elem.image_urls?.length || 0), 0);
      const totalVideos = elements.reduce((sum, elem) => sum + (elem.video_urls?.length || 0), 0);
      console.log(`\n   📊 Resumen:`);
      console.log(`      Total fotos: ${totalPhotos}`);
      console.log(`      Total videos: ${totalVideos}`);
    } else {
      console.log('   ⚠️ No hay elementos guardados para esta inspección');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (zones && zones.length > 0 && elements.length > 0) {
      console.log('✅ La inspección tiene datos completos');
    } else {
      console.log('⚠️ La inspección está vacía o incompleta');
      console.log('   Esto puede significar que:');
      console.log('   1. El checklist nunca se guardó correctamente');
      console.log('   2. La inspección se completó sin guardar datos');
      console.log('   3. Hay un problema con el guardado de datos');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

main();

