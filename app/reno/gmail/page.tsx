"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoHomeHeader } from "@/components/reno/reno-home-header";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { useGmail, type GmailMessage, type GmailMessageDetail } from "@/hooks/useGmail";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

  // Compose dialog
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  // Reply
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
      gmail.fetchMessages({ label });
    },
    [gmail.fetchMessages]
  );

  const handleSelectMessage = useCallback(
    async (msg: GmailMessage) => {
      setSelectedMessage(msg);
      setLoadingDetail(true);
      setShowReply(false);
      const detail = await gmail.fetchMessageDetail(msg.id);
      setMessageDetail(detail);
      setLoadingDetail(false);
    },
    [gmail.fetchMessageDetail]
  );

  const handleSendEmail = useCallback(async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      toast.error("Rellena todos los campos");
      return;
    }
    const ok = await gmail.sendMessage(composeTo, composeSubject, composeBody);
    if (ok) {
      setShowCompose(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      gmail.fetchMessages({ label: activeLabel });
    }
  }, [composeTo, composeSubject, composeBody, gmail.sendMessage, gmail.fetchMessages, activeLabel]);

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

  const loading = authLoading || gmail.isLoading;

  const LABELS = [
    { id: "INBOX", label: "Bandeja de entrada", icon: Inbox },
    { id: "SENT", label: "Enviados", icon: Send },
    { id: "STARRED", label: "Destacados", icon: Mail },
  ];

  // ── Not connected state ──
  const renderConnectView = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Conecta tu cuenta de Gmail</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Para leer y enviar correos desde la aplicación necesitas vincular tu cuenta de Google.
          {gmail.isConnected && !gmail.hasGmailScope && (
            <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
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

  // ── Message list ──
  const renderMessageList = () => (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="flex items-center gap-2 p-3 border-b">
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
        <Button variant="ghost" size="icon" onClick={() => gmail.fetchMessages({ label: activeLabel })} title="Actualizar">
          <RefreshCw className={cn("h-4 w-4", gmail.isFetching && "animate-spin")} />
        </Button>
        <Button onClick={() => setShowCompose(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo</span>
        </Button>
      </div>

      {/* Label tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b overflow-x-auto">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {gmail.isFetching && gmail.messages.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : gmail.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MailOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No hay correos</p>
          </div>
        ) : (
          <>
            {gmail.messages.map((msg) => (
              <button
                key={msg.id}
                type="button"
                onClick={() => handleSelectMessage(msg)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b hover:bg-accent/50 transition-colors",
                  msg.isUnread && "bg-primary/5",
                  selectedMessage?.id === msg.id && "bg-accent"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold",
                      msg.isUnread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {extractSenderName(msg.from).charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm truncate", msg.isUnread ? "font-semibold" : "font-medium")}>
                        {extractSenderName(msg.from)}
                      </p>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {formatEmailDate(msg.date)}
                      </span>
                    </div>
                    <p className={cn("text-sm truncate", msg.isUnread ? "font-medium text-foreground" : "text-foreground")}>
                      {msg.subject || "(Sin asunto)"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {msg.snippet}
                    </p>
                  </div>
                </div>
              </button>
            ))}
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
      <div className="flex items-center gap-2 p-3 border-b">
        <Button variant="ghost" size="icon" onClick={() => { setSelectedMessage(null); setMessageDetail(null); }}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-medium truncate flex-1">
          {messageDetail?.subject || selectedMessage?.subject || "Cargando..."}
        </h3>
      </div>

      {loadingDetail ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : messageDetail ? (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{extractSenderName(messageDetail.from)}</p>
                <span className="text-xs text-muted-foreground">{formatEmailDate(messageDetail.date)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{messageDetail.from}</p>
              <p className="text-xs text-muted-foreground">Para: {messageDetail.to}</p>
            </div>

            <div className="border-t pt-4" />

            {/* Body */}
            {messageDetail.html ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(messageDetail.html) }}
              />
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-sans text-foreground">{messageDetail.text}</pre>
            )}

            {/* Reply area */}
            <div className="border-t pt-4">
              {!showReply ? (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowReply(true)}>
                  <Send className="h-3.5 w-3.5" />
                  Responder
                </Button>
              ) : (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Escribe tu respuesta..."
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={5}
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
        <RenoHomeHeader />

        <div className="flex-1 overflow-hidden px-4 md:px-6 lg:px-8 xl:px-12 py-4 md:py-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
          {loading ? (
            <VistralLogoLoader className="min-h-[400px]" />
          ) : !gmail.isConnected || !gmail.hasGmailScope ? (
            <Card className="max-w-2xl mx-auto mt-8">
              <CardContent className="pt-6">
                {renderConnectView()}
              </CardContent>
            </Card>
          ) : (
            <div className="max-w-[1200px] mx-auto h-full">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Gmail
                </h1>
                <Button variant="ghost" size="sm" onClick={gmail.disconnect} className="gap-1.5 text-xs text-muted-foreground">
                  <Link2Off className="h-3.5 w-3.5" />
                  Desconectar
                </Button>
              </div>
              <Card className="h-[calc(100vh-200px)] overflow-hidden">
                {selectedMessage ? renderMessageDetail() : renderMessageList()}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Compose dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo correo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Para (email)"
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
            />
            <Input
              placeholder="Asunto"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
            />
            <Textarea
              placeholder="Escribe tu mensaje..."
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={8}
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
