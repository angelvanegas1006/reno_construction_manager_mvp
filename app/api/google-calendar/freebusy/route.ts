import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleCalendarApiClient } from "@/lib/google-calendar/api-client";

export interface TeamMember {
  userId: string;
  email: string;
  calendarId: string;
  role: string;
}

export interface FreeBusySlot {
  start: string;
  end: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teamMembers = await getTeamMembers(supabase, user.id);
    return NextResponse.json({ teamMembers });
  } catch (error: any) {
    console.error("[GET /api/google-calendar/freebusy]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { timeMin, timeMax, emails } = body;

    if (!timeMin || !timeMax || !emails?.length) {
      return NextResponse.json(
        { error: "timeMin, timeMax, and emails are required" },
        { status: 400 },
      );
    }

    const apiClient = getGoogleCalendarApiClient();
    const busyData = await apiClient.queryFreeBusy(
      user.id,
      timeMin,
      timeMax,
      emails,
      supabase,
    );

    return NextResponse.json({ busy: busyData });
  } catch (error: any) {
    console.error("[POST /api/google-calendar/freebusy]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getTeamMembers(supabase: any, currentUserId: string): Promise<TeamMember[]> {
  const { data: tokens, error: tokErr } = await (supabase as any)
    .from("google_calendar_tokens")
    .select("user_id, calendar_id");

  if (tokErr || !tokens) return [];

  const connectedUserIds = (tokens as any[])
    .filter((t: any) => t.user_id !== currentUserId && t.calendar_id)
    .map((t: any) => ({ userId: t.user_id, calendarId: t.calendar_id }));

  if (connectedUserIds.length === 0) return [];

  const { data: roles, error: roleErr } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", connectedUserIds.map((c: any) => c.userId));

  if (roleErr) return [];

  const roleMap = new Map((roles as any[]).map((r: any) => [r.user_id, r.role]));

  return connectedUserIds
    .map((c: any) => ({
      userId: c.userId,
      email: c.calendarId,
      calendarId: c.calendarId,
      role: roleMap.get(c.userId) || "unknown",
    }))
    .filter((m: TeamMember) => m.role !== "architect");
}
