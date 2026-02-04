# Bucket `inspection-images` – Checklist (Initial/Final Check) Fotos

Las fotos que se toman en cada sección del initial check y final check se suben al bucket de Supabase Storage **`inspection-images`** (no al bucket `checklists`, que es para HTML de checklists).

- **Código**: [lib/supabase/storage-upload.ts](../lib/supabase/storage-upload.ts) – constante `STORAGE_BUCKET = 'inspection-images'`
- **Path**: `{propertyId}/{inspectionId}/{zoneId}/{fileName}`

## Comprobar que el bucket existe

1. Supabase Dashboard → **Storage**
2. En la lista de buckets debe aparecer **`inspection-images`**
3. Si no existe: **New bucket** → Name: `inspection-images` → Public si quieres URLs públicas directas, o privado y usar signed URLs según tu diseño

## Políticas RLS para `inspection-images`

Si el bucket existe pero las subidas fallan con error de RLS/policy, hay que crear políticas sobre `storage.objects` para el bucket `inspection-images`.

### Opción A: Desde el Dashboard

1. Storage → bucket **inspection-images** → **Policies**
2. New policy:
   - **INSERT**: Allow authenticated users – condition: `bucket_id = 'inspection-images'` y `auth.uid() IS NOT NULL`
   - **SELECT**: Allow public o authenticated – condition: `bucket_id = 'inspection-images'` (para que las URLs públicas funcionen si el bucket es público)
   - **UPDATE** / **DELETE** (opcional): Allow authenticated, mismo bucket

### Opción B: SQL (requiere permisos de owner)

En SQL Editor de Supabase puedes crear políticas similares a las del bucket `checklists` pero para `inspection-images`:

```sql
-- INSERT: usuarios autenticados pueden subir
CREATE POLICY "Allow authenticated to upload inspection-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inspection-images' AND auth.uid()::text IS NOT NULL);

-- SELECT: lectura (público o authenticated según si el bucket es público)
CREATE POLICY "Allow public read inspection-images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'inspection-images');
```

Si ya existen políticas con otros nombres para este bucket, no duplicar; revisar en Storage → inspection-images → Policies.

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
