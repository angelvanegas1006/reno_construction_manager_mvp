"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { GoogleCalendarApiEvent } from "@/lib/google-calendar/types";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  source: "google" | "app";
  color: string;
  googleEvent?: GoogleCalendarApiEvent;
  meetLink?: string | null;
  htmlLink?: string | null;
  location?: string | null;
  description?: string | null;
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  appMeta?: { type: string; projectName?: string; projectId?: string };
}

export interface CreateEventInput {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  allDay?: boolean;
  location?: string;
  addMeet?: boolean;
  attendees?: string[];
}

function parseGoogleEvent(ge: GoogleCalendarApiEvent): CalendarEvent {
  const startDt = ge.start.dateTime ? new Date(ge.start.dateTime) : new Date(ge.start.date + "T00:00:00");
  const endDt = ge.end.dateTime ? new Date(ge.end.dateTime) : new Date(ge.end.date + "T00:00:00");
  const allDay = !ge.start.dateTime;

  return {
    id: `g-${ge.id}`,
    title: ge.summary || "(Sin título)",
    start: startDt,
    end: endDt,
    allDay,
    source: "google",
    color: "#4285f4",
    googleEvent: ge,
    meetLink: ge.hangoutLink || ge.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri || null,
    htmlLink: ge.htmlLink || null,
    location: ge.location || null,
    description: ge.description || null,
    attendees: ge.attendees,
  };
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, CalendarEvent[]>>(new Map());
  const appEventsRef = useRef<CalendarEvent[]>([]);

  const mergeEvents = useCallback((google: CalendarEvent[]) => {
    setEvents([...google, ...appEventsRef.current]);
  }, []);

  const fetchEvents = useCallback(async (timeMin: Date, timeMax: Date, force = false) => {
    const cacheKey = `${timeMin.toISOString()}_${timeMax.toISOString()}`;
    if (!force && cacheRef.current.has(cacheKey)) {
      mergeEvents(cacheRef.current.get(cacheKey)!);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: "500",
      });
      const res = await fetch(`/api/google-calendar/events?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al obtener eventos");
      }
      const { events: gEvents } = (await res.json()) as { events: GoogleCalendarApiEvent[] };
      const parsed = (gEvents || [])
        .filter((e) => e.status !== "cancelled")
        .map(parseGoogleEvent);

      cacheRef.current.set(cacheKey, parsed);
      mergeEvents(parsed);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mergeEvents]);

  const createEvent = useCallback(async (input: CreateEventInput): Promise<CalendarEvent | null> => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const toIso = (dt: string) => new Date(dt).toISOString();
      const start = input.allDay
        ? { date: input.startDateTime.split("T")[0] }
        : { dateTime: toIso(input.startDateTime), timeZone: tz };
      const end = input.allDay
        ? { date: input.endDateTime.split("T")[0] }
        : { dateTime: toIso(input.endDateTime), timeZone: tz };

      const res = await fetch("/api/google-calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: input.summary,
          description: input.description,
          start,
          end,
          location: input.location,
          addMeet: input.addMeet,
          attendees: input.attendees,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al crear evento");
      }
      const { event: ge } = await res.json();
      const parsed = parseGoogleEvent(ge);
      setEvents((prev) => [...prev, parsed]);
      cacheRef.current.clear();
      toast.success("Evento creado");
      return parsed;
    } catch (err: any) {
      toast.error(err.message);
      return null;
    }
  }, []);

  const updateEvent = useCallback(async (googleEventId: string, input: CreateEventInput): Promise<boolean> => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const toIso = (dt: string) => new Date(dt).toISOString();
      const start = input.allDay
        ? { date: input.startDateTime.split("T")[0] }
        : { dateTime: toIso(input.startDateTime), timeZone: tz };
      const end = input.allDay
        ? { date: input.endDateTime.split("T")[0] }
        : { dateTime: toIso(input.endDateTime), timeZone: tz };

      const res = await fetch("/api/google-calendar/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: googleEventId,
          summary: input.summary,
          description: input.description,
          start,
          end,
          location: input.location,
          addMeet: input.addMeet,
          attendees: input.attendees,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al actualizar evento");
      }
      const { event: ge } = await res.json();
      const parsed = parseGoogleEvent(ge);
      setEvents((prev) => prev.map((e) => (e.id === `g-${googleEventId}` ? parsed : e)));
      cacheRef.current.clear();
      toast.success("Evento actualizado");
      return true;
    } catch (err: any) {
      toast.error(err.message);
      return false;
    }
  }, []);

  const deleteEvent = useCallback(async (googleEventId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/google-calendar/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: googleEventId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al eliminar evento");
      }
      setEvents((prev) => prev.filter((e) => e.id !== `g-${googleEventId}`));
      cacheRef.current.clear();
      toast.success("Evento eliminado");
      return true;
    } catch (err: any) {
      toast.error(err.message);
      return false;
    }
  }, []);

  const setAppEvents = useCallback((appEvts: CalendarEvent[]) => {
    appEventsRef.current = appEvts;
    setEvents((prev) => {
      const googleOnly = prev.filter((e) => e.source === "google");
      return [...googleOnly, ...appEvts];
    });
  }, []);

  return {
    events,
    loading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    setAppEvents,
  };
}
