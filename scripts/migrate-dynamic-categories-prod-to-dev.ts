/**
 * Script para migrar property_dynamic_categories de PRODUCCIÓN a DESARROLLO
 * 
 * IMPORTANTE: Este script requiere:
 * 1. Credenciales de PRODUCCIÓN (se pedirán o se pueden configurar en variables de entorno)
 * 2. Credenciales de DESARROLLO (ya configuradas en .env.local)
 * 3. Que la tabla property_dynamic_categories exista en ambos entornos
 * 
 * USO:
 *   tsx scripts/migrate-dynamic-categories-prod-to-dev.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar .env.local primero, luego .env como fallback
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

// Tipos
type DynamicCategory = Database['public']['Tables']['property_dynamic_categories']['Row'];

// Configuración de PRODUCCIÓN
// ⚠️ IMPORTANTE: Estas credenciales deben ser de PRODUCCIÓN
const PROD_SUPABASE_URL = process.env.PROD_SUPABASE_URL || 'https://fxmobdtjazijugpzkadn.supabase.co';
const PROD_SUPABASE_SERVICE_KEY = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY || process.env.PROD_SERVICE_ROLE_KEY || '';

// Configuración de DESARROLLO (desde .env.local)
const DEV_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const DEV_SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Validar credenciales
if (!PROD_SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: PROD_SUPABASE_SERVICE_ROLE_KEY no está configurado');
  console.log('\n📝 Para configurarlo:');
  console.log('   export PROD_SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key-de-prod"');
  console.log('   O agrégalo a .env.local como: PROD_SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

if (!DEV_SUPABASE_URL || !DEV_SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Credenciales de DESARROLLO no están configuradas en .env.local');
  console.log('\n📝 Asegúrate de tener en .env.local:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://kqqobbxjyrdputngvxrf.supabase.co');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-de-dev');
  process.exit(1);
}

// Crear clientes
const prodClient: SupabaseClient<Database> = createClient(
  PROD_SUPABASE_URL,
  PROD_SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const devClient: SupabaseClient<Database> = createClient(
  DEV_SUPABASE_URL,
  DEV_SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function migrateCategories() {
  console.log('🔄 Iniciando migración de property_dynamic_categories...\n');
  console.log(`📦 PRODUCCIÓN: ${PROD_SUPABASE_URL}`);
  console.log(`🔧 DESARROLLO: ${DEV_SUPABASE_URL}\n`);

  try {
    // 1. Obtener todas las categorías de producción
    console.log('📥 Obteniendo categorías de PRODUCCIÓN...');
    const { data: prodCategories, error: fetchError } = await prodClient
      .from('property_dynamic_categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Error al obtener categorías de producción: ${fetchError.message}`);
    }

    if (!prodCategories || prodCategories.length === 0) {
      console.log('ℹ️  No hay categorías en producción para migrar.');
      return;
    }

    console.log(`✅ Encontradas ${prodCategories.length} categorías en producción\n`);

    // 2. Obtener propiedades de producción para mapear UUID -> Unique ID
    console.log('🔍 Obteniendo propiedades de PRODUCCIÓN para mapeo...');
    const prodPropertyIds = [...new Set(prodCategories.map(cat => cat.property_id))];
    
    const { data: prodProperties, error: prodPropsError } = await prodClient
      .from('properties')
      .select('id, "Unique ID From Engagements"')
      .in('id', prodPropertyIds);

    if (prodPropsError) {
      throw new Error(`Error al obtener propiedades de producción: ${prodPropsError.message}`);
    }

    // Crear mapa: UUID (prod) -> Unique ID From Engagements
    const prodUuidToUniqueId = new Map<string, string>();
    prodProperties?.forEach(prop => {
      const uniqueId = prop['Unique ID From Engagements'];
      if (uniqueId && typeof uniqueId === 'string') {
        prodUuidToUniqueId.set(prop.id, uniqueId);
      }
    });

    console.log(`✅ Mapeadas ${prodUuidToUniqueId.size} propiedades de producción\n`);

    // 3. Obtener propiedades de desarrollo usando Unique ID From Engagements
    console.log('🔍 Verificando qué propiedades existen en DESARROLLO...');
    const uniqueIds = Array.from(prodUuidToUniqueId.values());
    
    const { data: devProperties, error: devPropsError } = await devClient
      .from('properties')
      .select('id, "Unique ID From Engagements"')
      .in('Unique ID From Engagements', uniqueIds);

    if (devPropsError) {
      throw new Error(`Error al verificar propiedades en desarrollo: ${devPropsError.message}`);
    }

    // Crear mapa: Unique ID From Engagements -> id (dev)
    const uniqueIdToDevId = new Map<string, string>();
    devProperties?.forEach(prop => {
      const uniqueId = prop['Unique ID From Engagements'];
      if (uniqueId && typeof uniqueId === 'string') {
        uniqueIdToDevId.set(uniqueId, prop.id);
      }
    });

    const devPropertyIds = new Set(devProperties?.map(p => p.id) || []);
    const missingUniqueIds = uniqueIds.filter(id => !uniqueIdToDevId.has(id));

    if (missingUniqueIds.length > 0) {
      console.log(`⚠️  Advertencia: ${missingUniqueIds.length} propiedades no existen en desarrollo (por Unique ID):`);
      missingUniqueIds.slice(0, 10).forEach(id => console.log(`   - ${id}`));
      if (missingUniqueIds.length > 10) {
        console.log(`   ... y ${missingUniqueIds.length - 10} más`);
      }
      console.log('\n💡 Las categorías de estas propiedades NO se migrarán.\n');
    }

    // 4. Crear mapa final: UUID (prod) -> id (dev)
    const prodUuidToDevId = new Map<string, string>();
    prodUuidToUniqueId.forEach((uniqueId, prodUuid) => {
      const devId = uniqueIdToDevId.get(uniqueId);
      if (devId) {
        prodUuidToDevId.set(prodUuid, devId);
      }
    });

    // 5. Filtrar categorías que tienen property_id válido en desarrollo
    const categoriesToMigrate = prodCategories.filter(cat => prodUuidToDevId.has(cat.property_id));
    const categoriesToSkip = prodCategories.length - categoriesToMigrate.length;

    if (categoriesToSkip > 0) {
      console.log(`⏭️  Se omitirán ${categoriesToSkip} categorías (property_id no existe en dev)\n`);
    }

    if (categoriesToMigrate.length === 0) {
      console.log('ℹ️  No hay categorías para migrar (ninguna propiedad existe en desarrollo).');
      return;
    }

    console.log(`📤 Migrando ${categoriesToMigrate.length} categorías a DESARROLLO...\n`);

    // 6. Verificar si ya existen categorías en desarrollo (para evitar duplicados)
    const devPropertyIdsArray = Array.from(devPropertyIds);
    const { data: existingCategories, error: existingError } = await devClient
      .from('property_dynamic_categories')
      .select('id, property_id, category_name')
      .in('property_id', devPropertyIdsArray.length > 0 ? devPropertyIdsArray : ['']);

    if (existingError) {
      console.warn(`⚠️  No se pudo verificar categorías existentes: ${existingError.message}`);
    }

    const existingMap = new Map<string, Set<string>>();
    if (existingCategories) {
      existingCategories.forEach(cat => {
        if (!existingMap.has(cat.property_id)) {
          existingMap.set(cat.property_id, new Set());
        }
        existingMap.get(cat.property_id)!.add(cat.category_name);
      });
    }

    // 5. Migrar categorías (insertar solo las que no existen)
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const category of categoriesToMigrate) {
      const existing = existingMap.get(category.property_id);
      if (existing && existing.has(category.category_name)) {
        console.log(`⏭️  Omitida: ${category.category_name} (ya existe para ${category.property_id})`);
        skipped++;
        continue;
      }

      try {
        // Mapear property_id de producción a desarrollo
        const devPropertyId = prodUuidToDevId.get(category.property_id);
        if (!devPropertyId) {
          console.log(`⏭️  Omitida: ${category.category_name} (no se encontró mapeo para ${category.property_id})`);
          skipped++;
          continue;
        }

        // Insertar sin el id original (generará uno nuevo)
        const { error: insertError } = await devClient
          .from('property_dynamic_categories')
          .insert({
            property_id: devPropertyId, // Usar el ID de desarrollo mapeado
            category_name: category.category_name,
            activities_text: category.activities_text,
            percentage: category.percentage,
            created_at: category.created_at,
            updated_at: category.updated_at,
          });

        if (insertError) {
          console.error(`❌ Error insertando ${category.category_name} (${category.property_id}): ${insertError.message}`);
          errors++;
        } else {
          inserted++;
          if (inserted % 10 === 0) {
            console.log(`   ✅ Migradas ${inserted} categorías...`);
          }
        }
      } catch (err) {
        console.error(`❌ Error inesperado: ${err}`);
        errors++;
      }
    }

    // 6. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Insertadas: ${inserted}`);
    console.log(`⏭️  Omitidas (ya existían): ${skipped}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📦 Total en producción: ${prodCategories.length}`);
    console.log(`🔧 Total migradas a desarrollo: ${inserted}`);
    console.log('='.repeat(60) + '\n');

    if (errors > 0) {
      console.log('⚠️  Hubo errores durante la migración. Revisa los mensajes arriba.');
      process.exit(1);
    } else {
      console.log('✅ Migración completada exitosamente!');
    }

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateCategories();

