"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RenoPropertyCard } from "./reno-property-card";
import { Property } from "@/lib/property-storage";
import { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface RenoHomeTasksProps {
  checks: Property[];
  visits: Property[];
  onPropertyClick: (property: Property) => void;
}

const ITEMS_PER_PAGE = 7;

export function RenoHomeTasks({ checks, visits, onPropertyClick }: RenoHomeTasksProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"checks" | "visits">("checks");
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const displayedProperties = useMemo(() => {
    const propertiesToShow = activeTab === "checks" ? checks : visits;
    return propertiesToShow.slice(0, displayedCount);
  }, [activeTab, checks, visits, displayedCount]);

  // Reset displayed count when tab changes
  useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [activeTab]);

  // Infinite scroll handler
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop <= clientHeight + 50) {
        // Near bottom, load more
        const propertiesToShow = activeTab === "checks" ? checks : visits;
        if (displayedCount < propertiesToShow.length) {
          setDisplayedCount((prev) => Math.min(prev + ITEMS_PER_PAGE, propertiesToShow.length));
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeTab, checks, visits, displayedCount]);

  // Determine stage based on property ID or currentStage
  const getPropertyStage = (property: Property): RenoKanbanPhase => {
    if (["4463793", "4463794", "4463795", "4463796", "4463797", "4463798", "4463799", "4463800"].includes(property.id)) {
      return "upcoming-settlements";
    } else if (["4463801", "4463802", "4463803"].includes(property.id)) {
      return "initial-check";
    } else if (["4463804", "4463805"].includes(property.id)) {
      return "upcoming";
    } else if (["4463806", "4463807", "4463808"].includes(property.id)) {
      return "reno-in-progress";
    } else if (["4463809", "4463810"].includes(property.id)) {
      return "furnishing-cleaning";
    } else if (property.id === "4463811") {
      return "final-check";
    } else if (property.id === "4463812") {
      return "reno-fixes";
    } else if (["4463813", "4463814"].includes(property.id)) {
      return "done";
    }
    return "initial-check";
  };

  return (
    <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {activeTab === "checks" ? "Checks para ejecutar hoy" : "Visitas de estado de obra hoy"}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {activeTab === "checks" 
            ? "Checks iniciales y finales programados para hoy"
            : "Visitas de estado de obra programadas para hoy"}
        </p>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          <button
            onClick={() => setActiveTab("checks")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "checks"
                ? "border-[var(--prophero-blue-500)] text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Checks ({checks.length})
          </button>
          <button
            onClick={() => setActiveTab("visits")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "visits"
                ? "border-[var(--prophero-blue-500)] text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Visitas ({visits.length})
          </button>
        </div>

        {/* Properties List */}
        <div 
          ref={scrollContainerRef}
          className="space-y-3 max-h-[400px] overflow-y-auto"
        >
          {displayedProperties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay {activeTab === "checks" ? "checks" : "visitas"} programados para hoy
            </p>
          ) : (
            displayedProperties.map((property) => (
              <RenoPropertyCard
                key={property.id}
                property={property}
                stage={getPropertyStage(property)}
                onClick={() => onPropertyClick(property)}
                showRenoDetails={true}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}






