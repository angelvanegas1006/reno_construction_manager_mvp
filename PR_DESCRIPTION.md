# Pull Request: Mejoras en Kanban de Construction Manager

## Resumen
Esta PR incluye mejoras significativas en el Kanban del Construction Manager, incluyendo la división de la fase `reno-budget` en tres fases específicas, nuevos campos de visualización, filtros avanzados, y la integración de la vista de lista desarrollada por Ángel.

## Cambios Principales

### 1. División de la Fase "Reno Budget" en Tres Fases Específicas

**Problema resuelto**: La fase `reno-budget` era demasiado genérica y no permitía distinguir entre diferentes estados del proceso de presupuesto.

**Solución**: Se dividió en tres nuevas fases:
- **Pendiente Presupuesto (Renovador)** (`reno-budget-renovator`): Para propiedades con `Set Up Status == "Pending to budget (from renovator)"` o `"Pending to validate budget (from renovator)"`
- **Pendiente Presupuesto (Cliente)** (`reno-budget-client`): Para propiedades con `Set Up Status == "Pending to budget (from client)"` o `"Pending to validate budget (from client)"`
- **Obra a Empezar** (`reno-budget-start`): Para propiedades con `Set Up Status == "Reno to start"`

**Archivos modificados**:
- `lib/reno-kanban-config.ts`: Añadidas nuevas fases al tipo `RenoKanbanPhase`
- `lib/supabase/kanban-mapping.ts`: Añadidos mapeos específicos para las nuevas fases
- `lib/i18n/translations.ts`: Añadidas traducciones para las nuevas fases
- `components/reno/reno-kanban-board.tsx`: Lógica de ordenamiento y filtrado para las nuevas fases
- `components/reno/reno-property-card.tsx`: Visualización de las nuevas fases en las cards
- `hooks/useSupabaseKanbanProperties.ts`: Soporte para las nuevas fases

### 2. Campo "Days to Visit" (`days_to_visit`)

**Nuevo campo**: Se añadió el campo `days_to_visit` (numérico) mapeado desde Airtable "Days to visit".

**Funcionalidades**:
- Sincronización en cron jobs (`lib/airtable/sync-from-airtable.ts`, `lib/airtable/sync-unified.ts`)
- Visualización en las cards de las fases "Check Inicial" e "Upcoming Reno" con la etiqueta "Días para visitar"
- Ordenamiento: Las propiedades se ordenan de mayor a menor según `days_to_visit`
- Marcado en rojo: Las propiedades con `days_to_visit > 5` se marcan en rojo (borde izquierdo y triángulo de alerta)

**Archivos modificados**:
- `lib/property-storage.ts`: Añadido `daysToVisit?: number | null` al interface `Property`
- `lib/supabase/types.ts`: Añadido `days_to_visit: number | null` a los tipos de Supabase
- `lib/airtable/sync-from-airtable.ts`: Mapeo desde Airtable
- `lib/airtable/sync-unified.ts`: Mapeo desde Airtable
- `lib/supabase/property-converter.ts`: Conversión desde Supabase
- `hooks/useSupabaseKanbanProperties.ts`: Inclusión en propiedades del kanban
- `components/reno/reno-property-card.tsx`: Visualización y lógica de marcado en rojo
- `components/reno/reno-kanban-board.tsx`: Ordenamiento y filtrado

**Migración de base de datos**:
- `supabase/migrations/009_change_days_to_visit_to_numeric.sql`: Migración para cambiar el tipo de columna de `date` a `integer`

**Scripts**:
- `scripts/update-days-to-visit.ts`: Script para actualización masiva del campo desde Airtable

### 3. Campo Editable "Nombre del Renovador"

**Nueva funcionalidad**: Campo editable para el nombre del renovador en las fases de presupuesto.

**Características**:
- Visible siempre en las fases `reno-budget-renovator` y `reno-budget-client`
- Campo de texto libre editable
- Sincronización bidireccional: cambios se guardan en Supabase y luego en Airtable
- Feedback visual: Toast notifications para éxito/error
- Guardado automático al hacer blur o presionar Enter

**Archivos modificados**:
- `components/reno/property-action-tab.tsx`: Campo editable con lógica de guardado
- `app/reno/construction-manager/property/[id]/page.tsx`: Callback para actualizar renovator name
- `lib/airtable/client.ts`: Funciones de actualización en Airtable

### 4. Filtro "Obras Tardías"

**Nuevo filtro**: Checkbox para filtrar solo las propiedades marcadas en rojo.

**Lógica**: Muestra únicamente las propiedades que cumplen alguno de estos criterios:
- `reno-in-progress`: Duración excede límites según tipo (Light > 30, Medium > 60, Major > 120 días)
- `reno-budget-renovator`, `reno-budget-client`, `reno-budget-start`: `daysToStartRenoSinceRSD > 25`
- `initial-check`, `upcoming-settlements`: `daysToVisit > 5`
- `furnishing-cleaning`: `daysToPropertyReady > 25`

**Archivos modificados**:
- `components/reno/reno-kanban-filters.tsx`: Añadido checkbox "Obras Tardías"
- `components/reno/reno-kanban-board.tsx`: Lógica de filtrado
- `app/reno/construction-manager/kanban/page.tsx`: Estado del filtro

### 5. Mejoras en Visualización y Ordenamiento

**Ordenamiento mejorado por fase**:
- **Check Inicial** y **Upcoming Reno**: Ordenadas por `days_to_visit` descendente, propiedades rojas primero
- **Pendiente Presupuesto (Renovador/Cliente/Start)**: Ordenadas por `daysToStartRenoSinceRSD` descendente, propiedades rojas primero
- **Obras en Proceso**: Ordenadas por `renoDuration` descendente, propiedades rojas primero según límites por tipo
- **Limpieza y Amoblamiento**: Ordenadas por `daysToPropertyReady` descendente, propiedades rojas primero

**Marcado en rojo**:
- Borde izquierdo rojo de 4px
- Triángulo de alerta en la esquina superior derecha
- Criterios específicos por fase (ver sección de filtro)

**Ocultación de "Hace X días"**:
- Ocultado en las fases: `upcoming-settlements`, `initial-check`, `reno-budget-renovator`, `reno-budget-client`, `reno-budget-start`, `furnishing-cleaning`

**Archivos modificados**:
- `components/reno/reno-property-card.tsx`: Lógica de marcado en rojo y ocultación de tiempo en fase
- `components/reno/reno-kanban-board.tsx`: Funciones de ordenamiento personalizadas

### 6. Integración de Vista de Lista

**Integración**: Se integró la vista de lista desarrollada por Ángel manteniendo todos nuestros cambios.

**Características mantenidas**:
- Mismo ordenamiento que en vista kanban
- Mismo marcado en rojo (borde izquierdo y triángulo de alerta)
- Misma lógica de filtrado
- Navegación directa a tab "tareas" al hacer clic

**Mejoras aplicadas**:
- Borde rojo usando pseudo-elemento `::before` en la primera celda para evitar desplazamiento de contenido
- Icono de alerta posicionado absolutamente en la esquina superior derecha

**Archivos modificados**:
- `components/reno/reno-kanban-board.tsx`: Integración de lógica de ordenamiento y marcado en rojo en `renderListView`

### 7. Correcciones y Ajustes

**Ocultación de columna "Próximas propiedades"**:
- La fase `upcoming` (de upstream) se ocultó del kanban ya que no es necesaria

**Corrección de mapeo "Reno to start"**:
- Se aseguró que `Set Up Status == "Reno to start"` mapee correctamente a `reno-budget-start`

**Navegación mejorada**:
- Al hacer clic en una card desde el kanban, siempre navega al tab "tareas"
- Para fases `reno-budget-renovator` y `reno-budget-client`, siempre muestra el tab "tareas" incluso si no hay tareas

**Archivos modificados**:
- `lib/reno-kanban-config.ts`: Ocultación de fase `upcoming`
- `lib/supabase/kanban-mapping.ts`: Corrección de mapeo "Reno to start"
- `app/reno/construction-manager/property/[id]/page.tsx`: Lógica de navegación mejorada

## Archivos Nuevos

- `supabase/migrations/009_change_days_to_visit_to_numeric.sql`: Migración SQL
- `scripts/update-days-to-visit.ts`: Script de actualización masiva
- `scripts/check-days-to-visit-type.ts`: Script de verificación
- `docs/CHANGE_DAYS_TO_VISIT_TYPE.md`: Documentación de migración

## Dependencias

- `mixpanel-browser`: Ya estaba en `package.json`, se instaló para resolver error de build

## Testing

### Casos de prueba recomendados:

1. **Nuevas fases de presupuesto**:
   - Verificar que las propiedades se asignan correctamente a las tres nuevas fases según su `Set Up Status`
   - Verificar ordenamiento y marcado en rojo en cada fase

2. **Campo days_to_visit**:
   - Verificar visualización en cards de "Check Inicial" e "Upcoming Reno"
   - Verificar ordenamiento y marcado en rojo cuando `> 5 días`

3. **Campo editable renovator name**:
   - Editar nombre en fases `reno-budget-renovator` y `reno-budget-client`
   - Verificar que se guarda en Supabase y Airtable

4. **Filtro obras tardías**:
   - Activar filtro y verificar que solo muestra propiedades marcadas en rojo
   - Verificar que funciona en todas las fases

5. **Vista de lista**:
   - Verificar que mantiene mismo ordenamiento que kanban
   - Verificar que el marcado en rojo no desplaza el contenido
   - Verificar navegación al hacer clic

## Notas Importantes

- La fase legacy `reno-budget` se mantiene oculta pero presente para compatibilidad
- La fase `upcoming` de upstream se oculta pero se mantiene en el código para compatibilidad
- Se requiere ejecutar la migración SQL `009_change_days_to_visit_to_numeric.sql` antes de desplegar
- Se recomienda ejecutar `scripts/update-days-to-visit.ts` después de la migración para poblar el campo

## Breaking Changes

Ninguno. Todos los cambios son retrocompatibles.

## Screenshots / Demos

(Se pueden añadir screenshots de las nuevas funcionalidades si es necesario)
