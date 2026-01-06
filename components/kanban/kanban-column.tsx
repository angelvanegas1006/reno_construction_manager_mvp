"use client";

import { cn } from "@/lib/utils";
import { PropertyCard } from "./property-card";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface KanbanColumnProps {
  title: string;
  count: number;
  stage: "draft" | "review" | "needs-correction" | "negotiation" | "pending-arras" | "settlement" | "sold" | "rejected" | "initial-check" | "upcoming" | "reno-in-progress" | "furnishing-cleaning" | "final-check" | "reno-fixes" | "done";
  properties: Array<{
    id: string;
    address: string;
    price?: number;
    analyst?: string;
    completion?: number;
    correctionsCount?: number;
    timeInStage: string;
    timeCreated?: string;
    isReal?: boolean;
  }>;
  onCardClick?: (id: string, stage: string, isReal?: boolean) => void;
  highlightedPropertyId?: string | null;
  onColumnRef?: (element: HTMLDivElement | null) => void;
}

export function KanbanColumn({ title, count, stage, properties, onCardClick, highlightedPropertyId, onColumnRef }: KanbanColumnProps) {
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

  return (
    <div
      ref={onColumnRef}
      className="flex h-full md:h-auto flex-col min-w-[320px] md:min-w-[320px] w-full md:w-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Column Header - Collapsable on mobile */}
      <div className="mb-4 flex-shrink-0">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="md:pointer-events-none flex w-full md:w-auto items-center justify-between md:justify-start gap-2 hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)] rounded-md px-2 py-1 -mx-2 md:mx-0 md:hover:bg-transparent transition-colors"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {count}
            </span>
          </div>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground md:hidden" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground md:hidden" />
          )}
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
            "md:h-full max-h-[600px] md:max-h-none overflow-y-auto space-y-3 w-full",
            isHovered && needsScroll ? "scrollbar-overlay" : "scrollbar-hidden"
          )}
        >
          {properties.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No properties in this state
            </div>
          ) : (
            properties.map((property) => (
              <PropertyCard
                key={property.id}
                id={property.id}
                address={property.address}
                stage={stage}
                price={property.price}
                analyst={property.analyst}
                completion={property.completion}
                correctionsCount={property.correctionsCount}
                timeInStage={property.timeInStage}
                timeCreated={property.timeCreated}
                onClick={() => onCardClick?.(property.id, stage, property.isReal)}
                disabled={!property.isReal && stage === "draft"}
                isHighlighted={highlightedPropertyId === property.id}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

