-- Migración: Crear políticas RLS para el bucket checklists
-- ⚠️ IMPORTANTE: Si recibes error "must be owner of relation objects", 
-- usa el Dashboard de Supabase en lugar de SQL Editor.
-- Ver: EJECUTAR_POLITICAS_CHECKLISTS_DASHBOARD.md
--
-- Estas políticas permiten a usuarios autenticados subir, leer y eliminar archivos HTML de checklists
--
-- NOTA: Si tienes permisos de administrador, puedes ejecutar este SQL.
-- Si no, usa el Dashboard: Storage → checklists → Policies → New Policy

-- Eliminar políticas existentes si existen (para poder recrearlas)
-- ⚠️ Solo ejecutar si tienes permisos de administrador
-- DROP POLICY IF EXISTS "Allow authenticated users to upload checklist HTML" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow public to read checklist HTML" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated users to read checklist HTML" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated users to update checklist HTML" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated users to delete checklist HTML" ON storage.objects;

-- 1. Política para INSERT (subir archivos HTML de checklists)
CREATE POLICY "Allow authenticated users to upload checklist HTML"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'checklists' AND
  auth.uid()::text IS NOT NULL
);

-- 2. Política para SELECT (leer archivos HTML) - Público para que los HTML sean accesibles
CREATE POLICY "Allow public to read checklist HTML"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'checklists'
);

-- 3. Política para SELECT (leer archivos HTML) - También para usuarios autenticados
CREATE POLICY "Allow authenticated users to read checklist HTML"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'checklists' AND
  auth.uid()::text IS NOT NULL
);

-- 4. Política para UPDATE (actualizar archivos HTML)
CREATE POLICY "Allow authenticated users to update checklist HTML"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'checklists' AND
  auth.uid()::text IS NOT NULL
)
WITH CHECK (
  bucket_id = 'checklists' AND
  auth.uid()::text IS NOT NULL
);

-- 5. Política para DELETE (eliminar archivos HTML)
CREATE POLICY "Allow authenticated users to delete checklist HTML"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'checklists' AND
  auth.uid()::text IS NOT NULL
);

-- Comentarios para documentación
COMMENT ON POLICY "Allow authenticated users to upload checklist HTML" ON storage.objects IS 'Permite a usuarios autenticados subir archivos HTML de checklists';
COMMENT ON POLICY "Allow public to read checklist HTML" ON storage.objects IS 'Permite acceso público de lectura a los HTML de checklists para que sean accesibles';
COMMENT ON POLICY "Allow authenticated users to read checklist HTML" ON storage.objects IS 'Permite a usuarios autenticados leer archivos HTML de checklists';
COMMENT ON POLICY "Allow authenticated users to update checklist HTML" ON storage.objects IS 'Permite a usuarios autenticados actualizar archivos HTML de checklists';
COMMENT ON POLICY "Allow authenticated users to delete checklist HTML" ON storage.objects IS 'Permite a usuarios autenticados eliminar archivos HTML de checklists';

