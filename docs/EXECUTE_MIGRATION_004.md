# Ejecutar Migración 004: Agregar columna next_reno_steps

## 📋 Contenido de la Migración

Esta migración agrega la columna `next_reno_steps` a la tabla `properties` en Supabase.

## 🚀 Pasos para Ejecutar

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Abre Supabase Dashboard**
   - Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto

2. **Ve al SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - O ve directamente a: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql/new`

3. **Copia y pega el siguiente SQL:**

```sql
-- Migración: Agregar columna next_reno_steps para Initial Check
-- Ejecutar en Supabase SQL Editor

-- Agregar columna next_reno_steps
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS next_reno_steps TEXT;

-- Crear índice si es necesario
CREATE INDEX IF NOT EXISTS idx_properties_next_reno_steps ON properties(next_reno_steps);

-- Comentario para documentación
COMMENT ON COLUMN properties.next_reno_steps IS 'Next Reno Steps from Airtable (Initial Check phase)';
```

4. **Ejecuta la migración**
   - Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)
   - Espera a que aparezca el mensaje de éxito

5. **Verifica que se ejecutó correctamente**
   - Deberías ver un mensaje como: `Success. No rows returned`
   - O puedes verificar ejecutando:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'properties' 
   AND column_name = 'next_reno_steps';
   ```

### Opción 2: Desde Supabase CLI (Si lo tienes instalado)

```bash
# Desde la raíz del proyecto
cd "/Users/angelvanegas/Desktop/new project/vistral-mvp"

# Ejecutar migración
supabase db push
```

## ✅ Verificación

Después de ejecutar la migración, verifica que la columna existe:

```sql
-- Verificar que la columna existe
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'properties' 
AND column_name = 'next_reno_steps';
```

Deberías ver:
- `column_name`: `next_reno_steps`
- `data_type`: `text`
- `is_nullable`: `YES`

## 🔍 Verificar Índice

```sql
-- Verificar que el índice existe
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'properties' 
AND indexname = 'idx_properties_next_reno_steps';
```

## ⚠️ Notas

- La migración usa `IF NOT EXISTS`, por lo que es segura ejecutarla múltiples veces
- No afectará datos existentes (la columna será NULL para registros existentes)
- La columna es opcional (nullable), así que no requiere valores por defecto

## 🐛 Troubleshooting

### Error: "column already exists"
- Esto significa que la migración ya se ejecutó anteriormente
- Es seguro ignorar este error gracias a `IF NOT EXISTS`

### Error: "permission denied"
- Asegúrate de estar usando una cuenta con permisos de administrador
- Verifica que estás en el proyecto correcto de Supabase

### Error: "relation properties does not exist"
- Verifica que la tabla `properties` existe en tu base de datos
- Revisa que estás en el esquema correcto (`public`)


