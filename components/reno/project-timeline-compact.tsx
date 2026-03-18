"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import { cn } from "@/lib/utils";
import { MATURATION_PHASE_LABELS, WIP_PHASE_LABELS } from "@/lib/reno-kanban-config";
import { Clock, ArrowRight, AlertTriangle, CheckCircle2, Timer, ChevronDown, ChevronUp, X, Building2 } from "lucide-react";
import { buildWipCompactBlocks, type WipBlock } from "@/lib/reno/wip-timeline-logic";

const INITIAL_VISIBLE = 6;

/* ------------------------------------------------------------------ */
/*  WIP compact block colours                                         */
/* ------------------------------------------------------------------ */

const WIP_BLOCK_COLORS: Record<WipBlock, { bar: string; bg: string; text: string }> = {
  maduracion: {
    bar: "bg-violet-500",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-300",
  },
  obra: {
    bar: "bg-orange-500",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
  },
  "post-obra": {
    bar: "bg-emerald-500",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
  },
};

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

function parseAreaCluster(raw: string | null | undefined): string | null {
  const s = (raw ?? "").toString().trim();
  if (!s || ["[]", '[""]', "['']"].includes(s.replace(/\s/g, ""))) return null;
  return s.replace(/^\[|\]$/g, "").replace(/['"]/g, "").trim();
}

export function ProjectTimelineOverview({
  allProjects,
  getProjectUrl,
  allWipProjects,
}: {
  allProjects: ProjectRow[];
  getProjectUrl?: (project: ProjectRow) => string;
  allWipProjects?: ProjectRow[];
}) {
  const router = useRouter();
  const [tooltipData, setTooltipData] = useState<{ phases: CompactPhase[]; x: number; y: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [timelineMode, setTimelineMode] = useState<"proyectos" | "wips">("proyectos");

  // Filters
  const [filterCluster, setFilterCluster] = useState<string>("");
  const [filterArchitect, setFilterArchitect] = useState<string>("");
  const [filterHealth, setFilterHealth] = useState<string>("");

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

  // Filter options derived from data
  const clusterOptions = useMemo(() => {
    const set = new Set<string>();
    projectsWithTimeline.forEach(({ project }) => {
      const c = parseAreaCluster(project.area_cluster);
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [projectsWithTimeline]);

  const architectOptions = useMemo(() => {
    const set = new Set<string>();
    projectsWithTimeline.forEach(({ project }) => {
      const p = project as any;
      if (p.architect) set.add(p.architect);
    });
    return Array.from(set).sort();
  }, [projectsWithTimeline]);

  // Apply filters
  const filtered = useMemo(() => {
    return sorted.filter(({ project, health }) => {
      if (filterCluster) {
        const c = parseAreaCluster(project.area_cluster);
        if (c !== filterCluster) return false;
      }
      if (filterArchitect) {
        const p = project as any;
        if (p.architect !== filterArchitect) return false;
      }
      if (filterHealth && health !== filterHealth) return false;
      return true;
    });
  }, [sorted, filterCluster, filterArchitect, filterHealth]);

  const visible = expanded ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const hasMore = filtered.length > INITIAL_VISIBLE;
  const activeFilters = [filterCluster, filterArchitect, filterHealth].filter(Boolean).length;

  const delayedCount = projectsWithTimeline.filter(({ health }) => health === "delayed" || health === "slight-delay").length;
  const delayedOnlyCount = projectsWithTimeline.filter(({ health }) => health === "delayed").length;

  // WIP compact data
  const wipCards = useMemo(() => {
    if (!allWipProjects || allWipProjects.length === 0) return [];
    return allWipProjects.map((project) => {
      const blocks = buildWipCompactBlocks(project);
      const activeBlock = blocks.find((b) => b.status === "in-progress") ?? blocks[0];
      return { project, blocks, activeBlock };
    });
  }, [allWipProjects]);

  const wipFiltered = useMemo(() => {
    return wipCards; // No filters on WIP side (can expand later)
  }, [wipCards]);

  const wipVisible = expanded ? wipFiltered : wipFiltered.slice(0, INITIAL_VISIBLE);
  const wipHasMore = wipFiltered.length > INITIAL_VISIBLE;

  const hasWips = allWipProjects && allWipProjects.length > 0;

  if (projectsWithTimeline.length === 0 && !hasWips) {
    return (
      <div className="bg-card border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No hay proyectos con fecha de encargo anteproyecto para mostrar el timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* White box: title + KPI + filters + legend + grid */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        {/* Header inside box */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              Timeline de proyectos
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Haz clic en un proyecto para ver el detalle completo
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
              {timelineMode === "proyectos"
                ? `${filtered.length}${filtered.length !== projectsWithTimeline.length ? ` / ${projectsWithTimeline.length}` : ""} proyectos`
                : `${wipFiltered.length} WIPs`}
            </span>
          </div>
        </div>

        {/* Toggle Proyectos / WIPs — solo si hay WIPs */}
        {hasWips && (
          <div className="flex items-center">
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
              <button
                onClick={() => { setTimelineMode("proyectos"); setExpanded(false); }}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all",
                  timelineMode === "proyectos"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Proyectos
              </button>
              <button
                onClick={() => { setTimelineMode("wips"); setExpanded(false); }}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all",
                  timelineMode === "wips"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                WIPs
              </button>
            </div>
          </div>
        )}

        {/* ---- PROYECTOS MODE ---- */}
        {timelineMode === "proyectos" && <>

        {/* KPI: proyectos retrasados */}
        {delayedCount > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterHealth(filterHealth === "delayed" ? "" : "delayed")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                filterHealth === "delayed"
                  ? "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                  : "border-red-200 bg-red-50/60 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-sm font-bold">{delayedOnlyCount}</span>
              <span>proyectos retrasados</span>
              {filterHealth === "delayed" && <X className="h-3 w-3 ml-1" />}
            </button>
            {delayedCount > delayedOnlyCount && (
              <button
                onClick={() => setFilterHealth(filterHealth === "slight-delay" ? "" : "slight-delay")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                  filterHealth === "slight-delay"
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
                    : "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                )}
              >
                <Timer className="h-3.5 w-3.5" />
                <span className="text-sm font-bold">{delayedCount - delayedOnlyCount}</span>
                <span>con retraso leve</span>
                {filterHealth === "slight-delay" && <X className="h-3 w-3 ml-1" />}
              </button>
            )}
          </div>
        )}

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Cluster filter */}
          <div className="relative">
            <select
              value={filterCluster}
              onChange={(e) => { setFilterCluster(e.target.value); setExpanded(false); }}
              className={cn(
                "h-8 rounded-md border border-input bg-background px-3 pr-8 text-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring",
                filterCluster && "border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
              )}
            >
              <option value="">Área cluster</option>
              {clusterOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Architect filter */}
          <div className="relative">
            <select
              value={filterArchitect}
              onChange={(e) => { setFilterArchitect(e.target.value); setExpanded(false); }}
              className={cn(
                "h-8 rounded-md border border-input bg-background px-3 pr-8 text-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring",
                filterArchitect && "border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
              )}
            >
              <option value="">Arquitecto</option>
              {architectOptions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Health/status filter */}
          <div className="relative">
            <select
              value={filterHealth}
              onChange={(e) => { setFilterHealth(e.target.value); setExpanded(false); }}
              className={cn(
                "h-8 rounded-md border border-input bg-background px-3 pr-8 text-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring",
                filterHealth && "border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
              )}
            >
              <option value="">Estado</option>
              <option value="delayed">Retrasado</option>
              <option value="slight-delay">Retraso leve</option>
              <option value="on-track">En tiempo</option>
              <option value="not-started">Sin iniciar</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Clear filters */}
          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterCluster(""); setFilterArchitect(""); setFilterHealth(""); setExpanded(false); }}
              className="h-8 flex items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3 w-3" />
              Limpiar ({activeFilters})
            </button>
          )}

          {/* Legend — pushed to the right */}
          <div className="ml-auto hidden lg:flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> En tiempo</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> En progreso</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Retraso leve</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Retrasado</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-muted border border-border" /> Pendiente</span>
          </div>
        </div>

        {/* Empty filtered state */}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay proyectos que coincidan con los filtros seleccionados.
          </p>
        )}

        {/* Cards grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visible.map(({ project, phases, activeIdx, health, completedCount }) => {
              const badge = HEALTH_BADGE[health] || HEALTH_BADGE["not-started"];
              const BadgeIcon = badge.icon;
              const activePhaseName = activeIdx >= 0
                ? phases[activeIdx].label
                : phases.every(p => p.status !== "pending")
                  ? "Completado"
                  : "—";

              const completedPhases = phases.filter(
                p => p.status === "completed" || p.status === "completed-late"
              );
              const totalPhases = phases.length;
              const cluster = parseAreaCluster(project.area_cluster);
              const p = project as any;

              return (
                <div
                  key={project.id}
                  className="group relative rounded-lg border border-border bg-card p-4 cursor-pointer transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
                  onClick={() => router.push(getProjectUrl ? getProjectUrl(project) : `/reno/maturation-analyst/project/${project.id}?viewMode=kanban&from=maturation-home&tab=timeline`)}
                >
                  {/* Top row: badge + arrow */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      badge.className
                    )}>
                      <BadgeIcon className="h-2.5 w-2.5" />
                      {badge.label}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-blue-500 transition-colors" />
                  </div>

                  {/* Project name + meta */}
                  <div className="mb-3 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                      {project.name || "Sin nombre"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {[project.project_unique_id, activePhaseName !== "—" ? activePhaseName : null]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                    {(cluster || p.architect) && (
                      <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                        {[cluster, p.architect].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>

                  {/* Progress bar + phase count */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">
                        {completedCount} de {totalPhases} fases
                      </span>
                      {activeIdx >= 0 && phases[activeIdx].actualDays != null && (
                        <span className="text-[10px] text-muted-foreground">
                          {phases[activeIdx].actualDays}d / {phases[activeIdx].plannedDays}d plan.
                        </span>
                      )}
                    </div>
                    <div
                      className="flex h-2.5 rounded-full overflow-hidden bg-muted/40 border border-border/40"
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
                              ph.status === "pending" && "opacity-20",
                              isActive && "animate-pulse",
                            )}
                            style={{ width: `${widthPct}%` }}
                          >
                            <div className="absolute right-0 top-0 bottom-0 w-px bg-background/60" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Completed phase labels */}
                  {completedPhases.length > 0 && (
                    <div className="flex flex-wrap gap-x-1 gap-y-0.5 mt-2">
                      {completedPhases.map((ph, i) => (
                        <span key={ph.id} className="text-[10px]">
                          <span className={cn(
                            ph.status === "completed-late" ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
                          )}>
                            {ph.label}
                          </span>
                          {i < completedPhases.length - 1 && (
                            <span className="text-muted-foreground/50 ml-1">·</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Show more / less button — proyectos */}
        {hasMore && (
          <div className="flex justify-center pt-1">
            <button
              onClick={() => setExpanded(prev => !prev)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-muted"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Ver {filtered.length - INITIAL_VISIBLE} proyectos más
                </>
              )}
            </button>
          </div>
        )}

        </> /* end proyectos mode */}

        {/* ---- WIPS MODE ---- */}
        {timelineMode === "wips" && <>

          {/* WIP Legend */}
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500" /> Maduración</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> Obra</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Post-Obra</span>
          </div>

          {/* WIP Cards grid */}
          {wipFiltered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay WIPs disponibles.
            </p>
          )}

          {wipFiltered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {wipVisible.map(({ project, blocks, activeBlock }) => {
                const pw = project as any;
                const cluster = parseAreaCluster(project.area_cluster);
                const activeBlockColors = activeBlock ? WIP_BLOCK_COLORS[activeBlock.id] : null;
                const phaseName = pw.reno_phase
                  ? (WIP_PHASE_LABELS[pw.reno_phase as string] ?? pw.reno_phase)
                  : "—";

                return (
                  <div
                    key={project.id}
                    className="group relative rounded-lg border border-border bg-card p-4 cursor-pointer transition-all hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700"
                    onClick={() =>
                      router.push(
                        `/reno/maturation-analyst/wip/${project.id}?viewMode=kanban&from=maturation-home&tab=timeline`
                      )
                    }
                  >
                    {/* Top row: block badge + arrow */}
                    <div className="flex items-center justify-between mb-3">
                      {activeBlock && activeBlockColors ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            activeBlockColors.bg,
                            activeBlockColors.text
                          )}
                        >
                          <Building2 className="h-2.5 w-2.5" />
                          {activeBlock.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted">
                          Sin iniciar
                        </span>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-violet-500 transition-colors" />
                    </div>

                    {/* Project name + meta */}
                    <div className="mb-3 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors leading-tight">
                        {project.name || "Sin nombre"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {[project.project_unique_id, phaseName].filter(Boolean).join(" · ") || "—"}
                      </p>
                      {cluster && (
                        <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                          {cluster}
                          {pw.wip_completion_pct ? ` · ${pw.wip_completion_pct}% avance` : ""}
                        </p>
                      )}
                    </div>

                    {/* 3-block progress bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">
                          {blocks.filter((b) => b.status === "completed").length} de{" "}
                          {blocks.filter((b) => b.status !== "not-applicable").length} bloques
                        </span>
                      </div>
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/40 border border-border/40 gap-0.5">
                        {blocks.map((block) => {
                          const colors = WIP_BLOCK_COLORS[block.id];
                          return (
                            <div
                              key={block.id}
                              className={cn(
                                "h-full flex-1 transition-all",
                                block.status === "not-applicable"
                                  ? "bg-muted/20"
                                  : block.status === "completed"
                                  ? colors.bar
                                  : block.status === "in-progress"
                                  ? cn(colors.bar, "opacity-60 animate-pulse")
                                  : "bg-muted/40"
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Block status labels */}
                    <div className="flex flex-wrap gap-x-1 gap-y-0.5 mt-2">
                      {blocks
                        .filter((b) => b.status !== "not-applicable")
                        .map((block, i, arr) => (
                          <span key={block.id} className="text-[10px]">
                            <span
                              className={cn(
                                block.status === "completed"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : block.status === "in-progress"
                                  ? WIP_BLOCK_COLORS[block.id].text
                                  : "text-muted-foreground/50"
                              )}
                            >
                              {block.label}
                            </span>
                            {i < arr.length - 1 && (
                              <span className="text-muted-foreground/50 ml-1">·</span>
                            )}
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show more / less button — WIPs */}
          {wipHasMore && (
            <div className="flex justify-center pt-1">
              <button
                onClick={() => setExpanded(prev => !prev)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-muted"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Ver {wipFiltered.length - INITIAL_VISIBLE} WIPs más
                  </>
                )}
              </button>
            </div>
          )}

        </> /* end wips mode */}

      </div>

      {/* Tooltip */}
      {tooltipData && <CompactTooltip {...tooltipData} />}
    </div>
  );
}
