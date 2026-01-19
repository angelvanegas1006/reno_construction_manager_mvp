"use client";

import { useState, useMemo, useEffect, startTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { KanbanColumn } from "./kanban-column";
import { getAllProperties, Property } from "@/lib/property-storage";
import { calculateOverallProgress } from "@/lib/property-validation";
import { useI18n } from "@/lib/i18n";
import { visibleSupplyKanbanColumns, SupplyKanbanPhase } from "@/lib/supply-kanban-config";

interface KanbanBoardProps {
  searchQuery: string;
}

// Dummy data for demonstration
const dummyProperties = {
  draft: [
    { id: "4463739", address: "Calle Martinez de la Vega 26, 28014, Madrid", completion: 25, timeCreated: "2 días", timeInStage: "2 días" },
    { id: "4463740", address: "Avenida Diagonal 345, 08013, Barcelona", completion: 45, timeCreated: "3 días", timeInStage: "3 días" },
  ],
  "in-review": [
    { id: "4463745", address: "Calle de Vallehermoso 25, 28015, Madrid", analyst: "SA Supply Analyst", timeInStage: "3 días", timeCreated: "7 días" },
  ],
  "needs-correction": [],
  "in-negotiation": [],
  arras: [],
  "pending-to-settlement": [],
  settlement: [],
  rejected: [],
};

export function KanbanBoard({ searchQuery }: KanbanBoardProps) {
  const { t } = useI18n();
  
  // Use Supply Kanban configuration
  const columns = visibleSupplyKanbanColumns.map((col) => {
    // Map translation keys to actual translations
    const translationMap: Record<string, string> = {
      draft: t.kanban.draft,
      inReview: t.kanban.inReview,
      needsCorrection: t.kanban.needsCorrection,
      inNegotiation: t.kanban.inNegotiation,
      arras: t.kanban.arras,
      pendingToSettlement: t.kanban.pendingToSettlement,
      settlement: t.kanban.settlement,
      rejected: t.kanban.rejected,
    };
    
    // Map SupplyKanbanPhase to the stage type expected by KanbanColumn
    const stageMap: Record<SupplyKanbanPhase, "draft" | "review" | "needs-correction" | "negotiation" | "pending-arras" | "settlement" | "sold" | "rejected" | "initial-check" | "upcoming" | "reno-in-progress" | "furnishing-cleaning" | "final-check" | "reno-fixes" | "done"> = {
      "draft": "draft",
      "in-review": "review",
      "needs-correction": "needs-correction",
      "in-negotiation": "negotiation",
      "arras": "pending-arras",
      "pending-to-settlement": "pending-arras",
      "settlement": "settlement",
      "rejected": "rejected",
    };
    
    return {
      key: col.key,
      title: translationMap[col.translationKey] || col.key,
      stage: stageMap[col.stage],
    };
  });
  const [isHovered, setIsHovered] = useState(false);
  const [realProperties, setRealProperties] = useState<Property[]>([]);
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

  // Load properties from localStorage
  useEffect(() => {
    const loadProperties = () => {
      const props = getAllProperties();
      setRealProperties(props);
    };
    
    loadProperties();
    // Reload when storage changes (useful when a new property is added)
    const interval = setInterval(loadProperties, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (id: string, stage: string, isReal: boolean = false) => {
    // Only navigate to edit page if the card is in draft stage AND it's a real property
    if (stage === "draft" && isReal) {
      // Use startTransition to avoid blocking and prevent fetch errors
      startTransition(() => {
        router.push(`/partner/property/${id}/edit`);
      });
    }
  };

  // Transform real properties to card format
  const transformProperties = useMemo(() => {
    type CardData = {
      id: string;
      address: string;
      price?: number;
      analyst?: string;
      completion?: number;
      correctionsCount?: number;
      timeInStage: string;
      timeCreated?: string;
      isReal: boolean; // Track if property exists in storage
    };

    const transformed: Record<string, CardData[]> = {
      draft: [],
      "in-review": [],
      "needs-correction": [],
      "in-negotiation": [],
      arras: [],
      "pending-to-settlement": [],
      settlement: [],
      rejected: [],
    };

    realProperties.forEach((prop) => {
      // Calculate completion percentage for draft properties
      const completion = prop.currentStage === "draft" && prop.data
        ? calculateOverallProgress(prop.data, false, prop.propertyType)
        : prop.completion;

      // Format address
      const addressParts = [
        prop.fullAddress,
        prop.planta && `Planta ${prop.planta}`,
        prop.puerta && `Puerta ${prop.puerta}`,
        prop.bloque && `Bloque ${prop.bloque}`,
        prop.escalera && `Escalera ${prop.escalera}`,
      ].filter(Boolean);
      const address = addressParts.join(", ");

      const cardData: CardData = {
        id: prop.id,
        address,
        price: prop.price,
        analyst: prop.analyst,
        completion,
        correctionsCount: prop.correctionsCount,
        timeInStage: prop.timeInStage,
        timeCreated: prop.timeCreated,
        isReal: true, // Real properties from localStorage
      };

      // Map currentStage to the correct key
      const stageKey = prop.currentStage;
      if (stageKey in transformed) {
        transformed[stageKey].push(cardData);
      }
    });

    return transformed;
  }, [realProperties]);

  // Combine real properties with dummy data
  const allProperties = useMemo(() => {
    type CardData = {
      id: string;
      address: string;
      price?: number;
      analyst?: string;
      completion?: number;
      correctionsCount?: number;
      timeInStage: string;
      timeCreated?: string;
      isReal?: boolean;
    };

    // Mark dummy properties as not real
    const markedDummyProperties: Record<string, CardData[]> = {
      draft: dummyProperties.draft.map((p: any) => ({ ...p, isReal: false })),
      "in-review": dummyProperties["in-review"].map((p: any) => ({ ...p, isReal: false })),
      "needs-correction": dummyProperties["needs-correction"].map((p: any) => ({ ...p, isReal: false })),
      "in-negotiation": dummyProperties["in-negotiation"].map((p: any) => ({ ...p, isReal: false })),
      arras: dummyProperties.arras.map((p: any) => ({ ...p, isReal: false })),
      "pending-to-settlement": dummyProperties["pending-to-settlement"].map((p: any) => ({ ...p, isReal: false })),
      settlement: dummyProperties.settlement.map((p: any) => ({ ...p, isReal: false })),
      rejected: (dummyProperties.rejected || []).map((p: any) => ({ ...p, isReal: false })),
    };

    const combined: Record<string, CardData[]> = {
      draft: [...(transformProperties.draft || []), ...markedDummyProperties.draft],
      "in-review": [...(transformProperties["in-review"] || []), ...markedDummyProperties["in-review"]],
      "needs-correction": [...(transformProperties["needs-correction"] || []), ...markedDummyProperties["needs-correction"]],
      "in-negotiation": [...(transformProperties["in-negotiation"] || []), ...markedDummyProperties["in-negotiation"]],
      arras: [...(transformProperties.arras || []), ...markedDummyProperties.arras],
      "pending-to-settlement": [...(transformProperties["pending-to-settlement"] || []), ...markedDummyProperties["pending-to-settlement"]],
      settlement: [...(transformProperties.settlement || []), ...markedDummyProperties.settlement],
      rejected: [...(transformProperties.rejected || []), ...markedDummyProperties.rejected],
    };
    return combined;
  }, [transformProperties]);

  // Filter properties based on search query
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) {
      return allProperties;
    }

    const query = searchQuery.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Helper function to normalize and compare strings (handles accents)
    const normalizeString = (str: string) => {
      return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    // Helper function to check if a property matches the query
    const matchesQuery = (property: {
      id: string;
      address: string;
      price?: number;
      analyst?: string;
      completion?: number;
      correctionsCount?: number;
      timeInStage: string;
      timeCreated?: string;
      isReal?: boolean;
    }) => {
      // Match by ID
      if (normalizeString(property.id).includes(query)) {
        return true;
      }

      // Match by address (calle) - normalized comparison
      if (normalizeString(property.address).includes(query)) {
        return true;
      }

      // Match by price - only if query contains numbers
      if (property.price !== undefined && /\d/.test(query)) {
        const priceStr = property.price.toString();
        const priceFormatted = property.price.toLocaleString("es-ES");
        // Remove non-digits from query for numeric comparison
        const numericQuery = query.replace(/[^\d]/g, "");
        if (numericQuery && (priceStr.includes(numericQuery) || normalizeString(priceFormatted).includes(query))) {
          return true;
        }
      }

      return false;
    };

    // Filter each column explicitly to ensure all are processed
    const filtered: typeof allProperties = {
      draft: allProperties.draft.filter(matchesQuery),
      "in-review": allProperties["in-review"].filter(matchesQuery),
      "needs-correction": allProperties["needs-correction"].filter(matchesQuery),
      "in-negotiation": allProperties["in-negotiation"].filter(matchesQuery),
      arras: allProperties.arras.filter(matchesQuery),
      "pending-to-settlement": allProperties["pending-to-settlement"].filter(matchesQuery),
      settlement: allProperties.settlement.filter(matchesQuery),
      rejected: allProperties.rejected.filter(matchesQuery),
    };

    return filtered;
  }, [searchQuery, allProperties]);

  // Find first matching property when search query changes
  const highlightedPropertyId = useMemo(() => {
    if (!searchQuery.trim()) {
      return null;
    }
    
    // Find first property that matches the search
    for (const stage of columns) {
      const properties = filteredProperties[stage.key as keyof typeof filteredProperties] || [];
      if (properties.length > 0) {
        return properties[0].id;
      }
    }
    
    return null;
  }, [searchQuery, filteredProperties, columns]);

  // Scroll to highlighted property
  useEffect(() => {
    if (!highlightedPropertyId) return;

    // Find which column contains the highlighted property
    let targetColumnKey: string | null = null;
    for (const stage of columns) {
      const properties = filteredProperties[stage.key as keyof typeof filteredProperties] || [];
      if (properties.some(p => p.id === highlightedPropertyId)) {
        targetColumnKey = stage.key;
        break;
      }
    }

    if (!targetColumnKey) return;

    // Wait for DOM to update and animations to complete
    const timeoutId = setTimeout(() => {
      // Scroll to column
      const columnElement = columnRefs.current[targetColumnKey!];
      if (!columnElement) return;

      // Desktop: scroll horizontally to column
      if (window.innerWidth >= 768 && boardContainerRef.current) {
        // Use the board container for horizontal scroll
        const container = boardContainerRef.current;
        const columnRect = columnElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate scroll position to center the column
        const scrollLeft = container.scrollLeft + columnRect.left - containerRect.left - (containerRect.width / 2) + (columnRect.width / 2);
        
        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: "smooth",
        });
      } else {
        // Mobile: scroll vertically to column
        // Find the scrollable parent container (the one with overflow-y-auto in kanban page)
        const scrollableParent = document.querySelector('[data-scroll-container]') as HTMLElement;
        if (scrollableParent) {
          const columnTop = columnElement.offsetTop;
          const currentScroll = scrollableParent.scrollTop;
          const columnHeight = columnElement.offsetHeight;
          const parentHeight = scrollableParent.clientHeight;
          
          // Calculate position to center or show the column
          const targetScroll = columnTop - (parentHeight / 2) + (columnHeight / 2);
          
          scrollableParent.scrollTo({
            top: Math.max(0, targetScroll - 20), // 20px padding
            behavior: "smooth",
          });
        } else {
          // Fallback: use scrollIntoView
          columnElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
      
      // Also scroll within column if card is not visible
      setTimeout(() => {
        const cardElement = columnElement.querySelector(
          `[data-property-id="${highlightedPropertyId}"]`
        ) as HTMLElement;
        
        if (cardElement) {
          // Scroll within column container
          const columnContainer = columnElement.querySelector(
            '[class*="overflow-y-auto"]'
          ) as HTMLElement;
          
          if (columnContainer) {
            const cardTop = cardElement.offsetTop;
            const cardHeight = cardElement.offsetHeight;
            const containerTop = columnContainer.scrollTop;
            const containerHeight = columnContainer.clientHeight;
            
            // Check if card is visible
            if (cardTop < containerTop || cardTop + cardHeight > containerTop + containerHeight) {
              columnContainer.scrollTo({
                top: Math.max(0, cardTop - 20), // 20px padding
                behavior: "smooth",
              });
            }
          }
        }
      }, 200); // Wait a bit more for column scroll to complete
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [highlightedPropertyId, filteredProperties, columns]);

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
        {columns.map((column) => {
          const properties = filteredProperties[column.key as keyof typeof filteredProperties] || [];
          return (
            <KanbanColumn
              key={column.key}
              title={column.title}
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
        {columns.map((column) => {
          const properties = filteredProperties[column.key as keyof typeof filteredProperties] || [];
          return (
            <KanbanColumn
              key={column.key}
              title={column.title}
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

