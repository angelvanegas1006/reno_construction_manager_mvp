#!/usr/bin/env tsx
/**
 * Script para regenerar las zonas iniciales de una inspección que está vacía
 * Uso: npx tsx scripts/regenerate-inspection-zones.ts <propertyId> <type>
 */

import { createAdminClient } from '../lib/supabase/admin';
import { convertSectionToZones } from '../lib/supabase/checklist-converter';
import { createChecklist } from '../lib/checklist-storage';

async function main() {
  const propertyId = process.argv[2];
  const inspectionTypeArg = process.argv[3] || 'initial';

  if (!propertyId) {
    console.error('❌ Por favor proporciona un Property ID');
    console.error('   Uso: npx tsx scripts/regenerate-inspection-zones.ts SP-ORF-EM8-005810 initial');
    process.exit(1);
  }

  const checklistType = inspectionTypeArg === 'initial' ? 'reno_initial' : 'reno_final';
  const inspectionType = inspectionTypeArg === 'initial' ? 'initial' : 'final';

  console.log(`🔧 Regenerando zonas para propiedad ${propertyId} (${inspectionType})...\n`);

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

    console.log(`✅ Inspección encontrada: ${inspection.id}\n`);

    // 3. Verificar si ya hay zonas
    const { data: existingZones, error: zonesError } = await supabase
      .from('inspection_zones')
      .select('*')
      .eq('inspection_id', inspection.id);

    if (zonesError) {
      console.error('❌ Error verificando zonas:', zonesError.message);
      process.exit(1);
    }

    if (existingZones && existingZones.length > 0) {
      console.log(`⚠️ Ya existen ${existingZones.length} zonas para esta inspección.`);
      console.log('   Si quieres regenerarlas, primero elimínalas manualmente.\n');
      process.exit(0);
    }

    // 4. Crear checklist temporal para generar zonas
    const bedrooms = property.bedrooms || 0;
    const bathrooms = property.bathrooms || 0;

    console.log(`📝 Creando zonas iniciales (bedrooms: ${bedrooms}, bathrooms: ${bathrooms})...\n`);

    const tempChecklist = createChecklist(propertyId, checklistType, {
      "entorno-zonas-comunes": {
        id: "entorno-zonas-comunes",
        uploadZones: [
          { id: "portal", photos: [], videos: [] },
          { id: "fachada", photos: [], videos: [] },
          { id: "entorno", photos: [], videos: [] },
        ],
        questions: [
          { id: "acceso-principal" },
          { id: "acabados" },
          { id: "comunicaciones" },
          { id: "electricidad" },
          { id: "carpinteria" },
        ],
      },
      "estado-general": {
        id: "estado-general",
        uploadZones: [{ id: "perspectiva-general", photos: [], videos: [] }],
        questions: [{ id: "acabados" }, { id: "electricidad" }],
        climatizationItems: [
          { id: "radiadores", cantidad: 0 },
          { id: "split-ac", cantidad: 0 },
          { id: "calentador-agua", cantidad: 0 },
          { id: "calefaccion-conductos", cantidad: 0 },
        ],
      },
      "entrada-pasillos": {
        id: "entrada-pasillos",
        uploadZones: [
          { id: "cuadro-general-electrico", photos: [], videos: [] },
          { id: "entrada-vivienda-pasillos", photos: [], videos: [] },
        ],
        questions: [{ id: "acabados" }, { id: "electricidad" }],
        carpentryItems: [
          { id: "ventanas", cantidad: 0 },
          { id: "persianas", cantidad: 0 },
          { id: "armarios", cantidad: 0 },
        ],
        climatizationItems: [
          { id: "radiadores", cantidad: 0 },
          { id: "split-ac", cantidad: 0 },
        ],
        mobiliario: { existeMobiliario: false },
      },
      "habitaciones": {
        id: "habitaciones",
        dynamicItems: [],
        dynamicCount: bedrooms,
      },
      "salon": {
        id: "salon",
        questions: [],
      },
      "banos": {
        id: "banos",
        dynamicItems: [],
        dynamicCount: bathrooms,
      },
      "cocina": {
        id: "cocina",
        questions: [],
      },
      "exteriores": {
        id: "exteriores",
        questions: [],
      },
    });

    // 5. Crear zonas para cada sección
    let zonesCreated = 0;
    for (const [sectionId, section] of Object.entries(tempChecklist.sections)) {
      const zonesToCreate = convertSectionToZones(sectionId, section, inspection.id);
      
      for (const zoneData of zonesToCreate) {
        const { data: createdZone, error: createError } = await supabase
          .from('inspection_zones')
          .insert(zoneData)
          .select()
          .single();

        if (createError) {
          console.error(`❌ Error creando zona ${sectionId}:`, createError.message);
        } else if (createdZone) {
          zonesCreated++;
          console.log(`✅ Zona creada: ${createdZone.zone_name} (${createdZone.zone_type})`);
        }
      }
    }
    
    console.log(`\n✅ Total de zonas creadas: ${zonesCreated}`);
    console.log('\n💡 Ahora puedes regenerar el HTML del checklist con:');
    console.log(`   npx tsx scripts/generate-checklist-html.ts ${propertyId} ${inspectionTypeArg}\n`);

  } catch (error: any) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

main();

