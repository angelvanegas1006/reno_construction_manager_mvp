"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { PHASES_KANBAN_MATURATION } from "@/lib/reno-kanban-config";
import { ArchitectSelectorModal } from "@/components/reno/architect-selector-modal";

interface TodoWidget {
  id: string;
  title: string;
  count: number;
  projects: ProjectRow[];
}

const PHASE_ORDER: Record<string, number> = {};
PHASES_KANBAN_MATURATION.forEach((p, i) => {
  PHASE_ORDER[p] = i;
});

function phaseIndex(p: ProjectRow): number {
  return PHASE_ORDER[p.reno_phase ?? ""] ?? -1;
}

interface MaturationTodoWidgetsProps {
  allProjects: ProjectRow[];
  projectsByPhase: Record<RenoKanbanPhase, ProjectRow[]>;
  onRefetch?: () => void;
}

export function MaturationTodoWidgets({
  allProjects,
  projectsByPhase,
  onRefetch,
}: MaturationTodoWidgetsProps) {
  const router = useRouter();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  // Architect modal state
  const [architectModalOpen, setArchitectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(
    null
  );

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleArchitectSelect = useCallback(
    async ({ name }: { id: string; name: string }) => {
      if (!selectedProject) return;
      const supabase = createClient();
      const updates: Record<string, unknown> = {
        architect: name,
        updated_at: new Date().toISOString(),
      };
      if (!(selectedProject as any).draft_order_date) {
        updates.draft_order_date = new Date().toISOString();
      }
      const { error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", selectedProject.id);
      if (error) {
        toast.error("Error al asignar arquitecto");
      } else {
        toast.success(`Arquitecto ${name} asignado`);
        onRefetch?.();
      }
    },
    [selectedProject, onRefetch]
  );

  const todoWidgets = useMemo((): TodoWidget[] => {
    const sortDesc = (a: ProjectRow, b: ProjectRow) =>
      phaseIndex(b) - phaseIndex(a);

    // 1. Definir Arquitecto — proyectos sin arquitecto asignado
    const noArchitect = allProjects
      .filter((p) => {
        const arch = (p as any).architect;
        return !arch || (typeof arch === "string" && !arch.trim());
      })
      .sort(sortDesc);

    // 2. Revisión de Anteproyecto — proyectos en "pending-to-validate"
    //    donde el arquitecto ya ha enviado (project_architect_date existe)
    //    y falta revisión (project_review_done o financial_review_done es false)
    const pendingValidation = (
      projectsByPhase["pending-to-validate" as RenoKanbanPhase] || []
    ).filter((p) => {
      const pa = p as any;
      const architectSent = !!pa.project_architect_date;
      const reviewPending =
        !pa.project_review_done || !pa.financial_review_done;
      return architectSent && reviewPending;
    });

    // 3. Revisión de Proyecto — proyectos en "technical-project-in-progress"
    //    donde el arquitecto ha subido el proyecto técnico y el analista aún
    //    no ha marcado si se ha subido a la ECU (ecu_uploaded = false/null)
    const projectReview = (
      projectsByPhase["technical-project-in-progress" as RenoKanbanPhase] || []
    ).filter((p) => {
      const pa = p as any;
      const hasDoc =
        !!pa.arch_project_doc ||
        !!pa.technical_project_doc ||
        !!pa.project_end_date;
      const notUploadedToEcu = !pa.ecu_uploaded;
      return hasDoc && notUploadedToEcu;
    });

    // 4. Presupuesto Reformista — proyectos desde ECU Primera Validación
    //    hasta Pendiente Presupuesto Renovador que aún no tienen presupuesto,
    //    ordenados por cercanía a la fase final (pending-budget primero)
    const budgetPhases: RenoKanbanPhase[] = [
      "ecuv-first-validation" as RenoKanbanPhase,
      "technical-project-fine-tuning" as RenoKanbanPhase,
      "ecuv-final-validation" as RenoKanbanPhase,
      "pending-budget-from-renovator" as RenoKanbanPhase,
    ];
    const budgetPhaseOrder: Record<string, number> = {};
    budgetPhases.forEach((p, i) => {
      budgetPhaseOrder[p] = i;
    });
    const pendingBudget: ProjectRow[] = [];
    for (const phase of budgetPhases) {
      const projects = projectsByPhase[phase] || [];
      for (const p of projects) {
        const pa = p as any;
        const hasBudget =
          (Array.isArray(pa.renovator_budget_doc) &&
            pa.renovator_budget_doc.length > 0) ||
          (typeof pa.renovator_budget_doc === "string" &&
            pa.renovator_budget_doc.trim() !== "");
        if (!hasBudget) {
          pendingBudget.push(p);
        }
      }
    }
    pendingBudget.sort((a, b) => {
      const ai = budgetPhaseOrder[a.reno_phase ?? ""] ?? -1;
      const bi = budgetPhaseOrder[b.reno_phase ?? ""] ?? -1;
      return bi - ai;
    });

    return [
      {
        id: "architect",
        title: "Definir Arquitecto",
        count: noArchitect.length,
        projects: noArchitect,
      },
      {
        id: "review-draft",
        title: "Revisión de Anteproyecto",
        count: pendingValidation.length,
        projects: pendingValidation,
      },
      {
        id: "review-project",
        title: "Revisión de Proyecto",
        count: projectReview.length,
        projects: projectReview,
      },
      {
        id: "pending-budget",
        title: "Presupuesto Reformista",
        count: pendingBudget.length,
        projects: pendingBudget,
      },
    ];
  }, [allProjects, projectsByPhase]);

  const totalCount = todoWidgets.reduce((s, w) => s + w.count, 0);

  const handleProjectClick = (project: ProjectRow, widgetId: string) => {
    if (widgetId === "architect") {
      setSelectedProject(project);
      setArchitectModalOpen(true);
      return;
    }
    router.push(
      `/reno/maturation-analyst/project/${project.id}?from=maturation-home`
    );
  };

  const renderProjectInfo = (project: ProjectRow, widgetId: string) => {
    const pa = project as any;
    const rawZone = pa.area_cluster;
    const zone = rawZone
      ? String(rawZone).replace(/[\[\]"]/g, "").trim()
      : null;

    const details: string[] = [];
    if (zone) details.push(zone);
    if (pa.architect && widgetId !== "architect") details.push(pa.architect);

    return (
      <div className="space-y-1.5 min-w-0 w-full">
        <div className="text-sm font-medium text-foreground line-clamp-2 leading-snug break-words min-w-0">
          {project.name || "Sin nombre"}
        </div>
        {details.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap min-w-0">
            {details.map((d, i) => (
              <span key={i} className="whitespace-nowrap truncate max-w-full">
                {i > 0 ? `• ${d}` : d}
              </span>
            ))}
          </div>
        )}
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
                  onClick={() => handleProjectClick(project, widget.id)}
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
                      {renderProjectInfo(project, widget.id)}
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
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 xl:gap-6 min-h-[400px]">
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
                            onClick={() =>
                              handleProjectClick(project, widget.id)
                            }
                            className={cn(
                              "p-3 rounded-lg cursor-pointer transition-all duration-150",
                              "bg-white dark:bg-[#0a0a0a]",
                              "hover:bg-muted/40 hover:shadow-sm",
                              "border-2 overflow-hidden",
                              "min-w-0 w-full",
                              "border-border/60 hover:border-border"
                            )}
                          >
                            {renderProjectInfo(project, widget.id)}
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

      {/* Architect selector modal */}
      <ArchitectSelectorModal
        open={architectModalOpen}
        onOpenChange={setArchitectModalOpen}
        currentArchitect={
          selectedProject
            ? ((selectedProject as any).architect as string) ?? null
            : null
        }
        airtableProjectId={selectedProject?.airtable_project_id ?? null}
        onSelect={handleArchitectSelect}
      />
    </div>
  );
}
