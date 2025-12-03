# Ejecutar Migración 001: Checklist Migrations

## 📋 Contenido de la Migración

Esta migración crea las tablas necesarias para el sistema de checklist:
- `property_inspections` - Inspecciones de propiedades (initial/final)
- `inspection_zones` - Zonas de inspección
- `inspection_elements` - Elementos de inspección

**IMPORTANTE:** Esta migración incluye la columna `inspection_type` que es necesaria para el componente `PropertyStatusTab`.

## 🚀 Pasos para Ejecutar

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Abre Supabase Dashboard**
   - Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto

2. **Ve al SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - O ve directamente a: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql/new`

3. **Copia y pega el siguiente SQL:**

Abre el archivo `supabase/migrations/001_checklist_migrations.sql` y copia todo su contenido.

4. **Ejecuta la migración**
   - Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)
   - Espera a que aparezca el mensaje de éxito

5. **Verifica que se ejecutó correctamente**
   - Deberías ver un mensaje como: `Success. No rows returned`
   - O puedes verificar ejecutando:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'property_inspections'
   AND column_name = 'inspection_type';
   ```

## ✅ Verificación

Después de ejecutar la migración, verifica que las tablas existen:

```sql
-- Verificar que la tabla property_inspections existe con inspection_type
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'property_inspections'
ORDER BY ordinal_position;
```

Deberías ver estas columnas:
- `id` (uuid)
- `property_id` (text)
- `inspection_type` (text) - **IMPORTANTE: Esta columna debe existir**
- `inspection_status` (text)
- `created_at` (timestamp)
- `created_by` (text)
- `completed_at` (timestamp)
- `metadata` (jsonb)
- `pdf_url` (text)
- `public_link_id` (text)
- `has_elevator` (boolean)

## 📝 Notas

- La columna `inspection_type` es crítica para el funcionamiento del componente `PropertyStatusTab`
- Si la migración falla porque alguna tabla ya existe, puedes ejecutar solo las partes que faltan
- Los tipos ENUM se crean automáticamente si no existen









