/**
 * Gmail API Client
 *
 * Reuses the Google OAuth tokens stored by the Calendar integration.
 * Requires scopes: gmail.readonly, gmail.send
 */

import { getGoogleCalendarApiClient } from "@/lib/google-calendar/api-client";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  mimeType: string;
  headers?: GmailMessageHeader[];
  body?: { size: number; data?: string };
  parts?: GmailMessagePart[];
  filename?: string;
}

export interface GmailMessageRaw {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
  payload: GmailMessagePart;
  sizeEstimate: number;
}

export interface GmailMessageListItem {
  id: string;
  threadId: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  labelIds: string[];
  isUnread: boolean;
}

function getHeader(headers: GmailMessageHeader[] | undefined, name: string): string {
  if (!headers) return "";
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function extractTextBody(part: GmailMessagePart): { text: string; html: string } {
  let text = "";
  let html = "";

  if (part.mimeType === "text/plain" && part.body?.data) {
    text = decodeBase64Url(part.body.data);
  } else if (part.mimeType === "text/html" && part.body?.data) {
    html = decodeBase64Url(part.body.data);
  }

  if (part.parts) {
    for (const sub of part.parts) {
      const result = extractTextBody(sub);
      if (result.text) text = result.text;
      if (result.html) html = result.html;
    }
  }

  return { text, html };
}

export class GmailApiClient {
  private async getAccessToken(userId: string, supabaseClient?: any): Promise<string> {
    const calendarClient = getGoogleCalendarApiClient();
    return calendarClient.getAccessToken(userId, supabaseClient);
  }

  async listMessages(
    userId: string,
    opts?: { q?: string; maxResults?: number; pageToken?: string; labelIds?: string[] },
    supabaseClient?: any
  ): Promise<{ messages: GmailMessageListItem[]; nextPageToken?: string; resultSizeEstimate: number }> {
    const accessToken = await this.getAccessToken(userId, supabaseClient);

    const params = new URLSearchParams();
    if (opts?.q) params.set("q", opts.q);
    if (opts?.maxResults) params.set("maxResults", opts.maxResults.toString());
    if (opts?.pageToken) params.set("pageToken", opts.pageToken);
    if (opts?.labelIds) {
      for (const label of opts.labelIds) params.append("labelIds", label);
    }

    const res = await fetch(`${GMAIL_API}/messages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gmail listMessages failed: ${err}`);
    }

    const data = await res.json();
    return {
      messages: data.messages || [],
      nextPageToken: data.nextPageToken,
      resultSizeEstimate: data.resultSizeEstimate || 0,
    };
  }

  async getMessage(
    userId: string,
    messageId: string,
    supabaseClient?: any
  ): Promise<GmailMessageRaw> {
    const accessToken = await this.getAccessToken(userId, supabaseClient);

    const res = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gmail getMessage failed: ${err}`);
    }

    return res.json();
  }

  async getMessageSummary(
    userId: string,
    messageId: string,
    supabaseClient?: any
  ): Promise<GmailMessageSummary> {
    const raw = await this.getMessage(userId, messageId, supabaseClient);
    const headers = raw.payload.headers;

    return {
      id: raw.id,
      threadId: raw.threadId,
      from: getHeader(headers, "From"),
      to: getHeader(headers, "To"),
      subject: getHeader(headers, "Subject"),
      snippet: raw.snippet,
      date: getHeader(headers, "Date"),
      labelIds: raw.labelIds || [],
      isUnread: (raw.labelIds || []).includes("UNREAD"),
    };
  }

  async getMessageBody(
    userId: string,
    messageId: string,
    supabaseClient?: any
  ): Promise<{ text: string; html: string; subject: string; from: string; to: string; date: string }> {
    const raw = await this.getMessage(userId, messageId, supabaseClient);
    const headers = raw.payload.headers;
    const body = extractTextBody(raw.payload);

    return {
      ...body,
      subject: getHeader(headers, "Subject"),
      from: getHeader(headers, "From"),
      to: getHeader(headers, "To"),
      date: getHeader(headers, "Date"),
    };
  }

  async sendMessage(
    userId: string,
    to: string,
    subject: string,
    body: string,
    opts?: { cc?: string; bcc?: string; inReplyTo?: string; references?: string },
    supabaseClient?: any
  ): Promise<{ id: string; threadId: string; labelIds: string[] }> {
    const accessToken = await this.getAccessToken(userId, supabaseClient);

    const lines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset="UTF-8"`,
    ];
    if (opts?.cc) lines.push(`Cc: ${opts.cc}`);
    if (opts?.bcc) lines.push(`Bcc: ${opts.bcc}`);
    if (opts?.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`);
    if (opts?.references) lines.push(`References: ${opts.references}`);
    lines.push("", body);

    const raw = Buffer.from(lines.join("\r\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await fetch(`${GMAIL_API}/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gmail sendMessage failed: ${err}`);
    }

    return res.json();
  }

  async listLabels(
    userId: string,
    supabaseClient?: any
  ): Promise<GmailLabel[]> {
    const accessToken = await this.getAccessToken(userId, supabaseClient);

    const res = await fetch(`${GMAIL_API}/labels`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gmail listLabels failed: ${err}`);
    }

    const data = await res.json();
    return data.labels || [];
  }
}

let gmailClient: GmailApiClient | null = null;

export function getGmailApiClient(): GmailApiClient {
  if (!gmailClient) {
    gmailClient = new GmailApiClient();
  }
  return gmailClient;
}
