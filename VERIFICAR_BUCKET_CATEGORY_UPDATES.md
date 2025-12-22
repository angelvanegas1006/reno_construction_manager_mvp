# ⚠️ CREAR BUCKET DE STORAGE: category-updates

## Error actual:
```
Bucket not found
StorageApiError: Bucket 'category-updates' no encontrado
```

## Pasos para crear el bucket (5 minutos):

### 1. Abre Supabase Dashboard
- Ve a https://supabase.com
- Inicia sesión y selecciona tu proyecto

### 2. Ve a Storage
- En el menú lateral izquierdo, haz clic en **"Storage"**

### 3. Crea el bucket
- Haz clic en el botón **"New bucket"** o **"Create bucket"** (arriba a la derecha)
- **Nombre del bucket:** `category-updates` (exactamente así, con guión, sin espacios)
- **Public bucket:** ✅ **Marca esta casilla** (muy importante para que las imágenes sean accesibles)
- Haz clic en **"Create bucket"**

### 4. Verifica que se creó
- Deberías ver el bucket `category-updates` en la lista de buckets
- Debe aparecer como "Public"

## ✅ Después de crear el bucket:

Una vez creado, podrás:
- ✅ Subir fotos/videos cuando actualizas el progreso de una categoría
- ✅ Ver las fotos en el selector "Seleccionar Imágenes"
- ✅ Enviar updates al cliente con las imágenes adjuntas

## 🔍 Verificación rápida:

Si ves este error en la consola:
```
Bucket not found
StorageApiError
```

Significa que el bucket aún no existe. Sigue los pasos anteriores para crearlo.

## 📝 Nota importante:

El bucket debe ser **PÚBLICO** para que las imágenes sean accesibles en los emails que se envíen a los clientes.
