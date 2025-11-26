"use client";

import { useHelpConversations, type HelpConversation } from "@/hooks/useHelpConversations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, MessageSquare, Home, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

export default function NotificationsPage() {
  const { t, language } = useI18n();
  const { conversations, loading, error, markAsRead } = useHelpConversations();
  const [selectedConversation, setSelectedConversation] = useState<HelpConversation | null>(null);
  
  // Select locale based on current language
  const dateLocale = language === "en" ? enUS : es;

  const handleConversationClick = async (conversation: HelpConversation) => {
    setSelectedConversation(conversation);
    // Mark as read when opened
    if (!conversation.is_read && conversation.response_message) {
      await markAsRead(conversation.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--prophero-blue-600)] mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">{t.notifications.loadingConversations}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t.notifications.noConversations}</h3>
            <p className="text-sm text-muted-foreground">
              {t.notifications.noConversationsDescription}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t.notifications.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t.notifications.description}
        </p>
      </div>

      <div className="space-y-4">
        {conversations.map((conversation) => {
          const hasResponse = !!conversation.response_message;
          const isUnread = !conversation.is_read && hasResponse;
          const responseDate = conversation.response_received_at
            ? new Date(conversation.response_received_at)
            : null;

          return (
            <Card
              key={conversation.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isUnread && "border-[var(--prophero-blue-500)] border-2"
              )}
              onClick={() => handleConversationClick(conversation)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">
                        {conversation.error_type === "property"
                          ? t.notifications.propertyError
                          : t.notifications.generalError}
                      </CardTitle>
                      {isUnread && (
                        <Badge variant="default" className="bg-[var(--prophero-blue-600)]">
                          {t.notifications.new}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(conversation.created_at), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </CardDescription>
                  </div>
                  {conversation.error_type === "property" && conversation.property_address && (
                    <Badge variant="outline" className="ml-2">
                      <Home className="h-3 w-3 mr-1" />
                      {t.notifications.property}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Mensaje original */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{t.notifications.yourMessage}</p>
                    <p className="text-sm">{conversation.original_message}</p>
                  </div>

                  {/* Respuesta */}
                  {hasResponse ? (
                    <div className="bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-900)]/20 rounded-lg p-4 border border-[var(--prophero-blue-200)] dark:border-[var(--prophero-blue-800)]">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-[var(--prophero-blue-700)] dark:text-[var(--prophero-blue-300)]">
                          {t.notifications.teamResponse}
                        </p>
                        {responseDate && (
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(responseDate, { addSuffix: true, locale: dateLocale })}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{conversation.response_message}</p>
                    </div>
                  ) : (
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        {t.notifications.waitingForResponse}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog para ver conversación completa */}
      {selectedConversation && (
        <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedConversation.error_type === "property"
                  ? t.notifications.propertyError
                  : t.notifications.generalError}
              </DialogTitle>
              <DialogDescription>
                {formatDistanceToNow(new Date(selectedConversation.created_at), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {selectedConversation.error_type === "property" &&
                selectedConversation.property_address && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      {t.notifications.propertyLabel}
                    </p>
                    <p className="text-sm">{selectedConversation.property_address}</p>
                    {selectedConversation.property_airtable_id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: {selectedConversation.property_airtable_id}
                      </p>
                    )}
                  </div>
                )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t.notifications.yourMessage}</p>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedConversation.original_message}
                  </p>
                </div>
              </div>

              {selectedConversation.response_message ? (
                <div>
                  <p className="text-xs font-semibold text-[var(--prophero-blue-700)] dark:text-[var(--prophero-blue-300)] mb-2">
                    {t.notifications.teamResponse}
                  </p>
                  <div className="bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-900)]/20 rounded-lg p-4 border border-[var(--prophero-blue-200)] dark:border-[var(--prophero-blue-800)]">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedConversation.response_message}
                    </p>
                    {selectedConversation.response_received_at && (
                      <p className="text-xs text-muted-foreground mt-3">
                        {formatDistanceToNow(
                          new Date(selectedConversation.response_received_at),
                          { addSuffix: true, locale: dateLocale }
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t.notifications.waitingForResponse}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

