import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.AIRTABLE_API_KEY || process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_PROJECTS_TABLE_ID;

    if (!apiKey || !baseId || !tableId) {
      return NextResponse.json(
        { error: "Airtable environment variables not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { airtable_project_id, excluded_from_ecu } = body as {
      airtable_project_id?: string;
      excluded_from_ecu?: boolean;
    };

    if (!airtable_project_id?.trim()) {
      return NextResponse.json(
        { error: "airtable_project_id is required" },
        { status: 400 }
      );
    }

    if (typeof excluded_from_ecu !== "boolean") {
      return NextResponse.json(
        { error: "excluded_from_ecu must be a boolean" },
        { status: 400 }
      );
    }

    const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${airtable_project_id.trim()}`;

    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          "Excluded from ECU": excluded_from_ecu,
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("[API /airtable/projects/update-ecu] Airtable error:", res.status, errorBody);
      return NextResponse.json(
        { error: `Airtable returned ${res.status}: ${errorBody}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API /airtable/projects/update-ecu] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Error updating ECU status" },
      { status: 500 }
    );
  }
}
