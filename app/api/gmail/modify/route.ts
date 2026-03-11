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
    const { messageId, addLabelIds, removeLabelIds } = body;

    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    const gmail = getGmailApiClient();
    const result = await gmail.modifyMessage(
      user.id,
      messageId,
      { addLabelIds, removeLabelIds },
      supabase
    );

    return NextResponse.json({ success: true, id: result.id, labelIds: result.labelIds });
  } catch (error: any) {
    console.error("[POST /api/gmail/modify]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
