/**
 * GET /api/cron/architect-reminders
 * Daily cron – sends automated reminder emails to architects and auto-assigns
 * measurement date when the 7-day window has passed.
 *
 * Runs at 07:00 UTC via Vercel Cron.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendArchitectEmailAlertServer } from "@/lib/webhook/architect-email-alert";

/* ── helpers ─────────────────────────────────────────────────────────── */

function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const userAgent = request.headers.get("user-agent") ?? "";
  if (cronSecret) {
    if (authHeader === `Bearer ${cronSecret}`) return true;
    if (userAgent.startsWith("vercel-cron/")) return true;
    return false;
  }
  if (userAgent.startsWith("vercel-cron/")) return true;
  return process.env.NODE_ENV === "development";
}

function addDays(date: string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/* ── reminder definitions ────────────────────────────────────────────── */

interface ReminderDef {
  type: "measurement_reminder" | "draft_reminder" | "project_reminder" | "repairs_reminder";
  /** reno_phase values where this reminder applies */
  phases: string[];
  /** If this field is non-null the milestone is already done – skip */
  completedField: string;
  /** Compute deadline from these project fields */
  baseField: string;
  offsetDays: number;
  /** Fire when N days remain until deadline */
  daysBeforeDeadline: number;
}

const REMINDERS: ReminderDef[] = [
  {
    type: "measurement_reminder",
    phases: ["get-project-draft"],
    completedField: "measurement_date",
    baseField: "draft_order_date",
    offsetDays: 7,
    daysBeforeDeadline: 2,
  },
  {
    type: "draft_reminder",
    phases: ["pending-to-validate", "get-project-draft"],
    completedField: "project_architect_date",
    baseField: "measurement_date",
    offsetDays: 14,
    daysBeforeDeadline: 7,
  },
  {
    type: "project_reminder",
    phases: ["technical-project-in-progress"],
    completedField: "project_end_date",
    baseField: "draft_validation_date",
    offsetDays: 28,
    daysBeforeDeadline: 7,
  },
  {
    type: "repairs_reminder",
    phases: ["technical-project-fine-tuning"],
    completedField: "arch_correction_date",
    baseField: "ecu_first_end_date",
    offsetDays: 7,
    daysBeforeDeadline: 2,
  },
];

/* ── resolve architect email from Airtable API ───────────────────────── */

async function resolveEmail(architectName: string): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/airtable/architects`);
    if (!res.ok) return null;
    const data = await res.json();
    const match = (data.architects ?? []).find(
      (a: any) => a.name?.toLowerCase().trim() === architectName.toLowerCase().trim()
    );
    return match?.email ?? null;
  } catch {
    return null;
  }
}

/* ── main logic ──────────────────────────────────────────────────────── */

async function runReminders() {
  const supabase = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: projects, error: fetchErr } = await supabase
    .from("projects")
    .select("*")
    .not("architect", "is", null)
    .in("reno_phase", [
      "get-project-draft",
      "pending-to-validate",
      "technical-project-in-progress",
      "technical-project-fine-tuning",
    ]);

  if (fetchErr) throw new Error(`DB query failed: ${fetchErr.message}`);
  if (!projects || projects.length === 0) return { sent: 0, autoAssigned: 0 };

  const emailCache = new Map<string, string | null>();
  async function getEmail(name: string) {
    if (emailCache.has(name)) return emailCache.get(name)!;
    const email = await resolveEmail(name);
    emailCache.set(name, email);
    return email;
  }

  let sent = 0;
  let autoAssigned = 0;

  for (const proj of projects) {
    const p = proj as any;
    if (!p.architect) continue;

    /* ── Auto-assign measurement_date if 7 days past draft_order_date ── */
    if (
      p.reno_phase === "get-project-draft" &&
      p.draft_order_date &&
      !p.measurement_date
    ) {
      const deadline = addDays(p.draft_order_date, 7);
      if (today >= deadline) {
        await supabase
          .from("projects")
          .update({ measurement_date: toDateStr(deadline) })
          .eq("id", p.id);
        autoAssigned++;
      }
    }

    /* ── Evaluate each reminder ── */
    for (const def of REMINDERS) {
      if (!def.phases.includes(p.reno_phase ?? "")) continue;
      if (p[def.completedField]) continue;

      const baseVal = p[def.baseField];
      if (!baseVal) continue;

      const deadline = addDays(baseVal, def.offsetDays);
      const daysLeft = dayDiff(deadline, today);

      if (daysLeft !== def.daysBeforeDeadline) continue;

      // Dedup: check architect_reminder_log
      const { data: existing } = await supabase
        .from("architect_reminder_log" as any)
        .select("id")
        .eq("project_id", p.id)
        .eq("reminder_type", def.type)
        .maybeSingle();

      if (existing) continue;

      const email = await getEmail(p.architect);
      if (!email) continue;

      const result = await sendArchitectEmailAlertServer({
        alertType: def.type,
        architectName: p.architect,
        architectEmail: email,
        projectName: p.name || p.project_unique_id || "",
        areaCluster: p.area_cluster,
        architectFee: p.architect_fee ?? null,
        deadlineDate: toDateStr(deadline),
      });

      if (result.success) {
        await supabase.from("architect_reminder_log" as any).insert({
          project_id: p.id,
          reminder_type: def.type,
        });
        sent++;
      } else {
        console.warn(`Reminder ${def.type} failed for ${p.id}: ${result.error}`);
      }
    }
  }

  return { sent, autoAssigned };
}

/* ── route handlers ──────────────────────────────────────────────────── */

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await runReminders();
    return NextResponse.json({ ok: true, ...stats });
  } catch (err: any) {
    console.error("architect-reminders cron error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await runReminders();
    return NextResponse.json({ ok: true, ...stats });
  } catch (err: any) {
    console.error("architect-reminders cron error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
