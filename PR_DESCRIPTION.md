# PR: Mejoras en Kanban - Campos de días y filtro de obras tardías

## 📋 Resumen

Esta PR incluye mejoras significativas en el sistema de Kanban para el gestor de construcción, añadiendo nuevos campos de días desde Airtable, mejoras visuales en las cards y un nuevo filtro para obras tardías.

## 🎯 Cambios Principales

### 1. Nuevo campo `days_to_visit` desde Airtable
- ✅ Añadido campo `days_to_visit` (numeric) en Supabase
- ✅ Mapeo desde Airtable campo "Days to visit"
- ✅ Incluido en scripts de sincronización (`sync-from-airtable.ts`, `sync-unified.ts`)
- ✅ Script de actualización masiva: `scripts/update-days-to-visit.ts`
- ✅ Migración SQL para cambiar tipo de columna de `date` a `numeric`: `supabase/migrations/009_change_days_to_visit_to_numeric.sql`

### 2. Visualización de campos de Kanban Cards

#### Fase "Upcoming Settlements" y "Check Inicial"
- ✅ Muestra campo "Días para visitar" en las cards
- ✅ Ordenamiento de mayor a menor por `days_to_visit`
- ✅ Marcado en rojo (borde izquierdo + triángulo de alerta) cuando `days_to_visit > 5`
- ✅ Cards rojas aparecen primero en la columna
- ✅ Ocultado texto "hace X días" en estas fases

#### Fase "Limpieza y Amoblamiento" (furnishing-cleaning)
- ✅ Muestra campo "Días para propiedad lista" (`daysToPropertyReady`)
- ✅ Ordenamiento de mayor a menor por `daysToPropertyReady`
- ✅ Marcado en rojo cuando `daysToPropertyReady > 25`
- ✅ Cards rojas aparecen primero en la columna
- ✅ Ocultado texto "hace X días" en esta fase

### 3. Nuevo filtro "Obras Tardías"
- ✅ Añadido checkbox "Obras Tardías" en el diálogo de filtros
- ✅ Filtra solo propiedades marcadas en rojo según su fase:
  - `reno-in-progress`: según tipo de reno (Light > 30, Medium > 60, Major > 120 días)
  - `reno-budget-renovator/client/start`: `daysToStartRenoSinceRSD > 25`
  - `initial-check/upcoming-settlements`: `daysToVisit > 5`
  - `furnishing-cleaning`: `daysToPropertyReady > 25`
- ✅ Se combina con otros filtros (AND con obras tardías, OR entre otros filtros)

### 4. Mejoras en tipos y mapeos
- ✅ Actualizado `lib/supabase/types.ts` con nuevo campo `days_to_visit`
- ✅ Actualizado `lib/property-storage.ts` con `daysToVisit` y `daysToPropertyReady`
- ✅ Actualizado `hooks/useSupabaseKanbanProperties.ts` para mapear nuevos campos

## 📁 Archivos Modificados

### Componentes
- `components/reno/reno-property-card.tsx` - Visualización de campos y marcado en rojo
- `components/reno/reno-kanban-board.tsx` - Ordenamiento y filtrado
- `components/reno/reno-kanban-filters.tsx` - Nuevo filtro de obras tardías
- `components/reno/reno-kanban-column.tsx` - Mejoras en título de columnas

### Hooks y Utilidades
- `hooks/useSupabaseKanbanProperties.ts` - Mapeo de nuevos campos
- `lib/property-storage.ts` - Tipos actualizados
- `lib/supabase/types.ts` - Tipos de Supabase actualizados
- `lib/supabase/kanban-mapping.ts` - Mapeos mejorados

### Sincronización
- `lib/airtable/sync-from-airtable.ts` - Mapeo de `days_to_visit`
- `lib/airtable/sync-unified.ts` - Mapeo de `days_to_visit`

### Scripts
- `scripts/update-days-to-visit.ts` - Script de actualización masiva
- `scripts/check-days-to-visit-type.ts` - Script de verificación

### Migraciones
- `supabase/migrations/009_change_days_to_visit_to_numeric.sql` - Cambio de tipo de columna

## 🚀 Cómo Probar

1. **Migración de Base de Datos:**
   ```sql
   -- Ejecutar en Supabase SQL Editor
   -- Archivo: supabase/migrations/009_change_days_to_visit_to_numeric.sql
   ```

2. **Sincronización de Datos:**
   ```bash
   npx tsx scripts/update-days-to-visit.ts
   ```

3. **Verificar en UI:**
   - Verificar que las cards muestran "Días para visitar" en fases correspondientes
   - Verificar que las cards muestran "Días para propiedad lista" en furnishing-cleaning
   - Verificar ordenamiento (mayor a menor)
   - Verificar marcado en rojo cuando superan los límites
   - Probar filtro "Obras Tardías"

## ⚠️ Notas Importantes

- La migración SQL eliminará datos existentes en `days_to_visit` si estaban en formato fecha
- Los datos se repoblarán desde Airtable al ejecutar el script de sincronización
- El filtro de obras tardías funciona como AND con otros filtros (si está activo, solo muestra tardías)

## 📝 Checklist

- [x] Campos añadidos a tipos TypeScript
- [x] Mapeo desde Airtable implementado
- [x] Visualización en cards implementada
- [x] Ordenamiento implementado
- [x] Marcado en rojo implementado
- [x] Filtro de obras tardías implementado
- [x] Scripts de sincronización actualizados
- [x] Migración SQL creada
- [x] Documentación actualizada
