# Diagnóstico: sync de fases Airtable vs versión antigua (Vercel)

## Problema

Las propiedades no se asignaban correctamente a cada fase del Kanban; el comportamiento no coincidía con la versión antigua desplegada en Vercel.

## Causa identificada

En el sync unificado se usaban **dos criterios distintos** para decidir la fase:

1. **Por vista y prioridad**  
   Se obtienen propiedades de varias vistas de Airtable (Initial Check, Reno In Progress, Final Check, etc.). Si una propiedad aparecía en **varias vistas**, se le asignaba la fase de la **vista con mayor prioridad** (p. ej. Cleaning > Pendiente de Suministros > Final Check).

2. **Por Set Up Status (solo en casos concretos)**  
   Solo se usaba el campo "Set Up Status" de Airtable para:
   - validar Upcoming Settlements / Revisión Inicial (Stage + Set Up Status), y  
   - forzar "Utilities activation" → Pendiente de Suministros.

En Airtable, la **fuente de verdad** del estado de una fila es el campo **Set Up Status** (una sola valor por registro). Las vistas son solo filtros. Si los filtros se solapan, una misma propiedad puede estar en varias vistas; con la lógica anterior, la fase dependía de “en qué vista ganaba por prioridad”, no del valor real de Set Up Status, y por eso no coincidía con la versión antigua ni con lo esperado por fase.

## Cambio realizado

En **`lib/airtable/sync-unified.ts`**:

- **Fuente de verdad de la fase:**  
  La fase se determina **primero** con el campo **Set Up Status** de Airtable, usando el mapeo de `lib/supabase/kanban-mapping.ts` (`mapSetUpStatusToKanbanPhase`).

- **Fallback:**  
  Si Set Up Status no mapea a ninguna fase conocida, se usa la fase de la **vista con mayor prioridad** en la que apareció la propiedad (comportamiento anterior).

- **Excepción Upcoming / Revisión Inicial:**  
  Para `upcoming-settlements` e `initial-check` se sigue validando Stage + Set Up Status (Pending to visit + Presettlement vs Settled); si no se cumple, se asigna `reno-budget`.

Con esto, el sync vuelve a alinearse con la versión antigua: **cada fase en el Kanban refleja el valor de Set Up Status** de cada propiedad en Airtable.

## Cómo comprobarlo

1. Ejecutar el sync (botón "Sync con Airtable" o `npx tsx scripts/run-local-sync.ts`).
2. Revisar en el Kanban que las propiedades de cada columna coinciden con el valor de "Set Up Status" en Airtable para esas mismas propiedades.

## Referencia

- Mapeo Set Up Status → fase: `lib/supabase/kanban-mapping.ts`
- Sync unificado: `lib/airtable/sync-unified.ts` (asignación de `finalPhase`).
