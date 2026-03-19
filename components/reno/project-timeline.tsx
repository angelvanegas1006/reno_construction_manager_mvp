"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2, Pencil, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TimelinePhase {
  id: string;
  label: string;
  plannedStartDay: number;
  plannedDuration: number;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  type: "phase" | "milestone" | "parallel";
  parentPhaseId?: string;
  milestoneStyle?: "normal" | "major";
}

interface TooltipData {
  phase: TimelinePhase;
  x: number;
  y: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ROW_HEIGHT = 40;
const PARALLEL_ROW_HEIGHT = 32;
const MILESTONE_ROW_HEIGHT = 28;
const LABEL_WIDTH = 240;
const DAY_WIDTH = 8;
const HEADER_HEIGHT = 48;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/* ------------------------------------------------------------------ */
/*  buildPhases — maps project fields to timeline phases               */
/* ------------------------------------------------------------------ */

function buildPhases(project: ProjectRow): { phases: TimelinePhase[]; originDate: Date } | null {
  const p = project as any;
  const origin = parseDate(p.draft_order_date);
  if (!origin) return null;

  // Projects going through Ayuntamiento (Town Hall) instead of ECU
  const isAyto = p.excluded_from_ecu === true;

  const phases: TimelinePhase[] = [];
  let cursor = 0;

  // 1. Medición — 7 days
  phases.push({
    id: "measurement",
    label: "Medición",
    plannedStartDay: cursor,
    plannedDuration: 7,
    actualStartDate: origin,
    actualEndDate: parseDate(p.measurement_date),
    type: "phase",
  });
  cursor += 7;

  // 2. Anteproyecto — 14 days
  const measurementReal = parseDate(p.measurement_date);
  const anteStart = measurementReal ?? addDays(origin, 7);
  const anteEnd = parseDate(p.project_architect_date) ?? parseDate(p.project_draft_date);
  phases.push({
    id: "preliminary",
    label: "Anteproyecto",
    plannedStartDay: cursor,
    plannedDuration: 14,
    actualStartDate: anteStart,
    actualEndDate: anteEnd,
    type: "phase",
  });
  cursor += 14;

  // HITO: Validación Draft
  const draftValidationDate = parseDate(p.draft_validation_date);
  phases.push({
    id: "milestone-draft",
    label: "Validación Draft",
    plannedStartDay: cursor,
    plannedDuration: 0,
    actualStartDate: draftValidationDate,
    actualEndDate: draftValidationDate,
    type: "milestone",
    milestoneStyle: "normal",
  });

  // 3. Elaboración Proyecto Técnico — 28 days
  const techStart = draftValidationDate ?? parseDate(p.project_draft_date) ?? addDays(origin, cursor);
  phases.push({
    id: "technical-project",
    label: "Elaboración Proyecto Técnico",
    plannedStartDay: cursor,
    plannedDuration: 28,
    actualStartDate: techStart,
    actualEndDate: parseDate(p.project_end_date) ?? parseDate(p.estimated_project_end_date),
    type: "phase",
  });

  // Paralelo: Asignación ECUV / Contacto con Ayuntamiento
  phases.push({
    id: "ecuv-assignment",
    label: isAyto ? "Contacto con Ayuntamiento" : "Asignación y gestión ECUV",
    plannedStartDay: cursor,
    plannedDuration: 28,
    actualStartDate: techStart,
    actualEndDate: parseDate(p.ecu_delivery_date),
    type: "parallel",
    parentPhaseId: "technical-project",
  });
  cursor += 28;

  // HITO: Inicio Comercialización
  phases.push({
    id: "milestone-commercialization",
    label: "Inicio Comercialización",
    plannedStartDay: cursor,
    plannedDuration: 0,
    actualStartDate: parseDate(p.project_end_date),
    actualEndDate: parseDate(p.project_end_date),
    type: "milestone",
    milestoneStyle: "major",
  });

  // 4. 1ª Validación ECU / Primera Entrega Ayuntamiento — 28 days
  const ecuFirstStart = parseDate(p.ecu_first_start_date);
  const ecuFirstEnd = parseDate(p.ecu_first_end_date);
  const ecuStartFallback = parseDate(p.project_end_date) ?? parseDate(p.estimated_project_end_date);
  phases.push({
    id: "ecu-first-validation",
    label: isAyto ? "Primera Entrega al Ayuntamiento" : "1ª Validación ECU",
    plannedStartDay: cursor,
    plannedDuration: 28,
    actualStartDate: ecuFirstStart ?? ecuStartFallback ?? addDays(origin, cursor),
    actualEndDate: ecuFirstEnd,
    type: "phase",
  });
  cursor += 28;

  // 5. Reparos — 5 days
  const repairsStart = ecuFirstEnd ?? addDays(origin, cursor);
  const archCorrDate = parseDate(p.arch_correction_date);
  phases.push({
    id: "repairs",
    label: isAyto ? "Reparos Ayuntamiento" : "Reparos",
    plannedStartDay: cursor,
    plannedDuration: 5,
    actualStartDate: repairsStart,
    actualEndDate: archCorrDate,
    type: "phase",
  });
  cursor += 5;

  // 6. Validación Final ECU / Validación Final Ayuntamiento — 21 days
  const ecuFinalStart = parseDate(p.ecu_final_start_date);
  const ecuFinalEnd = parseDate(p.ecu_final_end_date);
  phases.push({
    id: "ecu-final-validation",
    label: isAyto ? "Validación Final / Espera Ayuntamiento" : "Validación Final ECU",
    plannedStartDay: cursor,
    plannedDuration: 21,
    actualStartDate: ecuFinalStart ?? archCorrDate ?? addDays(origin, cursor),
    actualEndDate: ecuFinalEnd,
    type: "phase",
  });

  // Paralelo: Asignación constructora
  phases.push({
    id: "constructor-assignment",
    label: "Asignación constructora",
    plannedStartDay: cursor,
    plannedDuration: 21,
    actualStartDate: ecuFinalStart ?? archCorrDate ?? addDays(origin, cursor),
    actualEndDate: null,
    type: "parallel",
    parentPhaseId: "ecu-final-validation",
  });

  // Paralelo: Check Ready to Settle
  phases.push({
    id: "ready-to-settle",
    label: "Check: Ready to Settle",
    plannedStartDay: cursor,
    plannedDuration: 21,
    actualStartDate: ecuFinalStart ?? archCorrDate ?? addDays(origin, cursor),
    actualEndDate: parseDate(p.settlement_date),
    type: "parallel",
    parentPhaseId: "ecu-final-validation",
  });
  cursor += 21;

  // 7. Gestión Licencia Ayuntamiento — open-ended, 30 days baseline (only for ECU projects)
  if (!isAyto) {
    phases.push({
      id: "license-management",
      label: "Gestión Licencia Ayuntamiento",
      plannedStartDay: cursor,
      plannedDuration: 30,
      actualStartDate: null,
      actualEndDate: null,
      type: "phase",
    });
  }

  return { phases, originDate: origin };
}


/* ------------------------------------------------------------------ */
/*  Component: PhaseTooltip                                            */
/* ------------------------------------------------------------------ */

function PhaseTooltip({ data, originDate }: { data: TooltipData; originDate: Date }) {
  const { phase } = data;
  const plannedStart = addDays(originDate, phase.plannedStartDay);
  const plannedEnd = addDays(originDate, phase.plannedStartDay + phase.plannedDuration);

  const actualDays = phase.actualStartDate && phase.actualEndDate
    ? daysBetween(phase.actualStartDate, phase.actualEndDate)
    : phase.actualStartDate
      ? daysBetween(phase.actualStartDate, new Date())
      : null;

  const diff = actualDays != null ? actualDays - phase.plannedDuration : null;

  return (
    <div
      className="fixed z-50 bg-popover border rounded-lg shadow-lg px-4 py-3 text-sm pointer-events-none max-w-xs"
      style={{ left: data.x, top: data.y - 10, transform: "translate(-50%, -100%)" }}
    >
      <p className="font-semibold text-foreground mb-1.5">{phase.label}</p>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground">Plan. inicio:</span>
        <span>{fmtDate(plannedStart)}</span>
        <span className="text-muted-foreground">Plan. fin:</span>
        <span>{fmtDate(phase.plannedDuration > 0 ? plannedEnd : null)}</span>
        <span className="text-muted-foreground">Duración plan.:</span>
        <span>{phase.plannedDuration > 0 ? `${phase.plannedDuration} días` : "Hito"}</span>
        <span className="text-muted-foreground">Real inicio:</span>
        <span>{fmtDate(phase.actualStartDate)}</span>
        <span className="text-muted-foreground">Real fin:</span>
        <span>{fmtDate(phase.actualEndDate)}</span>
        {actualDays != null && (
          <>
            <span className="text-muted-foreground">Duración real:</span>
            <span>{actualDays} días</span>
          </>
        )}
        {diff != null && diff !== 0 && phase.plannedDuration > 0 && (
          <>
            <span className="text-muted-foreground">Diferencia:</span>
            <span className={cn(diff > 0 ? "text-danger font-medium" : "text-success font-medium")}>
              {diff > 0 ? `+${diff} días (retraso)` : `${diff} días (adelanto)`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: ProjectTimeline                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Date fields config for the edit sheet                             */
/* ------------------------------------------------------------------ */

interface DateFieldConfig {
  key: string;
  label: string;
  group: string;
}

const DATE_FIELD_CONFIGS: DateFieldConfig[] = [
  // Medición
  { key: "draft_order_date", label: "Fecha de Encargo (origen)", group: "Medición" },
  { key: "measurement_date", label: "Fecha de Medición", group: "Medición" },
  // Anteproyecto
  { key: "project_architect_date", label: "Entrega Arquitecto", group: "Anteproyecto" },
  { key: "project_draft_date", label: "Anteproyecto recibido", group: "Anteproyecto" },
  // Proyecto Técnico
  { key: "draft_validation_date", label: "Validación Draft", group: "Proyecto Técnico" },
  { key: "estimated_project_end_date", label: "Fin estimado Proyecto Técnico", group: "Proyecto Técnico" },
  { key: "project_end_date", label: "Fin real Proyecto Técnico", group: "Proyecto Técnico" },
  // ECU / Ayuntamiento
  { key: "ecu_delivery_date", label: "Entrega ECUV / Contacto Ayuntamiento", group: "ECU / Ayuntamiento" },
  { key: "ecu_first_start_date", label: "Inicio 1ª Validación / 1ª Entrega Ayto.", group: "ECU / Ayuntamiento" },
  { key: "ecu_first_end_date", label: "Fin 1ª Validación / 1ª Entrega Ayto.", group: "ECU / Ayuntamiento" },
  // Reparos
  { key: "arch_correction_date", label: "Corrección Arquitecto (fin reparos)", group: "Reparos" },
  // Validación Final
  { key: "ecu_final_start_date", label: "Inicio Validación Final", group: "Validación Final" },
  { key: "ecu_final_end_date", label: "Fin Validación Final", group: "Validación Final" },
];

function toInputDate(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/*  Component: TimelineEditSheet                                       */
/* ------------------------------------------------------------------ */

function TimelineEditSheet({
  open,
  onOpenChange,
  project,
  onRefetch,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: ProjectRow | Record<string, any>;
  onRefetch: () => Promise<void>;
}) {
  const p = project as any;
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    DATE_FIELD_CONFIGS.forEach((f) => { init[f.key] = toInputDate(p[f.key]); });
    return init;
  });

  // Reset values when project changes
  useEffect(() => {
    const init: Record<string, string> = {};
    DATE_FIELD_CONFIGS.forEach((f) => { init[f.key] = toInputDate(p[f.key]); });
    setValues(init);
  }, [project]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, string | null> = { updated_at: new Date().toISOString() };
      DATE_FIELD_CONFIGS.forEach((f) => {
        updates[f.key] = values[f.key] ? values[f.key] : null;
      });
      const { error } = await supabase.from("projects").update(updates).eq("id", p.id);
      if (error) throw new Error(error.message);
      toast.success("Fechas del timeline actualizadas");
      onOpenChange(false);
      await onRefetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Group fields by group label
  const groups = DATE_FIELD_CONFIGS.reduce<Record<string, DateFieldConfig[]>>((acc, f) => {
    if (!acc[f.group]) acc[f.group] = [];
    acc[f.group].push(f);
    return acc;
  }, {});

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Editar fechas del timeline</SheetTitle>
          <p className="text-xs text-muted-foreground">
            Ajusta manualmente las fechas si los datos importados no son correctos. Los cambios solo se guardan en la base de datos local.
          </p>
        </SheetHeader>

        <div className="space-y-6">
          {Object.entries(groups).map(([groupName, fields]) => (
            <div key={groupName}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{groupName}</p>
              <div className="space-y-3">
                {fields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-sm">{f.label}</Label>
                    <Input
                      type="date"
                      value={values[f.key]}
                      onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <SheetFooter className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</> : "Guardar cambios"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: ProjectTimeline                                         */
/* ------------------------------------------------------------------ */

export function ProjectTimeline({
  project,
  canEdit,
  onRefetch,
}: {
  project: ProjectRow | Record<string, any>;
  canEdit?: boolean;
  onRefetch?: () => Promise<void>;
}) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const toggleFullscreen = useCallback(() => setIsFullscreen(prev => !prev), []);

  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isFullscreen]);

  const result = useMemo(() => {
    return buildPhases(project as ProjectRow);
  }, [project]);

  if (!result) {
    return (
      <div className="bg-card rounded-lg border p-8 shadow-sm text-center">
        <p className="text-muted-foreground text-sm">
          El timeline estará disponible cuando se asigne el arquitecto al proyecto.
        </p>
      </div>
    );
  }

  const { phases, originDate } = result;
  const today = new Date();
  const todayDay = daysBetween(originDate, today);

  // Total days to show: max of all planned ends + buffer or today + buffer
  const maxPlannedDay = Math.max(...phases.map(ph => ph.plannedStartDay + ph.plannedDuration));
  const totalDays = Math.max(maxPlannedDay, todayDay) + 14; // 2 week buffer

  const chartWidth = totalDays * DAY_WIDTH;

  // Build week markers
  const weekMarkers: { day: number; label: string }[] = [];
  for (let d = 0; d <= totalDays; d += 7) {
    const markerDate = addDays(originDate, d);
    weekMarkers.push({
      day: d,
      label: markerDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
    });
  }

  // Build month markers
  const monthMarkers: { startDay: number; endDay: number; label: string }[] = [];
  let currentMonth = -1;
  let monthStart = 0;
  for (let d = 0; d <= totalDays; d++) {
    const date = addDays(originDate, d);
    const m = date.getMonth();
    if (m !== currentMonth) {
      if (currentMonth !== -1) {
        monthMarkers.push({
          startDay: monthStart,
          endDay: d,
          label: addDays(originDate, monthStart).toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
        });
      }
      currentMonth = m;
      monthStart = d;
    }
  }
  monthMarkers.push({
    startDay: monthStart,
    endDay: totalDays,
    label: addDays(originDate, monthStart).toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
  });

  const getBarColor = (phase: TimelinePhase): string => {
    if (phase.plannedDuration === 0) return "";
    const actualEnd = phase.actualEndDate ?? today;
    const actualStart = phase.actualStartDate;
    if (!actualStart) return "bg-muted/60";

    const actualDays = daysBetween(actualStart, actualEnd);
    const ratio = actualDays / phase.plannedDuration;

    if (ratio <= 1) return "bg-success/80";
    if (ratio <= 1.2) return "bg-warning/80";
    return "bg-danger/80";
  };

  const handleMouseEnter = (e: React.MouseEvent, phase: TimelinePhase) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      phase,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  // Compute row y-positions
  let yOffset = 0;
  const rowPositions: { phase: TimelinePhase; y: number; height: number }[] = [];
  for (const phase of phases) {
    const h = phase.type === "parallel" ? PARALLEL_ROW_HEIGHT
      : phase.type === "milestone" ? MILESTONE_ROW_HEIGHT
      : ROW_HEIGHT;
    rowPositions.push({ phase, y: yOffset, height: h });
    yOffset += h;
  }
  const totalHeight = yOffset;

  const timelineContent = (fullscreen: boolean) => (
    <div className={cn(
      "bg-card overflow-hidden",
      fullscreen
        ? "fixed inset-0 z-50 flex flex-col"
        : "rounded-lg border shadow-sm",
    )}>
      <div className="px-6 py-4 border-b bg-muted/30 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold">Timeline del proyecto</h2>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && onRefetch && (
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Editar fechas del timeline"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Editar fechas</span>
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title={fullscreen ? "Salir de pantalla completa (Esc)" : "Ver en pantalla completa"}
          >
            {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-b flex flex-wrap gap-4 text-xs text-muted-foreground flex-shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-2.5 rounded-sm bg-muted border border-dashed border-muted-foreground/40" />
          Planeado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-2.5 rounded-sm bg-success/80" />
          En tiempo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-2.5 rounded-sm bg-warning/80" />
          Retraso leve
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-2.5 rounded-sm bg-danger/80" />
          Retraso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rotate-45 border-2 border-brand bg-brand/20" />
          Hito
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-4 bg-brand" />
          Hoy
        </span>
      </div>

      {/* Chart */}
      <div className={cn("overflow-x-auto", fullscreen && "flex-1 overflow-y-auto")}>
        <div className="flex" style={{ minWidth: LABEL_WIDTH + chartWidth }}>

          {/* Labels column */}
          <div
            className="flex-shrink-0 sticky left-0 z-20 bg-card border-r"
            style={{ width: LABEL_WIDTH }}
          >
            {/* Header spacer */}
            <div style={{ height: HEADER_HEIGHT }} className="border-b bg-muted/20" />

            {/* Phase labels */}
            {rowPositions.map(({ phase, height }) => (
              <div
                key={phase.id}
                className={cn(
                  "flex items-center px-4 border-b text-sm",
                  phase.type === "parallel" && "pl-8 text-xs text-muted-foreground",
                  phase.type === "milestone" && "text-xs font-medium",
                  phase.milestoneStyle === "major" && "text-brand dark:text-brand-400 font-semibold text-xs",
                )}
                style={{ height }}
              >
                {phase.type === "milestone" && (
                  <span
                    className={cn(
                      "inline-block w-2 h-2 rotate-45 mr-2 flex-shrink-0",
                      phase.milestoneStyle === "major"
                        ? "border-2 border-brand bg-brand/30"
                        : "border border-muted-foreground bg-muted-foreground/20"
                    )}
                  />
                )}
                <span className="truncate">{phase.label}</span>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 relative" style={{ width: chartWidth }}>

            {/* Month header */}
            <div className="flex border-b bg-muted/20" style={{ height: HEADER_HEIGHT / 2 }}>
              {monthMarkers.map((m, i) => (
                <div
                  key={i}
                  className="text-[10px] text-muted-foreground font-medium px-1 border-r flex items-center capitalize"
                  style={{
                    width: (m.endDay - m.startDay) * DAY_WIDTH,
                    minWidth: 0,
                  }}
                >
                  <span className="truncate">{m.label}</span>
                </div>
              ))}
            </div>

            {/* Week header */}
            <div className="flex border-b bg-muted/10" style={{ height: HEADER_HEIGHT / 2 }}>
              {weekMarkers.map((w, i) => (
                <div
                  key={i}
                  className="text-[9px] text-muted-foreground/70 border-r flex items-center justify-center"
                  style={{ width: 7 * DAY_WIDTH }}
                >
                  {w.label}
                </div>
              ))}
            </div>

            {/* Grid background lines (weeks) */}
            <div className="absolute inset-0" style={{ top: HEADER_HEIGHT }}>
              {weekMarkers.map((w, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-muted/40"
                  style={{ left: w.day * DAY_WIDTH }}
                />
              ))}
            </div>

            {/* Today line */}
            {todayDay >= 0 && todayDay <= totalDays && (
              <div
                className="absolute z-10 top-0 bottom-0 border-l-2 border-brand"
                style={{ left: todayDay * DAY_WIDTH }}
              >
                <span className="absolute -top-0 -translate-x-1/2 text-[9px] font-semibold text-brand bg-card px-1 rounded">
                  Hoy
                </span>
              </div>
            )}

            {/* Phase bars */}
            <div className="relative" style={{ height: totalHeight }}>
              {rowPositions.map(({ phase, y, height }) => {
                if (phase.type === "milestone") {
                  const completed = phase.actualStartDate != null;
                  return (
                    <div
                      key={phase.id}
                      className="absolute flex items-center"
                      style={{
                        top: y,
                        height,
                        left: phase.plannedStartDay * DAY_WIDTH - 6,
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, phase)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div
                        className={cn(
                          "w-3 h-3 rotate-45",
                          phase.milestoneStyle === "major"
                            ? cn("border-2", completed ? "border-brand bg-brand" : "border-brand/50 bg-brand/20")
                            : cn("border", completed ? "border-foreground bg-foreground" : "border-muted-foreground bg-muted-foreground/20"),
                        )}
                      />
                    </div>
                  );
                }

                const barHeight = phase.type === "parallel" ? 10 : 14;
                const barY = y + (height - barHeight) / 2;

                // Planned bar
                const plannedLeft = phase.plannedStartDay * DAY_WIDTH;
                const plannedWidth = phase.plannedDuration * DAY_WIDTH;

                // Actual bar
                let actualLeft = plannedLeft;
                let actualWidth = 0;
                if (phase.actualStartDate) {
                  const startDay = daysBetween(originDate, phase.actualStartDate);
                  actualLeft = startDay * DAY_WIDTH;
                  const endDay = phase.actualEndDate
                    ? daysBetween(originDate, phase.actualEndDate)
                    : todayDay;
                  actualWidth = Math.max(0, (endDay - startDay) * DAY_WIDTH);
                }

                const isInProgress = phase.actualStartDate && !phase.actualEndDate;

                return (
                  <div
                    key={phase.id}
                    className="absolute"
                    style={{ top: barY, height: barHeight }}
                    onMouseEnter={(e) => handleMouseEnter(e, phase)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Planned (ghost) bar */}
                    <div
                      className="absolute rounded-sm bg-muted/50 border border-dashed border-muted-foreground/30"
                      style={{
                        left: plannedLeft,
                        width: plannedWidth,
                        height: barHeight,
                      }}
                    />

                    {/* Actual bar */}
                    {phase.actualStartDate && actualWidth > 0 && (
                      <div
                        className={cn(
                          "absolute rounded-sm transition-all",
                          getBarColor(phase),
                          isInProgress && "animate-pulse",
                        )}
                        style={{
                          left: actualLeft,
                          width: actualWidth,
                          height: barHeight,
                        }}
                      />
                    )}

                    {/* In-progress indicator (striped end) */}
                    {isInProgress && actualWidth > 0 && (
                      <div
                        className="absolute top-0 w-1 rounded-r-sm bg-foreground/20"
                        style={{
                          left: actualLeft + actualWidth - 1,
                          height: barHeight,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && <PhaseTooltip data={tooltip} originDate={originDate} />}
    </div>
  );

  return (
    <>
      {timelineContent(false)}
      {isFullscreen && createPortal(
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={toggleFullscreen} />
          {timelineContent(true)}
        </>,
        document.body,
      )}
      {canEdit && onRefetch && (
        <TimelineEditSheet
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          project={project}
          onRefetch={onRefetch}
        />
      )}
    </>
  );
}
