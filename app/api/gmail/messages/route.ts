import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailApiClient } from "@/lib/google-gmail/api-client";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const q = params.get("q") || undefined;
    const maxResults = parseInt(params.get("maxResults") || "20", 10);
    const pageToken = params.get("pageToken") || undefined;
    const label = params.get("label") || undefined;

    const gmail = getGmailApiClient();
    const list = await gmail.listMessages(
      user.id,
      {
        q,
        maxResults,
        pageToken,
        labelIds: label ? [label] : undefined,
      },
      supabase
    );

    if (!list.messages || list.messages.length === 0) {
      return NextResponse.json({ messages: [], nextPageToken: null, total: 0 });
    }

    // Fetch summaries in parallel (batch of up to maxResults)
    const summaries = await Promise.all(
      list.messages.map((m) => gmail.getMessageSummary(user.id, m.id, supabase))
    );

    return NextResponse.json({
      messages: summaries,
      nextPageToken: list.nextPageToken || null,
      total: list.resultSizeEstimate,
    });
  } catch (error: any) {
    console.error("[GET /api/gmail/messages]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
