# 📊 Configuración de Mixpanel

## 🚀 Instalación y Configuración

### 1. Obtener Token de Mixpanel

1. Ve a [Mixpanel](https://mixpanel.com) y crea una cuenta o inicia sesión
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **Settings** → **Project Settings** → **Project Info**
4. Copia el **Token** del proyecto

### 2. Configurar Variables de Entorno

Agrega el token de Mixpanel a tus variables de entorno:

#### En Vercel:

1. Ve a tu proyecto en Vercel
2. Ve a **Settings** → **Environment Variables**
3. Agrega:
   - **Name**: `NEXT_PUBLIC_MIXPANEL_TOKEN`
   - **Value**: Tu token de Mixpanel (ej: `abc123def456...`)
   - **Environments**: Production, Preview, Development

#### En Local (.env.local):

```bash
NEXT_PUBLIC_MIXPANEL_TOKEN=tu_token_aqui
```

### 3. Verificar Instalación

El paquete `mixpanel-browser` ya está instalado y configurado. El `MixpanelProvider` se inicializa automáticamente en `app/layout.tsx`.

## 📝 Uso Básico

### Trackear Eventos

```typescript
import { useMixpanel } from "@/hooks/useMixpanel";

function MyComponent() {
  const { track } = useMixpanel();

  const handleButtonClick = () => {
    track("Button Clicked", {
      button_name: "Save Property",
      property_id: "123",
      page: "property-detail",
    });
  };

  return <button onClick={handleButtonClick}>Save</button>;
}
```

### Trackear Eventos Directamente

```typescript
import { trackEvent } from "@/lib/analytics/mixpanel";

trackEvent("Property Created", {
  property_id: "123",
  property_type: "apartment",
  renovation_type: "major",
});
```

### Actualizar Propiedades de Usuario

```typescript
import { useMixpanel } from "@/hooks/useMixpanel";

function MyComponent() {
  const { setProperties, increment } = useMixpanel();

  useEffect(() => {
    // Establecer propiedades del usuario
    setProperties({
      role: "construction_manager",
      team: "reno-team",
    });

    // Incrementar contador
    increment("properties_viewed");
  }, []);
}
```

## 🎯 Eventos Recomendados para Trackear

### Navegación

- `Page Viewed` - Automático cuando cambias de página
- `Navigation Clicked` - Cuando hacen clic en un enlace de navegación

### Propiedades

- `Property Viewed` - Cuando ven una propiedad
- `Property Created` - Cuando crean una propiedad
- `Property Updated` - Cuando actualizan una propiedad
- `Property Phase Changed` - Cuando cambian la fase de una propiedad
- `Property Card Clicked` - Cuando hacen clic en una card de propiedad

### Kanban

- `Kanban View Selected` - Cuando seleccionan vista Kanban
- `List View Selected` - Cuando seleccionan vista Lista
- `Property Dragged` - Cuando arrastran una propiedad a otra fase
- `Filter Applied` - Cuando aplican filtros

### Tareas y Checklist

- `Task Completed` - Cuando completan una tarea
- `Checklist Started` - Cuando inician un checklist
- `Checklist Completed` - Cuando completan un checklist

### Comentarios y Recordatorios

- `Comment Added` - Cuando agregan un comentario
- `Reminder Created` - Cuando crean un recordatorio
- `Reminder Completed` - Cuando completan un recordatorio

### Sincronización

- `Airtable Sync Triggered` - Cuando se ejecuta sincronización manual
- `Airtable Sync Completed` - Cuando completa sincronización
- `Airtable Sync Failed` - Cuando falla sincronización

## 📊 Ejemplos de Implementación

### Ejemplo 1: Trackear Clic en Card de Propiedad

```typescript
// components/reno/reno-property-card.tsx
import { useMixpanel } from "@/hooks/useMixpanel";

export function RenoPropertyCard({ property, onClick }) {
  const { track } = useMixpanel();

  const handleClick = () => {
    track("Property Card Clicked", {
      property_id: property.id,
      property_phase: property.renoPhase,
      property_type: property.type,
      renovation_type: property.renoType,
    });
    onClick?.();
  };

  return <div onClick={handleClick}>...</div>;
}
```

### Ejemplo 2: Trackear Cambio de Fase

```typescript
// components/reno/reno-kanban-board.tsx
import { useMixpanel } from "@/hooks/useMixpanel";

export function RenoKanbanBoard() {
  const { track } = useMixpanel();

  const handlePhaseChange = (propertyId: string, oldPhase: string, newPhase: string) => {
    track("Property Phase Changed", {
      property_id: propertyId,
      old_phase: oldPhase,
      new_phase: newPhase,
      method: "drag_and_drop", // o "manual"
    });
  };

  // ...
}
```

### Ejemplo 3: Trackear Vista Seleccionada

```typescript
// components/layout/navbar-l1.tsx
import { useMixpanel } from "@/hooks/useMixpanel";

export function NavbarL1({ viewMode, onViewModeChange }) {
  const { track } = useMixpanel();

  const handleViewModeChange = (newMode: "kanban" | "list") => {
    track(newMode === "kanban" ? "Kanban View Selected" : "List View Selected", {
      previous_view: viewMode,
      new_view: newMode,
    });
    onViewModeChange(newMode);
  };

  // ...
}
```

### Ejemplo 4: Trackear Filtros Aplicados

```typescript
// components/reno/reno-kanban-filters.tsx
import { useMixpanel } from "@/hooks/useMixpanel";

export function RenoKanbanFilters({ filters, onFiltersChange }) {
  const { track } = useMixpanel();

  const handleFilterChange = (newFilters: KanbanFilters) => {
    track("Filter Applied", {
      renovator_count: newFilters.renovatorNames.length,
      technical_constructor_count: newFilters.technicalConstructors.length,
      area_cluster_count: newFilters.areaClusters.length,
      total_filters: 
        newFilters.renovatorNames.length +
        newFilters.technicalConstructors.length +
        newFilters.areaClusters.length,
    });
    onFiltersChange(newFilters);
  };

  // ...
}
```

## 🔍 Verificar Eventos en Mixpanel

1. Ve a tu proyecto en Mixpanel
2. Ve a **Events** para ver todos los eventos trackeados
3. Ve a **Insights** para crear dashboards y análisis
4. Ve a **Users** para ver información de usuarios identificados

## 🛠️ Debugging

En desarrollo, Mixpanel mostrará logs en la consola del navegador:

```
[Mixpanel] Initialized successfully
[Mixpanel] User identified: user-123
[Mixpanel] Tracking event: Property Card Clicked
```

Si no ves estos logs, verifica:
1. Que `NEXT_PUBLIC_MIXPANEL_TOKEN` esté configurado
2. Que el `MixpanelProvider` esté en el layout
3. Que no haya errores en la consola

## 📚 Recursos

- [Mixpanel Documentation](https://developer.mixpanel.com/docs)
- [Mixpanel JavaScript SDK](https://github.com/mixpanel/mixpanel-js)
- [Best Practices](https://developer.mixpanel.com/docs/javascript-full-api-reference)

