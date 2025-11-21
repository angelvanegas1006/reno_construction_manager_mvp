/**
 * Ejemplo de uso de Supabase en RenoKanbanBoard
 * 
 * Este archivo muestra cómo integrar Supabase con Realtime
 * en el componente del Kanban
 */

'use client';

import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { supabaseProperties } from '@/lib/api/supabase-properties';
import { Property } from '@/lib/property-storage';
import { RenoKanbanPhase } from '@/lib/reno-kanban-config';
import { RenoKanbanColumn } from '@/components/reno/reno-kanban-column';

export function RenoKanbanBoardWithSupabase({ searchQuery }: { searchQuery: string }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<Set<string>>(new Set());

  // Load initial properties
  useEffect(() => {
    loadProperties();
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    const unsubscribe = supabaseProperties.subscribeToPhaseChanges((payload) => {
      console.log('Phase changed:', payload);
      
      // Update local state when phase changes from another user
      setProperties(prev => 
        prev.map(p => 
          p.id === payload.propertyId 
            ? { ...p, renoPhase: payload.newPhase as any }
            : p
        )
      );
      
      // Show notification
      // showToast(`Property ${payload.propertyId} moved to ${payload.newPhase}`);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      const props = await supabaseProperties.getProperties();
      setProperties(props);
    } catch (error) {
      console.error('Error loading properties:', error);
      // Fallback to localStorage if Supabase fails
      // const localProps = getAllProperties();
      // setProperties(localProps);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const propertyId = active.id as string;
    const newPhase = over.id as RenoKanbanPhase;
    
    // Get current property to find old phase
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    const oldPhase = property.renoPhase as RenoKanbanPhase | undefined;

    // Don't update if phase hasn't changed
    if (oldPhase === newPhase) return;

    // Optimistic update
    setIsUpdating(prev => new Set(prev).add(propertyId));
    setProperties(prev =>
      prev.map(p =>
        p.id === propertyId
          ? { ...p, renoPhase: newPhase as any }
          : p
      )
    );

    try {
      // Call Supabase API
      await supabaseProperties.updatePropertyPhase(propertyId, newPhase);
      
      // Success - property already updated optimistically
      console.log(`✅ Property ${propertyId} moved to ${newPhase}`);
    } catch (error) {
      console.error('Error updating property phase:', error);
      
      // Revert optimistic update
      setProperties(prev =>
        prev.map(p =>
          p.id === propertyId
            ? { ...p, renoPhase: oldPhase as any }
            : p
        )
      );
      
      // Show error message
      // showErrorToast('Error al mover la propiedad. Intenta de nuevo.');
    } finally {
      setIsUpdating(prev => {
        const next = new Set(prev);
        next.delete(propertyId);
        return next;
      });
    }
  };

  // Group properties by phase
  const propertiesByPhase = properties.reduce((acc, prop) => {
    const phase = (prop.renoPhase || 'initial-check') as RenoKanbanPhase;
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(prop);
    return acc;
  }, {} as Record<RenoKanbanPhase, Property[]>);

  if (isLoading) {
    return <div>Cargando propiedades...</div>;
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto">
        {renoKanbanColumns.map((column) => {
          const phaseProperties = propertiesByPhase[column.stage] || [];
          
          return (
            <RenoKanbanColumn
              key={column.key}
              title={column.title}
              count={phaseProperties.length}
              stage={column.stage}
              properties={phaseProperties}
              highlightedPropertyId={null}
            />
          );
        })}
      </div>
    </DndContext>
  );
}

/**
 * Hook personalizado para manejar propiedades con Supabase
 */
export function useSupabaseProperties(phase?: RenoKanbanPhase) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadProperties();

    // Subscribe to changes
    const unsubscribe = supabaseProperties.subscribeToProperties(phase || null, (property, eventType) => {
      if (eventType === 'INSERT') {
        setProperties(prev => [...prev, property]);
      } else if (eventType === 'UPDATE') {
        setProperties(prev =>
          prev.map(p => (p.id === property.id ? property : p))
        );
      } else if (eventType === 'DELETE') {
        setProperties(prev => prev.filter(p => p.id !== property.id));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [phase]);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const props = await supabaseProperties.getProperties(phase);
      setProperties(props);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading properties:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePhase = async (propertyId: string, newPhase: RenoKanbanPhase) => {
    try {
      await supabaseProperties.updatePropertyPhase(propertyId, newPhase);
      // Realtime subscription will update the state automatically
    } catch (err) {
      console.error('Error updating phase:', err);
      throw err;
    }
  };

  return {
    properties,
    isLoading,
    error,
    updatePhase,
    refetch: loadProperties,
  };
}

