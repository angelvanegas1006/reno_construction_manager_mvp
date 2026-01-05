# Próximos Pasos - Integración PR de Manu

## ✅ Completado

- ✅ Todos los cambios integrados y commiteados
- ✅ Push a `main` completado
- ✅ Push a `dev` completado

## 📋 Pasos Pendientes (Requieren Acceso a Supabase/Airtable)

### 1. Ejecutar Migración SQL en Supabase

**Archivo:** `supabase/migrations/009_change_days_to_visit_to_numeric.sql`

**Pasos:**
1. Abre el Supabase Dashboard
2. Ve a SQL Editor
3. Copia y pega el contenido del archivo `supabase/migrations/009_change_days_to_visit_to_numeric.sql`
4. Ejecuta la migración

**Nota:** Esta migración cambiará el tipo de la columna `days_to_visit` de `date` a `integer` si es necesario.

### 2. Verificar Tipo de Columna

**Comando:**
```bash
cd "/Users/angelvanegas/Desktop/new project/vistral-mvp"
npx tsx scripts/check-days-to-visit-type.ts
```

**Qué hace:**
- Verifica el tipo actual de la columna `days_to_visit`
- Indica si necesita ejecutar la migración SQL
- Prueba si la columna acepta números o fechas

### 3. Actualizar Datos desde Airtable

**Comando:**
```bash
cd "/Users/angelvanegas/Desktop/new project/vistral-mvp"
npx tsx scripts/update-days-to-visit.ts
```

**Qué hace:**
- Obtiene todas las propiedades de Supabase
- Obtiene todas las propiedades de Airtable
- Mapea `days_to_visit` desde Airtable usando `Unique ID From Engagements`
- Actualiza las propiedades en Supabase con los valores de Airtable
- Muestra un resumen de propiedades actualizadas, omitidas y errores

**Requisitos:**
- Variables de entorno configuradas:
  - `NEXT_PUBLIC_AIRTABLE_API_KEY`
  - `NEXT_PUBLIC_AIRTABLE_BASE_ID`
  - Credenciales de Supabase (en `.env.local`)

### 4. Verificar Funcionalidades

Después de ejecutar los pasos anteriores, verifica:

#### En el Kanban:
- ✅ Las 3 nuevas fases aparecen (`reno-budget-renovator`, `reno-budget-client`, `reno-budget-start`)
- ✅ Las propiedades se muestran en las fases correctas
- ✅ El campo `days_to_visit` se muestra en cards de `initial-check` y `upcoming-settlements`
- ✅ Las propiedades marcadas en rojo tienen borde rojo y triángulo de alerta
- ✅ El ordenamiento funciona correctamente (propiedades rojas primero, luego por días descendente)
- ✅ El filtro "Obras Tardías" funciona correctamente

#### En la Vista de Lista:
- ✅ Mismo ordenamiento que kanban
- ✅ Mismo marcado en rojo
- ✅ Mismo filtro de obras tardías

#### En la Página de Detalle de Propiedad:
- ✅ El campo editable "Nombre del Renovador" aparece en fases `reno-budget-renovator` y `reno-budget-client`
- ✅ El campo se puede editar y guarda correctamente
- ✅ La sincronización con Airtable funciona

## 🔍 Verificación de Criterios de Marcado en Rojo

### Por Fase:

1. **reno-in-progress**:
   - Light Reno: `renoDuration > 30` días → Rojo
   - Medium Reno: `renoDuration > 60` días → Rojo
   - Major Reno: `renoDuration > 120` días → Rojo

2. **reno-budget-renovator**, **reno-budget-client**, **reno-budget-start**:
   - `daysToStartRenoSinceRSD > 25` días → Rojo

3. **initial-check**, **upcoming-settlements**:
   - `daysToVisit > 5` días → Rojo

4. **furnishing-cleaning**:
   - `daysToPropertyReady > 25` días → Rojo

## 📝 Notas Importantes

- La migración SQL es **idempotente**: se puede ejecutar múltiples veces sin problemas
- El script de actualización masiva solo actualiza propiedades que tienen valores diferentes
- Si hay errores en la sincronización, revisa los logs del script
- Los cambios están en producción en `main` y `dev` branches

## 🚀 Despliegue en Vercel

Los cambios se desplegarán automáticamente en Vercel cuando:
- `main` branch se actualiza (producción)
- `dev` branch se actualiza (desarrollo)

Verifica que el build pase correctamente en Vercel.

