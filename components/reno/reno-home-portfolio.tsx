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
      "upcoming-settlements": language === "es" ? "Upcoming Reno" : "Upcoming Reno",
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
    <Card className="bg-card h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-lg font-semibold">{t.dashboard.portfolio}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {t.dashboard.portfolioDescription}
        </p>
      </CardHeader>
      <CardContent className="pt-6 flex-1 flex flex-col">
        <div className="flex-1 flex flex-col justify-end">
          {/* Chart */}
          <div className="flex items-end justify-between gap-3 h-[200px] relative pb-2">
            {visibleRenoKanbanColumns.map((column) => {
              const count = stageCounts[column.stage];
              const height = getBarHeight(count);

              return (
                <div
                  key={column.stage}
                  className="flex-1 flex flex-col items-center group cursor-pointer h-full"
                  onClick={() => handleBarClick(column.stage)}
                >
                  <div className="relative w-full flex items-end justify-center flex-1 min-h-0 pb-1">
                    <div
                      className="w-full rounded-t-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg relative overflow-hidden group-hover:opacity-90"
                      style={{ 
                        height: `${height}px`, 
                        minHeight: count > 0 ? "6px" : "0",
                        backgroundColor: count > 0 ? "var(--prophero-blue-400)" : "transparent"
                      }}
                      title={`${getStageLabel(column.stage)}: ${count}`}
                    />
                    {count > 0 && (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-semibold text-foreground bg-card border border-border rounded-md px-2.5 py-1 shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 whitespace-nowrap pointer-events-none">
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center leading-tight h-10 flex items-start justify-center overflow-hidden px-1">
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






