"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import {
  PHASES_KANBAN_MATURATION,
  MATURATION_PHASE_LABELS,
} from "@/lib/reno-kanban-config";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";

interface MaturationPhaseDistributionProps {
  projectsByPhase: Record<RenoKanbanPhase, ProjectRow[]>;
}

export function MaturationPhaseDistribution({ projectsByPhase }: MaturationPhaseDistributionProps) {
  const router = useRouter();

  const phaseData = useMemo(() => {
    return PHASES_KANBAN_MATURATION.map((phase) => ({
      phase,
      label: MATURATION_PHASE_LABELS[phase] ?? phase,
      count: (projectsByPhase[phase] || []).length,
    })).sort((a, b) => b.count - a.count);
  }, [projectsByPhase]);

  const total = useMemo(() => phaseData.reduce((s, d) => s + d.count, 0), [phaseData]);
  const maxCount = useMemo(() => Math.max(...phaseData.map((d) => d.count), 1), [phaseData]);

  return (
    <Card className="bg-card h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Distribución por fase
          </CardTitle>
          <Link
            href="/reno/maturation-analyst/kanban"
            className="text-xs text-brand hover:text-brand flex items-center gap-1 transition-colors"
          >
            Ver Kanban <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Proyectos en cada fase del Kanban de maduración
        </p>
      </CardHeader>
      <CardContent className="pt-6 flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="space-y-3 flex-1 overflow-y-auto">
            {phaseData.map((item) => {
              const width = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div
                  key={item.phase}
                  className="group cursor-pointer"
                  onClick={() => router.push(`/reno/maturation-analyst/kanban?stage=${item.phase}`)}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {item.count}
                      </span>
                      <span className="text-xs text-muted-foreground" title={`${item.count} de ${total} proyectos totales`}>
                        {total > 0 ? `${Math.round((item.count / total) * 100)}%` : "0%"}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-8 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 group-hover:opacity-90 relative overflow-hidden"
                      style={{
                        width: `${width}%`,
                        backgroundColor: item.count > 0 ? "var(--vistral-brand-400)" : "transparent",
                        minWidth: item.count > 0 ? "4px" : "0",
                      }}
                    >
                      {item.count > 0 && (
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
