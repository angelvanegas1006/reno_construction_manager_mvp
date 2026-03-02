"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Ruler,
  Hammer,
  CalendarCheck,
  ShieldCheck,
  Gavel,
  FileSignature,
  Filter,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MATURATION_PHASE_LABELS } from "@/lib/reno-kanban-config";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";

interface CalendarEvent {
  id: string;
  projectId: string;
  projectName: string;
  date: Date;
  dateStr: string;
  type: string;
  label: string;
  phase?: string;
}

type EventType = keyof typeof EVENT_CONFIG;

const EVENT_CONFIG = {
  draft_order_date:                { label: "Encargo Anteproyecto",    icon: FileText,     colorClass: "text-blue-500",    filterKey: "drafts" as const },
  measurement_date:                { label: "Medición",                icon: Ruler,        colorClass: "text-indigo-500",  filterKey: "measurements" as const },
  project_draft_date:              { label: "Borrador Proyecto",       icon: FileText,     colorClass: "text-violet-500",  filterKey: "drafts" as const },
  project_start_date:              { label: "Inicio Proyecto",         icon: Hammer,       colorClass: "text-orange-500",  filterKey: "projectDates" as const },
  estimated_project_end_date:      { label: "Fin Estimado",           icon: Clock,        colorClass: "text-amber-500",   filterKey: "projectDates" as const },
  project_end_date:                { label: "Fin Proyecto",           icon: CalendarCheck, colorClass: "text-green-500",   filterKey: "projectDates" as const },
  arras_deadline:                  { label: "Fecha Límite Arras",     icon: Gavel,        colorClass: "text-red-500",     filterKey: "arras" as const },
  ecu_delivery_date:               { label: "Entrega ECU",           icon: ShieldCheck,  colorClass: "text-teal-500",    filterKey: "ecu" as const },
  estimated_first_correction_date: { label: "1ª Corrección Est.",     icon: Clock,        colorClass: "text-cyan-500",    filterKey: "corrections" as const },
  first_correction_date:           { label: "1ª Corrección",         icon: CalendarCheck, colorClass: "text-sky-500",     filterKey: "corrections" as const },
  definitive_validation_date:      { label: "Validación Definitiva", icon: FileSignature, colorClass: "text-emerald-500", filterKey: "corrections" as const },
  settlement_date:                 { label: "Escrituración",         icon: FileSignature, colorClass: "text-purple-500",  filterKey: "arras" as const },
};

const DATE_FIELDS = Object.keys(EVENT_CONFIG) as EventType[];

interface MaturationCalendarProps {
  allProjects: ProjectRow[];
}

export function MaturationCalendar({ allProjects }: MaturationCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768 ? "day" : "week";
    }
    return "week";
  });
  const [isMobile, setIsMobile] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  const [filters, setFilters] = useState({
    drafts: true,
    measurements: true,
    projectDates: true,
    arras: true,
    ecu: true,
    corrections: true,
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768 && viewMode === "week") {
        setViewMode("day");
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [viewMode]);

  const goToPreviousPeriod = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (viewMode === "day" ? -1 : -7));
    setCurrentDate(newDate);
  };

  const goToNextPeriod = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (viewMode === "day" ? 1 : 7));
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const getDateButtonText = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const curr = new Date(currentDate);
    curr.setHours(0, 0, 0, 0);

    if (curr.getTime() === today.getTime()) return "Hoy";
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (curr.getTime() === tomorrow.getTime()) return "Mañana";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (curr.getTime() === yesterday.getTime()) return "Ayer";

    return currentDate.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const getDateRange = useCallback(() => {
    if (viewMode === "day") {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    const start = new Date(currentDate);
    const dayOfWeek = start.getDay();
    const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [currentDate, viewMode]);

  const allEvents = useMemo(() => {
    const { start, end } = getDateRange();
    const result: CalendarEvent[] = [];

    for (const p of allProjects) {
      const proj = p as any;
      for (const field of DATE_FIELDS) {
        const raw = proj[field];
        if (!raw || typeof raw !== "string") continue;
        const d = new Date(raw);
        if (isNaN(d.getTime())) continue;
        d.setHours(12, 0, 0, 0);
        if (d < start || d > end) continue;
        result.push({
          id: `${p.id}-${field}`,
          projectId: p.id,
          projectName: p.name || "Sin nombre",
          date: d,
          dateStr: raw,
          type: field,
          label: EVENT_CONFIG[field].label,
          phase: p.reno_phase ?? undefined,
        });
      }
    }

    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [allProjects, getDateRange]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      const cfg = EVENT_CONFIG[ev.type as EventType];
      if (!cfg) return true;
      return filters[cfg.filterKey];
    });
  }, [allEvents, filters]);

  const groupedEvents = useMemo(() => {
    if (viewMode === "day") {
      const grouped: Record<number, CalendarEvent[]> = {};
      filteredEvents.forEach((ev) => {
        const hour = ev.date.getHours();
        if (!grouped[hour]) grouped[hour] = [];
        grouped[hour].push(ev);
      });
      return grouped;
    }
    const grouped: Record<number, CalendarEvent[]> = {};
    filteredEvents.forEach((ev) => {
      const dayOfWeek = ev.date.getDay();
      const adjusted = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      if (adjusted >= 0 && adjusted <= 4) {
        if (!grouped[adjusted]) grouped[adjusted] = [];
        grouped[adjusted].push(ev);
      }
    });
    return grouped;
  }, [filteredEvents, viewMode]);

  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  const weekDays = useMemo(() => {
    const { start } = getDateRange();
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const dow = day.getDay();
      if (dow !== 0 && dow !== 6) days.push(day);
    }
    return days;
  }, [getDateRange]);

  const getEventIcon = (type: string) => {
    const cfg = EVENT_CONFIG[type as EventType];
    if (!cfg) return <Calendar className="h-4 w-4 text-muted-foreground" />;
    const Icon = cfg.icon;
    return <Icon className={cn("h-4 w-4", cfg.colorClass)} />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card className="bg-card w-full">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base md:text-lg font-semibold">
              Calendario de Fechas
            </CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Fechas relevantes de los proyectos de maduración
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {!isMobile && (
              <div className="flex gap-1 border rounded-md flex-shrink-0">
                <button
                  onClick={() => setViewMode("day")}
                  className={cn(
                    "px-2 md:px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    viewMode === "day"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Día
                </button>
                <button
                  onClick={() => setViewMode("week")}
                  className={cn(
                    "px-2 md:px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    viewMode === "week"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Semana
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={goToPreviousPeriod}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors",
                  "px-2 md:px-3 py-1 text-xs font-medium h-auto"
                )}
              >
                <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
              </button>
              <button
                onClick={goToToday}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors",
                  "px-2 md:px-3 py-1 text-xs font-medium h-auto min-w-[60px] md:min-w-[80px]"
                )}
              >
                {getDateButtonText()}
              </button>
              <button
                onClick={goToNextPeriod}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors",
                  "px-2 md:px-3 py-1 text-xs font-medium h-auto"
                )}
              >
                <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 md:gap-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Filtros:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.drafts}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({ ...prev, drafts: checked === true }))
                }
              />
              <span className="text-xs text-foreground">
                Borradores
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.measurements}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({
                    ...prev,
                    measurements: checked === true,
                  }))
                }
              />
              <span className="text-xs text-foreground">Mediciones</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.projectDates}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({
                    ...prev,
                    projectDates: checked === true,
                  }))
                }
              />
              <span className="text-xs text-foreground">
                Fechas de proyecto
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.arras}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({ ...prev, arras: checked === true }))
                }
              />
              <span className="text-xs text-foreground">
                Arras / Escrituración
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.ecu}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({ ...prev, ecu: checked === true }))
                }
              />
              <span className="text-xs text-foreground">ECU</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.corrections}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({
                    ...prev,
                    corrections: checked === true,
                  }))
                }
              />
              <span className="text-xs text-foreground">
                Correcciones / Validaciones
              </span>
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === "day" ? (
          <div className="relative max-h-[500px] md:max-h-[750px] overflow-y-auto">
            <div className="space-y-0">
              {hours.map((hour) => {
                const hourEvents = groupedEvents[hour] || [];
                const now = new Date();
                const isToday =
                  currentDate.toDateString() === now.toDateString();
                const isCurrentHour = isToday && hour === now.getHours();

                return (
                  <div
                    key={hour}
                    className={cn(
                      "flex gap-2 md:gap-4 border-b border-border/50 pb-3 md:pb-4 min-w-0 relative",
                      isCurrentHour && "bg-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 md:w-16 text-xs md:text-sm font-medium flex-shrink-0 pt-1 flex items-start",
                        isCurrentHour
                          ? "text-primary font-semibold"
                          : "text-muted-foreground"
                      )}
                    >
                      {isCurrentHour ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          <span>
                            {hour.toString().padStart(2, "0")}:00
                          </span>
                        </div>
                      ) : (
                        <span>
                          {hour.toString().padStart(2, "0")}:00
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      {hourEvents.length === 0 ? (
                        <span className="text-xs text-muted-foreground block py-1">
                          Sin eventos
                        </span>
                      ) : (
                        hourEvents.map((ev) => (
                          <button
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className={cn(
                              "w-full flex items-center gap-2 rounded-lg",
                              "border transition-all text-left min-w-0",
                              "bg-card hover:bg-accent hover:border-primary/50",
                              "shadow-sm hover:shadow-md",
                              "active:scale-[0.98]",
                              isMobile
                                ? "px-2 py-1.5 border-1"
                                : "px-3 md:px-4 py-2.5 md:py-3 border-2"
                            )}
                          >
                            <div className="flex-shrink-0">
                              <div
                                className={cn(
                                  "flex items-center justify-center",
                                  isMobile ? "w-6 h-6" : "w-8 h-8"
                                )}
                              >
                                {getEventIcon(ev.type)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div
                                  className={cn(
                                    "font-semibold text-foreground line-clamp-1 break-words",
                                    isMobile
                                      ? "text-xs"
                                      : "text-sm md:text-base"
                                  )}
                                >
                                  {ev.projectName}
                                </div>
                                <div
                                  className={cn(
                                    "text-muted-foreground",
                                    isMobile
                                      ? "text-[10px]"
                                      : "text-xs md:text-sm"
                                  )}
                                >
                                  {ev.label}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "flex md:grid gap-2 overflow-x-auto pb-2",
                "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
                isMobile
                  ? "flex-row snap-x snap-mandatory"
                  : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
              )}
            >
              {weekDays.map((day, dayIndex) => {
                const dayOfWeek = day.getDay();
                const originalIndex =
                  dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const dayEvents = groupedEvents[originalIndex] || [];
                const isToday =
                  day.toDateString() === new Date().toDateString();

                const sortedEvents = [...dayEvents].sort(
                  (a, b) => a.date.getTime() - b.date.getTime()
                );

                const MAX_VISIBLE = 5;
                const hasOverflow = sortedEvents.length > MAX_VISIBLE;

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "border rounded-lg p-3 md:p-4 flex flex-col",
                      isMobile
                        ? "min-w-[calc(100vw-2rem)] snap-start"
                        : "min-w-0",
                      isToday &&
                        "border-primary bg-primary/5 ring-2 ring-primary/20"
                    )}
                  >
                    <div
                      className={cn(
                        "text-sm md:text-xs font-semibold mb-3 md:mb-2 flex-shrink-0",
                        isToday && "text-primary"
                      )}
                    >
                      <div className="text-xs text-muted-foreground mb-0.5">
                        {day.toLocaleDateString("es-ES", {
                          weekday: "long",
                        })}
                      </div>
                      <div className="text-lg md:text-base">
                        {day.toLocaleDateString("es-ES", {
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "space-y-2 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
                        !isCalendarExpanded &&
                          !isMobile &&
                          "max-h-[310px]",
                        isMobile && "min-h-[350px]"
                      )}
                    >
                      {sortedEvents.length === 0 ? (
                        <span className="text-xs text-muted-foreground block py-2">
                          Sin eventos
                        </span>
                      ) : (
                        sortedEvents.map((ev) => (
                          <button
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className={cn(
                              "w-full flex items-start gap-2 px-3 py-2.5 rounded-lg",
                              "border-2 transition-all text-left",
                              "bg-card hover:bg-accent hover:border-primary/50",
                              "shadow-sm hover:shadow-md",
                              "active:scale-[0.98]"
                            )}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {getEventIcon(ev.type)}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs md:text-sm font-semibold text-foreground line-clamp-2 break-words">
                                  {ev.projectName}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {ev.label}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    {!isCalendarExpanded &&
                      hasOverflow &&
                      !isMobile && (
                        <div className="pt-1 text-center">
                          <span className="text-[10px] text-muted-foreground">
                            +{sortedEvents.length - MAX_VISIBLE} más
                          </span>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
            {!isMobile && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() =>
                    setIsCalendarExpanded(!isCalendarExpanded)
                  }
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted"
                >
                  {isCalendarExpanded ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5" />
                      Contraer calendario
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5" />
                      Expandir calendario completo
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Modal de detalles */}
        {selectedEvent && (
          <Dialog
            open={!!selectedEvent}
            onOpenChange={() => setSelectedEvent(null)}
          >
            <DialogContent className="sm:max-w-[500px] w-[95vw] md:w-full max-h-[85vh] md:max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
                  {getEventIcon(selectedEvent.type)}
                  <span className="break-words">
                    {selectedEvent.label}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Proyecto</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {selectedEvent.projectName}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(selectedEvent.dateStr)}</span>
                  </div>
                </div>

                {selectedEvent.phase && (
                  <div className="space-y-2">
                    <Label>Fase actual</Label>
                    <div className="text-sm bg-muted p-3 rounded-md">
                      {MATURATION_PHASE_LABELS[selectedEvent.phase] ||
                        selectedEvent.phase}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedEvent(null)}
                  >
                    Cerrar
                  </Button>
                  <Button
                    onClick={() => {
                      router.push(
                        `/reno/maturation-analyst/project/${selectedEvent.projectId}?from=maturation-home`
                      );
                      setSelectedEvent(null);
                    }}
                  >
                    Ver Proyecto
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
