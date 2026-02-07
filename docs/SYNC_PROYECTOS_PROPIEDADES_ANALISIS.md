# Análisis: Sincronización Proyectos ↔ Propiedades

Este documento describe el flujo completo de sincronización entre la tabla **Projects** de Airtable y el enlace **properties.project_id** en Supabase, y los puntos donde puede fallar.

---

## 1. Flujo actual

### 1.1 Sync de propiedades (sync unificado)

- **Origen:** Tabla **Transactions** en Airtable (`tblmX19OTsj3cTHmA`).
- **Código:** `lib/airtable/sync-unified.ts` → `mapAirtablePropertyToSupabase()`.
- **Qué se guarda en Supabase (properties):**
  - **`airtable_property_id`** = `record.id` del registro en **Transactions** (ID de la transacción).
  - **`airtable_properties_record_id`** = primer ID del campo **"Properties"** (link a tabla Properties en Airtable), si existe.

Si en Transactions no hay link a Properties, `airtable_properties_record_id` queda null y se usa el fallback `airtable_property_id = record.id` (Transaction ID).

### 1.2 Sync de proyectos

- **Origen:** Tabla **Projects** en Airtable, vista configurada en `AIRTABLE_PROJECTS_VIEW_ID` (`lib/reno-kanban-config.ts`).
- **Código:** `lib/airtable/sync-projects.ts` → `syncProjectsFromAirtable()`.
- **Qué hace:**
  - Lee todos los proyectos que aparecen en esa vista.
  - Inserta o actualiza la tabla `projects` en Supabase por `airtable_project_id`.
  - Marca como **orphaned** (`reno_phase = 'orphaned'`) los proyectos que están en Supabase pero **no** aparecen en la vista (ya no existen o fueron filtrados).

### 1.3 Enlace propiedades → proyectos

- **Origen:** Tabla **Projects** en Airtable, campo que enlaza a Properties o Transactions (p. ej. "Properties linked", "Properties", "Transactions").
- **Código:** `lib/airtable/sync-projects.ts` → `linkPropertiesToProjectsFromAirtable()`.
- **Qué hace:**
  1. Obtiene el mapa **airtable_project_id → supabase project id** solo para proyectos **no orphaned** (`getAirtableProjectIdToSupabaseIdMap()`).
  2. Lee de Airtable Projects el campo de enlace (prueba varios nombres: "Properties linked", "Linked properties", "Properties", "Transactions").
  3. Para cada proyecto, toma la lista de **record IDs** enlazados (pueden ser de tabla Properties o de tabla Transactions).
  4. En Supabase actualiza **properties**:
     - `project_id = supabase_project_id` donde **`airtable_properties_record_id`** IN (esos IDs), **o**
     - `project_id = supabase_project_id` donde **`airtable_property_id`** IN (esos IDs).

Así se cubren ambos casos: si en Airtable Projects el link es a **Properties**, coinciden por `airtable_properties_record_id`; si es a **Transactions**, por `airtable_property_id`.

---

## 2. Puntos de fallo y comprobaciones

| Punto | Qué puede fallar | Cómo comprobarlo |
|-------|-------------------|-------------------|
| **Campo de enlace en Airtable Projects** | El campo tiene otro nombre o no existe en la request. | En Airtable, revisar el nombre exacto del campo que enlaza a Properties/Transactions. El código prueba: "Properties linked", "Linked properties", "Properties", "Transactions". |
| **Tipo de IDs en el link** | Si Projects enlaza a **Transactions**, los IDs son de Transaction → deben coincidir con **airtable_property_id**. Si enlaza a **Properties**, con **airtable_properties_record_id**. | Ejecutar `npm run diagnose:projects-properties`: muestra para un proyecto de ejemplo cuántos IDs coinciden por cada columna. |
| **Propiedades sin IDs de Airtable** | Propiedades creadas antes del sync unificado o con sync que no rellena `airtable_property_id` / `airtable_properties_record_id`. | En el diagnóstico, ver cuántas propiedades tienen `airtable_property_id` y cuántas `airtable_properties_record_id`. Si son 0, hay que re-sincronizar propiedades (sync unificado). |
| **Proyectos orphaned** | Solo se enlaza a proyectos **no orphaned**. Si el proyecto está marcado orphaned, no se usa en el mapa y las propiedades no se le asignan. | Comprobar en Supabase que los proyectos que esperas tener en la vista no tengan `reno_phase = 'orphaned'`. Ejecutar de nuevo `npm run sync:projects` para refrescar desde la vista. |
| **Orden de ejecución** | Si se ejecuta el enlace antes de sincronizar propiedades, no hay filas con esos IDs. | Orden recomendado: 1) Sync propiedades (unificado), 2) Sync proyectos, 3) Enlace (link). El cron y `npm run sync:all-phases` ya hacen ese orden. |

---

## 3. Scripts útiles

- **`npm run sync:projects`**  
  Sincroniza proyectos desde Airtable (vista configurada) y ejecuta el enlace propiedades → proyectos.

- **`npm run diagnose:projects-properties`**  
  Diagnóstico: conteos en Supabase (proyectos, propiedades con/sin project_id y con/sin IDs de Airtable), muestra de un proyecto en Airtable y cuántos de sus IDs enlazados coinciden en Supabase por `airtable_property_id` y por `airtable_properties_record_id`.

- **`npm run verify:projects-properties-link`**  
  Verificación rápida de conteos antes/después del enlace y ejecuta solo `linkPropertiesToProjectsFromAirtable()`.

---

## 4. Resumen

- El enlace **no** depende de un único Field ID en Airtable: se prueban varios **nombres** de campo ("Properties linked", "Properties", "Transactions", etc.).
- Se hace match por **dos columnas** en Supabase: `airtable_properties_record_id` (si el link es a Properties) y `airtable_property_id` (si el link es a Transactions).
- Solo se enlaza a proyectos **no orphaned** (excluidos en `getAirtableProjectIdToSupabaseIdMap()`).
- Para que el enlace funcione, las propiedades deben tener al menos uno de los dos IDs de Airtable rellenado por el **sync unificado** de propiedades.
