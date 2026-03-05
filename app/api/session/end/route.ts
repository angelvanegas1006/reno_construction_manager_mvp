import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, now } = body as { sessionId?: string; now?: string };

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const timestamp = now || new Date().toISOString();

    await (supabase as any)
      .from("user_sessions")
      .update({ ended_at: timestamp, last_active_at: timestamp })
      .eq("id", sessionId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
