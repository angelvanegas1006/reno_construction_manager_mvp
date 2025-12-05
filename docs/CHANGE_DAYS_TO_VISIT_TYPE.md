# Cambiar days_to_visit de date a numeric

## Problema
El campo `days_to_visit` fue creado como tipo `date` en Supabase cuando debería ser `numeric` (integer).

## Solución

### Paso 1: Ejecutar la migración SQL

1. **Abre Supabase Dashboard**
   - Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto

2. **Ve al SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**

3. **Ejecuta la migración**
   - Abre el archivo `supabase/migrations/009_change_days_to_visit_to_numeric.sql`
   - Copia y pega el contenido en el SQL Editor
   - Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)

### Paso 2: Verificar el cambio

Ejecuta esta consulta para verificar que el tipo cambió correctamente:

```sql
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'properties'
AND column_name = 'days_to_visit';
```

Deberías ver:
- `column_name`: `days_to_visit`
- `data_type`: `integer`
- `is_nullable`: `YES`

### Paso 3: Sincronizar desde Airtable

Una vez cambiado el tipo, ejecuta el script de sincronización:

```bash
npx tsx scripts/update-days-to-visit.ts
```

Este script:
- Obtiene todas las propiedades de Supabase
- Obtiene todas las propiedades de Airtable
- Mapea el campo "Days to visit" de Airtable a `days_to_visit` en Supabase
- Actualiza solo las propiedades que tienen valores diferentes

## Nota importante

La migración eliminará cualquier dato existente en `days_to_visit` porque estaba en formato fecha y necesitamos números. Los datos se repoblarán desde Airtable al ejecutar el script de sincronización.


