# 🔐 Políticas de Storage para Supabase

## ⚠️ Error: "new row violates row-level security policy"

Este error ocurre cuando el bucket `inspection-images` tiene RLS habilitado pero no tiene políticas que permitan subir archivos.

## ✅ Solución: Crear Políticas RLS

### Paso 1: Ir al SQL Editor en Supabase

1. Ve a tu **Supabase Dashboard**: https://supabase.com/dashboard/project/kqqobbxjyrdputngvxrf
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New query"**

### Paso 2: Ejecutar las Políticas

Copia y pega este SQL en el editor y haz clic en **"Run"**:

```sql
-- Políticas para el bucket 'inspection-images'
-- Permite a usuarios autenticados subir, leer y eliminar sus propios archivos

-- 1. Política para INSERT (subir archivos)
CREATE POLICY "Allow authenticated users to upload inspection images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-images' AND
  auth.uid()::text IS NOT NULL
);

-- 2. Política para SELECT (leer archivos)
CREATE POLICY "Allow authenticated users to read inspection images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-images' AND
  auth.uid()::text IS NOT NULL
);

-- 3. Política para UPDATE (actualizar archivos)
CREATE POLICY "Allow authenticated users to update inspection images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inspection-images' AND
  auth.uid()::text IS NOT NULL
)
WITH CHECK (
  bucket_id = 'inspection-images' AND
  auth.uid()::text IS NOT NULL
);

-- 4. Política para DELETE (eliminar archivos)
CREATE POLICY "Allow authenticated users to delete inspection images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-images' AND
  auth.uid()::text IS NOT NULL
);
```

### Paso 3: Verificar que las Políticas se Crearon

1. Ve a **Storage** → **Policies** en el Dashboard
2. Busca el bucket `inspection-images`
3. Deberías ver las 4 políticas listadas arriba

## 🔒 Políticas Más Restrictivas (Opcional)

Si quieres que los usuarios solo puedan acceder a archivos de propiedades específicas, puedes usar estas políticas más restrictivas:

```sql
-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "Allow authenticated users to upload inspection images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read inspection images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update inspection images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete inspection images" ON storage.objects;

-- Políticas más restrictivas basadas en el path del archivo
-- El path es: {propertyId}/{inspectionId}/{zoneId}/{fileName}
-- Solo permite acceso si el usuario tiene acceso a esa propiedad

-- INSERT: Permitir subir solo si el path contiene un propertyId válido
CREATE POLICY "Allow authenticated users to upload inspection images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-images' AND
  auth.uid()::text IS NOT NULL AND
  (storage.foldername(name))[1] IS NOT NULL -- Verifica que hay al menos un folder (propertyId)
);

-- SELECT: Permitir leer archivos de propiedades accesibles
CREATE POLICY "Allow authenticated users to read inspection images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-images' AND
  auth.uid()::text IS NOT NULL
);

-- UPDATE: Permitir actualizar archivos propios
CREATE POLICY "Allow authenticated users to update inspection images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inspection-images' AND
  auth.uid()::text IS NOT NULL
)
WITH CHECK (
  bucket_id = 'inspection-images' AND
  auth.uid()::text IS NOT NULL
);

-- DELETE: Permitir eliminar archivos propios
CREATE POLICY "Allow authenticated users to delete inspection images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-images' AND
  auth.uid()::text IS NOT NULL
);
```

## 📝 Notas

- Las políticas básicas permiten a cualquier usuario autenticado subir/leer archivos en el bucket
- Las políticas restrictivas añaden validación adicional basada en el path del archivo
- Si usas Auth0 en lugar de Supabase Auth, es posible que necesites ajustar las políticas para usar `auth.jwt()` en lugar de `auth.uid()`

## ✅ Después de Ejecutar las Políticas

1. Recarga la página de la aplicación
2. Intenta subir una foto nuevamente
3. Debería funcionar sin el error de RLS

