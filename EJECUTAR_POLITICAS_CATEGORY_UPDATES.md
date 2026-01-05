# ⚠️ EJECUTAR POLÍTICAS RLS PARA category-updates

## Error actual:
```
StorageApiError: new row violates row-level security policy
```

## ✅ Solución: Crear políticas desde el Dashboard

El bucket `category-updates` existe pero necesita políticas de seguridad (RLS) para permitir subir archivos.

**⚠️ IMPORTANTE:** Si recibes el error "must be owner of relation objects" al ejecutar el SQL, usa el método del Dashboard en su lugar (ver `EJECUTAR_POLITICAS_CATEGORY_UPDATES_DASHBOARD.md`).

### Método 1: Desde el Dashboard (Recomendado)

Ver instrucciones detalladas en: `EJECUTAR_POLITICAS_CATEGORY_UPDATES_DASHBOARD.md`

### Método 2: Desde SQL Editor (Solo si tienes permisos de owner)

1. **Abre Supabase Dashboard**
   - Ve a https://supabase.com
   - Selecciona tu proyecto

2. **Ve al SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - Haz clic en **"New query"**

3. **Ejecuta la migración**
   - Copia el contenido completo del archivo `supabase/migrations/011_create_category_updates_storage_policies.sql`
   - Pégalo en el SQL Editor
   - Haz clic en **"Run"** o presiona `Cmd/Ctrl + Enter`

4. **Verifica que se crearon las políticas**
   - Ve a **Storage** → **Policies** en el Dashboard
   - Busca el bucket `category-updates`
   - Deberías ver 5 políticas:
     - Allow authenticated users to upload category update images
     - Allow public to read category update images
     - Allow authenticated users to read category update images
     - Allow authenticated users to update category update images
     - Allow authenticated users to delete category update images

## ✅ Después de ejecutar las políticas:

Una vez ejecutadas las políticas, podrás:
- ✅ Subir fotos/videos cuando actualizas el progreso de una categoría
- ✅ Ver las fotos en el selector "Seleccionar Imágenes"
- ✅ Enviar updates al cliente con las imágenes adjuntas
- ✅ Las imágenes serán accesibles públicamente en los emails

## 📝 Nota importante:

Las políticas incluyen acceso público de lectura para que las imágenes sean accesibles en los emails que se envíen a los clientes. Solo usuarios autenticados pueden subir/actualizar/eliminar archivos.
