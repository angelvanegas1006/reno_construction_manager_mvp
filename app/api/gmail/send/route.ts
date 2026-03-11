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
    const { to, subject, body: emailBody, cc, bcc, inReplyTo, references } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      );
    }

    const gmail = getGmailApiClient();
    const result = await gmail.sendMessage(
      user.id,
      to,
      subject,
      emailBody,
      { cc, bcc, inReplyTo, references },
      supabase
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[POST /api/gmail/send]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
