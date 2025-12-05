"use client";

import { cn } from "@/lib/utils";
import { RenoPropertyCard } from "./reno-property-card";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { isDelayedWork, isPropertyExpired } from "@/lib/property-sorting";
import { Property } from "@/lib/property-storage";
import { RenoKanbanPhase } from "@/lib/reno-kanban-config";

interface RenoKanbanColumnProps {
  title: string;
  count: number;
  stage: RenoKanbanPhase;
  properties: Property[];
  onCardClick?: (property: Property) => void;
  highlightedPropertyId?: string | null;
  onColumnRef?: (element: HTMLDivElement | null) => void;
}

export function RenoKanbanColumn({ 
  title, 
  count, 
  stage, 
  properties, 
  onCardClick, 
  highlightedPropertyId, 
  onColumnRef 
}: RenoKanbanColumnProps) {
  const [isHovered, setIsHovered] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);
  // Start collapsed on mobile for better usability, but expand if highlighted property is here
  const hasHighlightedProperty = highlightedPropertyId && properties.some(p => p.id === highlightedPropertyId);
  const [isCollapsed, setIsCollapsed] = useState(!hasHighlightedProperty);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const hasScroll = scrollContainerRef.current.scrollHeight > scrollContainerRef.current.clientHeight;
        setNeedsScroll(hasScroll);
      }
    };
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [properties]);

  // Expand column if highlighted property is here
  useEffect(() => {
    if (hasHighlightedProperty && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [hasHighlightedProperty, isCollapsed]);

  // Count properties in alert (delayed or expired)
  const alertCount = properties.filter(p => {
    return isDelayedWork(p, stage) || isPropertyExpired(p);
  }).length;

  return (
    <div
      ref={onColumnRef}
      className="flex h-full md:h-auto flex-col min-w-[280px] md:min-w-[320px] w-full md:w-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Column Header - Clean mobile design */}
      <div className="mb-1 md:mb-4 flex-shrink-0">
        {/* Mobile: Clean card-style header */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="md:pointer-events-none flex w-full md:w-auto items-center justify-between md:justify-start gap-3 bg-card dark:bg-[#000000] border border-border rounded-lg px-4 py-3 md:border-0 md:bg-transparent md:px-2 md:py-1 md:hover:bg-[var(--prophero-gray-100)] dark:md:hover:bg-[#1a1a1a] md:rounded-md md:-mx-2 md:mx-0 transition-colors min-w-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] md:shadow-none"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground whitespace-nowrap">{title}</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
              {count}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isCollapsed ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground md:hidden" />
            ) : (
              <ChevronUp className="h-5 w-5 text-muted-foreground md:hidden" />
            )}
          </div>
        </button>
      </div>

      {/* Column Content Wrapper - Fixed width prevents card movement, collapsable on mobile */}
      <div className={cn(
        "flex-1 min-h-0",
        "md:block",
        isCollapsed ? "hidden md:block" : "block"
      )}>
        <div
          ref={scrollContainerRef}
          className={cn(
            "md:h-full max-h-[600px] md:max-h-none overflow-y-auto space-y-3 md:space-y-3 w-full pt-1 md:pt-0",
            isHovered && needsScroll ? "scrollbar-overlay" : "scrollbar-hidden"
          )}
        >
          {properties.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center bg-card dark:bg-[#000000] border border-border rounded-lg md:border-0 md:bg-transparent">
              No properties in this state
            </div>
          ) : (
            properties.map((property) => (
              <RenoPropertyCard
                key={property.id}
                property={property}
                stage={stage}
                onClick={() => onCardClick?.(property)}
                isHighlighted={highlightedPropertyId === property.id}
                showRenoDetails={true}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}



