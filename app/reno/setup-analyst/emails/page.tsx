"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoHomeHeader } from "@/components/reno/reno-home-header";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  Send,
  Clock,
  CheckCircle2,
  Eye,
  Building2,
  Search,
  FileText,
  CalendarDays,
  TrendingUp,
  Inbox,
} from "lucide-react";
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
  property_address?: string | null;
  property_unique_id?: string | null;
}

type StatusFilter = "all" | "draft" | "sent";

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

export default function EmailsPage() {
  const router = useRouter();
  const { user, role, isLoading } = useAppAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [emails, setEmails] = useState<UpdateEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewEmail, setPreviewEmail] = useState<UpdateEmail | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!user || !role) {
      router.push("/login");
      return;
    }
    if (role !== "set_up_analyst" && role !== "admin") {
      router.push("/reno/construction-manager");
      toast.error("No tienes permisos para acceder a esta página");
    }
  }, [user, role, isLoading, router]);

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
        console.error("[EmailsPage] Error fetching emails:", error);
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
          property_unique_id:
            row.properties?.["Unique ID From Engagements"] ?? null,
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
        const payload = {
          to: email.client_email,
          subject:
            email.subject ??
            `Update de Progreso - ${email.property_unique_id ?? email.property_id}`,
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

  // --- Stats ---
  const stats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const drafts = emails.filter((e) => e.status === "draft");
    const sentEmails = emails.filter((e) => e.status === "sent");

    const sentThisWeek = sentEmails.filter(
      (e) => new Date(e.sent_at) >= startOfWeek
    );
    const sentThisMonth = sentEmails.filter(
      (e) => new Date(e.sent_at) >= startOfMonth
    );

    return {
      pending: drafts.length,
      sentThisWeek: sentThisWeek.length,
      sentThisMonth: sentThisMonth.length,
      totalSent: sentEmails.length,
    };
  }, [emails]);

  // --- Filtering ---
  const filtered = useMemo(() => {
    let result = emails;

    if (statusFilter !== "all") {
      result = result.filter((e) => e.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          (e.property_address ?? "").toLowerCase().includes(q) ||
          (e.property_unique_id ?? "").toLowerCase().includes(q) ||
          (e.client_email ?? "").toLowerCase().includes(q) ||
          (e.subject ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [emails, statusFilter, searchQuery]);

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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <VistralLogoLoader size="lg" />
      </div>
    );
  }

  const kpiCards = [
    {
      label: "Pendientes",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Enviados esta semana",
      value: stats.sentThisWeek,
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Enviados este mes",
      value: stats.sentThisMonth,
      icon: CalendarDays,
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Total enviados",
      value: stats.totalSent,
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-primary/5 dark:bg-primary/10",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        <RenoHomeHeader />

        <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 xl:px-12 py-4 md:py-6 lg:py-8 bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
          <div className="max-w-[1600px] mx-auto space-y-5 md:space-y-6 px-4 lg:px-8">
            {/* Page title */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Gestión de Emails
                </h1>
                <p className="text-sm text-muted-foreground">
                  Revisa, aprueba y envía los emails de actualización a clientes
                </p>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {kpiCards.map((kpi) => (
                <Card key={kpi.label} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0",
                          kpi.bgColor
                        )}
                      >
                        <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xl font-bold text-foreground leading-none">
                          {loading ? "—" : kpi.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {kpi.label}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por propiedad, email o asunto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="draft">Pendientes de envío</SelectItem>
                  <SelectItem value="sent">Enviados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Cargando..."
                  : `${filtered.length} email${filtered.length !== 1 ? "s" : ""}`}
              </p>
              {statusFilter !== "all" || searchQuery.trim() ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                  className="text-xs"
                >
                  Limpiar filtros
                </Button>
              ) : null}
            </div>

            {/* Email table */}
            <Card className="border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Estado</TableHead>
                      <TableHead>Propiedad</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Email cliente
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Asunto
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Fecha
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-12 text-muted-foreground"
                        >
                          Cargando emails...
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-12"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Inbox className="h-8 w-8 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                              {searchQuery || statusFilter !== "all"
                                ? "No se encontraron emails con esos filtros"
                                : "No hay emails"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((email) => (
                        <TableRow
                          key={email.id}
                          className="hover:bg-accent/40 cursor-pointer"
                          onClick={() => setPreviewEmail(email)}
                        >
                          <TableCell>
                            {email.status === "draft" ? (
                              <Badge
                                variant="secondary"
                                className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1"
                              >
                                <Clock className="h-3 w-3" />
                                Pendiente
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Enviado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-0">
                              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate max-w-[200px]">
                                {email.property_address ??
                                  email.property_unique_id ??
                                  email.property_id.slice(0, 8)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground truncate block max-w-[200px]">
                              {email.client_email ?? "Sin email"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground truncate block max-w-[250px]">
                              {email.subject ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDate(email.sent_at)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div
                              className="flex items-center justify-end gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPreviewEmail(email)}
                                className="h-8 gap-1"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden xl:inline">Ver</span>
                              </Button>
                              {email.status === "draft" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveAndSend(email)}
                                  disabled={sending === email.id}
                                  className="h-8 gap-1"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  <span className="hidden xl:inline">
                                    {sending === email.id
                                      ? "Enviando..."
                                      : "Aprobar y enviar"}
                                  </span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {previewEmail && (
        <Dialog
          open={!!previewEmail}
          onOpenChange={(open) => {
            if (!open) setPreviewEmail(null);
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {previewEmail.subject ?? "Preview email"}
              </DialogTitle>
              <div className="text-sm text-muted-foreground">
                Para: {previewEmail.client_email ?? "—"} ·{" "}
                {previewEmail.property_address ??
                  previewEmail.property_unique_id ??
                  previewEmail.property_id}
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
                  {sending === previewEmail.id
                    ? "Enviando..."
                    : "Aprobar y enviar"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
