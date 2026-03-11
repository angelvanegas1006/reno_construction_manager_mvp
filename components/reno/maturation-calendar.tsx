"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Euro,
  FileSignature,
  Filter,
  RefreshCw,
  X,
  Plus,
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
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { toast } from "sonner";

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
  draft_order_date:                { label: "Encargo Anteproyecto",    icon: FileText,     colorClass: "text-blue-500",    borderClass: "border-l-blue-500",    bgClass: "bg-blue-50 dark:bg-blue-950/30",    filterKey: "drafts" as const },
  measurement_date:                { label: "Medición",                icon: Ruler,        colorClass: "text-indigo-500",  borderClass: "border-l-indigo-500",  bgClass: "bg-indigo-50 dark:bg-indigo-950/30",  filterKey: "measurements" as const },
  project_draft_date:              { label: "Borrador Proyecto",       icon: FileText,     colorClass: "text-violet-500",  borderClass: "border-l-violet-500",  bgClass: "bg-violet-50 dark:bg-violet-950/30",  filterKey: "drafts" as const },
  project_start_date:              { label: "Inicio Proyecto",         icon: Hammer,       colorClass: "text-orange-500",  borderClass: "border-l-orange-500",  bgClass: "bg-orange-50 dark:bg-orange-950/30",  filterKey: "projectDates" as const },
  estimated_project_end_date:      { label: "Fin Estimado",           icon: Clock,        colorClass: "text-amber-500",   borderClass: "border-l-amber-500",   bgClass: "bg-amber-50 dark:bg-amber-950/30",   filterKey: "projectDates" as const },
  project_end_date:                { label: "Fin Proyecto",           icon: CalendarCheck, colorClass: "text-green-500",   borderClass: "border-l-green-500",   bgClass: "bg-green-50 dark:bg-green-950/30",   filterKey: "projectDates" as const },
  arras_deadline:                  { label: "Fecha Límite Arras",     icon: Euro,         colorClass: "text-red-500",     borderClass: "border-l-red-500",     bgClass: "bg-red-50 dark:bg-red-950/30",     filterKey: "arras" as const },
  ecu_delivery_date:               { label: "Entrega ECU",           icon: ShieldCheck,  colorClass: "text-teal-500",    borderClass: "border-l-teal-500",    bgClass: "bg-teal-50 dark:bg-teal-950/30",    filterKey: "ecu" as const },
  estimated_first_correction_date: { label: "1ª Corrección Est.",     icon: Clock,        colorClass: "text-cyan-500",    borderClass: "border-l-cyan-500",    bgClass: "bg-cyan-50 dark:bg-cyan-950/30",    filterKey: "corrections" as const },
  first_correction_date:           { label: "1ª Corrección",         icon: CalendarCheck, colorClass: "text-sky-500",     borderClass: "border-l-sky-500",     bgClass: "bg-sky-50 dark:bg-sky-950/30",     filterKey: "corrections" as const },
  definitive_validation_date:      { label: "Validación Definitiva", icon: FileSignature, colorClass: "text-emerald-500", borderClass: "border-l-emerald-500", bgClass: "bg-emerald-50 dark:bg-emerald-950/30", filterKey: "corrections" as const },
  settlement_date:                 { label: "Escrituración",         icon: FileSignature, colorClass: "text-purple-500",  borderClass: "border-l-purple-500",  bgClass: "bg-purple-50 dark:bg-purple-950/30",  filterKey: "arras" as const },
};

const DATE_FIELDS = Object.keys(EVENT_CONFIG) as EventType[];

interface MaturationCalendarProps {
  allProjects: ProjectRow[];
}

export function MaturationCalendar({ allProjects }: MaturationCalendarProps) {
  const router = useRouter();
  const { isConnected, isLoading: gcalLoading, isSyncing, isConfigured, connect, disconnect, sync, canConnect } = useGoogleCalendar();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768 ? "day" : "month";
    }
    return "month";
  });
  const [isMobile, setIsMobile] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("10:00");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [creatingEvent, setCreatingEvent] = useState(false);

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
      if (window.innerWidth < 768 && viewMode !== "day") {
        setViewMode("day");
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [viewMode]);

  const goToPreviousPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const getDateButtonText = () => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    }
    if (viewMode === "week") {
      const start = getWeekStart(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const fmt = (d: Date) => d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
      return `${fmt(start)} – ${fmt(end)}`;
    }
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
    return currentDate.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  };

  const getWeekStart = (d: Date) => {
    const copy = new Date(d);
    const day = copy.getDay();
    const diff = day === 0 ? 6 : day - 1;
    copy.setDate(copy.getDate() - diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const getDateRange = useCallback(() => {
    if (viewMode === "day") {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (viewMode === "week") {
      const start = getWeekStart(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1);
    start.setHours(0, 0, 0, 0);
    const firstDow = start.getDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    start.setDate(start.getDate() - offset);

    const end = new Date(year, month + 1, 0);
    end.setHours(23, 59, 59, 999);
    const lastDow = end.getDay();
    const trailing = lastDow === 0 ? 0 : 7 - lastDow;
    end.setDate(end.getDate() + trailing);

    return { start, end };
  }, [currentDate, viewMode]);

  const handleCreateEvent = async () => {
    if (!newEventTitle.trim() || !newEventDate) {
      toast.error("Título y fecha son obligatorios");
      return;
    }
    if (!isConnected) {
      toast.error("Conecta Google Calendar primero");
      return;
    }
    setCreatingEvent(true);
    try {
      const dateTime = `${newEventDate}T${newEventTime}:00`;
      const startDate = new Date(dateTime);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

      const res = await fetch("/api/google-calendar/sync-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          manualEvent: {
            summary: newEventTitle,
            description: newEventDesc || undefined,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear evento");
      }
      toast.success("Evento creado en Google Calendar");
      setShowCreateEvent(false);
      setNewEventTitle("");
      setNewEventDesc("");
      setNewEventDate("");
      setNewEventTime("10:00");
    } catch (err: any) {
      toast.error(err.message || "Error al crear evento");
    } finally {
      setCreatingEvent(false);
    }
  };

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

  const groupedByHour = useMemo(() => {
    const grouped: Record<number, CalendarEvent[]> = {};
    filteredEvents.forEach((ev) => {
      const hour = ev.date.getHours();
      if (!grouped[hour]) grouped[hour] = [];
      grouped[hour].push(ev);
    });
    return grouped;
  }, [filteredEvents]);

  const groupedByDateKey = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((ev) => {
      const key = ev.date.toISOString().slice(0, 10);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ev);
    });
    return grouped;
  }, [filteredEvents]);

  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  const gridCalendarDays = useMemo(() => {
    if (viewMode === "day") return [];
    const { start, end } = getDateRange();
    const days: Date[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [getDateRange, viewMode]);

  const weekDays = useMemo(() => {
    if (viewMode !== "week") return [];
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate, viewMode]);

  const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

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
            {/* Google Calendar */}
            {canConnect && !gcalLoading && (
              <>
                {isConnected ? (
                  <>
                    <Button onClick={() => { setNewEventDate(currentDate.toISOString().slice(0, 10)); setShowCreateEvent(true); }} variant="outline" size="sm" className="flex-shrink-0">
                      <Plus className="h-3 w-3 mr-1" />
                      <span className="text-xs">Evento</span>
                    </Button>
                    <Button onClick={sync} disabled={isSyncing || !isConfigured} variant="outline" size="sm" className="flex-shrink-0">
                      <RefreshCw className={cn("h-3 w-3 mr-1", isSyncing && "animate-spin")} />
                      <span className="text-xs">{isSyncing ? "Sync..." : "Sync"}</span>
                    </Button>
                    <Button onClick={disconnect} disabled={!isConfigured} variant="ghost" size="sm" className="flex-shrink-0 h-8 px-2">
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => connect()} disabled={!isConfigured} variant="outline" size="sm" className="flex-shrink-0">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span className="text-xs">Google Calendar</span>
                  </Button>
                )}
              </>
            )}

            {!isMobile && (
              <div className="flex gap-1 border rounded-md flex-shrink-0">
                {(["day", "week", "month"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "px-2 md:px-3 py-1 text-xs font-medium rounded-md transition-colors",
                      viewMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {mode === "day" ? "Día" : mode === "week" ? "Semana" : "Mes"}
                  </button>
                ))}
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
                const hourEvents = groupedByHour[hour] || [];
                const now = new Date();
                const isToday = currentDate.toDateString() === now.toDateString();
                const isCurrentHour = isToday && hour === now.getHours();

                return (
                  <div key={hour} className={cn("flex gap-2 md:gap-4 border-b border-border/50 pb-3 md:pb-4 min-w-0 relative", isCurrentHour && "bg-primary/5")}>
                    <div className={cn("w-12 md:w-16 text-xs md:text-sm font-medium flex-shrink-0 pt-1 flex items-start", isCurrentHour ? "text-primary font-semibold" : "text-muted-foreground")}>
                      {isCurrentHour ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          <span>{hour.toString().padStart(2, "0")}:00</span>
                        </div>
                      ) : (
                        <span>{hour.toString().padStart(2, "0")}:00</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      {hourEvents.length === 0 ? (
                        <span className="text-xs text-muted-foreground block py-1">Sin eventos</span>
                      ) : (
                        hourEvents.map((ev) => (
                          <button key={ev.id} onClick={() => setSelectedEvent(ev)} className={cn("w-full flex items-center gap-2 rounded-lg border transition-all text-left min-w-0 bg-card hover:bg-accent hover:border-primary/50 shadow-sm hover:shadow-md active:scale-[0.98]", isMobile ? "px-2 py-1.5 border-1" : "px-3 md:px-4 py-2.5 md:py-3 border-2")}>
                            <div className="flex-shrink-0">
                              <div className={cn("flex items-center justify-center", isMobile ? "w-6 h-6" : "w-8 h-8")}>{getEventIcon(ev.type)}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={cn("font-semibold text-foreground line-clamp-1 break-words", isMobile ? "text-xs" : "text-sm md:text-base")}>{ev.projectName}</div>
                              <div className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs md:text-sm")}>{ev.label}</div>
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
        ) : viewMode === "week" ? (
          /* ---- WEEK VIEW ---- */
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 border-b mb-1">
              {weekDays.map((day) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={day.toISOString()} className={cn("text-center py-2", isToday && "bg-primary/5")}>
                    <div className="text-xs font-semibold text-muted-foreground">{WEEKDAY_LABELS[weekDays.indexOf(day)]}</div>
                    <div className={cn("text-sm font-bold mt-0.5", isToday ? "text-primary" : "text-foreground")}>{day.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr gap-px bg-border/30">
              {weekDays.map((day) => {
                const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                const dayEvents = groupedByDateKey[key] || [];
                const isToday = day.toDateString() === new Date().toDateString();
                const MAX_VISIBLE = 4;
                const visibleEvents = dayEvents.slice(0, MAX_VISIBLE);
                const overflow = dayEvents.length - MAX_VISIBLE;

                return (
                  <div key={key} className={cn("bg-card p-1.5 min-h-[200px] flex flex-col gap-1", isToday && "ring-1 ring-primary/30 bg-primary/5")}>
                    {visibleEvents.map((ev) => {
                      const cfg = EVENT_CONFIG[ev.type as EventType];
                      const Icon = cfg?.icon ?? Calendar;
                      return (
                        <button key={ev.id} onClick={() => setSelectedEvent(ev)} className={cn("w-full text-left rounded-md transition-all group border-l-[3px] pl-1.5 pr-1 py-1 hover:shadow-md hover:scale-[1.02]", cfg?.borderClass ?? "border-l-muted-foreground", cfg?.bgClass ?? "bg-muted/40")} title={`${ev.projectName} — ${ev.label}`}>
                          <div className="flex items-center gap-1 mb-0.5">
                            <Icon className={cn("h-3 w-3 flex-shrink-0", cfg?.colorClass ?? "text-muted-foreground")} />
                            <span className={cn("text-[10px] font-semibold truncate", cfg?.colorClass ?? "text-muted-foreground")}>{ev.label}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate leading-tight group-hover:text-foreground transition-colors">{ev.projectName}</div>
                        </button>
                      );
                    })}
                    {overflow > 0 && (
                      <button onClick={() => setSelectedDayEvents({ date: day, events: dayEvents })} className="w-full text-center text-[10px] font-medium text-primary hover:underline cursor-pointer py-0.5 rounded hover:bg-primary/5 transition-colors">+{overflow} más</button>
                    )}
                    {dayEvents.length === 0 && <span className="text-[10px] text-muted-foreground/40 text-center mt-4">—</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ---- MONTH VIEW ---- */
          <div>
            <div className="grid grid-cols-7 border-b mb-1">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="text-center text-xs font-semibold text-muted-foreground py-2">{label}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr">
              {gridCalendarDays.map((day, idx) => {
                const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                const dayEvents = groupedByDateKey[key] || [];
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = day.toDateString() === new Date().toDateString();
                const MAX_VISIBLE_MONTH = 2;
                const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_MONTH);
                const overflow = dayEvents.length - MAX_VISIBLE_MONTH;

                return (
                  <div key={idx} className={cn("border border-border/30 p-1 md:p-1.5 min-h-[100px] md:min-h-[130px] flex flex-col", !isCurrentMonth && "bg-muted/20", isToday && "bg-primary/5 ring-1 ring-primary/30")}>
                    <div className={cn("text-[11px] font-medium mb-1 text-right pr-0.5", isToday ? "text-primary font-bold" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/60")}>
                      {isToday ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">{day.getDate()}</span>
                      ) : (
                        day.getDate()
                      )}
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {visibleEvents.map((ev) => {
                        const cfg = EVENT_CONFIG[ev.type as EventType];
                        const Icon = cfg?.icon ?? Calendar;
                        return (
                          <button key={ev.id} onClick={() => setSelectedEvent(ev)} className={cn("w-full text-left rounded-md transition-all group border-l-[3px] pl-1.5 pr-1 py-1 hover:shadow-md hover:scale-[1.02]", cfg?.borderClass ?? "border-l-muted-foreground", cfg?.bgClass ?? "bg-muted/40")} title={`${ev.projectName} — ${ev.label}`}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <Icon className={cn("h-3 w-3 flex-shrink-0", cfg?.colorClass ?? "text-muted-foreground")} />
                              <span className={cn("text-[10px] font-semibold truncate", cfg?.colorClass ?? "text-muted-foreground")}>{ev.label}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate leading-tight group-hover:text-foreground transition-colors">{ev.projectName}</div>
                          </button>
                        );
                      })}
                      {overflow > 0 && (
                        <button onClick={() => setSelectedDayEvents({ date: day, events: dayEvents })} className="w-full text-center text-[10px] font-medium text-primary hover:underline cursor-pointer py-0.5 rounded hover:bg-primary/5 transition-colors">+{overflow} más</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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

        {selectedDayEvents && (
          <Dialog open={!!selectedDayEvents} onOpenChange={() => setSelectedDayEvents(null)}>
            <DialogContent className="sm:max-w-[550px] w-[95vw] md:w-full max-h-[85vh] md:max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  Eventos del{" "}
                  {selectedDayEvents.date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 mt-4">
                {selectedDayEvents.events.map((ev) => {
                  const cfg = EVENT_CONFIG[ev.type as EventType];
                  const Icon = cfg?.icon ?? Calendar;
                  return (
                    <button key={ev.id} onClick={() => { setSelectedDayEvents(null); setSelectedEvent(ev); }} className={cn("w-full flex items-center gap-3 rounded-lg transition-all text-left border-l-4 pl-3 pr-4 py-3 hover:shadow-md active:scale-[0.98]", cfg?.borderClass ?? "border-l-muted-foreground", cfg?.bgClass ?? "bg-muted/40")}>
                      <div className="flex-shrink-0">
                        <Icon className={cn("h-4 w-4", cfg?.colorClass ?? "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground line-clamp-1">{ev.projectName}</div>
                        <div className={cn("text-xs font-medium", cfg?.colorClass ?? "text-muted-foreground")}>{ev.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedDayEvents(null)}>Cerrar</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Create event dialog */}
        <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
          <DialogContent className="sm:max-w-[450px] w-[95vw]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Crear evento en Google Calendar
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="Ej: Reunión con arquitecto" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Fecha *</Label>
                  <Input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input type="time" value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={newEventDesc} onChange={(e) => setNewEventDesc(e.target.value)} placeholder="Notas adicionales..." rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setShowCreateEvent(false)}>Cancelar</Button>
                <Button onClick={handleCreateEvent} disabled={creatingEvent}>
                  {creatingEvent ? "Creando..." : "Crear evento"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
