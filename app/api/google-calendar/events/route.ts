import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleCalendarApiClient } from "@/lib/google-calendar/api-client";
import crypto from "crypto";

async function getCalendarId(supabase: any, userId: string): Promise<string> {
  const { data } = await (supabase as any)
    .from("google_calendar_tokens")
    .select("calendar_id")
    .eq("user_id", userId)
    .single();
  if (!data?.calendar_id) throw new Error("Calendar not connected");
  return data.calendar_id;
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

    const { searchParams } = request.nextUrl;
    const timeMin = searchParams.get("timeMin");
    const timeMax = searchParams.get("timeMax");
    const maxResults = parseInt(searchParams.get("maxResults") || "250", 10);

    const calendarId = await getCalendarId(supabase, user.id);
    const apiClient = getGoogleCalendarApiClient();
    const events = await apiClient.listEvents(
      user.id,
      calendarId,
      {
        timeMin: timeMin || undefined,
        timeMax: timeMax || undefined,
        maxResults,
      },
      supabase,
    );

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("[GET /api/google-calendar/events]", error);
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
    const { summary, description, start, end, location, addMeet, attendees } = body;

    if (!summary || !start || !end) {
      return NextResponse.json(
        { error: "summary, start, and end are required" },
        { status: 400 },
      );
    }

    const calendarId = await getCalendarId(supabase, user.id);
    const apiClient = getGoogleCalendarApiClient();

    const eventData: any = {
      summary,
      description: description || "",
      start,
      end,
      location: location || undefined,
      attendees: attendees?.map((email: string) => ({ email })),
    };

    if (addMeet) {
      eventData.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    const event = await apiClient.createEvent(user.id, calendarId, eventData, supabase);
    return NextResponse.json({ event });
  } catch (error: any) {
    console.error("[POST /api/google-calendar/events]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, summary, description, start, end, location, addMeet, attendees } = body;

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    const calendarId = await getCalendarId(supabase, user.id);
    const apiClient = getGoogleCalendarApiClient();

    const eventData: any = {
      summary,
      description: description || "",
      start,
      end,
      location: location || undefined,
      attendees: attendees?.map((email: string) => ({ email })),
    };

    if (addMeet) {
      eventData.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    const event = await apiClient.updateEvent(user.id, calendarId, eventId, eventData, supabase);
    return NextResponse.json({ event });
  } catch (error: any) {
    console.error("[PUT /api/google-calendar/events]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    const calendarId = await getCalendarId(supabase, user.id);
    const apiClient = getGoogleCalendarApiClient();
    await apiClient.deleteEvent(user.id, calendarId, eventId, supabase);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/google-calendar/events]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
