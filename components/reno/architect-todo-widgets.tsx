"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import {
  PHASES_KANBAN_ARCHITECT,
  ARCHITECT_PHASE_LABELS,
} from "@/lib/reno-kanban-config";

interface TodoWidget {
  id: string;
  title: string;
  count: number;
  projects: ProjectRow[];
}

const PHASE_ORDER: Record<string, number> = {};
PHASES_KANBAN_ARCHITECT.forEach((p, i) => {
  PHASE_ORDER[p] = i;
});

function phaseIndex(p: ProjectRow): number {
  return PHASE_ORDER[p.reno_phase ?? ""] ?? -1;
}

interface ArchitectTodoWidgetsProps {
  allProjects: ProjectRow[];
  projectsByPhase: Record<RenoKanbanPhase, ProjectRow[]>;
}

export function ArchitectTodoWidgets({
  allProjects,
  projectsByPhase,
}: ArchitectTodoWidgetsProps) {
  const router = useRouter();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const todoWidgets = useMemo((): TodoWidget[] => {
    const sortDesc = (a: ProjectRow, b: ProjectRow) =>
      phaseIndex(b) - phaseIndex(a);

    const noMeasurement = allProjects
      .filter((p) => !(p as any).measurement_date)
      .sort(sortDesc);

    const noDraftDate = allProjects
      .filter((p) => !(p as any).project_draft_date)
      .sort(sortDesc);

    const noProjectEnd = allProjects
      .filter((p) => !(p as any).project_end_date)
      .sort(sortDesc);

    const pendingAdjustments = (
      projectsByPhase["arch-technical-adjustments"] || []
    ).sort(sortDesc);

    return [
      {
        id: "measurement",
        title: "Pendiente de Medición",
        count: noMeasurement.length,
        projects: noMeasurement,
      },
      {
        id: "draft",
        title: "Pendiente Entrega Anteproyecto",
        count: noDraftDate.length,
        projects: noDraftDate,
      },
      {
        id: "project-end",
        title: "Pendiente Elaboración Proyecto",
        count: noProjectEnd.length,
        projects: noProjectEnd,
      },
      {
        id: "adjustments",
        title: "Pendientes de Ajustes",
        count: pendingAdjustments.length,
        projects: pendingAdjustments,
      },
    ];
  }, [allProjects, projectsByPhase]);

  const totalCount = todoWidgets.reduce((s, w) => s + w.count, 0);

  const handleProjectClick = (project: ProjectRow) => {
    router.push(
      `/reno/maturation-analyst/project/${project.id}?from=architect-home`
    );
  };

  const renderProjectInfo = (project: ProjectRow) => {
    const phase = project.reno_phase
      ? ARCHITECT_PHASE_LABELS[project.reno_phase] || project.reno_phase
      : "—";
    return (
      <div className="space-y-1.5 min-w-0 w-full">
        <div className="text-sm font-medium text-foreground line-clamp-2 leading-snug break-words min-w-0">
          {project.name || "Sin nombre"}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap min-w-0">
          <span className="whitespace-nowrap truncate max-w-full">{phase}</span>
          {project.investment_type && (
            <span className="whitespace-nowrap truncate max-w-full">
              • {project.investment_type}
            </span>
          )}
        </div>
      </div>
    );
  };

  const WidgetCard = ({ widget }: { widget: TodoWidget }) => {
    const hasItems = widget.count > 0;

    return (
      <Card
        className={cn(
          "relative overflow-hidden border-2 h-full flex flex-col min-h-[400px] max-h-[600px]",
          "bg-card shadow-sm hover:shadow-md transition-shadow duration-200",
          hasItems ? "border-border" : "border-border/50 opacity-75"
        )}
      >
        <CardHeader
          className={cn(
            "relative z-10 flex flex-row items-start gap-3 py-4 flex-shrink-0",
            "border-b border-border/50"
          )}
        >
          <CardTitle className="text-sm font-semibold text-foreground leading-relaxed flex-1 min-w-0 break-words pt-0.5">
            {widget.title}
          </CardTitle>
          <div
            className={cn(
              "relative z-10 flex items-center justify-center min-w-[32px] h-7 px-2 rounded-md flex-shrink-0",
              "font-medium text-sm whitespace-nowrap",
              hasItems
                ? "bg-muted/50 text-foreground"
                : "bg-muted/30 text-muted-foreground"
            )}
          >
            {widget.count}
          </div>
        </CardHeader>

        <CardContent className="relative z-10 flex-1 flex flex-col pt-4 pb-4 px-4 min-h-0 overflow-hidden">
          {hasItems && widget.projects.length > 0 && (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2 scrollbar-overlay min-w-0">
              {widget.projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all duration-150",
                    "bg-white dark:bg-[#0a0a0a]",
                    "hover:bg-muted/40 hover:shadow-sm",
                    "border-2 overflow-hidden",
                    "min-w-0 w-full",
                    "border-border/60 hover:border-border"
                  )}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      {renderProjectInfo(project)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!hasItems && (
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="p-3 rounded-full bg-muted/30">
                    <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Todo completado
                </p>
                <p className="text-xs text-muted-foreground/70">
                  No hay tareas pendientes
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Tareas Pendientes
        </h2>
        <Badge variant="secondary" className="text-xs">
          {totalCount} total
        </Badge>
      </div>

      {/* Desktop: 4-column grid */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 xl:gap-7 min-h-[400px]">
        {todoWidgets.map((widget) => (
          <WidgetCard key={widget.id} widget={widget} />
        ))}
      </div>

      {/* Mobile: Accordion */}
      <Card className="bg-card md:hidden border-2">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {todoWidgets.map((widget, index) => {
              const isOpen = openItems.has(widget.id);
              const isLast = index === todoWidgets.length - 1;
              const hasItems = widget.count > 0;

              return (
                <Collapsible
                  key={widget.id}
                  open={isOpen}
                  onOpenChange={() => toggleItem(widget.id)}
                >
                  <CollapsibleTrigger
                    className={cn(
                      "w-full flex items-center justify-between p-4",
                      "hover:bg-muted/30",
                      isOpen && "bg-muted/30",
                      !isLast && "border-b border-border/50"
                    )}
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-semibold text-foreground leading-normal break-words">
                        {widget.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div
                        className={cn(
                          "flex items-center justify-center min-w-[32px] h-7 rounded-md font-medium text-sm",
                          hasItems
                            ? "bg-muted/50 text-foreground"
                            : "bg-muted/30 text-muted-foreground"
                        )}
                      >
                        {widget.count}
                      </div>
                      <div className={cn(isOpen && "rotate-90")}>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  {hasItems && widget.projects.length > 0 && (
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="pt-3 space-y-3">
                        {widget.projects.map((project) => (
                          <div
                            key={project.id}
                            onClick={() => handleProjectClick(project)}
                            className={cn(
                              "p-3 rounded-lg cursor-pointer transition-all duration-150",
                              "bg-white dark:bg-[#0a0a0a]",
                              "hover:bg-muted/40 hover:shadow-sm",
                              "border-2 overflow-hidden",
                              "min-w-0 w-full",
                              "border-border/60 hover:border-border"
                            )}
                          >
                            {renderProjectInfo(project)}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  )}

                  {!hasItems && (
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="pt-3 text-center py-6">
                        <div className="flex justify-center mb-2">
                          <div className="p-3 rounded-full bg-muted/30">
                            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Todo completado
                        </p>
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
