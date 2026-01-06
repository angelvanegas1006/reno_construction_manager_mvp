"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Property } from "@/lib/property-storage";
import { RenoKanbanPhase, visibleRenoKanbanColumns } from "@/lib/reno-kanban-config";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useRenoProperties } from "@/contexts/reno-properties-context";

interface RenoHomePortfolioProps {
  properties: Property[];
  propertiesByPhase?: Record<RenoKanbanPhase, Property[]>;
}

export function RenoHomePortfolio({ properties, propertiesByPhase: propsPropertiesByPhase }: RenoHomePortfolioProps) {
  const { t, language } = useI18n();
  const router = useRouter();
  
  // Get properties grouped by phase from context if not provided as prop
  // Use try-catch to handle case where component is used outside provider
  let hookPropertiesByPhase: Record<RenoKanbanPhase, Property[]> | undefined;
  try {
    const context = useRenoProperties();
    hookPropertiesByPhase = context.propertiesByPhase;
  } catch (e) {
    // Component used outside provider, use prop only
    hookPropertiesByPhase = undefined;
  }
  
  // Use prop if provided, otherwise use context result
  const propertiesByPhase = propsPropertiesByPhase || hookPropertiesByPhase;

  const stageCounts = useMemo(() => {
    const counts: Record<RenoKanbanPhase, number> = {
      "upcoming-settlements": 0,
      "initial-check": 0,
      "reno-budget-renovator": 0,
      "reno-budget-client": 0,
      "reno-budget-start": 0,
      "reno-budget": 0, // Legacy
      "upcoming": 0,
      "reno-in-progress": 0,
      "furnishing": 0,
      "cleaning": 0,
      "furnishing-cleaning": 0, // Legacy
      "final-check": 0,
      "reno-fixes": 0,
      "done": 0,
      "orphaned": 0,
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

  // Calculate totalProperties: sum of all properties across visible phases
  // This is used to calculate DISTRIBUTIONAL percentages: each phase's percentage relative to total portfolio
  // Example: If total is 100 properties:
  //   - "Obras en proceso": 41/100 = 41%
  //   - "Upcoming Reno": 30/100 = 30%
  //   - "Pendiente Presupuesto (Renovador)": 15/100 = 15%
  const totalProperties = useMemo(() => {
    return visibleRenoKanbanColumns.reduce((sum, col) => sum + stageCounts[col.stage], 0);
  }, [visibleRenoKanbanColumns, stageCounts]);
  
  // maxCount is still used for bar width visualization (comparative)
  const maxCount = Math.max(
    ...visibleRenoKanbanColumns.map(col => stageCounts[col.stage]),
    1
  );
  const maxHeight = 200; // Max height in pixels for the bars

  const getStageLabel = (stage: RenoKanbanPhase) => {
    const stageMap: Record<RenoKanbanPhase, string> = {
      "upcoming-settlements": language === "es" ? "Upcoming Reno" : "Upcoming Reno",
      "initial-check": language === "es" ? "Check inicial" : "Initial Check",
      "reno-budget-renovator": language === "es" ? "Pendiente Presupuesto (Renovador)" : "Pending Budget (Renovator)",
      "reno-budget-client": language === "es" ? "Pendiente Presupuesto (Cliente)" : "Pending Budget (Client)",
      "reno-budget-start": language === "es" ? "Obra a Empezar" : "Reno to Start",
      "reno-budget": language === "es" ? "Reno Budget" : "Reno Budget", // Legacy
      "upcoming": language === "es" ? "Próximas propiedades" : "Upcoming Properties",
      "reno-in-progress": language === "es" ? "Obras en proceso" : "Reno In Progress",
      "furnishing": language === "es" ? "Amoblamiento" : "Furnishing",
      "final-check": language === "es" ? "Check final" : "Final Check",
      "cleaning": language === "es" ? "Limpieza" : "Cleaning",
      "furnishing-cleaning": language === "es" ? "Limpieza y Amoblamiento" : "Furnishing & Cleaning", // Legacy
      "reno-fixes": language === "es" ? "Reparaciones reno" : "Reno Fixes",
      "done": language === "es" ? "Finalizadas" : "Done",
      "orphaned": language === "es" ? "Orphaned" : "Orphaned",
    };
    return stageMap[stage];
  };

  const getBarWidth = (count: number) => {
    if (maxCount === 0) return 0;
    return (count / maxCount) * 100;
  };

  const handleBarClick = (stage: RenoKanbanPhase) => {
    router.push(`/reno/construction-manager/kanban?stage=${stage}`);
  };

  // Sort columns by count (descending) for better visualization
  const sortedColumns = useMemo(() => {
    return [...visibleRenoKanbanColumns].sort((a, b) => {
      return stageCounts[b.stage] - stageCounts[a.stage];
    });
  }, [visibleRenoKanbanColumns, stageCounts]);

  return (
    <Card className="bg-card h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-lg font-semibold">{t.dashboard.portfolio}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {t.dashboard.portfolioDescription}
        </p>
      </CardHeader>
      <CardContent className="pt-6 flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Horizontal Bar Chart */}
          <div className="space-y-3 flex-1 overflow-y-auto">
            {sortedColumns.map((column) => {
              const count = stageCounts[column.stage];
              const width = getBarWidth(count);
              const label = getStageLabel(column.stage);

              return (
                <div
                  key={column.stage}
                  className="group cursor-pointer"
                  onClick={() => handleBarClick(column.stage)}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {label}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {count}
                      </span>
                      <span className="text-xs text-muted-foreground" title={`${count} de ${totalProperties} propiedades totales en el portfolio`}>
                        {totalProperties > 0 ? `${Math.round((count / totalProperties) * 100)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 group-hover:opacity-90 relative overflow-hidden"
                      style={{ 
                        width: `${width}%`,
                        backgroundColor: count > 0 ? "var(--prophero-blue-400)" : "transparent",
                        minWidth: count > 0 ? "4px" : "0"
                      }}
                    >
                      {count > 0 && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}






