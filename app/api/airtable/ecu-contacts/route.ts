import { NextResponse } from "next/server";
import Airtable from "airtable";

const B2B_TABLE_ID = "tbljB4pROJtXPOdpt";
const ECU_VIEW_ID = "viwy0PD0LyB2ya9af";

export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
    const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: "Airtable credentials not configured" },
        { status: 500 }
      );
    }

    const base = new Airtable({ apiKey }).base(baseId);
    const records = await base(B2B_TABLE_ID)
      .select({ view: ECU_VIEW_ID })
      .all();

    const contacts = records.map((rec) => {
      const f = rec.fields;
      return {
        id: rec.id,
        name: (f["Name"] as string) ?? "",
        company: (f["Company"] as string) ?? null,
        email: (f["Email"] as string) ?? null,
      };
    });

    contacts.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ contacts });
  } catch (error: any) {
    console.error("[API /airtable/ecu-contacts] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Error fetching ECU contacts" },
      { status: 500 }
    );
  }
}
