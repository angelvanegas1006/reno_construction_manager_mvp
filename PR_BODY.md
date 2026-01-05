## Cambios realizados

- Eliminado el `border-l-4` que causaba desplazamiento de celdas en la vista de lista
- Reemplazado el icono `AlertTriangle` por `Flag` en ambas vistas (lista y Kanban)
- Bandera roja con mástil negro para mejor visibilidad
- Tamaño reducido de la bandera para mejor proporción visual

## Problema resuelto

Las propiedades marcadas en rojo en la vista de lista se desplazaban una celda hacia la derecha debido al borde izquierdo. Se ha solucionado reemplazando el borde por una bandera roja que no afecta el layout de la tabla.

## Archivos modificados

- `components/reno/reno-kanban-board.tsx`
- `components/reno/reno-property-card.tsx`
- `components/reno/reno-home-todo-widgets.tsx`
- `hooks/useSupabaseKanbanProperties.ts`
- `lib/airtable/sync-all-phases.ts`
- `lib/airtable/sync-from-airtable.ts`


















