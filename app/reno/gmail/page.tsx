"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { useGmail, type GmailMessage, type GmailMessageDetail } from "@/hooks/useGmail";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail,
  Search,
  RefreshCw,
  Send,
  ArrowLeft,
  Inbox,
  Plus,
  Loader2,
  Link2Off,
  MailOpen,
  ChevronDown,
  Trash2,
  Star,
  CheckCheck,
  MailX,
  ChevronsUpDown,
  Reply,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";

function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "div", "span", "p", "br", "b", "i", "u", "strong", "em", "a",
      "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
      "table", "thead", "tbody", "tr", "td", "th", "img", "blockquote",
      "pre", "code", "hr", "style",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "class", "style", "target", "width", "height"],
  });
}

function formatEmailDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return "Ayer";
    }
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
}

function extractSenderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  const emailMatch = from.match(/([^@]+)@/);
  if (emailMatch) return emailMatch[1];
  return from;
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1];
  if (from.includes("@")) return from.trim();
  return from;
}

const LABELS = [
  { id: "INBOX", label: "Bandeja de entrada", icon: Inbox },
  { id: "SENT", label: "Enviados", icon: Send },
  { id: "STARRED", label: "Destacados", icon: Star },
  { id: "TRASH", label: "Papelera", icon: Trash2 },
];

export default function GmailPage() {
  const router = useRouter();
  const { user, role, isLoading: authLoading } = useAppAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const gmail = useGmail();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeLabel, setActiveLabel] = useState<string>("INBOX");
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);
  const [messageDetail, setMessageDetail] = useState<GmailMessageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);

  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState("");

  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !role) {
      router.push("/login");
      return;
    }
    if (role === "architect") {
      router.push("/reno/architect");
      toast.error("No tienes acceso a esta sección");
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    if (!gmail.isLoading && gmail.isConnected && gmail.hasGmailScope && !initialLoadDone.current) {
      initialLoadDone.current = true;
      gmail.fetchMessages({ label: activeLabel });
    }
  }, [gmail.isLoading, gmail.isConnected, gmail.hasGmailScope]);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      gmail.fetchMessages({ label: activeLabel });
    } else {
      gmail.fetchMessages({ q: searchQuery, label: activeLabel });
    }
  }, [searchQuery, activeLabel, gmail.fetchMessages]);

  const handleLabelChange = useCallback(
    (label: string) => {
      setActiveLabel(label);
      setSelectedMessage(null);
      setMessageDetail(null);
      gmail.clearSelection();
      gmail.fetchMessages({ label });
    },
    [gmail.fetchMessages, gmail.clearSelection]
  );

  const handleSelectMessage = useCallback(
    async (msg: GmailMessage) => {
      setSelectedMessage(msg);
      setLoadingDetail(true);
      setShowReply(false);
      const detail = await gmail.fetchMessageDetail(msg.id);
      setMessageDetail(detail);
      setLoadingDetail(false);
      if (msg.isUnread) {
        gmail.markAsRead([msg.id]);
      }
    },
    [gmail.fetchMessageDetail, gmail.markAsRead]
  );

  const handleBack = useCallback(() => {
    setSelectedMessage(null);
    setMessageDetail(null);
    setShowReply(false);
  }, []);

  const handleSendEmail = useCallback(async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      toast.error("Rellena todos los campos obligatorios");
      return;
    }
    const opts: { cc?: string; bcc?: string } = {};
    if (composeCc.trim()) opts.cc = composeCc.trim();
    if (composeBcc.trim()) opts.bcc = composeBcc.trim();
    const ok = await gmail.sendMessage(composeTo, composeSubject, composeBody, opts);
    if (ok) {
      setShowCompose(false);
      setComposeTo("");
      setComposeCc("");
      setComposeBcc("");
      setComposeSubject("");
      setComposeBody("");
      setShowCcBcc(false);
      gmail.fetchMessages({ label: activeLabel });
    }
  }, [composeTo, composeCc, composeBcc, composeSubject, composeBody, gmail.sendMessage, gmail.fetchMessages, activeLabel]);

  const handleSendReply = useCallback(async () => {
    if (!replyBody || !selectedMessage || !messageDetail) return;
    const ok = await gmail.sendMessage(
      messageDetail.from,
      `Re: ${messageDetail.subject}`,
      replyBody
    );
    if (ok) {
      setShowReply(false);
      setReplyBody("");
    }
  }, [replyBody, selectedMessage, messageDetail, gmail.sendMessage]);

  const handleLoadMore = useCallback(() => {
    if (gmail.nextPageToken) {
      gmail.fetchMessages({ label: activeLabel, pageToken: gmail.nextPageToken, q: searchQuery || undefined });
    }
  }, [gmail.nextPageToken, gmail.fetchMessages, activeLabel, searchQuery]);

  const handleBulkMarkRead = useCallback(() => {
    const ids = Array.from(gmail.selectedIds);
    gmail.markAsRead(ids);
    gmail.clearSelection();
  }, [gmail.selectedIds, gmail.markAsRead, gmail.clearSelection]);

  const handleBulkMarkUnread = useCallback(() => {
    const ids = Array.from(gmail.selectedIds);
    gmail.markAsUnread(ids);
    gmail.clearSelection();
  }, [gmail.selectedIds, gmail.markAsUnread, gmail.clearSelection]);

  const handleBulkTrash = useCallback(() => {
    const ids = Array.from(gmail.selectedIds);
    gmail.trashMessages(ids);
  }, [gmail.selectedIds, gmail.trashMessages]);

  const handleTrashSingle = useCallback(async () => {
    if (!selectedMessage) return;
    await gmail.trashMessages([selectedMessage.id]);
    handleBack();
  }, [selectedMessage, gmail.trashMessages, handleBack]);

  const loading = authLoading || gmail.isLoading;
  const hasSelection = gmail.selectedIds.size > 0;
  const allSelected = gmail.messages.length > 0 && gmail.selectedIds.size === gmail.messages.length;

  // ── Not connected ──
  const renderConnectView = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Mail className="h-10 w-10 text-primary" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Conecta tu cuenta de Gmail</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Para leer y enviar correos desde la aplicación necesitas vincular tu cuenta de Google.
          {gmail.isConnected && !gmail.hasGmailScope && (
            <span className="block mt-2 text-warning dark:text-warning font-medium">
              Tu cuenta está conectada a Google Calendar pero necesitas reconectar para habilitar
              los permisos de Gmail.
            </span>
          )}
        </p>
      </div>
      <Button onClick={gmail.connect} size="lg" className="gap-2">
        <Mail className="h-4 w-4" />
        {gmail.isConnected && !gmail.hasGmailScope ? "Reconectar con permisos de Gmail" : "Conectar con Google"}
      </Button>
    </div>
  );

  // ── Sidebar labels ──
  const renderLabelSidebar = () => (
    <div className="w-52 flex-shrink-0 border-r bg-card hidden md:flex flex-col">
      <div className="p-3">
        <Button onClick={() => setShowCompose(true)} className="w-full gap-2" size="sm">
          <Plus className="h-4 w-4" />
          Nuevo correo
        </Button>
      </div>
      <nav className="flex-1 px-2 space-y-0.5">
        {LABELS.map((l) => {
          const Icon = l.icon;
          const isActive = activeLabel === l.id;
          return (
            <button
              key={l.id}
              onClick={() => handleLabelChange(l.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {l.label}
            </button>
          );
        })}
      </nav>
    </div>
  );

  // ── Bulk actions bar ──
  const renderBulkActions = () => (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-accent/30">
      <Checkbox
        checked={allSelected}
        onCheckedChange={(v) => (v ? gmail.selectAll() : gmail.clearSelection())}
        className="mr-1"
      />
      <span className="text-xs text-muted-foreground mr-2">
        {gmail.selectedIds.size} seleccionado{gmail.selectedIds.size !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={handleBulkMarkRead} className="h-7 gap-1 text-xs px-2">
          <CheckCheck className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Marcar leído</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleBulkMarkUnread} className="h-7 gap-1 text-xs px-2">
          <MailX className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">No leído</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleBulkTrash} className="h-7 gap-1 text-xs text-destructive hover:text-destructive px-2">
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Eliminar</span>
        </Button>
      </div>
    </div>
  );

  // ── Mobile label tabs ──
  const renderMobileLabelTabs = () => (
    <div className="flex items-center gap-1 px-3 py-2 border-b overflow-x-auto md:hidden">
      {LABELS.map((l) => {
        const Icon = l.icon;
        return (
          <button
            key={l.id}
            onClick={() => handleLabelChange(l.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
              activeLabel === l.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {l.label}
          </button>
        );
      })}
    </div>
  );

  // ── Message list ──
  const renderMessageList = () => (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="flex items-center gap-2 p-3 border-b">
        <Checkbox
          checked={allSelected && gmail.messages.length > 0}
          onCheckedChange={(v) => (v ? gmail.selectAll() : gmail.clearSelection())}
          className="hidden sm:flex"
        />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar correos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9 h-9"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={() => gmail.fetchMessages({ label: activeLabel })} title="Actualizar" className="h-9 w-9">
          <RefreshCw className={cn("h-4 w-4", gmail.isFetching && "animate-spin")} />
        </Button>
        <Button onClick={() => setShowCompose(true)} size="sm" className="gap-1.5 md:hidden">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile label tabs */}
      {renderMobileLabelTabs()}

      {/* Bulk actions */}
      {hasSelection && renderBulkActions()}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {gmail.isFetching && gmail.messages.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : gmail.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MailOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No hay correos</p>
          </div>
        ) : (
          <>
            {gmail.messages.map((msg) => {
              const isSelected = gmail.selectedIds.has(msg.id);
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-start gap-0 border-b transition-colors group",
                    msg.isUnread && "bg-brand-50/60 dark:bg-brand-900/20",
                    isSelected && "bg-primary/5",
                    selectedMessage?.id === msg.id && "bg-accent",
                    "hover:bg-accent/50"
                  )}
                >
                  {/* Checkbox */}
                  <div className="flex items-center justify-center w-10 pt-3.5 flex-shrink-0">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => gmail.toggleSelect(msg.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {/* Message row */}
                  <button
                    type="button"
                    onClick={() => handleSelectMessage(msg)}
                    className="flex-1 text-left px-2 py-3 min-w-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold",
                          msg.isUnread
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {extractSenderName(msg.from).charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-sm truncate", msg.isUnread ? "font-semibold" : "font-normal text-foreground/80")}>
                            {extractSenderName(msg.from)}
                          </p>
                          <span className="text-[11px] text-muted-foreground flex-shrink-0">
                            {formatEmailDate(msg.date)}
                          </span>
                        </div>
                        <p className={cn(
                          "text-sm truncate",
                          msg.isUnread ? "font-medium text-foreground" : "text-foreground/70"
                        )}>
                          {msg.subject || "(Sin asunto)"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {msg.snippet}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
            {gmail.nextPageToken && (
              <div className="p-4 flex justify-center">
                <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={gmail.isFetching} className="gap-1.5">
                  {gmail.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
                  Cargar más
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ── Message detail ──
  const renderMessageDetail = () => (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b">
        <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0" />
        <Button variant="ghost" size="icon" onClick={handleTrashSingle} title="Eliminar" className="h-8 w-8 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {loadingDetail ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : messageDetail ? (
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Subject */}
            <h2 className="text-lg font-semibold leading-tight">
              {messageDetail.subject || "(Sin asunto)"}
            </h2>

            {/* Sender info */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {extractSenderName(messageDetail.from).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{extractSenderName(messageDetail.from)}</p>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{formatEmailDate(messageDetail.date)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{extractEmail(messageDetail.from)}</p>
                <p className="text-xs text-muted-foreground truncate">Para: {messageDetail.to}</p>
              </div>
            </div>

            <div className="border-t" />

            {/* Body */}
            {messageDetail.html ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto [&_img]:max-w-full [&_table]:text-sm"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(messageDetail.html) }}
              />
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">{messageDetail.text}</pre>
            )}

            {/* Reply area */}
            <div className="border-t pt-5">
              {!showReply ? (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowReply(true)}>
                  <Reply className="h-3.5 w-3.5" />
                  Responder
                </Button>
              ) : (
                <div className="space-y-3 rounded-lg border p-4 bg-accent/20">
                  <p className="text-xs text-muted-foreground">
                    Respondiendo a <span className="font-medium text-foreground">{extractSenderName(messageDetail.from)}</span>
                  </p>
                  <Textarea
                    placeholder="Escribe tu respuesta..."
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={5}
                    className="bg-background"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSendReply} disabled={gmail.isSending || !replyBody.trim()} className="gap-1.5">
                      {gmail.isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Enviar respuesta
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowReply(false); setReplyBody(""); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        {/* Custom Gmail header */}
        <header className="border-b bg-card h-[64px] min-h-[64px] flex items-center">
          <div className="pl-14 md:pl-6 pr-3 md:pr-6 w-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-semibold leading-tight">Gmail</h1>
                {user?.email && (
                  <p className="text-xs text-muted-foreground leading-tight">{user.email}</p>
                )}
              </div>
            </div>
            {gmail.isConnected && gmail.hasGmailScope && (
              <Button variant="ghost" size="sm" onClick={gmail.disconnect} className="gap-1.5 text-xs text-muted-foreground">
                <Link2Off className="h-3.5 w-3.5" />
                Desconectar
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-background dark:bg-background">
          {loading ? (
            <VistralLogoLoader className="min-h-[400px]" />
          ) : !gmail.isConnected || !gmail.hasGmailScope ? (
            <div className="flex items-center justify-center h-full p-6">
              <Card className="max-w-2xl w-full">
                <CardContent className="pt-6">
                  {renderConnectView()}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex h-full">
              {/* Label sidebar (desktop) */}
              {!selectedMessage && renderLabelSidebar()}

              {/* Main content */}
              <div className="flex-1 overflow-hidden">
                <Card className="h-full rounded-none md:rounded-tl-xl border-0 md:border-l overflow-hidden shadow-none">
                  {selectedMessage ? renderMessageDetail() : renderMessageList()}
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Nuevo correo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Input
                placeholder="Para (email)"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
              />
              {!showCcBcc && (
                <button
                  type="button"
                  onClick={() => setShowCcBcc(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <ChevronsUpDown className="h-3 w-3" />
                  CC / BCC
                </button>
              )}
              {showCcBcc && (
                <>
                  <Input
                    placeholder="CC (opcional)"
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                  />
                  <Input
                    placeholder="BCC (opcional)"
                    value={composeBcc}
                    onChange={(e) => setComposeBcc(e.target.value)}
                  />
                </>
              )}
            </div>
            <Input
              placeholder="Asunto"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
            />
            <Textarea
              placeholder="Escribe tu mensaje..."
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={10}
              className="min-h-[200px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCompose(false)}>Cancelar</Button>
            <Button onClick={handleSendEmail} disabled={gmail.isSending || !composeTo || !composeSubject || !composeBody} className="gap-1.5">
              {gmail.isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
