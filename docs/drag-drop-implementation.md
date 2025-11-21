# Implementación de Drag & Drop en Kanban

## Instalación

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Ejemplo de Implementación

### 1. Modificar `RenoKanbanBoard`

```typescript
"use client";

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';
import { renoApi } from '@/lib/api/reno-api';
import { getWebSocket } from '@/lib/api/websocket';

export function RenoKanbanBoard({ searchQuery }: RenoKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<Set<string>>(new Set());

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const propertyId = active.id as string;
    const newPhase = over.id as RenoKanbanPhase;
    const oldPhase = getPropertyPhase(propertyId); // Helper function

    // Don't update if phase hasn't changed
    if (oldPhase === newPhase) return;

    // Optimistic update
    setIsUpdating(prev => new Set(prev).add(propertyId));
    updateLocalPropertyPhase(propertyId, newPhase);

    try {
      // Call API
      await renoApi.updatePropertyPhase(propertyId, newPhase);
      
      // Success - property already updated locally
      showSuccessToast(`Propiedad movida a ${getPhaseLabel(newPhase)}`);
    } catch (error) {
      // Revert optimistic update
      updateLocalPropertyPhase(propertyId, oldPhase);
      showErrorToast('Error al mover la propiedad. Intenta de nuevo.');
    } finally {
      setIsUpdating(prev => {
        const next = new Set(prev);
        next.delete(propertyId);
        return next;
      });
    }
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto">
        {renoKanbanColumns.map((column) => (
          <RenoKanbanColumn
            key={column.key}
            stage={column.stage}
            properties={getPropertiesForPhase(column.stage)}
            isDraggable={true}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId ? (
          <RenoPropertyCard
            property={getPropertyById(activeId)}
            isDragging={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### 2. Modificar `RenoKanbanColumn` para ser Sortable

```typescript
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function RenoKanbanColumn({ stage, properties, ...props }) {
  const {
    setNodeRef,
    attributes,
    listeners,
    isDragging,
  } = useSortable({
    id: stage,
    data: {
      type: 'column',
      stage,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-80",
        isDragging && "opacity-50"
      )}
    >
      <SortableContext
        items={properties.map(p => p.id)}
        strategy={verticalListSortingStrategy}
      >
        {properties.map((property) => (
          <SortablePropertyCard
            key={property.id}
            property={property}
            stage={stage}
          />
        ))}
      </SortableContext>
    </div>
  );
}
```

### 3. Crear `SortablePropertyCard`

```typescript
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortablePropertyCardProps {
  property: Property;
  stage: RenoKanbanPhase;
}

export function SortablePropertyCard({ property, stage }: SortablePropertyCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: property.id,
    data: {
      type: 'property',
      property,
      stage,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "z-50"
      )}
    >
      <RenoPropertyCard
        property={property}
        stage={stage}
      />
    </div>
  );
}
```

### 4. Manejar Drop Zones

```typescript
import { useDroppable } from '@dnd-kit/core';

export function DroppableColumn({ stage, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: {
      type: 'column',
      stage,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[200px] p-4 rounded-lg border-2 transition-colors",
        isOver && "border-blue-500 bg-blue-50 dark:bg-blue-950"
      )}
    >
      {children}
    </div>
  );
}
```

## Integración con WebSocket

```typescript
useEffect(() => {
  const ws = getWebSocket();
  
  // Connect
  ws.connect();

  // Listen for phase changes from other users
  const unsubscribe = ws.on('property.phase.changed', (payload) => {
    const { propertyId, newPhase } = payload;
    
    // Update local state
    updateLocalPropertyPhase(propertyId, newPhase);
    
    // Show notification
    showInfoToast(`Propiedad ${propertyId} movida a ${getPhaseLabel(newPhase)}`);
  });

  return () => {
    unsubscribe();
    ws.disconnect();
  };
}, []);
```

## Optimistic Updates Pattern

```typescript
const [properties, setProperties] = useState<Property[]>([]);
const [pendingUpdates, setPendingUpdates] = useState<Map<string, RenoKanbanPhase>>(new Map());

const updateLocalPropertyPhase = (propertyId: string, phase: RenoKanbanPhase) => {
  setProperties(prev => 
    prev.map(p => 
      p.id === propertyId 
        ? { ...p, renoPhase: phase }
        : p
    )
  );
  
  // Track pending update
  setPendingUpdates(prev => new Map(prev).set(propertyId, phase));
};

// When API confirms update
const confirmUpdate = (propertyId: string) => {
  setPendingUpdates(prev => {
    const next = new Map(prev);
    next.delete(propertyId);
    return next;
  });
};

// When API fails, revert
const revertUpdate = (propertyId: string, oldPhase: RenoKanbanPhase) => {
  updateLocalPropertyPhase(propertyId, oldPhase);
  setPendingUpdates(prev => {
    const next = new Map(prev);
    next.delete(propertyId);
    return next;
  });
};
```

## Consideraciones de UX

1. **Visual Feedback**
   - Mostrar cursor grab/grabbing
   - Opacidad reducida durante drag
   - Highlight en drop zone válida

2. **Loading States**
   - Deshabilitar drag mientras se procesa
   - Mostrar spinner en tarjeta actualizándose
   - Bloquear otras interacciones

3. **Error Handling**
   - Revertir cambio visualmente
   - Mostrar mensaje de error claro
   - Permitir reintentar

4. **Conflictos**
   - Si otro usuario mueve la misma propiedad
   - Mostrar diálogo de conflicto
   - Permitir elegir versión

