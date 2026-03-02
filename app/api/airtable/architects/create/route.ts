import { NextRequest, NextResponse } from "next/server";
import Airtable from "airtable";

const B2B_TABLE_ID = "tbljB4pROJtXPOdpt";

// Field IDs for B2B Partners table
const FIELDS = {
  NAME: "fldIgLH4692Qthdp4",
  COMPANY: "flddf1xqweuFpJMfK",
  CATEGORY: "fldvyI2MugVNZ5CZR",
  COUNTRY: "fldPylq3S2vgP6c70",
  EMAIL: "fld4MmkFp5Iw729rg",
  PHONE: "fldb42b7o8erwchbJ",
} as const;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
    const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: "Airtable credentials not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, email, company, phone } = body as {
      name?: string;
      email?: string;
      company?: string;
      phone?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    if (!email?.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const fields: Record<string, string> = {
      [FIELDS.NAME]: name.trim(),
      [FIELDS.EMAIL]: email.trim(),
      [FIELDS.CATEGORY]: "Architect",
      [FIELDS.COUNTRY]: "Spain",
    };

    if (company?.trim()) {
      fields[FIELDS.COMPANY] = company.trim();
    }
    if (phone?.trim()) {
      fields[FIELDS.PHONE] = phone.trim();
    }

    const base = new Airtable({ apiKey }).base(baseId);
    const created = await base(B2B_TABLE_ID).create([{ fields }]);

    const newRecord = created[0];

    return NextResponse.json({
      id: newRecord.id,
      name: name.trim(),
    });
  } catch (error: any) {
    console.error("[API /airtable/architects/create] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Error creating architect" },
      { status: 500 }
    );
  }
}
