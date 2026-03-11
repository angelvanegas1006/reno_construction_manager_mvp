"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Video, ExternalLink, MapPin,
  Trash2, Pencil, X, Clock, Users, CalendarDays, Loader2, Eye, EyeOff,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CalendarEvent, CreateEventInput } from "@/hooks/useCalendarEvents";
import type { TeamMember, MemberAvailability, BusySlot } from "@/hooks/useTeamAvailability";
import { getEmailName, getRoleLabel } from "@/hooks/useTeamAvailability";

type ViewMode = "month" | "week" | "day";

interface FullCalendarProps {
  events: CalendarEvent[];
  loading?: boolean;
  onRangeChange: (start: Date, end: Date) => void;
  onCreateEvent: (input: CreateEventInput) => Promise<any>;
  onUpdateEvent: (googleEventId: string, input: CreateEventInput) => Promise<boolean>;
  onDeleteEvent: (googleEventId: string) => Promise<boolean>;
  teamMembers?: TeamMember[];
  availability?: MemberAvailability[];
  loadingTeam?: boolean;
  loadingBusy?: boolean;
  selectedTeamEmails?: string[];
  onToggleTeamMember?: (email: string) => void;
  onToggleAvailabilityPanel?: () => void;
  showAvailability?: boolean;
}

const HOUR_HEIGHT = 60;
const START_HOUR = 8;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function formatDateInput(d: Date): string {
  return d.toISOString().slice(0, 16);
}

function getMonthGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const startDay = startOfWeek(firstDay);
  const weeks: Date[][] = [];
  const cursor = new Date(startDay);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor.getMonth() !== month && cursor.getDate() > 7) break;
  }
  return weeks;
}

// ─── Overlap layout: assign column index & total columns to concurrent events ──

interface LayoutedEvent {
  event: CalendarEvent;
  startMin: number;
  endMin: number;
  col: number;
  totalCols: number;
}

function layoutOverlappingEvents(evts: CalendarEvent[]): LayoutedEvent[] {
  if (evts.length === 0) return [];

  const items = evts.map((e) => ({
    event: e,
    startMin: e.start.getHours() * 60 + e.start.getMinutes(),
    endMin: Math.max(e.end.getHours() * 60 + e.end.getMinutes(), e.start.getHours() * 60 + e.start.getMinutes() + 22),
    col: 0,
    totalCols: 1,
  }));

  items.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

  const groups: LayoutedEvent[][] = [];

  for (const item of items) {
    let placed = false;
    for (const group of groups) {
      const overlaps = group.some((g) => item.startMin < g.endMin && item.endMin > g.startMin);
      if (overlaps) {
        item.col = group.length;
        group.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      item.col = 0;
      groups.push([item]);
    }
  }

  for (const group of groups) {
    for (const item of group) {
      item.totalCols = group.length;
    }
  }

  return items;
}

// ─── Event Form Dialog ─────────────────────────────────────────────────────────

interface EventFormState {
  summary: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  allDay: boolean;
  location: string;
  addMeet: boolean;
  attendeesStr: string;
}

function EventFormDialog({
  open, onClose, onSubmit, initial, isEdit, isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EventFormState) => void;
  initial?: Partial<EventFormState>;
  isEdit?: boolean;
  isSubmitting?: boolean;
}) {
  const [form, setForm] = useState<EventFormState>({
    summary: initial?.summary || "",
    description: initial?.description || "",
    startDateTime: initial?.startDateTime || formatDateInput(new Date()),
    endDateTime: initial?.endDateTime || formatDateInput(new Date(Date.now() + 3600000)),
    allDay: initial?.allDay || false,
    location: initial?.location || "",
    addMeet: initial?.addMeet || false,
    attendeesStr: initial?.attendeesStr || "",
  });

  useEffect(() => {
    if (open && initial) {
      setForm({
        summary: initial.summary || "",
        description: initial.description || "",
        startDateTime: initial.startDateTime || formatDateInput(new Date()),
        endDateTime: initial.endDateTime || formatDateInput(new Date(Date.now() + 3600000)),
        allDay: initial.allDay || false,
        location: initial.location || "",
        addMeet: initial.addMeet || false,
        attendeesStr: initial.attendeesStr || "",
      });
    }
  }, [open, initial]);

  const set = (k: keyof EventFormState, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4.5 w-4.5 text-primary" />
            {isEdit ? "Editar evento" : "Nuevo evento"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Título</Label>
            <Input value={form.summary} onChange={(e) => set("summary", e.target.value)} placeholder="Título del evento" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Inicio</Label>
              <Input type={form.allDay ? "date" : "datetime-local"} value={form.allDay ? form.startDateTime.slice(0, 10) : form.startDateTime} onChange={(e) => set("startDateTime", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Fin</Label>
              <Input type={form.allDay ? "date" : "datetime-local"} value={form.allDay ? form.endDateTime.slice(0, 10) : form.endDateTime} onChange={(e) => set("endDateTime", e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-3 py-1">
            <Switch checked={form.allDay} onCheckedChange={(v) => set("allDay", v)} />
            <Label className="text-xs font-medium">Todo el día</Label>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Ubicación</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Ubicación (opcional)" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Descripción</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Descripción (opcional)" className="mt-1" />
          </div>
          <div className="flex items-center gap-3 py-1 px-3 rounded-lg bg-muted/40 border border-border/40">
            <Switch checked={form.addMeet} onCheckedChange={(v) => set("addMeet", v)} />
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-blue-500" /> Añadir Google Meet
            </Label>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Invitados (emails separados por coma)</Label>
            <Input value={form.attendeesStr} onChange={(e) => set("attendeesStr", e.target.value)} placeholder="a@example.com, b@example.com" className="mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" disabled={!form.summary.trim() || isSubmitting} onClick={() => onSubmit(form)}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {isEdit ? "Guardar" : "Crear evento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Event Detail Dialog ────────────────────────────────────────────────────────

function EventDetailDialog({
  event, open, onClose, onEdit, onDelete,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!event) return null;
  const isGoogle = event.source === "google";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">{event.title}</DialogTitle>
        <div className="h-2 w-full" style={{ backgroundColor: event.color }} />
        <div className="px-6 pt-4 pb-5 space-y-4">
          <div>
            <div className="flex items-start gap-3">
              <div className="w-3.5 h-3.5 rounded-sm mt-1 flex-shrink-0 shadow-sm" style={{ backgroundColor: event.color }} />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold leading-snug">{event.title}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                    {event.source === "google" ? "Google Calendar" : "Evento interno"}
                  </Badge>
                  {event.meetLink && (
                    <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0">
                      <Video className="h-2.5 w-2.5 mr-0.5" /> Meet
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm">
              <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              {event.allDay ? (
                <span className="font-medium">{event.start.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</span>
              ) : (
                <span>
                  <span className="font-medium">{event.start.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}</span>
                  <span className="text-muted-foreground mx-1.5">·</span>
                  <span className="tabular-nums">{formatTime(event.start)} – {formatTime(event.end)}</span>
                </span>
              )}
            </div>

            {event.location && (
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{event.location}</span>
              </div>
            )}

            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-2.5 text-sm">
                <Users className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {event.attendees.map((a) => (
                    <Badge key={a.email} variant="secondary" className="text-[10px] font-normal">{a.displayName || a.email}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {event.description && (
            <div className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/40 rounded-lg p-3 border border-border/30">
              {event.description}
            </div>
          )}

          {event.meetLink && (
            <a
              href={event.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors text-sm font-medium"
            >
              <Video className="h-4 w-4" /> Unirse a Google Meet
              <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
            </a>
          )}

          {event.htmlLink && !event.meetLink && (
            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> Abrir en Google Calendar
            </a>
          )}

          {event.appMeta && (
            <Badge variant="outline" className="text-[10px]">{event.appMeta.type}{event.appMeta.projectName ? ` · ${event.appMeta.projectName}` : ""}</Badge>
          )}

          {isGoogle && (
            <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
              {event.htmlLink && event.meetLink && (
                <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="mr-auto">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-8 gap-1">
                    <ExternalLink className="h-3 w-3" /> Google Calendar
                  </Button>
                </a>
              )}
              <Button variant="outline" size="sm" onClick={onEdit} className="h-8 gap-1">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete} className="h-8 gap-1 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Now-line ───────────────────────────────────────────────────────────────────

function NowLine() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const mins = now.getHours() * 60 + now.getMinutes();
  const pct = (mins / 1440) * 100;
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${pct}%` }}>
      <div className="flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 shadow-sm shadow-red-500/30" />
        <div className="flex-1 h-[2px] bg-red-500 shadow-sm shadow-red-500/20" />
      </div>
    </div>
  );
}

// ─── Event Chip (Month / All-day row) ─────────────────────────────────────────

function EventChip({ event, onClick, compact }: { event: CalendarEvent; onClick: () => void; compact?: boolean }) {
  const hasTime = !event.allDay && !compact;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "text-left rounded-md w-full transition-all group",
        "hover:shadow-sm hover:brightness-95 dark:hover:brightness-110",
        compact ? "px-1 py-px" : "px-1.5 py-0.5",
      )}
      style={{
        backgroundColor: event.color + "18",
        borderLeft: `3px solid ${event.color}`,
      }}
      title={event.title}
    >
      <div className="flex items-center gap-1 min-w-0">
        {hasTime && (
          <span className="text-[9px] tabular-nums font-medium flex-shrink-0 opacity-60" style={{ color: event.color }}>
            {formatTime(event.start)}
          </span>
        )}
        <span
          className={cn(
            "truncate font-medium leading-tight",
            compact ? "text-[9px]" : "text-[10px]",
          )}
          style={{ color: event.color }}
        >
          {event.title}
        </span>
        {event.meetLink && <Video className="h-2.5 w-2.5 flex-shrink-0 opacity-50" style={{ color: event.color }} />}
      </div>
    </button>
  );
}

// ─── Timed Event Block (Week / Day grids) ───────────────────────────────────────

function TimedEventBlock({ event, onClick, height, col, totalCols }: {
  event: CalendarEvent;
  onClick: () => void;
  height: number;
  col: number;
  totalCols: number;
}) {
  const showTime = height > 28;
  const showMeet = height > 42 && !!event.meetLink;
  const showLocation = height > 56 && !!event.location;

  const GAP = 2;
  const widthPct = (1 / totalCols) * 100;
  const leftPct = col * widthPct;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "absolute rounded-md overflow-hidden cursor-pointer z-10",
        "border-l-[3px] transition-all",
        "hover:shadow-md hover:brightness-95 dark:hover:brightness-110",
      )}
      style={{
        top: `${event.start.getHours() * 60 + event.start.getMinutes()}px`,
        height: `${height}px`,
        left: `calc(${leftPct}% + ${GAP}px)`,
        width: `calc(${widthPct}% - ${GAP * 2}px)`,
        backgroundColor: event.color + "15",
        borderLeftColor: event.color,
      }}
    >
      <div className="px-1.5 py-0.5 h-full flex flex-col min-w-0">
        <div className="truncate font-semibold text-[11px] leading-tight" style={{ color: event.color }}>
          {event.title}
        </div>
        {showTime && (
          <div className="text-[9px] tabular-nums mt-0.5 opacity-70" style={{ color: event.color }}>
            {formatTime(event.start)} – {formatTime(event.end)}
          </div>
        )}
        {showMeet && (
          <div className="flex items-center gap-1 mt-auto text-[9px] font-medium opacity-60" style={{ color: event.color }}>
            <Video className="h-2.5 w-2.5" /> Meet
          </div>
        )}
        {showLocation && (
          <div className="flex items-center gap-1 text-[9px] opacity-50 truncate" style={{ color: event.color }}>
            <MapPin className="h-2.5 w-2.5 flex-shrink-0" /> {event.location}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── MONTH VIEW ─────────────────────────────────────────────────────────────────

function MonthView({
  currentDate, events, onDayClick, onEventClick,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const weeks = useMemo(() => getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);
  const today = new Date();

  const eventsForDay = useCallback((day: Date) => {
    return events.filter((e) => {
      if (e.allDay) {
        const s = new Date(e.start); s.setHours(0, 0, 0, 0);
        const en = new Date(e.end); en.setHours(0, 0, 0, 0);
        const d = new Date(day); d.setHours(0, 0, 0, 0);
        return d >= s && d < en;
      }
      return isSameDay(e.start, day);
    });
  }, [events]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/20">
        {DAYS_ES.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-2.5 uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-rows-[repeat(auto-fill,minmax(0,1fr))]">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border/20 min-h-[100px]">
            {week.map((day, di) => {
              const isToday = isSameDay(day, today);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const dayEvents = eventsForDay(day);
              const maxShow = 3;
              const overflow = dayEvents.length - maxShow;

              return (
                <div
                  key={di}
                  onClick={() => onDayClick(day)}
                  className={cn(
                    "border-r border-border/20 last:border-r-0 p-1.5 cursor-pointer transition-colors",
                    "hover:bg-accent/30",
                    !isCurrentMonth && "bg-muted/10",
                    isToday && "bg-primary/[0.04]",
                  )}
                >
                  <div className={cn(
                    "text-[11px] font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                    isToday && "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
                    !isToday && isCurrentMonth && "text-foreground",
                    !isToday && !isCurrentMonth && "text-muted-foreground/50",
                  )}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, maxShow).map((ev) => (
                      <EventChip key={ev.id} event={ev} onClick={() => onEventClick(ev)} compact />
                    ))}
                    {overflow > 0 && (
                      <button
                        className="text-[9px] text-primary font-medium hover:underline pl-1 mt-0.5"
                        onClick={(e) => { e.stopPropagation(); onDayClick(day); }}
                      >
                        +{overflow} más
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Team availability colors ───────────────────────────────────────────────────

const TEAM_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e",
];

function getTeamColor(idx: number): string {
  return TEAM_COLORS[idx % TEAM_COLORS.length];
}

// ─── Busy overlay block for a single member ─────────────────────────────────────

function BusyBlock({ slot, color, label, col, totalCols }: {
  slot: BusySlot;
  color: string;
  label: string;
  col: number;
  totalCols: number;
}) {
  const topMin = slot.start.getHours() * 60 + slot.start.getMinutes();
  const botMin = slot.end.getHours() * 60 + slot.end.getMinutes();
  const height = Math.max(botMin - topMin, 10);
  const widthPct = (1 / totalCols) * 100;
  const leftPct = col * widthPct;

  return (
    <div
      className="absolute rounded-sm pointer-events-none z-[5] border"
      style={{
        top: `${topMin}px`,
        height: `${height}px`,
        left: `calc(${leftPct}% + 1px)`,
        width: `calc(${widthPct}% - 2px)`,
        backgroundColor: color + "18",
        borderColor: color + "40",
        borderStyle: "dashed",
      }}
    >
      {height > 18 && (
        <div
          className="px-1 text-[8px] font-medium truncate leading-[14px] opacity-80"
          style={{ color }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

// ─── Filter busy slots to a specific day ─────────────────────────────────────────

function busySlotsForDay(memberAvailability: MemberAvailability[], day: Date): { member: TeamMember; slots: BusySlot[] }[] {
  const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);

  return memberAvailability.map((ma) => ({
    member: ma.member,
    slots: ma.busy.filter((s) => {
      return s.start < dayEnd && s.end > dayStart;
    }).map((s) => ({
      start: s.start < dayStart ? dayStart : s.start,
      end: s.end > dayEnd ? dayEnd : s.end,
    })),
  }));
}

// ─── Shared time-grid column renderer ───────────────────────────────────────────

function TimeGridColumn({
  day, timedEvents, isToday, onSlotClick, onEventClick, busyOverlays,
}: {
  day: Date;
  timedEvents: CalendarEvent[];
  isToday: boolean;
  onSlotClick: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
  busyOverlays?: { member: TeamMember; slots: BusySlot[]; color: string }[];
}) {
  const layouted = useMemo(() => layoutOverlappingEvents(timedEvents), [timedEvents]);

  const totalOverlayCols = busyOverlays?.length || 0;

  return (
    <div className={cn("relative border-l border-border/20", isToday && "bg-primary/[0.02]")}>
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 border-t border-border/15 cursor-pointer hover:bg-accent/20 transition-colors"
          style={{ top: `${h * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
          onClick={() => {
            const slot = new Date(day);
            slot.setHours(h, 0, 0, 0);
            onSlotClick(slot);
          }}
        />
      ))}
      {busyOverlays && busyOverlays.map((overlay, idx) =>
        overlay.slots.map((slot, si) => (
          <BusyBlock
            key={`busy-${overlay.member.email}-${si}`}
            slot={slot}
            color={overlay.color}
            label={getEmailName(overlay.member.email)}
            col={idx}
            totalCols={totalOverlayCols}
          />
        ))
      )}
      {isToday && <NowLine />}
      {layouted.map((l) => {
        const duration = l.endMin - l.startMin;
        return (
          <TimedEventBlock
            key={l.event.id}
            event={l.event}
            onClick={() => onEventClick(l.event)}
            height={duration}
            col={l.col}
            totalCols={l.totalCols}
          />
        );
      })}
    </div>
  );
}

// ─── WEEK VIEW ──────────────────────────────────────────────────────────────────

function WeekView({
  currentDate, events, onSlotClick, onEventClick, memberAvailability,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSlotClick: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
  memberAvailability?: MemberAvailability[];
}) {
  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);
  const today = new Date();
  const weekScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      if (weekScrollRef.current) {
        weekScrollRef.current.scrollTop = START_HOUR * HOUR_HEIGHT;
      }
    }, 150);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allDayEvents = useMemo(() => events.filter((e) => e.allDay), [events]);
  const timedEvents = useMemo(() => events.filter((e) => !e.allDay), [events]);

  const eventsForDayTimed = useCallback((day: Date) => {
    return timedEvents.filter((e) => isSameDay(e.start, day));
  }, [timedEvents]);

  const allDayForDay = useCallback((day: Date) => {
    return allDayEvents.filter((e) => {
      const s = new Date(e.start); s.setHours(0, 0, 0, 0);
      const en = new Date(e.end); en.setHours(0, 0, 0, 0);
      const d = new Date(day); d.setHours(0, 0, 0, 0);
      return d >= s && d < en;
    });
  }, [allDayEvents]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Header */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/60 bg-muted/10">
        <div className="border-r border-border/20" />
        {days.map((d, i) => {
          const isDayToday = isSameDay(d, today);
          return (
            <div key={i} className={cn(
              "text-center py-2 border-l border-border/20 transition-colors",
              isDayToday && "bg-primary/[0.04]",
            )}>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{DAYS_ES[i]}</div>
              <div className={cn(
                "text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full mx-auto mt-0.5 transition-colors",
                isDayToday && "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
              )}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      {allDayEvents.length > 0 && (
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/40 bg-muted/5">
          <div className="text-[9px] text-muted-foreground flex items-center justify-end pr-2 font-medium uppercase tracking-wider border-r border-border/20">
            Día
          </div>
          {days.map((d, i) => (
            <div key={i} className="border-l border-border/20 px-0.5 py-1 space-y-0.5">
              {allDayForDay(d).map((ev) => (
                <EventChip key={ev.id} event={ev} onClick={() => onEventClick(ev)} compact />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div ref={weekScrollRef} className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Hour labels */}
          <div className="relative border-r border-border/20">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-muted-foreground font-medium tabular-nums"
                style={{ top: `${h * HOUR_HEIGHT}px`, transform: "translateY(-7px)" }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayBusy = memberAvailability ? busySlotsForDay(memberAvailability, day) : undefined;
            const overlays = dayBusy?.map((db, idx) => ({
              member: db.member,
              slots: db.slots,
              color: getTeamColor(idx),
            })).filter((o) => o.slots.length > 0);

            return (
              <TimeGridColumn
                key={di}
                day={day}
                timedEvents={eventsForDayTimed(day)}
                isToday={isSameDay(day, today)}
                onSlotClick={onSlotClick}
                onEventClick={onEventClick}
                busyOverlays={overlays && overlays.length > 0 ? overlays : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── DAY VIEW ───────────────────────────────────────────────────────────────────

function DayView({
  currentDate, events, onSlotClick, onEventClick, memberAvailability,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSlotClick: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
  memberAvailability?: MemberAvailability[];
}) {
  const today = new Date();
  const isToday = isSameDay(currentDate, today);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      if (dayScrollRef.current) {
        dayScrollRef.current.scrollTop = START_HOUR * HOUR_HEIGHT;
      }
    }, 150);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allDayEvents = useMemo(() =>
    events.filter((e) => e.allDay && (() => {
      const s = new Date(e.start); s.setHours(0, 0, 0, 0);
      const en = new Date(e.end); en.setHours(0, 0, 0, 0);
      const d = new Date(currentDate); d.setHours(0, 0, 0, 0);
      return d >= s && d < en;
    })()),
  [events, currentDate]);

  const timedEvents = useMemo(() =>
    events.filter((e) => !e.allDay && isSameDay(e.start, currentDate)),
  [events, currentDate]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="text-center py-3 border-b border-border/60 bg-muted/10">
        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{DAYS_ES[(currentDate.getDay() + 6) % 7]}</div>
        <div className={cn(
          "text-xl font-bold w-10 h-10 flex items-center justify-center rounded-full mx-auto mt-0.5 transition-colors",
          isToday && "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
        )}>
          {currentDate.getDate()}
        </div>
      </div>

      {allDayEvents.length > 0 && (
        <div className="px-16 py-1.5 border-b border-border/40 bg-muted/5 space-y-0.5">
          {allDayEvents.map((ev) => (
            <EventChip key={ev.id} event={ev} onClick={() => onEventClick(ev)} />
          ))}
        </div>
      )}

      <div ref={dayScrollRef} className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[56px_1fr] relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          <div className="relative border-r border-border/20">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-muted-foreground font-medium tabular-nums"
                style={{ top: `${h * HOUR_HEIGHT}px`, transform: "translateY(-7px)" }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {(() => {
            const dayBusy = memberAvailability ? busySlotsForDay(memberAvailability, currentDate) : undefined;
            const overlays = dayBusy?.map((db, idx) => ({
              member: db.member,
              slots: db.slots,
              color: getTeamColor(idx),
            })).filter((o) => o.slots.length > 0);

            return (
              <TimeGridColumn
                day={currentDate}
                timedEvents={timedEvents}
                isToday={isToday}
                onSlotClick={onSlotClick}
                onEventClick={onEventClick}
                busyOverlays={overlays && overlays.length > 0 ? overlays : undefined}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Availability side panel ─────────────────────────────────────────────────────

function AvailabilityPanel({
  teamMembers, selectedEmails, onToggle, loading, loadingBusy, availability,
}: {
  teamMembers: TeamMember[];
  selectedEmails: string[];
  onToggle: (email: string) => void;
  loading: boolean;
  loadingBusy: boolean;
  availability: MemberAvailability[];
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="text-center py-6 px-3">
        <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          No hay compañeros con Google Calendar conectado.
        </p>
      </div>
    );
  }

  const grouped = teamMembers.reduce<Record<string, TeamMember[]>>((acc, m) => {
    const role = getRoleLabel(m.role);
    if (!acc[role]) acc[role] = [];
    acc[role].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">Disponibilidad del equipo</span>
        {loadingBusy && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />}
      </div>
      <ScrollArea className="max-h-[280px]">
        <div className="space-y-3 pr-2">
          {Object.entries(grouped).map(([role, members]) => (
            <div key={role}>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">{role}</div>
              <div className="space-y-0.5">
                {members.map((m) => {
                  const isSelected = selectedEmails.includes(m.calendarId);
                  const colorIdx = teamMembers.findIndex((tm) => tm.calendarId === m.calendarId);
                  const color = getTeamColor(colorIdx);
                  const memberBusy = availability.find((a) => a.member.calendarId === m.calendarId);

                  return (
                    <button
                      key={m.userId}
                      onClick={() => onToggle(m.calendarId)}
                      className={cn(
                        "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-left transition-all",
                        isSelected
                          ? "bg-accent/60"
                          : "hover:bg-accent/30",
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="h-3.5 w-3.5 rounded-sm"
                        style={isSelected ? { borderColor: color, backgroundColor: color } : undefined}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{getEmailName(m.email)}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{m.email}</div>
                      </div>
                      {isSelected && memberBusy && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1 py-0 h-4 flex-shrink-0"
                          style={{ color, backgroundColor: color + "15" }}
                        >
                          {memberBusy.busy.length === 0 ? (
                            <><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Libre</>
                          ) : (
                            <>{memberBusy.busy.length} ocupado{memberBusy.busy.length > 1 ? "s" : ""}</>
                          )}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      {selectedEmails.length > 0 && (
        <div className="pt-2 border-t border-border/40">
          <div className="flex flex-wrap gap-1">
            {selectedEmails.map((email) => {
              const idx = teamMembers.findIndex((m) => m.calendarId === email);
              const color = getTeamColor(idx);
              return (
                <div key={email} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium" style={{ backgroundColor: color + "18", color }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  {getEmailName(email)}
                  <span className="opacity-50">= ocupado</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────

export function FullCalendar({
  events, loading, onRangeChange, onCreateEvent, onUpdateEvent, onDeleteEvent,
  teamMembers, availability, loadingTeam, loadingBusy, selectedTeamEmails,
  onToggleTeamMember, onToggleAvailabilityPanel, showAvailability,
}: FullCalendarProps) {
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formInitial, setFormInitial] = useState<Partial<EventFormState> | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rangeForView = useMemo(() => {
    const d = currentDate;
    if (view === "month") {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      start.setDate(start.getDate() - 7);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      end.setDate(end.getDate() + 7);
      return { start, end };
    }
    if (view === "week") {
      const start = startOfWeek(d);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end };
    }
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [view, currentDate]);

  useEffect(() => {
    onRangeChange(rangeForView.start, rangeForView.end);
  }, [rangeForView, onRangeChange]);

  const navigate = useCallback((dir: -1 | 1) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else if (view === "week") d.setDate(d.getDate() + 7 * dir);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  }, [view]);

  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  const title = useMemo(() => {
    const d = currentDate;
    if (view === "month") return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
    if (view === "week") {
      const ws = startOfWeek(d);
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      const sameMonth = ws.getMonth() === we.getMonth();
      if (sameMonth) return `${ws.getDate()} – ${we.getDate()} ${MONTHS_ES[ws.getMonth()]} ${ws.getFullYear()}`;
      return `${ws.getDate()} ${MONTHS_ES[ws.getMonth()].slice(0, 3)} – ${we.getDate()} ${MONTHS_ES[we.getMonth()].slice(0, 3)} ${we.getFullYear()}`;
    }
    return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [view, currentDate]);

  const handleDayClick = useCallback((d: Date) => {
    setCurrentDate(d);
    setView("day");
  }, []);

  const handleSlotClick = useCallback((d: Date) => {
    const end = new Date(d);
    end.setHours(end.getHours() + 1);
    setEditingEvent(null);
    setFormInitial({
      startDateTime: formatDateInput(d),
      endDateTime: formatDateInput(end),
    });
    setShowForm(true);
  }, []);

  const handleEventClick = useCallback((e: CalendarEvent) => {
    setSelectedEvent(e);
    setShowDetail(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (!selectedEvent || !selectedEvent.googleEvent) return;
    setShowDetail(false);
    setEditingEvent(selectedEvent);
    const ge = selectedEvent.googleEvent;
    setFormInitial({
      summary: ge.summary || "",
      description: ge.description || "",
      startDateTime: ge.start.dateTime ? formatDateInput(new Date(ge.start.dateTime)) : ge.start.date || "",
      endDateTime: ge.end.dateTime ? formatDateInput(new Date(ge.end.dateTime)) : ge.end.date || "",
      allDay: !ge.start.dateTime,
      location: ge.location || "",
      addMeet: !!(selectedEvent.meetLink),
      attendeesStr: ge.attendees?.filter((a) => !a.self).map((a) => a.email).join(", ") || "",
    });
    setShowForm(true);
  }, [selectedEvent]);

  const handleDelete = useCallback(async () => {
    if (!selectedEvent?.googleEvent) return;
    setShowDetail(false);
    await onDeleteEvent(selectedEvent.googleEvent.id);
  }, [selectedEvent, onDeleteEvent]);

  const handleFormSubmit = useCallback(async (form: EventFormState) => {
    setIsSubmitting(true);
    const input: CreateEventInput = {
      summary: form.summary,
      description: form.description || undefined,
      startDateTime: form.allDay ? form.startDateTime : form.startDateTime,
      endDateTime: form.allDay ? form.endDateTime : form.endDateTime,
      allDay: form.allDay,
      location: form.location || undefined,
      addMeet: form.addMeet,
      attendees: form.attendeesStr ? form.attendeesStr.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    };

    if (editingEvent?.googleEvent) {
      await onUpdateEvent(editingEvent.googleEvent.id, input);
    } else {
      await onCreateEvent(input);
    }
    setIsSubmitting(false);
    setShowForm(false);
    setEditingEvent(null);
  }, [editingEvent, onCreateEvent, onUpdateEvent]);

  return (
    <div className="flex flex-col h-full bg-background rounded-xl border border-border/50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday} className="text-xs h-8 font-medium">Hoy</Button>
          <div className="flex items-center rounded-lg border border-border/50 overflow-hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="w-px h-4 bg-border/50" />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <h2 className="text-sm font-semibold ml-2 capitalize select-none">{title}</h2>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border/50 overflow-hidden bg-muted/30">
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-medium transition-all",
                  view === v
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
          {onToggleAvailabilityPanel && view !== "month" && (
            <Button
              variant={showAvailability ? "default" : "outline"}
              size="sm"
              className={cn("h-8 gap-1.5", showAvailability && "shadow-sm")}
              onClick={onToggleAvailabilityPanel}
            >
              {showAvailability ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              Disponibilidad
              {selectedTeamEmails && selectedTeamEmails.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 text-[9px] px-1 py-0 h-4 min-w-4 flex items-center justify-center">
                  {selectedTeamEmails.length}
                </Badge>
              )}
            </Button>
          )}
          <Button size="sm" className="h-8 gap-1.5 shadow-sm" onClick={() => {
            setEditingEvent(null);
            setFormInitial(undefined);
            setShowForm(true);
          }}>
            <Plus className="h-3.5 w-3.5" /> Evento
          </Button>
        </div>
      </div>

      {/* Calendar Body with optional availability panel */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className={cn("flex-1 flex flex-col overflow-hidden min-h-0", showAvailability && view !== "month" && "pr-0")}>
          {view === "month" && (
            <MonthView currentDate={currentDate} events={events} onDayClick={handleDayClick} onEventClick={handleEventClick} />
          )}
          {view === "week" && (
            <WeekView
              currentDate={currentDate}
              events={events}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
              memberAvailability={showAvailability ? availability : undefined}
            />
          )}
          {view === "day" && (
            <DayView
              currentDate={currentDate}
              events={events}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
              memberAvailability={showAvailability ? availability : undefined}
            />
          )}
        </div>

        {showAvailability && view !== "month" && teamMembers && onToggleTeamMember && (
          <div className="w-64 border-l border-border/50 bg-card/30 p-3 overflow-y-auto flex-shrink-0">
            <AvailabilityPanel
              teamMembers={teamMembers}
              selectedEmails={selectedTeamEmails || []}
              onToggle={onToggleTeamMember}
              loading={!!loadingTeam}
              loadingBusy={!!loadingBusy}
              availability={availability || []}
            />
          </div>
        )}
      </div>

      {/* Dialogs */}
      <EventDetailDialog
        event={selectedEvent}
        open={showDetail}
        onClose={() => setShowDetail(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <EventFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingEvent(null); }}
        onSubmit={handleFormSubmit}
        initial={formInitial}
        isEdit={!!editingEvent}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
