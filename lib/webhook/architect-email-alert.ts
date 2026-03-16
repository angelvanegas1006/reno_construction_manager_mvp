const WEBHOOK_URL =
  "https://n8n.prod.prophero.com/webhook/emails_to_architects";

export type ArchitectAlertType =
  | "new_project"
  | "project_confirmation"
  | "ecu_repairs"
  | "measurement_reminder"
  | "draft_reminder"
  | "project_reminder"
  | "repairs_reminder"
  | "ecu_certificates_received";

interface SendAlertParams {
  alertType: ArchitectAlertType;
  architectName: string;
  architectEmail?: string | null;
  projectName: string;
  areaCluster?: string | null;
  architectFee?: number | null;
  deadlineDate?: string | null;
}

interface SendAlertResult {
  success: boolean;
  error?: string;
}

async function resolveArchitectEmail(
  name: string
): Promise<string | null> {
  try {
    const res = await fetch("/api/airtable/architects");
    if (!res.ok) return null;
    const data = await res.json();
    const architects: { name: string; email: string | null }[] =
      data.architects ?? [];
    const match = architects.find(
      (a) => a.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    return match?.email ?? null;
  } catch {
    return null;
  }
}

function cleanZone(raw: string | null | undefined): string {
  if (!raw) return "";
  return String(raw).replace(/[\[\]"]/g, "").trim();
}

export async function sendArchitectEmailAlert(
  params: SendAlertParams
): Promise<SendAlertResult> {
  const { alertType, architectName, projectName, areaCluster, architectFee, deadlineDate } = params;

  let email = params.architectEmail;
  if (!email) {
    email = await resolveArchitectEmail(architectName);
  }

  if (!email) {
    return {
      success: false,
      error: `No se encontró el email del arquitecto "${architectName}"`,
    };
  }

  const payload: Record<string, unknown> = {
    alert_type: alertType,
    architect_email: email,
    architect_name: architectName,
    project_name: projectName,
    area_cluster: cleanZone(areaCluster),
  };

  if (architectFee != null) {
    payload.architect_fee = architectFee;
  }
  if (deadlineDate) {
    payload.deadline_date = deadlineDate;
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Error al enviar notificación por email al arquitecto (HTTP ${res.status})`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.message || "Error de red al enviar notificación por email al arquitecto",
    };
  }
}

/**
 * Server-side version that resolves email from Airtable API directly.
 * Used by cron jobs that don't run in browser context.
 */
export async function sendArchitectEmailAlertServer(
  params: SendAlertParams & { architectEmail: string }
): Promise<SendAlertResult> {
  const { alertType, architectName, architectEmail, projectName, areaCluster, architectFee, deadlineDate } = params;

  const payload: Record<string, unknown> = {
    alert_type: alertType,
    architect_email: architectEmail,
    architect_name: architectName,
    project_name: projectName,
    area_cluster: cleanZone(areaCluster),
  };

  if (architectFee != null) {
    payload.architect_fee = architectFee;
  }
  if (deadlineDate) {
    payload.deadline_date = deadlineDate;
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Webhook error HTTP ${res.status}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network error sending webhook",
    };
  }
}
