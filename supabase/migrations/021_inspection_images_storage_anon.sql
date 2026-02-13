-- ============================================
-- Políticas Storage para bucket inspection-images (acceso anon con Auth0)
-- Con Auth0 no hay sesión Supabase (auth.uid() = null). Esta migración permite
-- que el cliente con anon key pueda subir y leer fotos en inspection-images.
-- Ejecutar en Supabase Dashboard → SQL Editor.
-- Si recibes "must be owner of relation objects", usa Dashboard: Storage → inspection-images → Policies.
-- ============================================

-- Eliminar políticas existentes para inspection-images que exijan auth.uid() (por nombre conocido)
DROP POLICY IF EXISTS "Allow authenticated to upload inspection-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read inspection-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload inspection-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon read inspection-images" ON storage.objects;

-- INSERT: anon puede subir al bucket inspection-images
CREATE POLICY "Allow anon upload inspection-images"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'inspection-images');

-- SELECT: anon (y público) puede leer para que las URLs de fotos funcionen
CREATE POLICY "Allow anon read inspection-images"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'inspection-images');

CREATE POLICY "Allow public read inspection-images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'inspection-images');

-- INSERT/SELECT para authenticated (cuando el cliente envía JWT, p. ej. Auth0)
-- Sin esto la subida devuelve 403 y las fotos no se guardan; al recargar/borrar caché desaparecen.
DROP POLICY IF EXISTS "Allow authenticated upload inspection-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read inspection-images" ON storage.objects;
CREATE POLICY "Allow authenticated upload inspection-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inspection-images');
CREATE POLICY "Allow authenticated read inspection-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'inspection-images');

-- Migración completada
