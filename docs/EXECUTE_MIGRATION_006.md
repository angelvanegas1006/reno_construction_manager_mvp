# Ejecutar Migración 006: Agregar Recordatorios a Comentarios

## 📋 Contenido de la Migración

Esta migración agrega funcionalidad de recordatorios a los comentarios de propiedades:
- Campos de recordatorio en `property_comments`
- Nueva tabla `property_reminders` para gestionar notificaciones

## 🚀 Pasos para Ejecutar

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Abre Supabase Dashboard**
   - Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto

2. **Ve al SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - O ve directamente a: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql/new`

3. **Copia y pega el siguiente SQL:**

Abre el archivo `supabase/migrations/006_add_reminders_to_comments.sql` y copia todo su contenido.

4. **Ejecuta la migración**
   - Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)
   - Espera a que aparezca el mensaje de éxito

5. **Verifica que se ejecutó correctamente**
   - Deberías ver un mensaje como: `Success. No rows returned`
   - O puedes verificar ejecutando:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'property_comments' 
   AND column_name IN ('is_reminder', 'reminder_date', 'reminder_notified', 'reminder_notification_date');
   ```

## ✅ Verificación

Después de ejecutar la migración, verifica que las tablas existen:

```sql
-- Verificar campos de recordatorio en property_comments
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'property_comments'
AND column_name IN ('is_reminder', 'reminder_date', 'reminder_notified', 'reminder_notification_date')
ORDER BY ordinal_position;

-- Verificar tabla property_reminders
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'property_reminders'
ORDER BY ordinal_position;
```

Deberías ver:
- En `property_comments`: `is_reminder`, `reminder_date`, `reminder_notified`, `reminder_notification_date`
- Tabla `property_reminders` con todas sus columnas

## 📝 Notas

- Los recordatorios se crean desde los comentarios
- Cuando se crea un comentario con recordatorio, también se crea un registro en `property_reminders`
- Los recordatorios generarán notificaciones cuando llegue la fecha especificada
- El campo `reminder_notified` indica si ya se envió la notificación

## 🔔 Próximos Pasos

Después de ejecutar esta migración, necesitarás:
1. Crear un cron job o función para verificar recordatorios pendientes
2. Implementar el sistema de notificaciones (email, push, etc.)
3. Actualizar la UI para mostrar recordatorios pendientes


