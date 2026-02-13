# Bucket `inspection-images` – Checklist (Initial/Final Check) Fotos

Las fotos que se toman en cada sección del initial check y final check se suben al bucket de Supabase Storage **`inspection-images`** (no al bucket `checklists`, que es para HTML de checklists).

- **Código**: [lib/supabase/storage-upload.ts](../lib/supabase/storage-upload.ts) – constante `STORAGE_BUCKET = 'inspection-images'`
- **Path**: `{propertyId}/{inspectionId}/{zoneId}/{fileName}`

## Auth0 y políticas de Storage

La app usa **Auth0** para el login. En ese flujo el cliente **no tiene sesión de Supabase** (`auth.uid()` es `null`). Si las políticas del bucket `inspection-images` exigen `auth.uid() IS NOT NULL` o están definidas solo para `TO authenticated`, las subidas desde el navegador (cliente con anon key) **fallan**. Por tanto, cuando el upload se hace desde el cliente con anon key, las políticas **no deben depender de `auth.uid()`**. En este proyecto se usan políticas para el rol **anon** (ver [migración 021](../supabase/migrations/021_inspection_images_storage_anon.sql) y sección "Políticas RLS").

## Comprobar que el bucket existe

1. Supabase Dashboard → **Storage**
2. En la lista de buckets debe aparecer **`inspection-images`**
3. Si no existe: **New bucket** → Name: `inspection-images` → Public si quieres URLs públicas directas, o privado y usar signed URLs según tu diseño

## Políticas RLS para `inspection-images`

Si el bucket existe pero las subidas fallan con error de RLS/policy, hay que crear políticas sobre `storage.objects` para el bucket `inspection-images`.

### Proyecto actual (Auth0 / anon key)

En este proyecto las políticas aplicadas son las de la migración **[supabase/migrations/021_inspection_images_storage_anon.sql](../supabase/migrations/021_inspection_images_storage_anon.sql)**. Resumen:

- **INSERT** para rol `anon`: permitir subida con `WITH CHECK (bucket_id = 'inspection-images')`.
- **SELECT** para rol `anon` y para `public`: permitir lectura con `USING (bucket_id = 'inspection-images')` para que las URLs de las fotos funcionen.

Si tienes permisos de owner, ejecuta esa migración en Supabase Dashboard → SQL Editor. Si recibes "must be owner of relation objects", configura las políticas desde el Dashboard:

1. Storage → bucket **inspection-images** → **Policies**
2. New policy para **INSERT**: Allow **anon** (no solo authenticated), condition: `bucket_id = 'inspection-images'`.
3. New policy para **SELECT**: Allow **public** o **anon**, condition: `bucket_id = 'inspection-images'`.

### Referencia: políticas que exigen auth.uid() (no usar con Auth0 desde cliente)

Si en el futuro se usara **solo** sesión Supabase (sin Auth0) desde el cliente, podrían usarse políticas que exigen `auth.uid()`:

- **INSERT**: `TO authenticated` con `WITH CHECK (bucket_id = 'inspection-images' AND auth.uid()::text IS NOT NULL)`.
- **SELECT**: `TO public` con `USING (bucket_id = 'inspection-images')`.

Con Auth0 y cliente anon, **no** uses políticas que exijan `auth.uid()` para INSERT en este bucket.

## Script de comprobación

Ejecutar desde la raíz del proyecto:

```bash
npx tsx scripts/check-inspection-images-bucket.ts
```

El script intenta listar el bucket `inspection-images` (o comprobar su existencia). Si falla, indica si el error es "Bucket not found" o RLS. Ver [scripts/check-inspection-images-bucket.ts](../scripts/check-inspection-images-bucket.ts).

## Errores frecuentes

- **Bucket not found**: Crear el bucket `inspection-images` en Storage (Dashboard).
- **RLS / policy**: Añadir políticas de INSERT (y SELECT si aplica) para `inspection-images` como arriba.
- **Tamaño de archivo**: Supabase permite por defecto archivos grandes (p. ej. 50MB). Si en móvil las fotos son muy pesadas, revisar logs (tamaño en [lib/supabase/storage-upload.ts](../lib/supabase/storage-upload.ts)) y valorar compresión en cliente.
