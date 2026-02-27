"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Send, Clock, CheckCircle2, Eye, Building2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const WEBHOOK_URL = "https://n8n.prod.prophero.com/webhook/envio_emailsupdates";

interface UpdateEmail {
  id: string;
  property_id: string;
  html_content: string;
  client_email: string | null;
  subject: string | null;
  sent_at: string;
  created_by: string | null;
  status: "draft" | "sent";
  // join con properties
  property_address?: string | null;
  property_unique_id?: string | null;
}

type Tab = "draft" | "sent";

export function UpdateEmailInbox() {
  const [tab, setTab] = useState<Tab>("draft");
  const [emails, setEmails] = useState<UpdateEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewEmail, setPreviewEmail] = useState<UpdateEmail | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("client_update_emails")
        .select(`
          id, property_id, html_content, client_email, subject, sent_at, created_by, status,
          properties!fk_client_update_emails_property (
            address,
            "Unique ID From Engagements"
          )
        `)
        .order("sent_at", { ascending: false });

      if (error) {
        console.error("[UpdateEmailInbox] Error fetching emails:", error);
        setEmails([]);
      } else {
        const mapped: UpdateEmail[] = (data ?? []).map((row: any) => ({
          id: row.id,
          property_id: row.property_id,
          html_content: row.html_content,
          client_email: row.client_email,
          subject: row.subject,
          sent_at: row.sent_at,
          created_by: row.created_by,
          status: row.status ?? "sent",
          property_address: row.properties?.address ?? null,
          property_unique_id: row.properties?.["Unique ID From Engagements"] ?? null,
        }));
        setEmails(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleApproveAndSend = useCallback(
    async (email: UpdateEmail) => {
      if (!email.client_email) {
        toast.error("Este email no tiene dirección de cliente");
        return;
      }
      setSending(email.id);
      try {
        // Llamar al webhook de n8n igual que antes
        const payload = {
          to: email.client_email,
          subject: email.subject ?? `Update de Progreso - ${email.property_unique_id ?? email.property_id}`,
          html: email.html_content,
          uniqueIdAirtable: email.property_unique_id ?? email.property_id,
          propertyId: email.property_id,
        };

        const response = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Error al enviar: ${response.statusText}`);
        }

        // Marcar como enviado en Supabase
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from("client_update_emails")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", email.id);

        if (updateError) throw updateError;

        toast.success("Email enviado al cliente correctamente");
        setPreviewEmail(null);
        await fetchEmails();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al enviar";
        toast.error(msg);
      } finally {
        setSending(null);
      }
    },
    [fetchEmails]
  );

  const drafts = emails.filter((e) => e.status === "draft");
  const sent = emails.filter((e) => e.status === "sent");
  const displayed = tab === "draft" ? drafts : sent;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Bandeja de emails</h2>
        </div>
        {drafts.length > 0 && (
          <Badge className="bg-amber-500 text-white text-xs">
            {drafts.length} pendiente{drafts.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setTab("draft")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors",
            tab === "draft"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Clock className="h-4 w-4" />
          Pendientes de envío
          {drafts.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-1.5 py-0.5 font-semibold">
              {drafts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("sent")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors",
            tab === "sent"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          Enviados
          {sent.length > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">({sent.length})</span>
          )}
        </button>
      </div>

      {/* Lista */}
      <div className="divide-y max-h-96 overflow-y-auto">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : displayed.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {tab === "draft" ? "No hay emails pendientes de envío" : "No hay emails enviados"}
          </div>
        ) : (
          displayed.map((email) => (
            <div
              key={email.id}
              className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="mt-0.5 flex-shrink-0">
                  {email.status === "draft" ? (
                    <Clock className="h-4 w-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {email.property_address ?? email.property_unique_id ?? email.property_id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {email.client_email ?? "Sin email"} · {formatDate(email.sent_at)}
                  </p>
                  {email.subject && (
                    <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewEmail(email)}
                  className="h-8 gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ver</span>
                </Button>
                {email.status === "draft" && (
                  <Button
                    size="sm"
                    onClick={() => handleApproveAndSend(email)}
                    disabled={sending === email.id}
                    className="h-8 gap-1"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">
                      {sending === email.id ? "Enviando..." : "Aprobar y enviar"}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal preview */}
      {previewEmail && (
        <Dialog open={!!previewEmail} onOpenChange={(open) => { if (!open) setPreviewEmail(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {previewEmail.subject ?? "Preview email"}
              </DialogTitle>
              <div className="text-sm text-muted-foreground">
                Para: {previewEmail.client_email ?? "—"} ·{" "}
                {previewEmail.property_address ?? previewEmail.property_unique_id ?? previewEmail.property_id}
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto border rounded-md bg-white min-h-0">
              <EmailHtmlPreview html={previewEmail.html_content} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPreviewEmail(null)}>
                Cerrar
              </Button>
              {previewEmail.status === "draft" && (
                <Button
                  onClick={() => handleApproveAndSend(previewEmail)}
                  disabled={sending === previewEmail.id}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sending === previewEmail.id ? "Enviando..." : "Aprobar y enviar"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/**
 * Renderiza HTML del email usando un blob: URL para que el iframe tenga
 * un origen real y pueda cargar imágenes externas (logo de Google Drive).
 * srcDoc crea un origen "null" que bloquea peticiones de red externas.
 */
function EmailHtmlPreview({ html }: { html: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [html]);

  if (!blobUrl) return null;

  return (
    <iframe
      src={blobUrl}
      className="w-full border-0"
      style={{ height: "600px", minHeight: "600px" }}
      title="Email preview"
    />
  );
}
