# 🔐 Políticas de Storage para Supabase

## ⚠️ Error: "new row violates row-level security policy"

Este error ocurre cuando un bucket de storage tiene RLS habilitado pero no tiene políticas que permitan subir archivos.

## 📦 Buckets que Necesitan Políticas

### 1. `inspection-images` - Fotos del checklist
### 2. `checklists` - PDFs/HTML de checklists completados ⚠️ **ESTE ES EL QUE ESTÁ FALLANDO**

---

## ✅ Solución: Crear Políticas RLS

### Paso 1: Ir al SQL Editor en Supabase

1. Ve a tu **Supabase Dashboard**: https://supabase.com/dashboard
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New query"**

### Paso 2: Ejecutar las Políticas para `checklists` (CHECKLIST PDFs)

**⚠️ IMPORTANTE: Este es el bucket que está causando el error actual**

Copia y pega este SQL en el editor y haz clic en **"Run"**:

```sql
-- ============================================
-- POLÍTICAS PARA EL BUCKET 'checklists'
-- ============================================
-- Permite a usuarios autenticados subir, leer y eliminar archivos HTML de checklists

-- Eliminar políticas existentes si existen (para evitar errores)
DROP POLICY IF EXISTS "Allow authenticated users to upload checklist HTML" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read checklist HTML" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read checklist HTML" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update checklist HTML" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete checklist HTML" ON storage.objects;

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
```

### Paso 3: Ejecutar las Políticas para `inspection-images` (Fotos del checklist)

```sql
-- ============================================
-- POLÍTICAS PARA EL BUCKET 'inspection-images'
-- ============================================
-- Permite a usuarios autenticados subir, leer y eliminar sus propios archivos

-- Eliminar políticas existentes si existen (para evitar errores)
DROP POLICY IF EXISTS "Allow authenticated users to upload inspection images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read inspection images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update inspection images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete inspection images" ON storage.objects;

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

### Paso 4: Verificar que el Bucket `checklists` es Público ⚠️ **IMPORTANTE**

El bucket `checklists` **DEBE estar configurado como público** para que los HTML sean accesibles:

1. Ve a **Storage** → **Buckets** en el Dashboard
2. Busca el bucket **`checklists`**
3. Haz clic en el bucket para abrir sus configuraciones
4. Verifica que **"Public bucket"** esté marcado ✅
5. Si no está marcado:
   - Haz clic en el ícono de edición (lápiz)
   - Marca la casilla **"Public bucket"**
   - Guarda los cambios

**⚠️ Sin esto, los HTML no serán accesibles públicamente y recibirás errores 400/403.**

### Paso 5: Verificar que las Políticas se Crearon

1. Ve a **Storage** → **Policies** en el Dashboard
2. Busca los buckets `checklists` e `inspection-images`
3. Deberías ver las políticas listadas arriba para cada bucket

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

