# Estado de Integración de PR de Manu

## ✅ Cambios Completados

### 1. División de `reno-budget` en 3 fases ✅
- ✅ Agregadas fases: `reno-budget-renovator`, `reno-budget-client`, `reno-budget-start`
- ✅ Actualizado `lib/reno-kanban-config.ts`
- ✅ Actualizado `lib/supabase/kanban-mapping.ts` con mapeos específicos
- ✅ Agregadas traducciones en `lib/i18n/translations.ts`
- ✅ Actualizado `hooks/useSupabaseKanbanProperties.ts`
- ✅ Actualizados todos los componentes que usan `RenoKanbanPhase`

### 2. Campo `days_to_visit` ✅
- ✅ Agregado a `lib/property-storage.ts`
- ✅ Agregado a `lib/supabase/types.ts`
- ✅ Agregado a `lib/supabase/property-converter.ts`
- ✅ Agregado a `lib/airtable/sync-from-airtable.ts`
- ✅ Agregado a `hooks/useSupabaseKanbanProperties.ts`

### 3. Campo editable "Nombre del Renovador" ✅
- ✅ Implementado en `components/reno/property-action-tab.tsx`
- ✅ Agregado callback `onUpdateRenovatorName` en `app/reno/construction-manager/property/[id]/page.tsx`
- ✅ Sincronización bidireccional Supabase ↔ Airtable

### 4. Filtro "Obras Tardías" 🔄 (En progreso)
- ✅ Agregado `delayedWorks: boolean` a `KanbanFilters` interface
- ✅ Agregado checkbox en `components/reno/reno-kanban-filters.tsx`
- ✅ Actualizado estado inicial en `app/reno/construction-manager/kanban/page.tsx`
- ⏳ Pendiente: Lógica de filtrado en `reno-kanban-board.tsx`
- ⏳ Pendiente: Función helper para determinar si una propiedad está marcada en rojo

## ⏳ Cambios Pendientes

### 5. Mejoras en ordenamiento y marcado en rojo
- ⏳ Agregar funciones de verificación de límites en `reno-property-card.tsx`:
  - `exceedsDurationLimit` (para `reno-in-progress`)
  - `exceedsDaysToStartLimit` (para fases de budget)
  - `exceedsDaysToVisitLimit` (para `initial-check` y `upcoming-settlements`)
  - `exceedsDaysToPropertyReadyLimit` (para `furnishing-cleaning`)
- ⏳ Agregar marcado visual en rojo (borde izquierdo y triángulo de alerta)
- ⏳ Implementar ordenamiento mejorado por fase en `reno-kanban-board.tsx`:
  - `sortDaysToVisitPhase` para `initial-check` y `upcoming-settlements`
  - `sortRenoBudgetPhase` para fases de budget
  - `sortFurnishingCleaningPhase` para `furnishing-cleaning`
- ⏳ Ocultar "Hace X días" en fases específicas

### 6. Integración de mejoras en vista de lista
- ⏳ Aplicar mismo ordenamiento que kanban
- ⏳ Aplicar mismo marcado en rojo
- ⏳ Aplicar mismo filtro de obras tardías

### 7. Migración SQL para `days_to_visit`
- ⏳ Crear migración `supabase/migrations/009_change_days_to_visit_to_numeric.sql`
- ⏳ Cambiar tipo de columna de `date` a `integer`

### 8. Scripts de actualización masiva
- ⏳ Crear `scripts/update-days-to-visit.ts`
- ⏳ Crear `scripts/check-days-to-visit-type.ts`

## 📝 Notas

- El build pasa sin errores de TypeScript ✅
- Todos los cambios están integrados manteniendo compatibilidad con cambios anteriores ✅
- La fase legacy `reno-budget` se mantiene oculta pero presente para compatibilidad ✅

