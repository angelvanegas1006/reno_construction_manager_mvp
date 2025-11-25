# Ejecutar Migración 007: Crear Tabla de Visitas

## 📋 Contenido de la Migración

Esta migración crea la tabla `property_visits` para gestionar visitas y recordatorios programados:
- Visitas: solo se pueden crear para propiedades en fases específicas
- Recordatorios: se pueden crear para cualquier propiedad del jefe de obra

## 🚀 Pasos para Ejecutar

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Abre Supabase Dashboard**
   - Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto

2. **Ve al SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - O ve directamente a: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql/new`

3. **Copia y pega el siguiente SQL:**

Abre el archivo `supabase/migrations/007_create_visits_table.sql` y copia todo su contenido.

4. **Ejecuta la migración**
   - Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)
   - Espera a que aparezca el mensaje de éxito

5. **Verifica que se ejecutó correctamente**
   - Deberías ver un mensaje como: `Success. No rows returned`
   - O puedes verificar ejecutando:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_name = 'property_visits';
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
WHERE table_name = 'property_visits'
ORDER BY ordinal_position;
```

Deberías ver estas columnas:
- `id` (uuid)
- `property_id` (text)
- `visit_date` (timestamp with time zone)
- `visit_type` (text) - 'visit' o 'reminder'
- `notes` (text)
- `created_by` (text)
- `notified` (boolean)
- `notification_date` (timestamp with time zone)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

## 📝 Notas

- Las visitas solo se pueden crear para propiedades en fases: `upcoming-settlements`, `initial-check`, `reno-in-progress`, `final-check`
- Los recordatorios se pueden crear para cualquier propiedad donde el usuario sea el `responsible_owner` (jefe de obra)
- El campo `visit_type` diferencia entre 'visit' y 'reminder'
- Los recordatorios se muestran con un icono de campana y fondo azul claro

## 🔔 Próximos Pasos

Después de ejecutar esta migración:
1. El componente "Visitas y Recordatorios" estará disponible en el home
2. Podrás crear visitas y recordatorios desde el botón "Crear"
3. Se mostrarán en el home ordenados por fecha


