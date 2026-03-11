import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar/config-check";

export async function GET() {
  try {
    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json({ connected: false, configured: false, hasGmailScope: false });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tokenData } = await (supabase as any)
      .from("google_calendar_tokens")
      .select("connected_at, scopes")
      .eq("user_id", user.id)
      .single();

    const connected = !!tokenData;
    const hasGmailScope = connected && typeof tokenData.scopes === "string" && tokenData.scopes.includes("gmail");

    return NextResponse.json({ connected, configured: true, hasGmailScope });
  } catch (error: any) {
    console.error("[GET /api/gmail/status]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
