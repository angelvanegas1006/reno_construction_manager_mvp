# Investigación: Calendario y visitas estimadas

## Resumen

El calendario del Construction Manager (`VisitsCalendar`) combina **eventos generados desde propiedades** (`generatePropertyEvents`) con **visitas de la tabla `property_visits`** (`fetchVisits`). Para que las visitas estimadas y todos los eventos aparezcan bien, debe cumplirse la cadena: Supabase → contexto → conversión → calendario.

---

## 1. Origen de los datos

- **`propertiesByPhase`** viene de `useRenoProperties()` → `useSupabaseKanbanProperties()`.
- Se hace `supabase.from('properties').select('*')`, así que se traen todas las columnas de `properties` (incluida `"Estimated Visit Date"` si existe en la BD).
- Cada fila se convierte con `convertSupabasePropertyToKanbanProperty()`, que rellena:
  - `estimatedVisitDate`: `(supabaseProperty as any)['Estimated Visit Date'] || (supabaseProperty as any)['estimated_visit_date']`
  - `proximaActualizacion`: `supabaseProperty.next_update`
  - `realSettlementDate`, `renoPhase`, etc.
  - Y se guarda `supabaseProperty` en `(property as any).supabaseProperty` para campos extra (p. ej. `Est_reno_start_date`).

---

## 2. Eventos que genera el calendario (`generatePropertyEvents`)

| Origen | Condición | Tipo evento |
|--------|-----------|-------------|
| **initial-check** + **final-check** | `proximaActualizacion` en rango y ≤ hoy | `check-*` (initial-check / final-check) |
| **initial-check** | `estimatedVisitDate` en rango y ≥ hoy | `upcoming-*` (initial-check) |
| **reno-in-progress** | `proximaActualizacion` (o calculada) en rango | `work-update-*` (obra-seguimiento) |
| Todas las fases | `realSettlementDate` en rango | `settlement-*` (real-settlement-date) |
| Todas las fases | `supabaseProperty.Est_reno_start_date` en rango | `reno-start-*` (reno-start-date) |

Luego se hace **merge** con las filas de `property_visits` en ese rango y se eliminan duplicados (misma propiedad, misma fecha, mismo tipo).

---

## 3. Visitas estimadas (Estimated Visit Date)

- **Dónde se usa:** solo en el bloque “Upcoming visits” de `generatePropertyEvents`.
- **Fase:** solo se consideran propiedades en **`initial-check`**. Las de **upcoming-settlements** con `estimatedVisitDate` no generan evento hoy.
- **Condición:** `property.estimatedVisitDate` existe, la fecha está en `[start, end]` y `visitDate >= today` (incluye hoy).
- **En BD:** el campo se guarda como `"Estimated Visit Date"` (Todo Widget y Airtable sync). En TypeScript no está en los tipos de `properties`; se accede con `(supabaseProperty as any)['Estimated Visit Date']`. Si la columna no existe en Supabase, `estimatedVisitDate` será siempre `undefined` y no saldrá ninguna visita estimada.

---

## 4. Posibles fallos

1. **Columna "Estimated Visit Date" en Supabase**  
   Si no existe, `select('*')` no la devuelve y las visitas estimadas nunca aparecen. Conviene una migración `ADD COLUMN IF NOT EXISTS "Estimated Visit Date" ...`.

2. **Solo initial-check**  
   Si una propiedad tiene visita estimada pero sigue en **upcoming-settlements**, no entra en “Upcoming visits”. Incluir también `upcoming-settlements` en ese bloque evita que se pierdan visitas estimadas.

3. **Filtros del calendario**  
   Los filtros (`showSettlements`, `showRenoStarts`, `showWorkUpdates`, `showInitialChecks`) no tienen uno explícito para “Final check”. Los eventos `final-check` entran en el `default: return true`, así que se muestran siempre; se puede añadir `showFinalChecks` para simetría y control.

4. **Vista semanal y fines de semana**  
   En vista semana, `weekDays` excluye sábado y domingo (solo se muestran lun–vie). Los eventos que caen en sábado/domingo siguen en `visits` pero no tienen columna ese día; podría valorarse mostrarlos en una fila “Fin de semana” o aclararlo en UI.

---

## 5. Cambios realizados / recomendados

- **Migración:** añadir columna `"Estimated Visit Date"` en `properties` si no existe (y opcionalmente en tipos de Supabase).
- **Calendario:** en “Upcoming visits”, considerar además propiedades en **upcoming-settlements** con `estimatedVisitDate` en rango.
- **Filtros:** añadir `showFinalChecks` y usarlo para el tipo `final-check`, para alinear con el resto de tipos de evento.

---

## 6. Archivos relevantes

- `components/reno/visits-calendar.tsx`: `generatePropertyEvents`, `fetchVisits`, filtros y merge.
- `hooks/useSupabaseKanbanProperties.ts`: query `properties` y `convertSupabasePropertyToKanbanProperty`.
- `lib/supabase/property-converter.ts`: `estimatedVisitDate` en conversión detalle.
- `contexts/reno-properties-context.tsx`: exposición de `propertiesByPhase`.
- Tabla Supabase: `property_visits` (visitas creadas a mano) y `properties` (campos de fecha: `next_update`, `Estimated Visit Date`, etc.).
