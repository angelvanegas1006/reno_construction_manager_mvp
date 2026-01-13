#!/usr/bin/env tsx
/**
 * Script para verificar el estado de una propiedad
 * Uso: npx tsx scripts/verify-property-phase.ts <propertyId>
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

async function verifyProperty(propertyId: string) {
  console.log(`🔍 Verificando propiedad ${propertyId}...\n`);

  const supabase = createAdminClient();

  try {
    // Buscar la propiedad
    let { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('id, address, "Set Up Status", reno_phase, "Unique ID From Engagements"')
      .eq('id', propertyId)
      .single();

    if (fetchError || !property) {
      const { data: propertyByUniqueId } = await supabase
        .from('properties')
        .select('id, address, "Set Up Status", reno_phase, "Unique ID From Engagements"')
        .eq('Unique ID From Engagements', propertyId)
        .single();
      
      if (!propertyByUniqueId) {
        console.error('❌ Propiedad no encontrada');
        process.exit(1);
      }
      
      property = propertyByUniqueId;
    }

    console.log('✅ Propiedad:');
    console.log(`   ID: ${property.id}`);
    console.log(`   Dirección: ${property.address || 'N/A'}`);
    console.log(`   Set Up Status: ${property['Set Up Status'] || 'N/A'}`);
    console.log(`   Reno Phase: ${property.reno_phase || 'N/A'}\n`);

    // Verificar inspecciones
    const { data: inspections, error: inspectionsError } = await supabase
      .from('property_inspections')
      .select('id, inspection_type, inspection_status, created_at')
      .eq('property_id', property.id);

    if (inspectionsError) {
      console.error('❌ Error buscando inspecciones:', inspectionsError);
    } else {
      console.log(`📋 Inspecciones: ${inspections?.length || 0}`);
      if (inspections && inspections.length > 0) {
        inspections.forEach((inspection) => {
          console.log(`   - ${inspection.inspection_type} (${inspection.inspection_status}) - ${inspection.created_at}`);
        });
      } else {
        console.log('   ✅ No hay inspecciones (correcto para fase initial-check)');
      }
    }

    // Verificar archivos en Storage
    console.log('\n📦 Archivos en Storage:');
    try {
      const { data: initialFiles } = await supabase.storage
        .from('checklists')
        .list(`${propertyId}/initial`);

      if (initialFiles && initialFiles.length > 0) {
        console.log(`   ⚠️  Encontrados ${initialFiles.length} archivo(s) en Storage:`);
        initialFiles.forEach((file) => {
          console.log(`      - ${file.name} (${file.metadata?.size || 0} bytes)`);
        });
      } else {
        console.log('   ✅ No hay archivos en Storage (correcto)');
      }
    } catch (storageError: any) {
      console.log('   ℹ️  No se pudo verificar Storage:', storageError.message);
    }

    console.log('\n✅ Verificación completada');

  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

const propertyId = process.argv[2];
if (!propertyId) {
  console.error('❌ Por favor proporciona un Property ID');
  process.exit(1);
}

verifyProperty(propertyId);
