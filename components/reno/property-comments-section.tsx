"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Plus, Bell, BellOff } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { usePropertyComments, PropertyComment } from "@/hooks/usePropertyComments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MentionsTextarea } from "@/components/reno/mentions-textarea";
import { DateTimePicker } from "@/components/property/datetime-picker";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

interface PropertyCommentsSectionProps {
  propertyId: string;
  property: Property;
  supabaseProperty?: any;
}

/**
 * PropertyCommentsSection Component
 * 
 * Sección de comentarios integrada en el tab "Tareas"
 * - Muestra solo los últimos 3 comentarios por defecto
 * - Opción de expandir para ver todos
 * - Formulario para agregar nuevos comentarios con @mentions
 */
export function PropertyCommentsSection({
  propertyId,
  property,
  supabaseProperty,
}: PropertyCommentsSectionProps) {
  const { t, language } = useI18n();
  const { comments, loading, addComment, refetch } = usePropertyComments(propertyId);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReminder, setIsReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState<string | undefined>(undefined);
  const [hasSyncedNextSteps, setHasSyncedNextSteps] = useState(false);
  const supabase = createClient();

  // Sincronizar "Next Reno Steps" como comentario si existe
  useEffect(() => {
    const syncNextRenoSteps = async () => {
      if (!propertyId || !supabaseProperty || hasSyncedNextSteps || loading) return;

      const nextRenoSteps = supabaseProperty?.next_reno_steps;
      if (!nextRenoSteps) return;

      // Verificar si ya existe un comentario con este texto
      const existingComment = comments.find(
        (c) => c.comment_text.includes(nextRenoSteps) || c.comment_text.startsWith("Próximos pasos:")
      );

      if (existingComment) {
        setHasSyncedNextSteps(true);
        return;
      }

      try {
        // Obtener usuario actual
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const createdBy = user?.email || user?.id || null;

        // Crear comentario automáticamente
        const { error: insertError } = await supabase
          .from("property_comments")
          .insert({
            property_id: propertyId,
            comment_text: `Próximos pasos: ${nextRenoSteps}`,
            created_by: createdBy,
            is_reminder: false,
          });

        if (!insertError) {
          setHasSyncedNextSteps(true);
          // Refrescar comentarios
          await refetch();
        }
      } catch (error) {
        console.error("Error syncing Next Reno Steps as comment:", error);
      }
    };

    syncNextRenoSteps();
  }, [propertyId, supabaseProperty, comments, loading, hasSyncedNextSteps, refetch, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await addComment(newComment, isReminder, reminderDate);
    if (success) {
      setNewComment("");
      setIsReminder(false);
      setReminderDate(undefined);
    }
    setIsSubmitting(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Use locale-aware formatting
    const locale = language === "es" ? "es-ES" : "en-US";
    const timeLabels = language === "es" 
      ? { now: "Ahora", min: "min", h: "h", days: "días", ago: "Hace" }
      : { now: "Now", min: "min", h: "h", days: "days", ago: "Ago" };

    if (diffMins < 1) return timeLabels.now;
    if (diffMins < 60) return `${timeLabels.ago} ${diffMins} ${timeLabels.min}`;
    if (diffHours < 24) return `${timeLabels.ago} ${diffHours} ${timeLabels.h}`;
    if (diffDays < 7) return `${timeLabels.ago} ${diffDays} ${timeLabels.days}`;
    
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Remove title when in sidebar - it's handled by parent */}

      {/* Add New Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <MentionsTextarea
          value={newComment}
          onChange={setNewComment}
          placeholder={t.comments.placeholder}
          rows={3}
          className="resize-none text-sm"
          disabled={isSubmitting}
        />
        
        {/* Reminder Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReminder(!isReminder)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors",
              isReminder
                ? "bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)]/20 text-[var(--prophero-blue-700)] dark:text-[var(--prophero-blue-400)]"
                : "bg-[var(--prophero-gray-100)] dark:bg-[#1a1a1a] text-muted-foreground hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[#262626]"
            )}
          >
            {isReminder ? (
              <>
                <Bell className="h-3.5 w-3.5" />
                {t.comments.reminder}
              </>
            ) : (
              <>
                <BellOff className="h-3.5 w-3.5" />
                {t.comments.addReminder}
              </>
            )}
          </button>
        </div>

        {/* Reminder Date & Time Picker */}
        {isReminder && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              {t.comments.reminderDateTime}
            </Label>
            <DateTimePicker
              value={reminderDate}
              onChange={setReminderDate}
              placeholder={t.comments.reminderDateTimePlaceholder}
              errorMessage={t.comments.reminderDateTimeError}
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!newComment.trim() || isSubmitting || (isReminder && !reminderDate)}
            size="sm"
            className="w-full bg-[var(--prophero-blue-500)] hover:bg-[var(--prophero-blue-600)] text-white transition-colors"
          >
            {isSubmitting ? (
              <>
                <span className="mr-2">{t.comments.saving}</span>
                <span className="animate-spin">⏳</span>
              </>
            ) : (
              <>
                {isReminder ? (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    {t.comments.createReminder}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {t.comments.add}
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Comments History - Show existing comments */}
      {!loading && comments.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t.comments.history}
          </h5>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} formatDate={formatDate} />
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-2">
          <p className="text-xs text-muted-foreground text-center">{t.comments.loading}</p>
        </div>
      )}

      {/* Empty state - only show if no comments */}
      {!loading && comments.length === 0 && (
        <div className="py-2">
          <p className="text-xs text-muted-foreground text-center">
            {t.comments.noComments}
          </p>
        </div>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: PropertyComment;
  formatDate: (date: string) => string;
}

function CommentItem({ comment, formatDate }: CommentItemProps) {
  const { t, language } = useI18n();
  // Parse mentions from comment text (@username)
  const parseMentions = (text: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.substring(lastIndex, match.index) });
      }
      // Add mention
      parts.push({
        type: "mention",
        content: match[0],
        username: match[1],
      });
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.substring(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: "text", content: text }];
  };

  const parts = parseMentions(comment.comment_text);
  const isReminder = comment.is_reminder || false;
  const reminderDate = comment.reminder_date;

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors",
      isReminder
        ? "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-900)]/20 border-[var(--prophero-blue-200)] dark:border-[var(--prophero-blue-800)]"
        : "bg-[var(--prophero-gray-50)] dark:bg-[#1a1a1a] border-[var(--prophero-gray-200)] dark:border-[#333333]"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isReminder
            ? "bg-[var(--prophero-blue-200)] dark:bg-[var(--prophero-blue-800)]"
            : "bg-[var(--prophero-gray-200)] dark:bg-[#262626]"
        )}>
          {isReminder ? (
            <Bell className="h-4 w-4 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]" />
          ) : (
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isReminder && (
                <span className="text-xs font-medium text-[var(--prophero-blue-700)] dark:text-[var(--prophero-blue-400)] bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)]/30 px-1.5 py-0.5 rounded">
                  {t.comments.reminder}
                </span>
              )}
              {comment.created_by && (
                <span className="text-xs font-medium text-foreground">
                  {comment.created_by.split("@")[0]}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDate(comment.created_at)}
              </span>
              {isReminder && reminderDate && (
                <span className="text-xs text-muted-foreground">
                  · {t.comments.remindAt}: {new Date(reminderDate).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
                    month: "short",
                    day: "numeric",
                  })} {language === "es" ? "a las" : "at"} {new Date(reminderDate).toLocaleTimeString(language === "es" ? "es-ES" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {parts.map((part, index) => {
              if (part.type === "mention") {
                return (
                  <span
                    key={index}
                    className="font-medium text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-900)]/20 px-1.5 py-0.5 rounded"
                  >
                    {part.content}
                  </span>
                );
              }
              return <span key={index}>{part.content}</span>;
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

