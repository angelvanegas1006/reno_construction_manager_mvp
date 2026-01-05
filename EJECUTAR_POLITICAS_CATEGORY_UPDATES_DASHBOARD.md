# ⚠️ CREAR POLÍTICAS RLS PARA category-updates (Dashboard)

## Error actual:
```
StorageApiError: new row violates row-level security policy
```

## ✅ Solución: Crear políticas desde el Dashboard

Como no tienes permisos para crear políticas desde SQL, las crearemos desde el Dashboard de Supabase.

### Pasos:

1. **Abre Supabase Dashboard**
   - Ve a https://supabase.com
   - Selecciona tu proyecto

2. **Ve a Storage → Policies**
   - En el menú lateral, haz clic en **"Storage"**
   - Haz clic en el bucket **"category-updates"**
   - Ve a la pestaña **"Policies"**

3. **Crear Política 1: Upload (INSERT)**
   - Haz clic en **"New Policy"**
   - **Policy name:** `INSERT category-updates` (23 caracteres)
   - **Allowed operation:** ✅ Marca `INSERT`
   - **Target roles:** Selecciona `authenticated`
   - **Policy definition (WITH CHECK):** (Este es el único campo que aparece para INSERT)
     ```sql
     bucket_id = 'category-updates' AND auth.uid()::text IS NOT NULL
     ```
   - ⚠️ **IMPORTANTE:** Solo escribe la expresión SQL, sin etiquetas como "WITH CHECK expression:"
   - Haz clic en **"Review"** y luego **"Save policy"**

4. **Crear Política 2: Public Read (SELECT)**
   - Haz clic en **"New Policy"**
   - **Policy name:** `SELECT public category-updates` (28 caracteres)
   - **Allowed operation:** ✅ Marca `SELECT`
   - **Target roles:** Selecciona `public` (o deja por defecto)
   - **Policy definition (USING):** (Este es el campo que aparece para SELECT)
     ```sql
     bucket_id = 'category-updates'
     ```
   - ⚠️ **IMPORTANTE:** Solo escribe la expresión SQL, sin etiquetas
   - Haz clic en **"Review"** y luego **"Save policy"**

5. **Crear Política 3: Authenticated Read (SELECT)**
   - Haz clic en **"New Policy"**
   - **Policy name:** `SELECT auth category-updates` (26 caracteres)
   - **Allowed operation:** ✅ Marca `SELECT`
   - **Target roles:** Selecciona `authenticated`
   - **Policy definition (USING):** (Este es el campo que aparece para SELECT)
     ```sql
     bucket_id = 'category-updates' AND auth.uid()::text IS NOT NULL
     ```
   - ⚠️ **IMPORTANTE:** Solo escribe la expresión SQL, sin etiquetas
   - Haz clic en **"Review"** y luego **"Save policy"**

6. **Crear Política 4: Update**
   - Haz clic en **"New Policy"**
   - **Policy name:** `UPDATE category-updates` (23 caracteres)
   - **Allowed operation:** ✅ Marca `UPDATE` (SELECT se seleccionará automáticamente)
   - **Target roles:** Selecciona `authenticated`
   - **USING expression:** (Campo "Policy definition" - solo la expresión, sin etiquetas)
     ```sql
     bucket_id = 'category-updates' AND auth.uid()::text IS NOT NULL
     ```
   - **WITH CHECK expression:** (Campo separado que aparece cuando seleccionas UPDATE)
     ```sql
     bucket_id = 'category-updates' AND auth.uid()::text IS NOT NULL
     ```
   - ⚠️ **IMPORTANTE:** 
     - En el campo "Policy definition" (USING) solo pon: `bucket_id = 'category-updates' AND auth.uid()::text IS NOT NULL`
     - En el campo "WITH CHECK expression" (si aparece separado) pon: `bucket_id = 'category-updates' AND auth.uid()::text IS NOT NULL`
     - **NO escribas** "WITH CHECK expression:" como texto, solo la expresión SQL
   - Haz clic en **"Review"** y luego **"Save policy"**

7. **Crear Política 5: Delete**
   - Haz clic en **"New Policy"**
   - **Policy name:** `DELETE category-updates` (24 caracteres)
   - **Allowed operation:** ✅ Marca `DELETE` (SELECT se seleccionará automáticamente)
   - **Target roles:** Selecciona `authenticated`
   - **Policy definition (USING):** (Este es el campo que aparece para DELETE)
     ```sql
     bucket_id = 'category-updates' AND auth.uid()::text IS NOT NULL
     ```
   - ⚠️ **IMPORTANTE:** Solo escribe la expresión SQL, sin etiquetas
   - Haz clic en **"Review"** y luego **"Save policy"**

## ✅ Verificación:

Después de crear las 5 políticas, deberías poder:
- ✅ Subir fotos/videos cuando actualizas el progreso de una categoría
- ✅ Ver las fotos en el selector "Seleccionar Imágenes"
- ✅ Enviar updates al cliente con las imágenes adjuntas
- ✅ Las imágenes serán accesibles públicamente en los emails

## 📝 Resumen de políticas creadas:

| # | Nombre (≤50 caracteres) | Operación | Roles |
|---|------------------------|-----------|-------|
| 1 | `INSERT category-updates` | INSERT | authenticated |
| 2 | `SELECT public category-updates` | SELECT | public |
| 3 | `SELECT auth category-updates` | SELECT | authenticated |
| 4 | `UPDATE category-updates` | UPDATE | authenticated |
| 5 | `DELETE category-updates` | DELETE | authenticated |

## 📝 Nota importante:

La política de lectura pública (`SELECT public category-updates`) es necesaria para que las imágenes sean accesibles en los emails que se envíen a los clientes.
