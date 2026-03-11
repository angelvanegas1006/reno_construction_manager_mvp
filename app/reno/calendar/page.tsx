"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2 } from "lucide-react";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/useCalendarEvents";
import { useMaturationProjects } from "@/hooks/useMaturationProjects";
import { useTeamAvailability } from "@/hooks/useTeamAvailability";
import { FullCalendar } from "@/components/reno/full-calendar";
import { GoogleCalendarConnect } from "@/components/auth/google-calendar-connect";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";

const ALLOWED_ROLES = ["admin", "construction_manager", "foreman", "set_up_analyst", "maduration_analyst"];

const APP_EVENT_MAP: { field: string; label: string; color: string }[] = [
  { field: "draft_order_date", label: "Encargo Anteproyecto", color: "#8b5cf6" },
  { field: "measurement_date", label: "Medición", color: "#10b981" },
  { field: "project_draft_date", label: "Borrador Proyecto", color: "#06b6d4" },
  { field: "arras_deadline", label: "Deadline Arras", color: "#f59e0b" },
  { field: "settlement_date", label: "Escrituración", color: "#f59e0b" },
  { field: "ecu_delivery_date", label: "Entrega ECU", color: "#6366f1" },
  { field: "est_reno_start_date", label: "Arranque Obra Est.", color: "#ef4444" },
  { field: "reno_start_date", label: "Inicio Obra", color: "#ef4444" },
  { field: "est_reno_end_date", label: "Fin Obra Est.", color: "#ec4899" },
  { field: "reno_end_date", label: "Fin Obra", color: "#ec4899" },
];

function projectsToAppEvents(projects: ProjectRow[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const p of projects) {
    for (const { field, label, color } of APP_EVENT_MAP) {
      const val = (p as any)[field];
      if (!val) continue;
      const d = new Date(val);
      if (isNaN(d.getTime())) continue;
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      events.push({
        id: `app-${p.id}-${field}`,
        title: `${label} · ${p.name || p.project_unique_id || ""}`,
        start: d,
        end,
        allDay: true,
        source: "app",
        color,
        appMeta: { type: label, projectName: p.name || undefined, projectId: p.id },
      });
    }
  }
  return events;
}

export default function CalendarPage() {
  const router = useRouter();
  const { user, role, isLoading: authLoading } = useAppAuth();
  const { isConnected, isLoading: gcalLoading } = useGoogleCalendar();
  const { events, loading: eventsLoading, fetchEvents, createEvent, updateEvent, deleteEvent, setAppEvents } = useCalendarEvents();
  const { allProjects, loading: projectsLoading } = useMaturationProjects();
  const {
    teamMembers, availability, loading: loadingTeam, loadingBusy,
    fetchTeamMembers, fetchAvailability,
  } = useTeamAvailability();

  const [showAvailability, setShowAvailability] = useState(false);
  const [selectedTeamEmails, setSelectedTeamEmails] = useState<string[]>([]);
  const currentRangeRef = useRef<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !ALLOWED_ROLES.includes(role || ""))) {
      router.replace("/login");
    }
  }, [authLoading, user, role, router]);

  const appEvents = useMemo(() => projectsToAppEvents(allProjects), [allProjects]);

  useEffect(() => {
    if (!projectsLoading) {
      setAppEvents(appEvents);
    }
  }, [appEvents, projectsLoading, setAppEvents]);

  useEffect(() => {
    if (showAvailability && isConnected) {
      fetchTeamMembers();
    }
  }, [showAvailability, isConnected, fetchTeamMembers]);

  useEffect(() => {
    if (selectedTeamEmails.length > 0 && currentRangeRef.current) {
      fetchAvailability(
        currentRangeRef.current.start,
        currentRangeRef.current.end,
        selectedTeamEmails,
      );
    }
  }, [selectedTeamEmails, fetchAvailability]);

  const handleRangeChange = useCallback(
    (start: Date, end: Date) => {
      currentRangeRef.current = { start, end };
      if (isConnected) {
        fetchEvents(start, end);
      }
      if (selectedTeamEmails.length > 0) {
        fetchAvailability(start, end, selectedTeamEmails);
      }
    },
    [isConnected, fetchEvents, selectedTeamEmails, fetchAvailability],
  );

  const handleToggleTeamMember = useCallback(
    (email: string) => {
      setSelectedTeamEmails((prev) => {
        const next = prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email];
        if (next.length > 0 && currentRangeRef.current) {
          fetchAvailability(currentRangeRef.current.start, currentRangeRef.current.end, next);
        }
        return next;
      });
    },
    [fetchAvailability],
  );

  const handleTogglePanel = useCallback(() => {
    setShowAvailability((prev) => !prev);
  }, []);

  if (authLoading || gcalLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 max-w-md mx-auto px-4">
        <div className="text-center space-y-2">
          <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Calendario</h1>
          <p className="text-sm text-muted-foreground">
            Conecta tu Google Calendar para ver y gestionar todos tus eventos desde aquí.
          </p>
        </div>
        <GoogleCalendarConnect origin="calendar-page" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-2rem)] flex flex-col p-4 gap-3">
      <FullCalendar
        events={events}
        loading={eventsLoading}
        onRangeChange={handleRangeChange}
        onCreateEvent={createEvent}
        onUpdateEvent={updateEvent}
        onDeleteEvent={deleteEvent}
        teamMembers={teamMembers}
        availability={availability}
        loadingTeam={loadingTeam}
        loadingBusy={loadingBusy}
        selectedTeamEmails={selectedTeamEmails}
        onToggleTeamMember={handleToggleTeamMember}
        onToggleAvailabilityPanel={handleTogglePanel}
        showAvailability={showAvailability}
      />
    </div>
  );
}
