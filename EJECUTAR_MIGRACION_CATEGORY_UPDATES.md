# Ejecutar Migración: category_updates

## ⚠️ IMPORTANTE

La tabla `category_updates` no existe aún en Supabase. Necesitas ejecutar la migración SQL antes de poder usar la funcionalidad de "Enviar Update a Cliente".

## Pasos para ejecutar la migración:

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto en https://supabase.com
   - Navega a "SQL Editor"

2. **Ejecuta la migración**
   - Copia el contenido completo del archivo `supabase/migrations/010_create_category_updates.sql`
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en "Run" o presiona `Cmd/Ctrl + Enter`

3. **Verifica que se creó correctamente**
   - Ve a "Table Editor" en Supabase
   - Deberías ver la tabla `category_updates` en la lista

## ¿Qué crea esta migración?

- Tabla `category_updates` para almacenar updates de progreso con fotos/videos
- Índices para búsquedas rápidas
- Foreign keys a `property_dynamic_categories` y `properties`

## Después de ejecutar la migración:

Una vez ejecutada la migración, podrás:
- Ver imágenes en el selector "Seleccionar Imágenes"
- Enviar updates al cliente con fotos adjuntas
- Ver el historial de updates por categoría
