import { NextRequest, NextResponse } from "next/server";
import { updateAirtableWithRetry } from "@/lib/airtable/client";

export async function POST(request: NextRequest) {
  try {
    const tableId = process.env.AIRTABLE_PROJECTS_TABLE_ID;

    if (!tableId) {
      return NextResponse.json(
        { error: "AIRTABLE_PROJECTS_TABLE_ID not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { airtable_project_id, architect_record_id } = body as {
      airtable_project_id?: string;
      architect_record_id?: string;
    };

    if (!airtable_project_id?.trim()) {
      return NextResponse.json(
        { error: "airtable_project_id is required" },
        { status: 400 }
      );
    }
    if (!architect_record_id?.trim()) {
      return NextResponse.json(
        { error: "architect_record_id is required" },
        { status: 400 }
      );
    }

    const success = await updateAirtableWithRetry(
      tableId,
      airtable_project_id.trim(),
      { Architect: [architect_record_id.trim()] }
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update architect in Airtable" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API /airtable/projects/update-architect] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Error updating architect" },
      { status: 500 }
    );
  }
}
