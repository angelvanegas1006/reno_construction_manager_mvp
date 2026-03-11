import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailApiClient } from "@/lib/google-gmail/api-client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: messageId } = await params;
    const gmail = getGmailApiClient();
    const body = await gmail.getMessageBody(user.id, messageId, supabase);

    return NextResponse.json(body);
  } catch (error: any) {
    console.error("[GET /api/gmail/messages/:id]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
