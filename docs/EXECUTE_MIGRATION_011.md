# Ejecutar Migración 011: Agregar campo pics_urls a properties

## 📋 Descripción
Esta migración agrega el campo `pics_urls` a la tabla `properties` en Supabase para almacenar las URLs de las fotos de las propiedades que vienen de Airtable.

**Field ID en Airtable:** `fldq1FLXBToYEY9W3`

## 🎯 Objetivo
Sincronizar las URLs de fotos desde Airtable hacia Supabase para poder mostrarlas en la aplicación.

## 📝 Pasos para Ejecutar

### 1. Acceder a Supabase SQL Editor
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona el proyecto **vistral-dev** (ID: `kqqobbxjyrdputngvxrf`)
3. Ve a **SQL Editor** en el menú lateral

### 2. Ejecutar la Migración
1. Crea una nueva query o abre el editor SQL
2. Copia y pega el contenido completo del archivo:
   ```
   supabase/migrations/011_add_pics_urls_to_properties.sql
   ```
3. Haz click en **Run** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)

### 3. Verificar la Migración
Ejecuta esta query para verificar que el campo se creó correctamente:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'properties'
  AND column_name = 'pics_urls';
```

Deberías ver:
- `column_name`: `pics_urls`
- `data_type`: `ARRAY` (o `text[]`)
- `column_default`: `'{}'`

### 4. Verificar el Índice
Ejecuta esta query para verificar que el índice se creó:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'properties'
  AND indexname = 'idx_properties_pics_urls';
```

## ✅ Resultado Esperado
- ✅ Campo `pics_urls` agregado a la tabla `properties` como `TEXT[]`
- ✅ Índice GIN creado para búsquedas rápidas
- ✅ Valor por defecto: array vacío `[]`

## 🔄 Sincronización
Una vez ejecutada la migración, las URLs de fotos se sincronizarán automáticamente desde Airtable cuando ejecutes:

```bash
npm run sync:reno-in-progress
# o cualquier otro script de sincronización
```

## 📊 Estructura del Campo
- **Tipo**: `TEXT[]` (array de strings)
- **Valor por defecto**: `[]` (array vacío)
- **Ejemplo de valor**: `['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']`

## ⚠️ Notas
- El campo puede contener múltiples URLs (array)
- Las URLs se extraen automáticamente desde Airtable usando el field ID `fldq1FLXBToYEY9W3`
- El campo acepta tanto arrays de URLs como strings con URLs separadas por comas o saltos de línea





