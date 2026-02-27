"use client";

import { cn } from "@/lib/utils";
import { RenoPropertyCard } from "./reno-property-card";
import { RenoProjectCard } from "./reno-project-card";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { isDelayedWork, isPropertyExpired } from "@/lib/property-sorting";
import { Property } from "@/lib/property-storage";
import { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { useI18n } from "@/lib/i18n";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";

interface RenoKanbanColumnProps {
  title: string;
  count: number;
  stage: RenoKanbanPhase;
  properties: Property[];
  onCardClick?: (property: Property) => void;
  highlightedPropertyId?: string | null;
  onColumnRef?: (element: HTMLDivElement | null) => void;
  fromParam?: string;
  onAssignSiteManager?: (propertyId: string, email: string | null) => void;
  projects?: ProjectRow[];
  onProjectClick?: (project: ProjectRow) => void;
  propertiesByProjectId?: Record<string, Property[]>;
}

export function RenoKanbanColumn({ 
  title, 
  count, 
  stage, 
  properties, 
  onCardClick, 
  highlightedPropertyId, 
  onColumnRef,
  fromParam,
  onAssignSiteManager,
  projects,
  onProjectClick,
  propertiesByProjectId,
}: RenoKanbanColumnProps) {
  const { t } = useI18n();
  const [isHovered, setIsHovered] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);
  const isProjectMode = projects && projects.length >= 0;
  const hasHighlightedProperty = highlightedPropertyId && properties.some(p => p.id === highlightedPropertyId);
  const [isCollapsed, setIsCollapsed] = useState(!hasHighlightedProperty);

  const isEmpty = count === 0;
  const [emptyExpanded, setEmptyExpanded] = useState(false);

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
  }, [properties, projects]);

  useEffect(() => {
    if (hasHighlightedProperty && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [hasHighlightedProperty, isCollapsed]);

  const alertCount = isProjectMode ? 0 : properties.filter(p => {
    return isDelayedWork(p, stage) || isPropertyExpired(p);
  }).length;

  // Desktop: empty column renders as a thin collapsed strip with vertical title (clickable to expand)
  if (isEmpty && !emptyExpanded) {
    return (
      <div
        ref={onColumnRef}
        className={cn(
          "flex flex-col items-center",
          "hidden md:flex",
          "md:min-w-[44px] md:w-[44px]",
          "h-full"
        )}
      >
        <button
          onClick={() => setEmptyExpanded(true)}
          className="flex flex-col items-center gap-2 py-3 px-1 bg-muted/30 dark:bg-muted/10 border border-border/50 rounded-lg h-full w-full hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors cursor-pointer"
        >
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">
            0
          </span>
          <span
            className="text-base font-semibold text-foreground whitespace-nowrap"
            style={{ writingMode: "vertical-lr", textOrientation: "mixed" }}
          >
            {title}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={onColumnRef}
      className="flex h-full md:h-auto flex-col min-w-[280px] md:min-w-[320px] w-full md:w-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Column Header */}
      <div className="mb-1 md:mb-4 flex-shrink-0">
        <button
          onClick={() => {
            if (isEmpty && emptyExpanded) {
              setEmptyExpanded(false);
            } else {
              setIsCollapsed(!isCollapsed);
            }
          }}
          className={cn(
            "flex w-full md:w-auto items-center justify-between md:justify-start gap-3 bg-card dark:bg-[#000000] border border-border rounded-lg px-4 py-3 md:border-0 md:bg-transparent md:px-2 md:py-1 md:hover:bg-[var(--prophero-gray-100)] dark:md:hover:bg-[#1a1a1a] md:rounded-md md:-mx-2 md:mx-0 transition-colors min-w-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] md:shadow-none",
            isEmpty && emptyExpanded ? "md:pointer-events-auto md:cursor-pointer" : "md:pointer-events-none"
          )}
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

      {/* Column Content */}
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
          {isProjectMode && projects && projects.length > 0 ? (
            projects.map((project, index) => (
              <RenoProjectCard
                key={project.id ?? `project-${stage}-${index}`}
                project={project}
                onClick={() => onProjectClick?.(project)}
                linkedProperties={project.id ? (propertiesByProjectId?.[project.id] ?? []) : []}
              />
            ))
          ) : properties.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center bg-card dark:bg-[#000000] border border-border rounded-lg md:border-0 md:bg-transparent">
              {isProjectMode ? "No hay proyectos en esta fase" : t.kanban.noPropertiesInState}
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
                fromParam={fromParam}
                onAssignSiteManager={onAssignSiteManager}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
