#!/usr/bin/env tsx
/**
 * Comprueba que el bucket inspection-images existe y es accesible.
 * Uso: npx tsx scripts/check-inspection-images-bucket.ts
 * Ver: docs/SUPABASE_STORAGE_INSPECTION_IMAGES.md
 */

import { loadEnvConfig } from '@next/env';
import { createAdminClient } from '@/lib/supabase/admin';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const BUCKET = 'inspection-images';

async function main() {
  const supabase = createAdminClient();

  console.log(`\n🔍 Comprobando bucket de Storage: ${BUCKET}\n`);

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ Error listando buckets:', listError.message);
    console.log('\n💡 Comprueba que el proyecto tiene Storage habilitado y que las variables de entorno de Supabase son correctas.');
    process.exit(1);
  }

  const found = buckets?.find((b) => b.name === BUCKET);
  if (!found) {
    console.log(`❌ Bucket "${BUCKET}" no encontrado.`);
    console.log('\nBuckets existentes:', buckets?.map((b) => b.name).join(', ') || '(ninguno)');
    console.log('\n💡 Crear el bucket en Supabase Dashboard → Storage → New bucket → Name:', BUCKET);
    console.log('   Ver: docs/SUPABASE_STORAGE_INSPECTION_IMAGES.md');
    process.exit(1);
  }

  console.log('✅ Bucket encontrado:', found.name);
  console.log('   Public:', found.public ?? 'N/A');
  console.log('   Created:', (found as any).created_at ?? 'N/A');

  const { data: files, error: listFilesError } = await supabase.storage.from(BUCKET).list('', { limit: 5 });
  if (listFilesError) {
    console.warn('\n⚠️ No se pudo listar el contenido del bucket (puede ser RLS):', listFilesError.message);
    console.log('   Si las subidas fallan, revisa las políticas RLS para', BUCKET);
    console.log('   Ver: docs/SUPABASE_STORAGE_INSPECTION_IMAGES.md');
  } else {
    const count = files?.length ?? 0;
    console.log('\n📁 Primeros elementos en la raíz:', count);
    if (count > 0) {
      files?.slice(0, 5).forEach((f) => console.log('   -', f.name));
    }
  }

  console.log('\n✅ Comprobación terminada.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
