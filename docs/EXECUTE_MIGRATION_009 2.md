# Ejecutar Migración 009: Crear Tabla property_dynamic_categories

## 📋 Contenido de la Migración

Esta migración crea la tabla necesaria para las categorías dinámicas de progreso de obras:
- `property_dynamic_categories` - Categorías de progreso que se extraen del PDF del presupuesto o se crean manualmente

**IMPORTANTE:** Esta tabla es necesaria para que funcione el componente `DynamicCategoriesProgress` en la fase "obras en progreso".

## 🚀 Pasos para Ejecutar

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Abre Supabase Dashboard**
   - Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto de **DEV** (kqqobbxjyrdputngvxrf)

2. **Ve al SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - O ve directamente a: `https://supabase.com/dashboard/project/kqqobbxjyrdputngvxrf/sql/new`

3. **Copia y pega el siguiente SQL:**

Abre el archivo `supabase/migrations/009_create_property_dynamic_categories.sql` y copia todo su contenido.

4. **Ejecuta la migración**
   - Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)
   - Espera a que aparezca el mensaje de éxito

5. **Verifica que se ejecutó correctamente**
   - Deberías ver un mensaje como: `Success. No rows returned`
   - O puedes verificar ejecutando:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'property_dynamic_categories'
   ORDER BY ordinal_position;
   ```

## ✅ Verificación

Después de ejecutar la migración, verifica que la tabla existe:

```sql
-- Verificar que la tabla property_dynamic_categories existe
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'property_dynamic_categories'
ORDER BY ordinal_position;
```

Deberías ver estas columnas:
- `id` (uuid, PRIMARY KEY)
- `property_id` (text, NOT NULL, FK a properties.id)
- `category_name` (text, NOT NULL)
- `activities_text` (text, nullable)
- `percentage` (integer, nullable, CHECK 0-100)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

### Verificar Foreign Key

```sql
-- Verificar que la foreign key existe
SELECT 
  constraint_name,
  table_name,
  column_name,
  foreign_table_name,
  foreign_column_name
FROM information_schema.key_column_usage k
JOIN information_schema.referential_constraints r 
  ON k.constraint_name = r.constraint_name
JOIN information_schema.key_column_usage f 
  ON r.unique_constraint_name = f.constraint_name
WHERE k.table_name = 'property_dynamic_categories'
  AND k.column_name = 'property_id';
```

### Verificar Índices

```sql
-- Verificar que los índices existen
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'property_dynamic_categories';
```

Deberías ver 3 índices:
- `idx_property_dynamic_categories_property_id`
- `idx_property_dynamic_categories_created_at`
- `idx_property_dynamic_categories_updated_at`

## 🔍 Estructura de la Tabla

La tabla `property_dynamic_categories` almacena:

- **category_name**: Nombre de la categoría (ej: "Fontanería", "Electricidad", "Carpintería")
- **activities_text**: Texto descriptivo de las actividades incluidas en esta categoría
- **percentage**: Porcentaje de progreso (0-100). Puede ser NULL inicialmente.
- **property_id**: ID de la propiedad (FK a `properties.id`)

## 📝 Notas

- La tabla se crea con `ON DELETE CASCADE`, por lo que si se elimina una propiedad, se eliminan automáticamente sus categorías.
- El trigger `trigger_update_property_dynamic_categories_updated_at` actualiza automáticamente `updated_at` cuando se modifica un registro.
- El campo `percentage` tiene una restricción CHECK que solo permite valores entre 0 y 100, o NULL.







