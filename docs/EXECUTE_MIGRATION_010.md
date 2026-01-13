# Ejecutar Migración 010: Arreglar índice de next_reno_steps

## 📋 Problema

El índice `idx_properties_next_reno_steps` está causando errores al insertar propiedades con contenido largo en el campo `next_reno_steps`:

```
Error: index row size 5688 exceeds btree version 4 maximum 2704 for index "idx_properties_next_reno_steps"
```

**Causa:** PostgreSQL tiene un límite de tamaño para índices B-tree (2704 bytes). Cuando el campo `next_reno_steps` contiene texto muy largo, excede este límite.

## 🔧 Solución

Eliminar el índice B-tree ya que:
1. El campo `next_reno_steps` no se usa para búsquedas frecuentes
2. Es principalmente un campo descriptivo/informativo
3. Si en el futuro se necesita buscar en este campo, se puede crear un índice GIN de texto completo

## 🚀 Pasos para Ejecutar

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Abre Supabase Dashboard**
   - Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto de **DEV** (kqqobbxjyrdputngvxrf)

2. **Ve al SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - O ve directamente a: `https://supabase.com/dashboard/project/kqqobbxjyrdputngvxrf/sql/new`

3. **Copia y pega el siguiente SQL:**

Abre el archivo `supabase/migrations/010_fix_next_reno_steps_index.sql` y copia todo su contenido.

4. **Ejecuta la migración**
   - Haz clic en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)
   - Espera a que aparezca el mensaje de éxito

5. **Verifica que se ejecutó correctamente**
   - Deberías ver un mensaje como: `Success. No rows returned`
   - O puedes verificar ejecutando:
   ```sql
   SELECT indexname 
   FROM pg_indexes 
   WHERE tablename = 'properties' 
   AND indexname = 'idx_properties_next_reno_steps';
   ```
   - Debería retornar 0 filas (el índice ya no existe)

## ✅ Verificación

Después de ejecutar la migración, verifica que el índice fue eliminado:

```sql
-- Verificar que el índice NO existe
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'properties' 
AND indexname = 'idx_properties_next_reno_steps';
```

**Resultado esperado:** 0 filas (el índice no existe)

## 🔄 Después de la Migración

Una vez eliminado el índice:

1. **Reintentar la sincronización:**
   ```bash
   npm run sync:final-check
   ```

2. **Las propiedades que fallaron anteriormente ahora deberían crearse correctamente**

## 📝 Notas

- ✅ **Seguro:** Eliminar este índice no afecta la funcionalidad de la aplicación
- ✅ **Sin pérdida de datos:** Solo se elimina el índice, no los datos
- ✅ **Reversible:** Si en el futuro se necesita el índice, se puede recrear con un tipo diferente (GIN para texto completo)

## 🔮 Futuro: Si se necesita buscar en next_reno_steps

Si en el futuro necesitas buscar en el contenido de `next_reno_steps`, puedes crear un índice de texto completo:

```sql
-- Ejemplo de índice GIN para búsqueda de texto completo (solo si es necesario)
CREATE INDEX idx_properties_next_reno_steps_gin 
ON properties USING gin(to_tsvector('spanish', next_reno_steps));
```

Pero por ahora, no es necesario ya que este campo no se usa para búsquedas.







