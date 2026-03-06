"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import { cn } from "@/lib/utils";
import { MATURATION_PHASE_LABELS } from "@/lib/reno-kanban-config";
import { Clock, ArrowRight, AlertTriangle, CheckCircle2, Timer } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Phase definitions                                                  */
/* ------------------------------------------------------------------ */

const PHASE_DEFS = [
  { id: "measurement", label: "Medición", days: 7 },
  { id: "preliminary", label: "Anteproyecto", days: 14 },
  { id: "technical", label: "Proyecto Técnico", days: 28 },
  { id: "ecu-1st", label: "1ª Validación ECU", days: 28 },
  { id: "repairs", label: "Reparos", days: 5 },
  { id: "ecu-final", label: "Validación Final", days: 21 },
  { id: "license", label: "Licencia", days: 30 },
] as const;

const TOTAL_PLANNED_DAYS = PHASE_DEFS.reduce((s, p) => s + p.days, 0);

type PhaseStatus = "completed" | "completed-late" | "in-progress" | "in-progress-late" | "pending";

interface CompactPhase {
  id: string;
  label: string;
  plannedDays: number;
  actualDays: number | null;
  status: PhaseStatus;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function getCompactPhases(project: ProjectRow): CompactPhase[] | null {
  const p = project as any;
  const origin = parseDate(p.draft_order_date);
  if (!origin) return null;

  const today = new Date();
  const phases: CompactPhase[] = [];

  const dates = {
    measurement: parseDate(p.measurement_date),
    draft: parseDate(p.draft_validation_date) ?? parseDate(p.project_draft_date),
    techEnd: parseDate(p.project_end_date) ?? parseDate(p.estimated_project_end_date),
    firstCorrection: parseDate(p.first_correction_date),
    definitiveValidation: parseDate(p.definitive_validation_date),
  };

  const phaseEndDates: (Date | null)[] = [
    dates.measurement,
    dates.draft,
    dates.techEnd,
    dates.firstCorrection,
    dates.definitiveValidation,
    null,
    null,
  ];

  let cursor: Date = origin;

  for (let i = 0; i < PHASE_DEFS.length; i++) {
    const def = PHASE_DEFS[i];
    const endDate = phaseEndDates[i];
    const plannedDays = def.days;

    let status: PhaseStatus;
    let actualDays: number | null = null;

    if (endDate) {
      actualDays = daysBetween(cursor, endDate);
      status = actualDays > plannedDays ? "completed-late" : "completed";
      cursor = endDate;
    } else {
      const prevCompleted = i === 0 || phaseEndDates[i - 1] != null;
      if (prevCompleted) {
        actualDays = daysBetween(cursor, today);
        status = actualDays > plannedDays ? "in-progress-late" : "in-progress";
      } else {
        status = "pending";
      }
    }

    phases.push({ id: def.id, label: def.label, plannedDays, actualDays, status });

    if (status === "in-progress" || status === "in-progress-late" || status === "pending") {
      for (let j = i + 1; j < PHASE_DEFS.length; j++) {
        phases.push({
          id: PHASE_DEFS[j].id,
          label: PHASE_DEFS[j].label,
          plannedDays: PHASE_DEFS[j].days,
          actualDays: null,
          status: "pending",
        });
      }
      break;
    }
  }

  return phases;
}

function getActivePhaseIndex(phases: CompactPhase[]): number {
  return phases.findIndex(p => p.status === "in-progress" || p.status === "in-progress-late");
}

function getOverallHealth(phases: CompactPhase[]): "on-track" | "slight-delay" | "delayed" | "not-started" {
  const hasOrigin = phases.length > 0;
  if (!hasOrigin) return "not-started";

  const active = phases.find(p => p.status === "in-progress" || p.status === "in-progress-late");
  if (!active) {
    const allDone = phases.every(p => p.status === "completed" || p.status === "completed-late");
    if (allDone) {
      const anyLate = phases.some(p => p.status === "completed-late");
      return anyLate ? "slight-delay" : "on-track";
    }
    return "not-started";
  }

  const lateCompleted = phases.filter(p => p.status === "completed-late").length;
  if (active.status === "in-progress-late" || lateCompleted > 1) return "delayed";
  if (lateCompleted === 1) return "slight-delay";
  return "on-track";
}

/* ------------------------------------------------------------------ */
/*  Segment colors                                                     */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<PhaseStatus, string> = {
  completed: "bg-emerald-500",
  "completed-late": "bg-red-500",
  "in-progress": "bg-blue-500",
  "in-progress-late": "bg-amber-500",
  pending: "bg-muted",
};

const HEALTH_BADGE: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  "on-track": { label: "En tiempo", className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400", icon: CheckCircle2 },
  "slight-delay": { label: "Retraso leve", className: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400", icon: Timer },
  delayed: { label: "Retrasado", className: "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400", icon: AlertTriangle },
  "not-started": { label: "Sin iniciar", className: "text-muted-foreground bg-muted", icon: Clock },
};

/* ------------------------------------------------------------------ */
/*  Tooltip component                                                  */
/* ------------------------------------------------------------------ */

function CompactTooltip({ phases, x, y }: { phases: CompactPhase[]; x: number; y: number }) {
  return (
    <div
      className="fixed z-50 bg-popover border rounded-lg shadow-lg px-3 py-2 text-xs pointer-events-none"
      style={{ left: x, top: y - 8, transform: "translate(-50%, -100%)" }}
    >
      <div className="space-y-1">
        {phases.map((ph) => (
          <div key={ph.id} className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_COLORS[ph.status])} />
            <span className="text-muted-foreground w-28 truncate">{ph.label}</span>
            <span className="font-medium">
              {ph.status === "pending"
                ? `${ph.plannedDays}d plan.`
                : ph.status === "in-progress" || ph.status === "in-progress-late"
                  ? `${ph.actualDays}d / ${ph.plannedDays}d`
                  : `${ph.actualDays}d (${ph.actualDays! <= ph.plannedDays ? "OK" : `+${ph.actualDays! - ph.plannedDays}d`})`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function ProjectTimelineOverview({ allProjects, getProjectUrl }: { allProjects: ProjectRow[]; getProjectUrl?: (project: ProjectRow) => string }) {
  const router = useRouter();
  const [tooltipData, setTooltipData] = useState<{ phases: CompactPhase[]; x: number; y: number } | null>(null);

  const projectsWithTimeline = useMemo(() => {
    return allProjects
      .map((project) => {
        const phases = getCompactPhases(project);
        if (!phases) return null;
        const activeIdx = getActivePhaseIndex(phases);
        const health = getOverallHealth(phases);
        const completedCount = phases.filter(p => p.status === "completed" || p.status === "completed-late").length;
        return { project, phases, activeIdx, health, completedCount };
      })
      .filter(Boolean) as {
        project: ProjectRow;
        phases: CompactPhase[];
        activeIdx: number;
        health: string;
        completedCount: number;
      }[];
  }, [allProjects]);

  const sorted = useMemo(() => {
    return [...projectsWithTimeline].sort((a, b) => {
      const healthOrder: Record<string, number> = { delayed: 0, "slight-delay": 1, "in-progress": 2, "on-track": 3, "not-started": 4 };
      const ha = healthOrder[a.health] ?? 5;
      const hb = healthOrder[b.health] ?? 5;
      if (ha !== hb) return ha - hb;
      return b.completedCount - a.completedCount;
    });
  }, [projectsWithTimeline]);

  const noTimeline = allProjects.length - projectsWithTimeline.length;

  if (projectsWithTimeline.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          Timeline de proyectos
        </h3>
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay proyectos con fecha de encargo anteproyecto para mostrar el timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          Timeline de proyectos
          <span className="text-xs text-muted-foreground font-normal">({projectsWithTimeline.length} proyectos)</span>
        </h3>
        {noTimeline > 0 && (
          <span className="text-xs text-muted-foreground">
            {noTimeline} sin fecha de encargo
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> En tiempo
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> En progreso
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Retraso leve
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Retrasado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-muted border" /> Pendiente
        </span>
      </div>

      {/* Project rows */}
      <div className="space-y-1">
        {sorted.map(({ project, phases, activeIdx, health }) => {
          const badge = HEALTH_BADGE[health] || HEALTH_BADGE["not-started"];
          const BadgeIcon = badge.icon;
          const activePhaseName = activeIdx >= 0 ? phases[activeIdx].label : phases.every(p => p.status !== "pending") ? "Completado" : "—";

          return (
            <div
              key={project.id}
              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/40 transition-colors cursor-pointer group"
              onClick={() => router.push(getProjectUrl ? getProjectUrl(project) : `/reno/maturation-analyst/project/${project.id}?viewMode=kanban&from=maturation-home&tab=timeline`)}
            >
              {/* Project info */}
              <div className="w-44 flex-shrink-0 min-w-0">
                <p className="text-xs font-medium truncate text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {project.name || "Sin nombre"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {project.project_unique_id || (project.reno_phase ? MATURATION_PHASE_LABELS[project.reno_phase] : "—")}
                </p>
              </div>

              {/* Timeline bar */}
              <div
                className="flex-1 flex h-5 rounded-full overflow-hidden bg-muted/30 border border-border/50"
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTooltipData({ phases, x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => setTooltipData(null)}
              >
                {phases.map((ph) => {
                  const widthPct = (ph.plannedDays / TOTAL_PLANNED_DAYS) * 100;
                  const isActive = ph.status === "in-progress" || ph.status === "in-progress-late";
                  return (
                    <div
                      key={ph.id}
                      className={cn(
                        "h-full transition-all relative",
                        STATUS_COLORS[ph.status],
                        ph.status === "pending" && "opacity-30",
                        isActive && "animate-pulse",
                      )}
                      style={{ width: `${widthPct}%` }}
                    >
                      {/* Separator between segments */}
                      <div className="absolute right-0 top-0 bottom-0 w-px bg-background/50" />
                    </div>
                  );
                })}
              </div>

              {/* Current phase */}
              <div className="w-32 flex-shrink-0 text-right hidden sm:block">
                <span className="text-[10px] text-muted-foreground">{activePhaseName}</span>
              </div>

              {/* Health badge */}
              <div className="w-24 flex-shrink-0 hidden md:flex justify-end">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", badge.className)}>
                  <BadgeIcon className="h-2.5 w-2.5" />
                  {badge.label}
                </span>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-blue-500 transition-colors flex-shrink-0" />
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltipData && <CompactTooltip {...tooltipData} />}
    </div>
  );
}
