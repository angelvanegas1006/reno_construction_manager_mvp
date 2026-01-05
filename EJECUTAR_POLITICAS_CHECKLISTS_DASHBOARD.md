# ⚠️ CREAR POLÍTICAS RLS PARA checklists (Dashboard)

## Error actual:
```
StorageApiError: new row violates row-level security policy
Error: must be owner of relation objects
```

## ✅ Solución: Crear políticas desde el Dashboard

Como no tienes permisos para crear políticas desde SQL, las crearemos desde el Dashboard de Supabase.

### Pasos:

1. **Abre Supabase Dashboard**
   - Ve a https://supabase.com
   - Selecciona tu proyecto

2. **Ve a Storage → Policies**
   - En el menú lateral, haz clic en **"Storage"**
   - Haz clic en el bucket **"checklists"** (si no existe, créalo primero)
   - Ve a la pestaña **"Policies"**

3. **Crear Política 1: Upload (INSERT)**
   - Haz clic en **"New Policy"**
   - **Policy name:** `Allow authenticated users to upload checklist HTML`
   - **Allowed operation:** ✅ Marca `INSERT`
   - **Target roles:** Selecciona `authenticated`
   - **Policy definition (WITH CHECK):**
     ```sql
     bucket_id = 'checklists' AND auth.uid()::text IS NOT NULL
     ```
   - ⚠️ **IMPORTANTE:** Solo escribe la expresión SQL, sin etiquetas
   - Haz clic en **"Review"** y luego **"Save policy"**

4. **Crear Política 2: Public Read (SELECT)**
   - Haz clic en **"New Policy"**
   - **Policy name:** `Allow public to read checklist HTML`
   - **Allowed operation:** ✅ Marca `SELECT`
   - **Target roles:** Selecciona `public` (o deja por defecto)
   - **Policy definition (USING):**
     ```sql
     bucket_id = 'checklists'
     ```
   - ⚠️ **IMPORTANTE:** Solo escribe la expresión SQL, sin etiquetas
   - Haz clic en **"Review"** y luego **"Save policy"**

5. **Crear Política 3: Authenticated Read (SELECT)**
   - Haz clic en **"New Policy"**
   - **Policy name:** `Allow authenticated users to read checklist HTML`
   - **Allowed operation:** ✅ Marca `SELECT`
   - **Target roles:** Selecciona `authenticated`
   - **Policy definition (USING):**
     ```sql
     bucket_id = 'checklists' AND auth.uid()::text IS NOT NULL
     ```
   - Haz clic en **"Review"** y luego **"Save policy"**

6. **Crear Política 4: Update (UPDATE)**
   - Haz clic en **"New Policy"**
   - **Policy name:** `Allow authenticated users to update checklist HTML`
   - **Allowed operation:** ✅ Marca `UPDATE`
   - **Target roles:** Selecciona `authenticated`
   - **Policy definition (USING):**
     ```sql
     bucket_id = 'checklists' AND auth.uid()::text IS NOT NULL
     ```
   - **Policy definition (WITH CHECK):**
     ```sql
     bucket_id = 'checklists' AND auth.uid()::text IS NOT NULL
     ```
   - Haz clic en **"Review"** y luego **"Save policy"**

7. **Crear Política 5: Delete (DELETE)**
   - Haz clic en **"New Policy"**
   - **Policy name:** `Allow authenticated users to delete checklist HTML`
   - **Allowed operation:** ✅ Marca `DELETE`
   - **Target roles:** Selecciona `authenticated`
   - **Policy definition (USING):**
     ```sql
     bucket_id = 'checklists' AND auth.uid()::text IS NOT NULL
     ```
   - Haz clic en **"Review"** y luego **"Save policy"**

## 🔍 Verificar que el bucket existe

Si el bucket `checklists` no existe:

1. Ve a **Storage** → **Buckets**
2. Haz clic en **"New bucket"**
3. **Name:** `checklists`
4. **Public bucket:** ✅ Marca esta opción (para que los HTML sean accesibles públicamente)
5. Haz clic en **"Create bucket"**

## ✅ Después de Crear las Políticas

1. Recarga la página de la aplicación
2. Intenta finalizar un checklist nuevamente
3. Debería funcionar sin el error de RLS

## 📝 Notas

- Las políticas permiten a usuarios autenticados subir/actualizar/eliminar HTML de checklists
- La política pública permite leer los HTML sin autenticación (necesario para compartir links)
- Si sigues teniendo problemas, verifica que el bucket `checklists` existe y está configurado como público

