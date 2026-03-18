/**
 * Cron alert notifications via n8n webhook.
 *
 * When a cron job fails or times out, call sendCronAlert() to send a
 * notification payload to an n8n workflow that can forward it as an email,
 * Slack message, etc.
 *
 * Required env var (set in Vercel):
 *   N8N_CRON_ALERT_WEBHOOK_URL — URL of the n8n webhook endpoint that
 *   receives cron error alerts. If not set, errors are only logged to console.
 */

interface CronAlertPayload {
  cron_name: string;
  error_message: string;
  timestamp: string;
  environment: string;
}

/**
 * Sends a cron error alert to the configured n8n webhook.
 * Never throws — failures are swallowed so that alert logic never masks the
 * original error.
 */
export async function sendCronAlert(
  cronName: string,
  error: unknown
): Promise<void> {
  const webhookUrl = process.env.N8N_CRON_ALERT_WEBHOOK_URL;

  const errorMessage =
    error instanceof Error
      ? `${error.message}${error.stack ? `\n${error.stack.split("\n").slice(0, 5).join("\n")}` : ""}`
      : String(error);

  const payload: CronAlertPayload = {
    cron_name: cronName,
    error_message: errorMessage,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "unknown",
  };

  console.error(`[cron-alert] ${cronName} failed:`, errorMessage);

  if (!webhookUrl) {
    console.warn(
      "[cron-alert] N8N_CRON_ALERT_WEBHOOK_URL not set — skipping webhook notification"
    );
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.warn(
        `[cron-alert] Webhook responded with ${res.status} for cron "${cronName}"`
      );
    }
  } catch (alertErr) {
    console.warn(
      `[cron-alert] Failed to send alert for cron "${cronName}":`,
      alertErr
    );
  }
}
