"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface PropertyComment {
  id: string;
  property_id: string;
  comment_text: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  synced_to_airtable: boolean;
  airtable_sync_date: string | null;
  is_reminder?: boolean;
  reminder_date?: string | null;
  reminder_notified?: boolean;
  reminder_notification_date?: string | null;
}

interface UsePropertyCommentsReturn {
  comments: PropertyComment[];
  loading: boolean;
  error: Error | null;
  addComment: (text: string, isReminder?: boolean, reminderDate?: string) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Hook para manejar comentarios de propiedades
 */
export function usePropertyComments(propertyId: string | null): UsePropertyCommentsReturn {
  const [comments, setComments] = useState<PropertyComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!propertyId) {
      setComments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("property_comments")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Convert null to undefined for optional fields to match PropertyComment type
      const normalizedData: PropertyComment[] = (data || []).map((item: any) => ({
        id: item.id,
        property_id: item.property_id,
        comment_text: item.comment_text,
        created_by: item.created_by,
        created_at: item.created_at,
        updated_at: item.updated_at,
        synced_to_airtable: item.synced_to_airtable,
        airtable_sync_date: item.airtable_sync_date,
        is_reminder: item.is_reminder ?? undefined,
        reminder_date: item.reminder_date ?? undefined,
        reminder_notified: item.reminder_notified ?? undefined,
        reminder_notification_date: item.reminder_notification_date ?? undefined,
      }));

      setComments(normalizedData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Error al cargar comentarios");
      setError(error);
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [propertyId, supabase]);

  // Add comment
  const addComment = useCallback(
    async (text: string, isReminder: boolean = false, reminderDate?: string): Promise<boolean> => {
      if (!propertyId || !text.trim()) {
        toast.error("El comentario no puede estar vacío");
        return false;
      }

      if (isReminder && !reminderDate) {
        toast.error("Debes seleccionar una fecha para el recordatorio");
        return false;
      }

      try {
        // Get current user (if available)
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const createdBy = user?.email || user?.id || null;

        const commentData: any = {
          property_id: propertyId,
          comment_text: text.trim(),
          created_by: createdBy,
          is_reminder: isReminder,
        };

        if (isReminder && reminderDate) {
          commentData.reminder_date = reminderDate;
        }

        const { data, error: insertError } = await supabase
          .from("property_comments")
          .insert(commentData)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        // Si es un recordatorio, crear también en la tabla de recordatorios
        if (isReminder && reminderDate && data.id) {
          await supabase
            .from("property_reminders")
            .insert({
              comment_id: data.id,
              property_id: propertyId,
              reminder_text: text.trim(),
              reminder_date: reminderDate,
              created_by: createdBy,
            });
        }

        // Add to local state (normalize null to undefined)
        const normalizedComment: PropertyComment = {
          ...data,
          is_reminder: data.is_reminder ?? undefined,
          reminder_date: data.reminder_date ?? undefined,
          reminder_notified: data.reminder_notified ?? undefined,
          reminder_notification_date: data.reminder_notification_date ?? undefined,
        };
        setComments((prev) => [normalizedComment, ...prev]);

        toast.success(isReminder ? "Recordatorio creado correctamente" : "Comentario agregado correctamente");
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Error al agregar comentario");
        console.error("Error adding comment:", error);
        toast.error("Error al agregar el comentario");
        return false;
      }
    },
    [propertyId, supabase]
  );

  // Delete comment
  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from("property_comments")
          .delete()
          .eq("id", commentId);

        if (deleteError) {
          throw deleteError;
        }

        // Remove from local state
        setComments((prev) => prev.filter((c) => c.id !== commentId));

        toast.success("Comentario eliminado");
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Error al eliminar comentario");
        console.error("Error deleting comment:", error);
        toast.error("Error al eliminar el comentario");
        return false;
      }
    },
    [supabase]
  );

  // Initial fetch
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    error,
    addComment,
    deleteComment,
    refetch: fetchComments,
  };
}

