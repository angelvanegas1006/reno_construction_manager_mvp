"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useSupabaseKanbanProperties } from '@/hooks/useSupabaseKanbanProperties';
import type { Property } from '@/lib/property-storage';
import type { RenoKanbanPhase } from '@/lib/reno-kanban-config';

interface RenoPropertiesContextValue {
  propertiesByPhase: Record<RenoKanbanPhase, Property[]>;
  loading: boolean;
  error: string | null;
  totalProperties: number;
  // Helper to get all properties as flat array
  allProperties: Property[];
}

const RenoPropertiesContext = createContext<RenoPropertiesContextValue | undefined>(undefined);

interface RenoPropertiesProviderProps {
  children: ReactNode;
}

/**
 * Provider that fetches and shares properties data across the Reno Construction Manager app
 * This eliminates duplicate fetches between Home and Kanban pages
 */
export function RenoPropertiesProvider({ children }: RenoPropertiesProviderProps) {
  const { propertiesByPhase, loading, error, totalProperties } = useSupabaseKanbanProperties();

  // Memoize allProperties to avoid recalculating on every render
  const allProperties = React.useMemo(() => {
    if (!propertiesByPhase) return [];
    return Object.values(propertiesByPhase).flat();
  }, [propertiesByPhase]);

  const value: RenoPropertiesContextValue = {
    propertiesByPhase: propertiesByPhase || ({} as Record<RenoKanbanPhase, Property[]>),
    loading,
    error,
    totalProperties,
    allProperties,
  };

  return (
    <RenoPropertiesContext.Provider value={value}>
      {children}
    </RenoPropertiesContext.Provider>
  );
}

/**
 * Hook to access properties from the context
 * Throws error if used outside provider
 */
export function useRenoProperties() {
  const context = useContext(RenoPropertiesContext);
  if (context === undefined) {
    throw new Error('useRenoProperties must be used within a RenoPropertiesProvider');
  }
  return context;
}

