/**
 * Script para limpiar imágenes y updates de categorías de una propiedad específica
 * Ejecutar con: npx tsx scripts/cleanup-category-updates.ts SP-SRF-ZHJ-001024
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupCategoryUpdates(propertyId: string) {
  console.log(`🧹 Limpiando imágenes y updates para la propiedad: ${propertyId}\n`);

  try {
    // 1. Obtener todos los updates de esta propiedad
    console.log('📋 Buscando updates en la base de datos...');
    const { data: updates, error: updatesError } = await supabase
      .from('category_updates')
      .select('id, photos, videos')
      .eq('property_id', propertyId);

    if (updatesError) {
      console.error('❌ Error al buscar updates:', updatesError.message);
      return false;
    }

    console.log(`✅ Encontrados ${updates?.length || 0} updates\n`);

    // 2. Recopilar todas las URLs de imágenes y videos
    const allImageUrls: string[] = [];
    const allVideoUrls: string[] = [];
    const updateIds: string[] = [];

    (updates || []).forEach((update: any) => {
      updateIds.push(update.id);
      if (update.photos && Array.isArray(update.photos)) {
        allImageUrls.push(...update.photos);
      }
      if (update.videos && Array.isArray(update.videos)) {
        allVideoUrls.push(...update.videos);
      }
    });

    console.log(`📸 Imágenes encontradas: ${allImageUrls.length}`);
    console.log(`🎥 Videos encontrados: ${allVideoUrls.length}\n`);

    // 3. Extraer paths de Storage de las URLs
    const extractStoragePath = (url: string): string | null => {
      try {
        // Las URLs de Supabase Storage tienen el formato:
        // https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
        const match = url.match(/\/storage\/v1\/object\/public\/category-updates\/(.+)$/);
        return match ? match[1] : null;
      } catch (error) {
        return null;
      }
    };

    const imagePaths = allImageUrls
      .map(extractStoragePath)
      .filter((path): path is string => path !== null);
    
    const videoPaths = allVideoUrls
      .map(extractStoragePath)
      .filter((path): path is string => path !== null);

    const allPaths = [...imagePaths, ...videoPaths];

    console.log(`🗂️  Paths de Storage encontrados: ${allPaths.length}\n`);

    // 4. Eliminar archivos del Storage
    if (allPaths.length > 0) {
      console.log('🗑️  Eliminando archivos del Storage...');
      
      // Eliminar en lotes de 100 (límite de Supabase)
      const batchSize = 100;
      for (let i = 0; i < allPaths.length; i += batchSize) {
        const batch = allPaths.slice(i, i + batchSize);
        const { data, error } = await supabase.storage
          .from('category-updates')
          .remove(batch);

        if (error) {
          console.error(`❌ Error al eliminar lote ${Math.floor(i / batchSize) + 1}:`, error.message);
        } else {
          console.log(`✅ Eliminados ${batch.length} archivos del lote ${Math.floor(i / batchSize) + 1}`);
        }
      }
    } else {
      console.log('ℹ️  No hay archivos en Storage para eliminar');
    }

    // 5. Eliminar registros de la base de datos
    if (updateIds.length > 0) {
      console.log(`\n🗑️  Eliminando ${updateIds.length} registros de category_updates...`);
      
      const { error: deleteError } = await supabase
        .from('category_updates')
        .delete()
        .eq('property_id', propertyId);

      if (deleteError) {
        console.error('❌ Error al eliminar registros:', deleteError.message);
        return false;
      }

      console.log(`✅ Eliminados ${updateIds.length} registros de category_updates`);
    } else {
      console.log('ℹ️  No hay registros en category_updates para eliminar');
    }

    // 6. También eliminar cualquier archivo que pueda estar en el folder de la propiedad
    console.log(`\n🗑️  Eliminando archivos restantes en el folder ${propertyId}/...`);
    const { data: listData, error: listError } = await supabase.storage
      .from('category-updates')
      .list(propertyId, {
        limit: 1000,
        offset: 0,
      });

    if (!listError && listData && listData.length > 0) {
      const remainingPaths = listData.map(file => `${propertyId}/${file.name}`);
      
      // Eliminar recursivamente si hay subfolders
      const allRemainingPaths: string[] = [];
      for (const item of listData) {
        if (item.id === null) {
          // Es un folder, listar contenido
          const { data: folderData } = await supabase.storage
            .from('category-updates')
            .list(`${propertyId}/${item.name}`, {
              limit: 1000,
            });
          
          if (folderData) {
            folderData.forEach(file => {
              allRemainingPaths.push(`${propertyId}/${item.name}/${file.name}`);
            });
          }
        } else {
          allRemainingPaths.push(`${propertyId}/${item.name}`);
        }
      }

      if (allRemainingPaths.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < allRemainingPaths.length; i += batchSize) {
          const batch = allRemainingPaths.slice(i, i + batchSize);
          const { error: removeError } = await supabase.storage
            .from('category-updates')
            .remove(batch);

          if (removeError) {
            console.error(`❌ Error al eliminar archivos restantes del lote ${Math.floor(i / batchSize) + 1}:`, removeError.message);
          } else {
            console.log(`✅ Eliminados ${batch.length} archivos restantes del lote ${Math.floor(i / batchSize) + 1}`);
          }
        }
      }
    }

    // 7. Resetear porcentajes de categorías a 0
    console.log(`\n🔄 Reseteando porcentajes de categorías a 0...`);
    const { data: categories, error: categoriesError } = await supabase
      .from('property_dynamic_categories')
      .select('id, category_name')
      .eq('property_id', propertyId);

    if (categoriesError) {
      console.error('❌ Error al buscar categorías:', categoriesError.message);
    } else if (categories && categories.length > 0) {
      console.log(`📋 Encontradas ${categories.length} categorías`);
      
      const { error: resetError } = await supabase
        .from('property_dynamic_categories')
        .update({
          percentage: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('property_id', propertyId);

      if (resetError) {
        console.error('❌ Error al resetear porcentajes:', resetError.message);
      } else {
        console.log(`✅ Reseteados ${categories.length} porcentajes de categorías a 0`);
        categories.forEach((cat: any) => {
          console.log(`   - ${cat.category_name}: 0%`);
        });
      }
    } else {
      console.log('ℹ️  No hay categorías para resetear');
    }

    console.log('\n✅ Reinicio completo exitoso!');
    return true;

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    return false;
  }
}

// Obtener propertyId de los argumentos de línea de comandos
const propertyId = process.argv[2];

if (!propertyId) {
  console.error('❌ Error: Debes proporcionar el ID de la propiedad');
  console.log('Uso: npx tsx scripts/cleanup-category-updates.ts SP-SRF-ZHJ-001024');
  process.exit(1);
}

cleanupCategoryUpdates(propertyId).then(success => {
  process.exit(success ? 0 : 1);
});
