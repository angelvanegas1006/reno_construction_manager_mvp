# Ejecutar Migración 005: Crear tabla de comentarios

## 📋 Contenido de la Migración

Esta migración crea la tabla `property_comments` en Supabase para almacenar comentarios asociados a propiedades.

## 🚀 Pasos para Ejecutar

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Abre Supabase Dashboard**
   - Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto

2. **Ve al SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - O ve directamente a: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql/new`

3. **Copia y pega el siguiente SQL:**

Abre el archivo `supabase/migrations/005_create_property_comments.sql` y copia todo su contenido.

4. **Ejecuta la migración**
   - Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)
   - Espera a que aparezca el mensaje de éxito

5. **Verifica que se ejecutó correctamente**
   - Deberías ver un mensaje como: `Success. No rows returned`
   - O puedes verificar ejecutando:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name = 'property_comments';
   ```

## ✅ Verificación

Después de ejecutar la migración, verifica que la tabla existe:

```sql
-- Verificar que la tabla existe
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'property_comments'
ORDER BY ordinal_position;
```

Deberías ver estas columnas:
- `id` (uuid)
- `property_id` (text)
- `comment_text` (text)
- `created_by` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `synced_to_airtable` (boolean)
- `airtable_sync_date` (timestamp)

## 📝 Notas

- La tabla tiene un índice en `property_id` para búsquedas rápidas
- Los comentarios se sincronizan con Airtable combinando todos los comentarios con timestamps
- El campo `synced_to_airtable` indica si el comentario ya fue sincronizado









