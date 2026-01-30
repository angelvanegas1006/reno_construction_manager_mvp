# PR a develop: Kanban Proyectos/WIP, Loader Vistral, Filtros y Mejoras

## Resumen

- **Segundo Kanban (Proyectos / WIP)** para admin y construction_manager, con fases desde presupuesto hasta limpieza y todas las viviendas en esas fases.
- **Primer Kanban**: se excluyen Project y WIP; filtro de tipo solo Unit/Building.
- **Loader con logo Vistral** (segmentos y spin) sustituyendo loaders genéricos.
- **Tags Project y WIP** en tonalidades azules en fichas y filtros.
- **Ubicación de las llaves** en sidebar de detalle de propiedad.
- **Dar obra por finalizada**: botón y modal cuando todas las categorías al 100%; avance a Amoblamiento y sync Airtable.
- **Fecha estimada de visita**: permitir seleccionar hoy además de fechas futuras.
- **Navegación**: soporte `from=kanban-projects` en detalle y checklist para volver al segundo kanban.

## Cambios principales

### Kanban
- `app/reno/construction-manager/kanban/page.tsx`: Excluir Project/WIP del primer kanban; override de propiedades por fase.
- `app/reno/construction-manager/kanban-projects/page.tsx`: **Nueva** página del segundo kanban (Proyectos / WIP), protección por rol, todas las viviendas en fases desde reno-budget.
- `components/reno/reno-sidebar.tsx`: Ítem "Proyectos / WIP" para admin y construction_manager.
- `components/reno/reno-kanban-board.tsx`: Props opcionales `propertiesByPhaseOverride`, `visibleColumnsOverride`, `fromParam`.
- `components/reno/reno-kanban-filters.tsx`: Opción `propertyTypeOptions`; tipos Project y WIP en filtros del segundo kanban.
- `lib/reno-kanban-config.ts`: `PHASES_FROM_OBRA_START` (incl. reno-budget), `visibleRenoKanbanColumnsFromObraStart` exportados.

### UI / UX
- `components/reno/vistral-logo-loader.tsx`: **Nuevo** loader con logo Vistral (variantes segmentos y spin).
- `app/globals.css`: Keyframes y clases para animaciones del loader.
- `components/reno/reno-property-card.tsx`: Tags Project y WIP en tonos azules.
- `components/reno/property-status-sidebar.tsx`: Campo "Ubicación de las llaves" (`keys_location`).
- `components/property/future-date-picker.tsx`: Permitir fecha de hoy en fecha estimada de visita.

### Dar obra por finalizada
- `components/reno/dynamic-categories-progress.tsx`: Modal "Dar obra por finalizada", checkboxes por categorías/partidas, avance a furnishing y sync Airtable.
- `lib/airtable/phase-sync.ts`: Mapeo furnishing en sync a Airtable.
- `app/reno/construction-manager/property/[id]/page.tsx`: Botón móvil "Dar obra por finalizada", soporte `from=kanban-projects` en redirect y checklist.

### Navegación y detalle
- `app/reno/construction-manager/property/[id]/checklist/page.tsx`: Redirect y botón atrás con `from=kanban-projects`.

### i18n
- `lib/i18n/translations.ts`: `nav.kanbanProjects` (ES/EN) y claves para modal finalizar obra.

### Docs
- `docs/GOOGLE_MAPS_SETUP.md`: Configuración de Google Maps y referrers.
- `docs/LOADER_LOGO_VISTRAL_ESPECIFICACION.md`: Especificación del loader Vistral.

## Cómo probar

1. **Kanban Proyectos / WIP**: Entrar como admin o construction_manager, sidebar → "Proyectos / WIP". Deben verse todas las viviendas en las fases desde presupuesto hasta limpieza.
2. **Primer Kanban**: No deben aparecer propiedades con tipo Project o WIP; en filtros solo Unit y Building.
3. **Loader**: Cargar home, kanban o detalle de propiedad y comprobar loader con logo Vistral.
4. **Dar obra por finalizada**: En una propiedad en "Obra en proceso" con todas las categorías al 100%, usar el botón verde y completar el modal; debe pasar a Amoblamiento y reflejarse en Airtable.
5. **Desde kanban-projects**: Abrir una propiedad desde Proyectos/WIP; al volver atrás o desde checklist debe regresar a Proyectos/WIP.

## Base

- **Base:** `develop`
- **Head:** `feature/reno-photos-furnishing-sync` (o la rama que subas)
