import { NextResponse } from "next/server";
import Airtable from "airtable";

const B2B_TABLE_ID = "tbljB4pROJtXPOdpt";
const ARCHITECTS_VIEW_ID = "viwKXdfkQyApxpAmG";

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
      .select({ view: ARCHITECTS_VIEW_ID })
      .all();

    const architects = records.map((rec) => {
      const f = rec.fields;
      return {
        id: rec.id,
        name: (f["Name"] as string) ?? "",
        company: (f["Company"] as string) ?? null,
        email: (f["Email"] as string) ?? null,
      };
    });

    architects.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ architects });
  } catch (error: any) {
    console.error("[API /airtable/architects] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Error fetching architects" },
      { status: 500 }
    );
  }
}
