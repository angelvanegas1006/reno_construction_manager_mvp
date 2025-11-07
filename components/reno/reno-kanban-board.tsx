"use client";

import { useState, useMemo, useEffect, startTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { RenoKanbanColumn } from "./reno-kanban-column";
import { getAllProperties, Property, saveProperty } from "@/lib/property-storage";
import { calculateOverallProgress } from "@/lib/property-validation";
import { useI18n } from "@/lib/i18n";
import { renoKanbanColumns, RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { sortPropertiesByExpired } from "@/lib/property-sorting";

interface RenoKanbanBoardProps {
  searchQuery: string;
}

// Helper to create dummy Property objects with reno fields
function createDummyRenoProperty(
  id: string,
  address: string,
  price: number,
  stage: RenoKanbanPhase,
  options?: {
    analyst?: string;
    completion?: number;
    timeInStage?: string;
    timeCreated?: string;
    proximaActualizacion?: string;
    ultimaActualizacion?: string;
    inicio?: string;
    finEst?: string;
    region?: string;
    renoType?: string;
    renovador?: string;
  }
): Property {
  const now = new Date();
  const today = new Date().toISOString().split('T')[0];
  
  return {
    id,
    fullAddress: address,
    propertyType: "Piso",
    currentStage: "settlement", // Map to partner stage for demo
    address,
    price,
    analyst: options?.analyst || "CM",
    completion: options?.completion,
    timeInStage: options?.timeInStage || "1 día",
    timeCreated: options?.timeCreated || "Hoy",
    createdAt: now.toISOString(),
    proximaActualizacion: options?.proximaActualizacion || today,
    ultimaActualizacion: options?.ultimaActualizacion,
    inicio: options?.inicio,
    finEst: options?.finEst,
    region: options?.region,
    renoType: options?.renoType,
    renovador: options?.renovador,
  };
}

// Dummy data for Reno Construction Manager Kanban
const renoDummyProperties: Record<RenoKanbanPhase, Array<Property>> = {
  "initial-check": [
    createDummyRenoProperty("4463801", "Calle Valencia 45, 08015 - Barcelona", 320000, "initial-check", {
      timeInStage: "2 días",
      timeCreated: "5 días",
      proximaActualizacion: new Date().toISOString().split('T')[0], // Today
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
      inicio: "2025-10-29",
      finEst: "2025-11-19",
    }),
    createDummyRenoProperty("4463802", "Avenida Meridiana 234, 08027 - Barcelona", 280000, "initial-check", {
      timeInStage: "1 día",
      timeCreated: "4 días",
      proximaActualizacion: new Date().toISOString().split('T')[0], // Today
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
    }),
    createDummyRenoProperty("4463803", "Calle Mallorca 89, 08009 - Barcelona", 450000, "initial-check", {
      timeInStage: "3 días",
      timeCreated: "6 días",
      proximaActualizacion: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday (expired)
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
    }),
  ],
  "upcoming": [
    createDummyRenoProperty("4463804", "Passeig de Sant Joan 156, 08037 - Barcelona", 380000, "upcoming", {
      timeInStage: "5 días",
      timeCreated: "10 días",
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
    }),
    createDummyRenoProperty("4463805", "Calle Girona 67, 08009 - Barcelona", 295000, "upcoming", {
      timeInStage: "4 días",
      timeCreated: "9 días",
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
    }),
  ],
  "reno-in-progress": [
    createDummyRenoProperty("4463806", "Avenida sirenas 10, 2º - 7a, Torrevieja", 420000, "reno-in-progress", {
      analyst: "CM",
      timeInStage: "12 días",
      timeCreated: "25 días",
      proximaActualizacion: new Date().toISOString().split('T')[0], // Today
      ultimaActualizacion: "2025-11-03",
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
      inicio: "2025-10-29",
      finEst: "2025-11-19",
    }),
    createDummyRenoProperty("4463807", "Calle Balmes 189, 08006 - Barcelona", 510000, "reno-in-progress", {
      analyst: "CM",
      timeInStage: "8 días",
      timeCreated: "20 días",
      proximaActualizacion: new Date().toISOString().split('T')[0], // Today
      ultimaActualizacion: "2025-11-02",
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
    }),
    createDummyRenoProperty("4463808", "Avinguda Diagonal 456, 08008 - Barcelona", 485000, "reno-in-progress", {
      analyst: "CM",
      timeInStage: "15 días",
      timeCreated: "30 días",
      proximaActualizacion: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday (expired)
      ultimaActualizacion: "2025-11-01",
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
    }),
  ],
  "furnishing-cleaning": [
    createDummyRenoProperty("4463809", "Calle Muntaner 234, 08021 - Barcelona", 390000, "furnishing-cleaning", {
      analyst: "CM",
      timeInStage: "3 días",
      timeCreated: "35 días",
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
    }),
    createDummyRenoProperty("4463810", "Calle Diputació 345, 08013 - Barcelona", 365000, "furnishing-cleaning", {
      analyst: "CM",
      timeInStage: "2 días",
      timeCreated: "33 días",
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
    }),
  ],
  "final-check": [
    createDummyRenoProperty("4463811", "Passeig de Gràcia 67, 08008 - Barcelona", 550000, "final-check", {
      analyst: "CM",
      timeInStage: "1 día",
      timeCreated: "40 días",
      proximaActualizacion: new Date().toISOString().split('T')[0], // Today
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
    }),
  ],
  "reno-fixes": [
    createDummyRenoProperty("4463812", "Calle Aribau 156, 08036 - Barcelona", 440000, "reno-fixes", {
      analyst: "CM",
      timeInStage: "5 días",
      timeCreated: "45 días",
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
    }),
  ],
  "done": [
    createDummyRenoProperty("4463813", "Calle Roselló 89, 08029 - Barcelona", 480000, "done", {
      timeInStage: "10 días",
      timeCreated: "60 días",
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
    }),
    createDummyRenoProperty("4463814", "Calle Córcega 234, 08008 - Barcelona", 520000, "done", {
      timeInStage: "8 días",
      timeCreated: "58 días",
      region: "Vega Baja",
      renoType: "Light Reno",
      renovador: "LyR",
    }),
  ],
};

export function RenoKanbanBoard({ searchQuery }: RenoKanbanBoardProps) {
  const { t } = useI18n();
  const [isHovered, setIsHovered] = useState(false);
  const [realProperties, setRealProperties] = useState<Property[]>([]);
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

  // Load properties from localStorage
  useEffect(() => {
    const loadProperties = () => {
      const props = getAllProperties();
      setRealProperties(props);
    };
    
    loadProperties();
    const interval = setInterval(loadProperties, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (property: Property) => {
    // For construction manager, navigate to view-only page
    // Later, this will open the task execution screen
    startTransition(() => {
      router.push(`/reno/construction-manager/property/${property.id}`);
    });
  };

  // Transform real properties to Property objects for reno phases
  // For now, map partner properties to reno phases (simulation)
  const transformProperties = useMemo(() => {
    const transformed: Record<RenoKanbanPhase, Property[]> = {
      "initial-check": [],
      "upcoming": [],
      "reno-in-progress": [],
      "furnishing-cleaning": [],
      "final-check": [],
      "reno-fixes": [],
      "done": [],
    };

    // Filter out dummy properties (they're already in organizedByPhase)
    const realOnlyProperties = realProperties.filter(p => 
      !["4463801", "4463802", "4463803", "4463804", "4463805", "4463806", "4463807", "4463808",
        "4463809", "4463810", "4463811", "4463812", "4463813", "4463814"].includes(p.id)
    );

    // For demo, map partner properties to reno phases
    realOnlyProperties.forEach((prop) => {
      // Map partner stages to reno phases for demo
      // In real backend, properties would have renoPhase field
      let renoPhase: RenoKanbanPhase = "initial-check";
      if (prop.currentStage === "settlement") {
        renoPhase = "initial-check";
      } else if (prop.currentStage === "sold") {
        renoPhase = "upcoming";
      } else {
        // Default to initial-check for demo
        renoPhase = "initial-check";
      }

      transformed[renoPhase].push(prop);
    });

    return transformed;
  }, [realProperties]);

  // Initialize dummy properties in localStorage on mount (only once)
  useEffect(() => {
    const existingProps = getAllProperties();
    const dummyIds = [
      "4463801", "4463802", "4463803", "4463804", "4463805", "4463806", "4463807", "4463808",
      "4463809", "4463810", "4463811", "4463812", "4463813", "4463814"
    ];
    
    const hasDummies = dummyIds.some(id => existingProps.some(p => p.id === id));
    
    if (!hasDummies) {
      // Save dummy properties to localStorage
      Object.values(renoDummyProperties).flat().forEach(prop => {
        const exists = existingProps.some(p => p.id === prop.id);
        if (!exists) {
          saveProperty(prop);
        }
      });
    }
  }, []);

  // Combine real properties with dummy data - now return Property objects directly
  // Use consistent initial values for SSR to avoid hydration mismatch
  const allProperties = useMemo(() => {
    // During SSR or initial render, use dummy data directly to ensure consistency
    if (!isMounted) {
      // Return dummy data structure for SSR - this ensures server and client render the same initially
      const organizedByPhase: Record<RenoKanbanPhase, Property[]> = {
        "initial-check": renoDummyProperties["initial-check"],
        "upcoming": renoDummyProperties["upcoming"],
        "reno-in-progress": renoDummyProperties["reno-in-progress"],
        "furnishing-cleaning": renoDummyProperties["furnishing-cleaning"],
        "final-check": renoDummyProperties["final-check"],
        "reno-fixes": renoDummyProperties["reno-fixes"],
        "done": renoDummyProperties["done"],
      };
      
      // Sort each column: expired first
      const sorted: Record<RenoKanbanPhase, Property[]> = {
        "initial-check": sortPropertiesByExpired(organizedByPhase["initial-check"]),
        "upcoming": sortPropertiesByExpired(organizedByPhase["upcoming"]),
        "reno-in-progress": sortPropertiesByExpired(organizedByPhase["reno-in-progress"]),
        "furnishing-cleaning": sortPropertiesByExpired(organizedByPhase["furnishing-cleaning"]),
        "final-check": sortPropertiesByExpired(organizedByPhase["final-check"]),
        "reno-fixes": sortPropertiesByExpired(organizedByPhase["reno-fixes"]),
        "done": sortPropertiesByExpired(organizedByPhase["done"]),
      };
      
      return sorted;
    }

    // Get all dummy properties from storage (client-side only)
    const allStoredProps = getAllProperties();
    const dummyProps = allStoredProps.filter(p => 
      ["4463801", "4463802", "4463803", "4463804", "4463805", "4463806", "4463807", "4463808",
       "4463809", "4463810", "4463811", "4463812", "4463813", "4463814"].includes(p.id)
    );

    const organizedByPhase: Record<RenoKanbanPhase, Property[]> = {
      "initial-check": dummyProps.filter(p => ["4463801", "4463802", "4463803"].includes(p.id)),
      "upcoming": dummyProps.filter(p => ["4463804", "4463805"].includes(p.id)),
      "reno-in-progress": dummyProps.filter(p => ["4463806", "4463807", "4463808"].includes(p.id)),
      "furnishing-cleaning": dummyProps.filter(p => ["4463809", "4463810"].includes(p.id)),
      "final-check": dummyProps.filter(p => p.id === "4463811"),
      "reno-fixes": dummyProps.filter(p => p.id === "4463812"),
      "done": dummyProps.filter(p => ["4463813", "4463814"].includes(p.id)),
    };

    // Combine transformed real properties with dummy properties
    const combined: Record<RenoKanbanPhase, Property[]> = {
      "initial-check": [...(transformProperties["initial-check"] || []), ...organizedByPhase["initial-check"]],
      "upcoming": [...(transformProperties["upcoming"] || []), ...organizedByPhase["upcoming"]],
      "reno-in-progress": [...(transformProperties["reno-in-progress"] || []), ...organizedByPhase["reno-in-progress"]],
      "furnishing-cleaning": [...(transformProperties["furnishing-cleaning"] || []), ...organizedByPhase["furnishing-cleaning"]],
      "final-check": [...(transformProperties["final-check"] || []), ...organizedByPhase["final-check"]],
      "reno-fixes": [...(transformProperties["reno-fixes"] || []), ...organizedByPhase["reno-fixes"]],
      "done": [...(transformProperties["done"] || []), ...organizedByPhase["done"]],
    };
    
    // Sort each column: expired first
    const sorted: Record<RenoKanbanPhase, Property[]> = {
      "initial-check": sortPropertiesByExpired(combined["initial-check"]),
      "upcoming": sortPropertiesByExpired(combined["upcoming"]),
      "reno-in-progress": sortPropertiesByExpired(combined["reno-in-progress"]),
      "furnishing-cleaning": sortPropertiesByExpired(combined["furnishing-cleaning"]),
      "final-check": sortPropertiesByExpired(combined["final-check"]),
      "reno-fixes": sortPropertiesByExpired(combined["reno-fixes"]),
      "done": sortPropertiesByExpired(combined["done"]),
    };
    
    return sorted;
  }, [transformProperties, isMounted]);

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
    
    for (const column of renoKanbanColumns) {
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
    for (const column of renoKanbanColumns) {
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
        {renoKanbanColumns.map((column) => {
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
        {renoKanbanColumns.map((column) => {
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

