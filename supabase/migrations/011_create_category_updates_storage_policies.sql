-- Migración: Crear políticas RLS para el bucket category-updates
-- Ejecutar en Supabase SQL Editor
-- Estas políticas permiten a usuarios autenticados subir, leer y eliminar archivos en el bucket category-updates

-- Eliminar políticas existentes si existen (para poder recrearlas)
DROP POLICY IF EXISTS "Allow authenticated users to upload category update images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read category update images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read category update images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update category update images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete category update images" ON storage.objects;

-- 1. Política para INSERT (subir archivos)
CREATE POLICY "Allow authenticated users to upload category update images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'category-updates' AND
  auth.uid()::text IS NOT NULL
);

-- 2. Política para SELECT (leer archivos) - Público para que las imágenes sean accesibles en emails
CREATE POLICY "Allow public to read category update images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'category-updates'
);

-- 3. Política para SELECT (leer archivos) - También para usuarios autenticados
CREATE POLICY "Allow authenticated users to read category update images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'category-updates' AND
  auth.uid()::text IS NOT NULL
);

-- 4. Política para UPDATE (actualizar archivos)
CREATE POLICY "Allow authenticated users to update category update images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'category-updates' AND
  auth.uid()::text IS NOT NULL
)
WITH CHECK (
  bucket_id = 'category-updates' AND
  auth.uid()::text IS NOT NULL
);

-- 5. Política para DELETE (eliminar archivos)
CREATE POLICY "Allow authenticated users to delete category update images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'category-updates' AND
  auth.uid()::text IS NOT NULL
);

-- Comentarios para documentación
COMMENT ON POLICY "Allow authenticated users to upload category update images" ON storage.objects IS 'Permite a usuarios autenticados subir imágenes/videos de updates de categorías';
COMMENT ON POLICY "Allow public to read category update images" ON storage.objects IS 'Permite acceso público de lectura a las imágenes para que sean accesibles en emails';
COMMENT ON POLICY "Allow authenticated users to read category update images" ON storage.objects IS 'Permite a usuarios autenticados leer imágenes/videos de updates de categorías';
COMMENT ON POLICY "Allow authenticated users to update category update images" ON storage.objects IS 'Permite a usuarios autenticados actualizar imágenes/videos de updates de categorías';
COMMENT ON POLICY "Allow authenticated users to delete category update images" ON storage.objects IS 'Permite a usuarios autenticados eliminar imágenes/videos de updates de categorías';
