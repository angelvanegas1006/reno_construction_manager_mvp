"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { toast } from "sonner";

export interface GmailMessage {
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

export interface GmailMessageDetail {
  text: string;
  html: string;
  subject: string;
  from: string;
  to: string;
  date: string;
}

interface GmailState {
  isConnected: boolean;
  hasGmailScope: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  messages: GmailMessage[];
  nextPageToken: string | null;
  total: number;
  isFetching: boolean;
  isSending: boolean;
  error: string | null;
}

export function useGmail() {
  const { user } = useAppAuth();
  const [state, setState] = useState<GmailState>({
    isConnected: false,
    hasGmailScope: false,
    isConfigured: false,
    isLoading: true,
    messages: [],
    nextPageToken: null,
    total: 0,
    isFetching: false,
    isSending: false,
    error: null,
  });

  const checkStatus = useCallback(async () => {
    if (!user) {
      setState((prev) => ({ ...prev, isLoading: false, isConnected: false }));
      return;
    }
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const res = await fetch("/api/gmail/status");
      if (!res.ok) throw new Error("Failed to check Gmail status");
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        isConnected: data.connected || false,
        hasGmailScope: data.hasGmailScope || false,
        isConfigured: data.configured !== false,
        isLoading: false,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isConnected: false,
        error: err.message,
      }));
    }
  }, [user]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const connect = useCallback(() => {
    if (!user) {
      toast.error("Debes iniciar sesión para conectar Gmail");
      return;
    }
    window.location.href = "/api/google-calendar/connect?origin=gmail";
  }, [user]);

  const disconnect = useCallback(async () => {
    if (!user) return;
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const res = await fetch("/api/google-calendar/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setState((prev) => ({
        ...prev,
        isConnected: false,
        hasGmailScope: false,
        isLoading: false,
        messages: [],
      }));
      toast.success("Gmail desconectado");
    } catch (err: any) {
      setState((prev) => ({ ...prev, isLoading: false, error: err.message }));
      toast.error("Error al desconectar: " + err.message);
    }
  }, [user]);

  const fetchMessages = useCallback(
    async (opts?: { q?: string; pageToken?: string; label?: string; maxResults?: number }) => {
      if (!user || !state.isConnected) return;
      try {
        setState((prev) => ({ ...prev, isFetching: true, error: null }));
        const params = new URLSearchParams();
        if (opts?.q) params.set("q", opts.q);
        if (opts?.pageToken) params.set("pageToken", opts.pageToken);
        if (opts?.label) params.set("label", opts.label);
        if (opts?.maxResults) params.set("maxResults", opts.maxResults.toString());

        const res = await fetch(`/api/gmail/messages?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch messages");
        }
        const data = await res.json();

        setState((prev) => ({
          ...prev,
          messages: opts?.pageToken ? [...prev.messages, ...data.messages] : data.messages,
          nextPageToken: data.nextPageToken,
          total: data.total,
          isFetching: false,
        }));
      } catch (err: any) {
        setState((prev) => ({ ...prev, isFetching: false, error: err.message }));
        toast.error("Error al cargar correos: " + err.message);
      }
    },
    [user, state.isConnected]
  );

  const fetchMessageDetail = useCallback(
    async (messageId: string): Promise<GmailMessageDetail | null> => {
      if (!user) return null;
      try {
        const res = await fetch(`/api/gmail/messages/${messageId}`);
        if (!res.ok) throw new Error("Failed to fetch message detail");
        return res.json();
      } catch (err: any) {
        toast.error("Error al cargar el correo: " + err.message);
        return null;
      }
    },
    [user]
  );

  const sendMessage = useCallback(
    async (to: string, subject: string, body: string, opts?: { cc?: string; bcc?: string; inReplyTo?: string; references?: string }) => {
      if (!user) return false;
      try {
        setState((prev) => ({ ...prev, isSending: true, error: null }));
        const res = await fetch("/api/gmail/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, subject, body, ...opts }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to send message");
        }
        setState((prev) => ({ ...prev, isSending: false }));
        toast.success("Correo enviado correctamente");
        return true;
      } catch (err: any) {
        setState((prev) => ({ ...prev, isSending: false, error: err.message }));
        toast.error("Error al enviar correo: " + err.message);
        return false;
      }
    },
    [user]
  );

  return {
    ...state,
    connect,
    disconnect,
    fetchMessages,
    fetchMessageDetail,
    sendMessage,
    refresh: checkStatus,
    canConnect: !!user,
  };
}
