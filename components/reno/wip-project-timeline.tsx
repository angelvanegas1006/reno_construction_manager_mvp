"use client";

import { useMemo, useState } from "react";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import { cn } from "@/lib/utils";
import { Pencil, Loader2, Info } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  buildWipPhases,
  type WipTimelinePhase,
  type WipBlock,
  type WipPhaseStatus,
} from "@/lib/reno/wip-timeline-logic";

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const ROW_H = 44;
const LABEL_W = 200;
const DAY_W = 5;
const HEADER_H = 52;

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function toInputDate(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().split("T")[0];
}

/* ------------------------------------------------------------------ */
/*  Block colours                                                      */
/* ------------------------------------------------------------------ */

const BLOCK_COLORS: Record<WipBlock, { bg: string; text: string; bar: string; barEst: string; border: string }> = {
  maduracion: {
    bg: "bg-violet-50 dark:bg-violet-950/20",
    text: "text-violet-700 dark:text-violet-300",
    bar: "bg-violet-500",
    barEst: "bg-violet-300 dark:bg-violet-700",
    border: "border-violet-200 dark:border-violet-800",
  },
  obra: {
    bg: "bg-orange-50 dark:bg-orange-950/20",
    text: "text-orange-700 dark:text-orange-300",
    bar: "bg-orange-500",
    barEst: "bg-orange-300 dark:bg-orange-700",
    border: "border-orange-200 dark:border-orange-800",
  },
  "post-obra": {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    text: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
    barEst: "bg-emerald-300 dark:bg-emerald-700",
    border: "border-emerald-200 dark:border-emerald-800",
  },
};

const STATUS_OPACITY: Record<WipPhaseStatus, string> = {
  completed: "opacity-100",
  "in-progress": "opacity-100",
  pending: "opacity-40",
  "not-applicable": "opacity-20",
};

/* ------------------------------------------------------------------ */
/*  Editable date fields                                               */
/* ------------------------------------------------------------------ */

const EDIT_FIELDS = [
  { key: "project_start_date", label: "Inicio del proyecto" },
  { key: "reno_start_date", label: "Inicio de obra (real)" },
  { key: "est_reno_start_date", label: "Inicio de obra (estimado)" },
  { key: "reno_end_date", label: "Fin de obra (real)" },
  { key: "est_reno_end_date", label: "Fin de obra (estimado)" },
  { key: "estimated_settlement_date", label: "Fecha estimada de liquidación" },
];

/* ------------------------------------------------------------------ */
/*  Edit Sheet                                                         */
/* ------------------------------------------------------------------ */

function WipTimelineEditSheet({
  project,
  open,
  onOpenChange,
  onSaved,
}: {
  project: ProjectRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const p = project as any;
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of EDIT_FIELDS) {
      init[f.key] = toInputDate(parseDate(p[f.key]));
    }
    return init;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const patch: Record<string, string | null> = {};
      for (const f of EDIT_FIELDS) {
        patch[f.key] = values[f.key] ? values[f.key] : null;
      }
      const { error } = await supabase
        .from("projects")
        .update(patch)
        .eq("id", project.id);
      if (error) throw error;
      toast.success("Fechas guardadas correctamente");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error("Error al guardar fechas");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar fechas del WIP</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {EDIT_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key} className="text-sm font-medium">
                {f.label}
              </Label>
              <Input
                id={f.key}
                type="date"
                value={values[f.key]}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <SheetFooter className="mt-6 flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Tooltip                                                            */
/* ------------------------------------------------------------------ */

function PhaseTooltip({
  phase,
  x,
  y,
}: {
  phase: WipTimelinePhase;
  x: number;
  y: number;
}) {
  return (
    <div
      className="fixed z-50 bg-popover border rounded-lg shadow-lg px-3 py-2.5 text-xs pointer-events-none min-w-[200px]"
      style={{ left: x, top: y - 8, transform: "translate(-50%, -100%)" }}
    >
      <p className="font-semibold mb-1">{phase.label}</p>
      {phase.startDate && (
        <p className="text-muted-foreground">
          Inicio: <span className="text-foreground">{fmtDate(phase.startDate)}</span>
        </p>
      )}
      {phase.endDate && (
        <p className="text-muted-foreground">
          Fin: <span className="text-foreground">{fmtDate(phase.endDate)}</span>
        </p>
      )}
      {phase.estimatedDays && (
        <p className="text-muted-foreground">
          Duración est.:{" "}
          <span className="text-foreground">
            {Math.round(phase.estimatedDays / 30.44)} meses
          </span>
        </p>
      )}
      {phase.note && (
        <p className="text-muted-foreground mt-1 italic">{phase.note}</p>
      )}
      {phase.isEstimated && (
        <p className="text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
          <Info className="h-3 w-3" />
          Fecha estimada
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface WipProjectTimelineProps {
  project: ProjectRow;
  canEdit?: boolean;
  onRefetch?: () => void;
}

export function WipProjectTimeline({
  project,
  canEdit,
  onRefetch,
}: WipProjectTimelineProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [tooltipData, setTooltipData] = useState<{
    phase: WipTimelinePhase;
    x: number;
    y: number;
  } | null>(null);

  const phases = useMemo(() => buildWipPhases(project), [project]);

  // Determine timeline origin and total span
  const { originDate, totalDays } = useMemo(() => {
    const allDates: Date[] = [];
    for (const ph of phases) {
      if (ph.startDate) allDates.push(ph.startDate);
      if (ph.endDate) allDates.push(ph.endDate);
    }
    // Also add estimated ends
    const p = project as any;
    const origin =
      parseDate(p.project_start_date) ??
      parseDate(p.reno_start_date) ??
      parseDate(p.est_reno_start_date);

    if (!origin) return { originDate: null, totalDays: 0 };

    const endCandidates: Date[] = allDates.filter((d) => d >= origin);
    // Add a minimum span so the timeline is always visible
    const maxEnd =
      endCandidates.length > 0
        ? new Date(Math.max(...endCandidates.map((d) => d.getTime())))
        : addDays(origin, 540); // default 18 months

    const span = Math.max(daysBetween(origin, maxEnd) + 90, 365);
    return { originDate: origin, totalDays: span };
  }, [phases, project]);

  // Visible phases (exclude not-applicable)
  const visiblePhases = phases.filter((ph) => ph.status !== "not-applicable");

  const canvasWidth = LABEL_W + totalDays * DAY_W;
  const canvasHeight = HEADER_H + visiblePhases.length * ROW_H;

  // Month tick marks
  const monthTicks = useMemo(() => {
    if (!originDate || totalDays === 0) return [];
    const ticks: { label: string; day: number }[] = [];
    const cursor = new Date(originDate);
    cursor.setDate(1);
    if (cursor < originDate) cursor.setMonth(cursor.getMonth() + 1);
    while (daysBetween(originDate, cursor) < totalDays) {
      ticks.push({
        label: cursor.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
        day: daysBetween(originDate, cursor),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return ticks;
  }, [originDate, totalDays]);

  const today = useMemo(() => new Date(), []);

  if (!originDate || visiblePhases.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No hay fechas suficientes para mostrar el timeline de este WIP.
        </p>
        {canEdit && onRefetch && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Editar fechas
          </Button>
        )}
        {canEdit && onRefetch && (
          <WipTimelineEditSheet
            project={project}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSaved={() => onRefetch?.()}
          />
        )}
      </div>
    );
  }

  const todayOffset = daysBetween(originDate, today);

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div>
          <h2 className="text-base font-semibold">Timeline del WIP</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Origen:{" "}
            {fmtDate(
              parseDate((project as any).project_start_date) ??
                parseDate((project as any).reno_start_date) ??
                originDate
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Block legend */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
            {(Object.keys(BLOCK_COLORS) as WipBlock[]).map((b) => (
              <span key={b} className="flex items-center gap-1.5">
                <span className={cn("w-3 h-3 rounded-sm", BLOCK_COLORS[b].bar)} />
                {b === "maduracion"
                  ? "Maduración"
                  : b === "obra"
                  ? "Obra"
                  : "Post-Obra"}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-muted border-2 border-dashed border-muted-foreground/40" />
              Estimado
            </span>
          </div>
          {canEdit && onRefetch && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar fechas
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Gantt */}
      <div className="overflow-x-auto">
        <div style={{ width: canvasWidth, position: "relative" }}>
          {/* Month header row */}
          <div
            className="flex border-b bg-muted/20"
            style={{ height: HEADER_H, paddingLeft: LABEL_W }}
          >
            {monthTicks.map((tick) => (
              <div
                key={tick.day}
                className="absolute text-[10px] text-muted-foreground border-l border-border/40 pl-1 flex items-end pb-1"
                style={{
                  left: LABEL_W + tick.day * DAY_W,
                  height: HEADER_H,
                  minWidth: 1,
                }}
              >
                {tick.label}
              </div>
            ))}
          </div>

          {/* Rows */}
          {visiblePhases.map((phase, idx) => {
            const colors = BLOCK_COLORS[phase.block];
            const rowTop = HEADER_H + idx * ROW_H;

            // Determine bar position
            const barStart = phase.startDate
              ? daysBetween(originDate, phase.startDate)
              : null;
            const barEnd = phase.endDate
              ? daysBetween(originDate, phase.endDate)
              : phase.startDate && phase.estimatedDays
              ? daysBetween(originDate, addDays(phase.startDate, phase.estimatedDays))
              : null;

            const barLeft = barStart !== null ? LABEL_W + Math.max(0, barStart) * DAY_W : null;
            const barWidth =
              barLeft !== null && barEnd !== null
                ? Math.max(4, (barEnd - Math.max(0, barStart!)) * DAY_W)
                : phase.estimatedDays
                ? phase.estimatedDays * DAY_W
                : 0;

            const isNA = phase.status === "not-applicable";
            const isActive = phase.status === "in-progress";

            return (
              <div
                key={phase.id}
                className={cn(
                  "absolute w-full flex items-center border-b border-border/30",
                  idx % 2 === 0 ? "" : "bg-muted/10"
                )}
                style={{ top: rowTop, height: ROW_H }}
              >
                {/* Label */}
                <div
                  className="flex items-center gap-1.5 px-3 flex-shrink-0"
                  style={{ width: LABEL_W }}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      isNA ? "bg-muted-foreground/30" : colors.bar
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs leading-tight truncate",
                      isNA ? "text-muted-foreground/50 line-through" : "text-foreground"
                    )}
                  >
                    {phase.label}
                  </span>
                </div>

                {/* Bar */}
                {!isNA && barLeft !== null && barWidth > 0 && (
                  <div
                    className={cn(
                      "absolute h-6 rounded-md cursor-pointer flex items-center justify-end pr-1",
                      phase.isEstimated
                        ? cn(colors.barEst, "border-2 border-dashed", colors.border)
                        : colors.bar,
                      STATUS_OPACITY[phase.status],
                      isActive && "ring-2 ring-offset-1 ring-orange-400 dark:ring-orange-500"
                    )}
                    style={{ left: barLeft, width: barWidth }}
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setTooltipData({
                        phase,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setTooltipData(null)}
                  >
                    {barWidth > 60 && (
                      <span className="text-[9px] text-white/80 truncate px-1">
                        {phase.estimatedDays
                          ? `${Math.round(phase.estimatedDays / 30.44)}m`
                          : ""}
                      </span>
                    )}
                  </div>
                )}

                {/* "N/A" label */}
                {isNA && (
                  <span
                    className="absolute text-[10px] text-muted-foreground/40"
                    style={{ left: LABEL_W + 8 }}
                  >
                    N/A
                  </span>
                )}
              </div>
            );
          })}

          {/* Today line */}
          {todayOffset >= 0 && todayOffset < totalDays && (
            <div
              className="absolute top-0 bottom-0 w-px bg-blue-500 z-10"
              style={{ left: LABEL_W + todayOffset * DAY_W, height: canvasHeight }}
            >
              <span className="absolute top-1 left-1 text-[9px] text-blue-500 font-medium whitespace-nowrap">
                Hoy
              </span>
            </div>
          )}

          {/* Block separators */}
          {(["maduracion", "obra", "post-obra"] as WipBlock[]).map((block) => {
            const firstIdx = visiblePhases.findIndex((ph) => ph.block === block);
            if (firstIdx <= 0) return null;
            return (
              <div
                key={block}
                className="absolute left-0 right-0 border-t-2 border-border/60"
                style={{ top: HEADER_H + firstIdx * ROW_H }}
              />
            );
          })}
        </div>
      </div>

      {/* Block summary pills below */}
      <div className="flex flex-wrap gap-2 px-4 py-3 border-t bg-muted/10">
        {(Object.keys(BLOCK_COLORS) as WipBlock[]).map((block) => {
          const blockPhases = visiblePhases.filter((ph) => ph.block === block);
          if (blockPhases.length === 0) return null;
          const done = blockPhases.filter((ph) => ph.status === "completed").length;
          const colors = BLOCK_COLORS[block];
          const blockLabel =
            block === "maduracion"
              ? "Maduración"
              : block === "obra"
              ? "Obra"
              : "Post-Obra";
          return (
            <span
              key={block}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border",
                colors.bg,
                colors.text,
                colors.border
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", colors.bar)} />
              {blockLabel}: {done}/{blockPhases.length} fases
            </span>
          );
        })}
      </div>

      {/* Edit sheet */}
      {canEdit && onRefetch && (
        <WipTimelineEditSheet
          project={project}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={() => onRefetch?.()}
        />
      )}

      {/* Tooltip */}
      {tooltipData && <PhaseTooltip {...tooltipData} />}
    </div>
  );
}
