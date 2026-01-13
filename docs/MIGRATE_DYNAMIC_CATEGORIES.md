# Migrar property_dynamic_categories de Producción a Desarrollo

Este documento explica cómo migrar los datos de la tabla `property_dynamic_categories` desde producción a desarrollo.

## 📋 Requisitos Previos

1. ✅ La tabla `property_dynamic_categories` debe existir en **ambos** entornos:
   - ✅ Producción: Ya existe
   - ✅ Desarrollo: Ejecutar primero la migración `009_create_property_dynamic_categories.sql`

2. ✅ Credenciales configuradas:
   - ✅ Desarrollo: Ya configuradas en `.env.local`
   - ⚠️ Producción: Necesitas el **Service Role Key** de producción

## 🔑 Obtener Service Role Key de Producción

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona el proyecto de **PRODUCCIÓN** (`fxmobdtjazijugpzkadn`)
3. Ve a **Settings** → **API**
4. Copia el **`service_role` key** (⚠️ Es secreto, no lo compartas)

## 🚀 Pasos para Ejecutar la Migración

### Opción 1: Usando Variable de Entorno (Recomendado)

1. **Agrega la Service Role Key de producción a `.env.local`:**

```bash
# En .env.local, agrega:
PROD_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-de-produccion-aqui
```

2. **Ejecuta el script:**

```bash
npm run migrate:dynamic-categories
```

### Opción 2: Usando Variable de Entorno Temporal

```bash
export PROD_SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key-de-produccion"
npm run migrate:dynamic-categories
```

## 📊 ¿Qué hace el script?

1. **Conecta a PRODUCCIÓN** y obtiene todas las categorías de `property_dynamic_categories`
2. **Verifica** qué `property_id` existen en DESARROLLO
3. **Filtra** las categorías que tienen `property_id` válido en desarrollo
4. **Evita duplicados** verificando si ya existen categorías con el mismo nombre para la misma propiedad
5. **Inserta** las categorías en desarrollo (sin el ID original, genera uno nuevo)
6. **Muestra un resumen** de la migración

## ⚠️ Consideraciones Importantes

### 1. Property IDs deben existir en desarrollo

El script **solo migra** categorías de propiedades que existen en desarrollo. Si una propiedad no existe en desarrollo, sus categorías se omitirán.

**Solución:** Si necesitas las categorías de propiedades que no están en desarrollo, primero migra las propiedades usando `scripts/import-properties-from-prod.js`.

### 2. Evita duplicados

El script verifica si ya existe una categoría con el mismo `category_name` para la misma `property_id` en desarrollo. Si existe, la omite.

### 3. IDs nuevos

Los IDs de las categorías en desarrollo serán **diferentes** a los de producción (se generan nuevos UUIDs). Esto es normal y esperado.

### 4. Fechas preservadas

Las fechas `created_at` y `updated_at` se preservan de producción.

## 📝 Ejemplo de Salida

```
🔄 Iniciando migración de property_dynamic_categories...

📦 PRODUCCIÓN: https://fxmobdtjazijugpzkadn.supabase.co
🔧 DESARROLLO: https://kqqobbxjyrdputngvxrf.supabase.co

📥 Obteniendo categorías de PRODUCCIÓN...
✅ Encontradas 150 categorías en producción

🔍 Verificando qué property_ids existen en DESARROLLO...
⚠️  Advertencia: 5 property_ids no existen en desarrollo:
   - SP-ABC-123-001
   - SP-ABC-123-002
   ...

💡 Las categorías de estas propiedades NO se migrarán.

⏭️  Se omitirán 12 categorías (property_id no existe en dev)

📤 Migrando 138 categorías a DESARROLLO...
   ✅ Migradas 10 categorías...
   ✅ Migradas 20 categorías...
   ...

============================================================
📊 RESUMEN DE MIGRACIÓN
============================================================
✅ Insertadas: 135
⏭️  Omitidas (ya existían): 3
❌ Errores: 0
📦 Total en producción: 150
🔧 Total migradas a desarrollo: 135
============================================================

✅ Migración completada exitosamente!
```

## 🔍 Verificar la Migración

Después de ejecutar el script, puedes verificar en Supabase:

```sql
-- En desarrollo, verifica cuántas categorías hay
SELECT COUNT(*) FROM property_dynamic_categories;

-- Ver categorías por propiedad
SELECT 
  property_id,
  COUNT(*) as total_categorias
FROM property_dynamic_categories
GROUP BY property_id
ORDER BY total_categorias DESC;
```

## ❌ Solución de Problemas

### Error: "PROD_SUPABASE_SERVICE_ROLE_KEY no está configurado"

**Solución:** Agrega la variable a `.env.local`:
```bash
PROD_SUPABASE_SERVICE_ROLE_KEY=tu-key-aqui
```

### Error: "Credenciales de DESARROLLO no están configuradas"

**Solución:** Verifica que `.env.local` tenga:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://kqqobbxjyrdputngvxrf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-de-dev
```

### Error: "Error al obtener categorías de producción"

**Posibles causas:**
- Service Role Key incorrecto
- Problemas de red
- La tabla no existe en producción

**Solución:** Verifica las credenciales y que la tabla exista.

### Error: "Error al insertar categorías"

**Posibles causas:**
- La tabla no existe en desarrollo (ejecuta primero la migración 009)
- Foreign key constraint (property_id no existe)
- Datos inválidos

**Solución:** 
1. Ejecuta primero `supabase/migrations/009_create_property_dynamic_categories.sql` en desarrollo
2. Verifica que las propiedades existan en desarrollo

## 🔄 Re-ejecutar la Migración

Si necesitas re-ejecutar la migración:

- El script **evita duplicados** automáticamente
- Si quieres **reemplazar** categorías existentes, primero elimínalas manualmente en Supabase o modifica el script

## 📚 Archivos Relacionados

- Script: `scripts/migrate-dynamic-categories-prod-to-dev.ts`
- Migración de tabla: `supabase/migrations/009_create_property_dynamic_categories.sql`
- Documentación de migración: `docs/EXECUTE_MIGRATION_009.md`







