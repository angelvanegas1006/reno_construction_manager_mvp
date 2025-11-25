"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Property } from "@/lib/property-storage";
import { RenoKanbanPhase, visibleRenoKanbanColumns } from "@/lib/reno-kanban-config";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useSupabaseKanbanProperties } from "@/hooks/useSupabaseKanbanProperties";

interface RenoHomePortfolioProps {
  properties: Property[];
  propertiesByPhase?: Record<RenoKanbanPhase, Property[]>;
}

export function RenoHomePortfolio({ properties, propertiesByPhase: propsPropertiesByPhase }: RenoHomePortfolioProps) {
  const { t, language } = useI18n();
  const router = useRouter();
  
  // Get properties grouped by phase from Supabase if not provided as prop
  const { propertiesByPhase: hookPropertiesByPhase } = useSupabaseKanbanProperties();
  
  // Use prop if provided, otherwise use hook result
  const propertiesByPhase = propsPropertiesByPhase || hookPropertiesByPhase;

  const stageCounts = useMemo(() => {
    const counts: Record<RenoKanbanPhase, number> = {
      "upcoming-settlements": 0,
      "initial-check": 0,
      "reno-budget": 0,
      "reno-in-progress": 0,
      "furnishing-cleaning": 0,
      "final-check": 0,
      "reno-fixes": 0,
      "done": 0,
    };

    // Use propertiesByPhase directly from Supabase hook
    // This ensures we're using the real phase data from the database
    if (propertiesByPhase) {
      Object.entries(propertiesByPhase).forEach(([phase, phaseProperties]) => {
        if (phase in counts) {
          counts[phase as RenoKanbanPhase] = phaseProperties.length;
        }
      });
    }

    return counts;
  }, [propertiesByPhase]);

  const maxCount = Math.max(...Object.values(stageCounts), 1);
  const maxHeight = 200; // Max height in pixels for the bars

  const getStageLabel = (stage: RenoKanbanPhase) => {
    const stageMap: Record<RenoKanbanPhase, string> = {
      "upcoming-settlements": language === "es" ? "Nuevas escrituras" : "Upcoming Settlements",
      "initial-check": language === "es" ? "Check inicial" : "Initial Check",
      "reno-budget": language === "es" ? "Reno Budget" : "Reno Budget",
      "reno-in-progress": language === "es" ? "Obras en proceso" : "Reno In Progress",
      "furnishing-cleaning": language === "es" ? "Limpieza y amoblamiento" : "Furnishing & Cleaning",
      "final-check": language === "es" ? "Check final" : "Final Check",
      "reno-fixes": language === "es" ? "Reparaciones reno" : "Reno Fixes",
      "done": language === "es" ? "Finalizadas" : "Done",
    };
    return stageMap[stage];
  };

  const getBarHeight = (count: number) => {
    return (count / maxCount) * maxHeight;
  };

  const handleBarClick = (stage: RenoKanbanPhase) => {
    router.push(`/reno/construction-manager/kanban?stage=${stage}`);
  };

  return (
    <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t.dashboard.portfolio}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {t.dashboard.portfolioDescription}
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Chart */}
          <div className="flex items-end justify-between gap-2 h-[220px] relative">
            {visibleRenoKanbanColumns.map((column) => {
              const count = stageCounts[column.stage];
              const height = getBarHeight(count);

              return (
                <div
                  key={column.stage}
                  className="flex-1 flex flex-col items-center group cursor-pointer"
                  onClick={() => handleBarClick(column.stage)}
                >
                  <div className="relative w-full flex items-end justify-center">
                    <div
                      className="w-full bg-[var(--prophero-blue-500)] dark:bg-[var(--prophero-blue-600)] rounded-t transition-all hover:opacity-80"
                      style={{ height: `${height}px`, minHeight: count > 0 ? "4px" : "0" }}
                      title={`${getStageLabel(column.stage)}: ${count}`}
                    />
                    {count > 0 && (
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-medium text-foreground bg-card dark:bg-[var(--prophero-gray-900)] border border-border rounded px-2 py-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap pointer-events-none">
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center leading-tight h-8 flex items-start justify-center overflow-hidden">
                    {getStageLabel(column.stage)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}






