"use client";

import { useState, useCallback, useRef } from "react";

export interface TeamMember {
  userId: string;
  email: string;
  calendarId: string;
  role: string;
}

export interface BusySlot {
  start: Date;
  end: Date;
}

export interface MemberAvailability {
  member: TeamMember;
  busy: BusySlot[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  construction_manager: "Jefe de Obra",
  foreman: "Capataz",
  set_up_analyst: "Analista Set Up",
  maduration_analyst: "Analista Maduración",
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] || role;
}

export function getEmailName(email: string): string {
  const name = email.split("@")[0];
  return name
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useTeamAvailability() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availability, setAvailability] = useState<MemberAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBusy, setLoadingBusy] = useState(false);
  const fetchedRef = useRef(false);

  const fetchTeamMembers = useCallback(async () => {
    if (fetchedRef.current) return;
    setLoading(true);
    try {
      const res = await fetch("/api/google-calendar/freebusy");
      if (!res.ok) throw new Error("Error al obtener equipo");
      const { teamMembers: members } = await res.json();
      setTeamMembers(members || []);
      fetchedRef.current = true;
    } catch {
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAvailability = useCallback(
    async (timeMin: Date, timeMax: Date, selectedEmails: string[]) => {
      if (selectedEmails.length === 0) {
        setAvailability([]);
        return;
      }
      setLoadingBusy(true);
      try {
        const res = await fetch("/api/google-calendar/freebusy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            emails: selectedEmails,
          }),
        });
        if (!res.ok) throw new Error("Error al consultar disponibilidad");
        const { busy } = await res.json();

        const result: MemberAvailability[] = selectedEmails.map((email) => {
          const member = teamMembers.find((m) => m.calendarId === email || m.email === email);
          const slots = (busy[email] || []).map((s: any) => ({
            start: new Date(s.start),
            end: new Date(s.end),
          }));
          return {
            member: member || { userId: "", email, calendarId: email, role: "unknown" },
            busy: slots,
          };
        });

        setAvailability(result);
      } catch {
        setAvailability([]);
      } finally {
        setLoadingBusy(false);
      }
    },
    [teamMembers],
  );

  return {
    teamMembers,
    availability,
    loading,
    loadingBusy,
    fetchTeamMembers,
    fetchAvailability,
  };
}
