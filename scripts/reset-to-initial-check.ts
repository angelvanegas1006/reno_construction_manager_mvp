#!/usr/bin/env tsx
/**
 * Script para eliminar el checklist inicial y resetear la propiedad a fase "initial-check"
 * Uso: npx tsx scripts/reset-to-initial-check.ts <propertyId>
 * Ejemplo: npx tsx scripts/reset-to-initial-check.ts SP-TJP-JXR-005643
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.warn('⚠️  No se pudo cargar .env.local, usando variables de entorno del sistema');
}

import { createAdminClient } from '../lib/supabase/admin';

async function resetToInitialCheck(propertyId: string) {
  console.log(`🔄 Reseteando propiedad ${propertyId} a fase "initial-check"...\n`);

  const supabase = createAdminClient();

  try {
    // 1. Buscar la propiedad
    let { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('id, address, "Set Up Status", reno_phase, "Unique ID From Engagements"')
      .eq('id', propertyId)
      .single();

    // Si no se encuentra por id, buscar por "Unique ID From Engagements"
    if (fetchError || !property) {
      const { data: propertyByUniqueId, error: fetchErrorByUniqueId } = await supabase
        .from('properties')
        .select('id, address, "Set Up Status", reno_phase, "Unique ID From Engagements"')
        .eq('Unique ID From Engagements', propertyId)
        .single();
      
      if (fetchErrorByUniqueId || !propertyByUniqueId) {
        console.error('❌ Propiedad no encontrada:', propertyId);
        process.exit(1);
      }
      
      property = propertyByUniqueId;
      fetchError = null;
    }

    const actualPropertyId = property.id;

    console.log('✅ Propiedad encontrada:');
    console.log(`   ID: ${actualPropertyId}`);
    console.log(`   Dirección: ${property.address || 'N/A'}`);
    console.log(`   Unique ID: ${property['Unique ID From Engagements'] || 'N/A'}`);
    console.log(`   Fase actual: ${property.reno_phase || 'N/A'}`);
    console.log(`   Set Up Status: ${property['Set Up Status'] || 'N/A'}\n`);

    // 2. Buscar y eliminar inspecciones (solo initial, pero eliminamos todas por seguridad)
    console.log('🔍 Buscando inspecciones...');
    const { data: inspections, error: inspectionsError } = await supabase
      .from('property_inspections')
      .select('id, inspection_type, created_at')
      .eq('property_id', actualPropertyId);

    if (inspectionsError) {
      console.error('❌ Error buscando inspecciones:', inspectionsError);
      process.exit(1);
    }

    if (!inspections || inspections.length === 0) {
      console.log('ℹ️  No se encontraron inspecciones para esta propiedad.\n');
    } else {
      console.log(`📋 Inspecciones encontradas: ${inspections.length}`);
      inspections.forEach((inspection) => {
        console.log(`   - ${inspection.inspection_type} (ID: ${inspection.id}, Creado: ${inspection.created_at})`);
      });
      console.log('');

      const inspectionIds = inspections.map(i => i.id);

      // 3. Eliminar elementos primero (tienen foreign key a zones)
      const { data: zones, error: zonesFetchError } = await supabase
        .from('inspection_zones')
        .select('id')
        .in('inspection_id', inspectionIds);

      if (!zonesFetchError && zones && zones.length > 0) {
        const zoneIds = zones.map(z => z.id);
        
        console.log(`🗑️  Eliminando ${zoneIds.length} elementos de inspección...`);
        const { error: deleteElementsError } = await supabase
          .from('inspection_elements')
          .delete()
          .in('zone_id', zoneIds);
        
        if (deleteElementsError) {
          console.error('❌ Error eliminando elementos:', deleteElementsError);
        } else {
          console.log('✅ Elementos eliminados');
        }
      }

      // 4. Eliminar zonas
      if (!zonesFetchError && zones && zones.length > 0) {
        console.log(`🗑️  Eliminando ${zones.length} zonas de inspección...`);
        const { error: deleteZonesError } = await supabase
          .from('inspection_zones')
          .delete()
          .in('inspection_id', inspectionIds);
        
        if (deleteZonesError) {
          console.error('❌ Error eliminando zonas:', deleteZonesError);
        } else {
          console.log('✅ Zonas eliminadas');
        }
      }

      // 5. Eliminar inspecciones
      console.log(`🗑️  Eliminando ${inspections.length} inspecciones...`);
      const { error: deleteInspectionsError } = await supabase
        .from('property_inspections')
        .delete()
        .eq('property_id', actualPropertyId);

      if (deleteInspectionsError) {
        console.error('❌ Error eliminando inspecciones:', deleteInspectionsError);
        process.exit(1);
      } else {
        console.log('✅ Inspecciones eliminadas\n');
      }
    }

    // 6. Eliminar archivos HTML del Storage (opcional, pero recomendado)
    console.log('🗑️  Eliminando archivos HTML del Storage...');
    try {
      const { data: initialFiles, error: initialListError } = await supabase.storage
        .from('checklists')
        .list(`${propertyId}/initial`);

      if (!initialListError && initialFiles && initialFiles.length > 0) {
        const filesToDelete = initialFiles.map(f => `${propertyId}/initial/${f.name}`);
        const { error: deleteError } = await supabase.storage
          .from('checklists')
          .remove(filesToDelete);
        
        if (deleteError) {
          console.warn('⚠️  Error eliminando archivos del Storage:', deleteError.message);
        } else {
          console.log(`✅ ${filesToDelete.length} archivo(s) eliminado(s) del Storage`);
        }
      } else {
        console.log('ℹ️  No se encontraron archivos en Storage para eliminar');
      }
    } catch (storageError: any) {
      console.warn('⚠️  Error accediendo al Storage:', storageError.message);
    }

    // 7. Resetear propiedad a fase "initial-check"
    console.log('\n🔄 Reseteando propiedad a fase "initial-check"...');
    const updates: Record<string, any> = {
      'Set Up Status': 'initial check',
      reno_phase: 'initial-check',
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProperty, error: updateError } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', actualPropertyId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error al actualizar la propiedad:', updateError);
      process.exit(1);
    }

    console.log('\n✅ Propiedad reseteada exitosamente:');
    console.log(`   - Set Up Status: ${updatedProperty['Set Up Status']}`);
    console.log(`   - Reno Phase: ${updatedProperty.reno_phase}`);
    console.log('\n🎉 La propiedad ahora está en la fase "initial-check" y lista para realizar el checklist inicial nuevamente.');

  } catch (error: any) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Obtener el propertyId de los argumentos de línea de comandos
const propertyId = process.argv[2];

if (!propertyId) {
  console.error('❌ Por favor proporciona un Property ID');
  console.error('   Uso: npx tsx scripts/reset-to-initial-check.ts <propertyId>');
  console.error('   Ejemplo: npx tsx scripts/reset-to-initial-check.ts SP-TJP-JXR-005643');
  process.exit(1);
}

resetToInitialCheck(propertyId);
