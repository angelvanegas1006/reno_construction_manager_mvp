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

  // Determine stage based on property renoPhase
  const getPropertyStage = (property: Property): RenoKanbanPhase => {
    // Use renoPhase if available, otherwise fallback to default
    if (property.renoPhase && ["upcoming-settlements", "initial-check", "reno-budget-renovator", "reno-budget-client", "reno-budget-start", "reno-budget", "reno-in-progress", "furnishing-cleaning", "final-check", "reno-fixes", "done"].includes(property.renoPhase)) {
      return property.renoPhase as RenoKanbanPhase;
    }
    // Default fallback
    return "initial-check";
  };

  return (
    <Card className="bg-card bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {activeTab === "checks" ? t.dashboard.checksForToday : t.dashboard.workStatusVisitsToday}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {activeTab === "checks" 
            ? t.dashboard.checksForTodayDescription
            : t.dashboard.workStatusVisitsTodayDescription}
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
            {t.dashboard.checks} ({checks.length})
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
            {t.dashboard.visits} ({visits.length})
          </button>
        </div>

        {/* Properties List */}
        <div 
          ref={scrollContainerRef}
          className="space-y-3 max-h-[400px] overflow-y-auto"
        >
          {displayedProperties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {activeTab === "checks" ? t.dashboard.noChecksScheduled : t.dashboard.noVisitsScheduled}
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






