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
    const { airtable_project_id, field_name, field_value } = body as {
      airtable_project_id?: string;
      field_name?: string;
      field_value?: unknown;
    };

    if (!airtable_project_id?.trim()) {
      return NextResponse.json({ error: "airtable_project_id is required" }, { status: 400 });
    }
    if (!field_name?.trim()) {
      return NextResponse.json({ error: "field_name is required" }, { status: 400 });
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
          [field_name.trim()]: field_value,
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[API /airtable/projects/update-field] Airtable error for "${field_name}":`, res.status, errorBody);
      return NextResponse.json(
        { error: `Airtable returned ${res.status}: ${errorBody}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API /airtable/projects/update-field] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Error updating field" },
      { status: 500 }
    );
  }
}
