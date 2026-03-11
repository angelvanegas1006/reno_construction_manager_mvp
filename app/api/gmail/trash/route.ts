import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailApiClient } from "@/lib/google-gmail/api-client";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { messageIds } = body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: "messageIds array is required" }, { status: 400 });
    }

    const gmail = getGmailApiClient();
    const results = await Promise.allSettled(
      messageIds.map((id: string) => gmail.trashMessage(user.id, id, supabase))
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    const succeeded = results.filter((r) => r.status === "fulfilled").length;

    return NextResponse.json({ success: true, succeeded, failed, total: messageIds.length });
  } catch (error: any) {
    console.error("[POST /api/gmail/trash]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
