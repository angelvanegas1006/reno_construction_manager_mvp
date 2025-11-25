"use client";

import { useState, useMemo, useEffect, startTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { RenoKanbanColumn } from "./reno-kanban-column";
import { RenoHomeLoader } from "./reno-home-loader";
import { Property } from "@/lib/property-storage";
import { useSupabaseKanbanProperties } from "@/hooks/useSupabaseKanbanProperties";
import { calculateOverallProgress } from "@/lib/property-validation";
import { useI18n } from "@/lib/i18n";
import { visibleRenoKanbanColumns, RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { sortPropertiesByExpired } from "@/lib/property-sorting";

interface RenoKanbanBoardProps {
  searchQuery: string;
}

// Dummy data and helper functions removed - now using Supabase

export function RenoKanbanBoard({ searchQuery }: RenoKanbanBoardProps) {
  const { t } = useI18n();
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  
  // Refs for columns to enable scrolling
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const boardContainerRef = useRef<HTMLDivElement>(null);
  
  // Store column refs callback
  const setColumnRef = useCallback((key: string, element: HTMLDivElement | null) => {
    if (element) {
      columnRefs.current[key] = element;
    } else {
      delete columnRefs.current[key];
    }
  }, []);

  // Set mounted flag after component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load properties from Supabase (replaces localStorage and mock data)
  const { propertiesByPhase: supabasePropertiesByPhase, loading: supabaseLoading, error: supabaseError } = useSupabaseKanbanProperties();

  const handleCardClick = (property: Property) => {
    // For construction manager, navigate to view-only page
    // Later, this will open the task execution screen
    startTransition(() => {
      router.push(`/reno/construction-manager/property/${property.id}`);
    });
  };

  // Use properties from Supabase (no transformation needed, already grouped by phase)
  const transformProperties = useMemo(() => {
    // Return Supabase properties directly, already grouped by phase
    return supabasePropertiesByPhase;
  }, [supabasePropertiesByPhase]);

  // Mock data initialization removed - now using Supabase only

  // Use properties from Supabase only (no mock data, no localStorage)
  const allProperties = useMemo(() => {
    // During SSR or initial render, return empty structure
    if (!isMounted || supabaseLoading) {
      return {
      "upcoming-settlements": [],
      "initial-check": [],
      "upcoming": [],
      "reno-in-progress": [],
      "furnishing-cleaning": [],
      "final-check": [],
      "reno-fixes": [],
      "done": [],
    };
    }

    // Use properties from Supabase, already grouped by phase
    // Sort each column: expired first
    const sorted: Record<RenoKanbanPhase, Property[]> = {
      "upcoming-settlements": sortPropertiesByExpired(transformProperties["upcoming-settlements"] || []),
      "initial-check": sortPropertiesByExpired(transformProperties["initial-check"] || []),
      "upcoming": sortPropertiesByExpired(transformProperties["upcoming"] || []),
      "reno-in-progress": sortPropertiesByExpired(transformProperties["reno-in-progress"] || []),
      "furnishing-cleaning": sortPropertiesByExpired(transformProperties["furnishing-cleaning"] || []),
      "final-check": sortPropertiesByExpired(transformProperties["final-check"] || []),
      "reno-fixes": sortPropertiesByExpired(transformProperties["reno-fixes"] || []),
      "done": sortPropertiesByExpired(transformProperties["done"] || []),
    };
    
    return sorted;
  }, [isMounted, supabaseLoading, transformProperties]);

  // Filter properties based on search query
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) {
      return allProperties;
    }

    const query = searchQuery.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const normalizeString = (str: string) => {
      return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const matchesQuery = (property: Property) => {
      if (normalizeString(property.id).includes(query)) {
        return true;
      }
      if (normalizeString(property.fullAddress).includes(query)) {
        return true;
      }
      if (property.price !== undefined && /\d/.test(query)) {
        const priceStr = property.price.toString();
        const priceFormatted = property.price.toLocaleString("es-ES");
        const numericQuery = query.replace(/[^\d]/g, "");
        if (numericQuery && (priceStr.includes(numericQuery) || normalizeString(priceFormatted).includes(query))) {
          return true;
        }
      }
      return false;
    };

    const filtered: typeof allProperties = {
      "upcoming-settlements": allProperties["upcoming-settlements"].filter(matchesQuery),
      "initial-check": allProperties["initial-check"].filter(matchesQuery),
      "upcoming": allProperties["upcoming"].filter(matchesQuery),
      "reno-in-progress": allProperties["reno-in-progress"].filter(matchesQuery),
      "furnishing-cleaning": allProperties["furnishing-cleaning"].filter(matchesQuery),
      "final-check": allProperties["final-check"].filter(matchesQuery),
      "reno-fixes": allProperties["reno-fixes"].filter(matchesQuery),
      "done": allProperties["done"].filter(matchesQuery),
    };

    // Sort each column: expired first (even after filtering)
    const sorted: typeof filtered = {
      "upcoming-settlements": sortPropertiesByExpired(filtered["upcoming-settlements"]),
      "initial-check": sortPropertiesByExpired(filtered["initial-check"]),
      "upcoming": sortPropertiesByExpired(filtered["upcoming"]),
      "reno-in-progress": sortPropertiesByExpired(filtered["reno-in-progress"]),
      "furnishing-cleaning": sortPropertiesByExpired(filtered["furnishing-cleaning"]),
      "final-check": sortPropertiesByExpired(filtered["final-check"]),
      "reno-fixes": sortPropertiesByExpired(filtered["reno-fixes"]),
      "done": sortPropertiesByExpired(filtered["done"]),
    };

    return sorted;
  }, [searchQuery, allProperties]);

  // Find first matching property when search query changes
  const highlightedPropertyId = useMemo(() => {
    if (!searchQuery.trim()) {
      return null;
    }
    
    for (const column of visibleRenoKanbanColumns) {
      const properties = filteredProperties[column.key] || [];
      if (properties.length > 0) {
        return properties[0].id;
      }
    }
    
    return null;
  }, [searchQuery, filteredProperties]);

  // Scroll to highlighted property
  useEffect(() => {
    if (!highlightedPropertyId) return;

    let targetColumnKey: RenoKanbanPhase | null = null;
    for (const column of visibleRenoKanbanColumns) {
      const properties = filteredProperties[column.key] || [];
      if (properties.some(p => p.id === highlightedPropertyId)) {
        targetColumnKey = column.key;
        break;
      }
    }

    if (!targetColumnKey) return;

    const timeoutId = setTimeout(() => {
      const columnElement = columnRefs.current[targetColumnKey!];
      if (!columnElement) return;

      if (window.innerWidth >= 768 && boardContainerRef.current) {
        const container = boardContainerRef.current;
        const columnRect = columnElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const scrollLeft = container.scrollLeft + columnRect.left - containerRect.left - (containerRect.width / 2) + (columnRect.width / 2);
        
        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: "smooth",
        });
      } else {
        const scrollableParent = document.querySelector('[data-scroll-container]') as HTMLElement;
        if (scrollableParent) {
          const columnTop = columnElement.offsetTop;
          const columnHeight = columnElement.offsetHeight;
          const parentHeight = scrollableParent.clientHeight;
          
          const targetScroll = columnTop - (parentHeight / 2) + (columnHeight / 2);
          
          scrollableParent.scrollTo({
            top: Math.max(0, targetScroll - 20),
            behavior: "smooth",
          });
        } else {
          columnElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
      
      setTimeout(() => {
        const cardElement = columnElement.querySelector(
          `[data-property-id="${highlightedPropertyId}"]`
        ) as HTMLElement;
        
        if (cardElement) {
          const columnContainer = columnElement.querySelector(
            '[class*="overflow-y-auto"]'
          ) as HTMLElement;
          
          if (columnContainer) {
            const cardTop = cardElement.offsetTop;
            const cardHeight = cardElement.offsetHeight;
            const containerTop = columnContainer.scrollTop;
            const containerHeight = columnContainer.clientHeight;
            
            if (cardTop < containerTop || cardTop + cardHeight > containerTop + containerHeight) {
              columnContainer.scrollTo({
                top: Math.max(0, cardTop - 20),
                behavior: "smooth",
              });
            }
          }
        }
      }, 200);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [highlightedPropertyId, filteredProperties]);

  // Show error message if Supabase fails
  if (supabaseError) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center space-y-2">
          <p className="text-red-600 dark:text-red-400 font-semibold">Error al cargar propiedades</p>
          <p className="text-sm text-muted-foreground">{supabaseError}</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (supabaseLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RenoHomeLoader />
      </div>
    );
  }

  return (
    <div
      ref={boardContainerRef}
      className={cn(
        "h-full",
        "md:overflow-x-auto pb-4",
        "md:scrollbar-hidden",
        isHovered ? "md:scrollbar-visible" : "md:scrollbar-hidden"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        scrollbarWidth: isHovered ? "thin" : "none",
      }}
    >
      {/* Mobile: Vertical layout */}
      <div className="flex flex-col md:hidden gap-6 pb-20">
        {visibleRenoKanbanColumns.map((column) => {
          const properties = filteredProperties[column.key] || [];
          const title = t.kanban[column.translationKey];
          return (
            <RenoKanbanColumn
              key={column.key}
              title={title}
              count={properties.length}
              stage={column.stage}
              properties={properties}
              onCardClick={handleCardClick}
              highlightedPropertyId={highlightedPropertyId}
              onColumnRef={(el) => setColumnRef(column.key, el)}
            />
          );
        })}
      </div>

      {/* Desktop: Horizontal layout */}
      <div className="hidden md:flex h-full gap-4 px-1" style={{ minWidth: "fit-content" }}>
        {visibleRenoKanbanColumns.map((column) => {
          const properties = filteredProperties[column.key] || [];
          const title = t.kanban[column.translationKey];
          return (
            <RenoKanbanColumn
              key={column.key}
              title={title}
              count={properties.length}
              stage={column.stage}
              properties={properties}
              onCardClick={handleCardClick}
              highlightedPropertyId={highlightedPropertyId}
              onColumnRef={(el) => setColumnRef(column.key, el)}
            />
          );
        })}
      </div>
    </div>
  );
}

