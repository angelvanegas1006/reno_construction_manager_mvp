"use client";

import { useState } from "react";
import { MessageSquare, Plus, Trash2, Calendar, User } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { usePropertyComments, PropertyComment } from "@/hooks/usePropertyComments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface PropertyCommentsTabProps {
  propertyId: string;
  property: Property;
}

/**
 * PropertyCommentsTab Component
 * 
 * Muestra y permite gestionar comentarios de la propiedad
 * - Lista de comentarios con timestamps
 * - Formulario para agregar nuevos comentarios
 * - Historial completo de comentarios
 */
export function PropertyCommentsTab({
  propertyId,
  property,
}: PropertyCommentsTabProps) {
  const { t } = useI18n();
  const { comments, loading, addComment, deleteComment } = usePropertyComments(propertyId);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await addComment(newComment);
    if (success) {
      setNewComment("");
    }
    setIsSubmitting(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Add New Comment Form */}
      <div className="bg-card bg-card rounded-lg border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Nuevo Comentario
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribe un comentario sobre esta propiedad..."
            rows={4}
            className="resize-none"
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <span className="mr-2">Guardando...</span>
                  <span className="animate-spin">⏳</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Comentario
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Historial de Comentarios ({comments.length})
        </h3>

        {loading && (
          <div className="bg-card bg-card rounded-lg border p-6 shadow-sm">
            <p className="text-muted-foreground text-center">Cargando comentarios...</p>
          </div>
        )}

        {!loading && comments.length === 0 && (
          <div className="bg-card bg-card rounded-lg border p-6 shadow-sm">
            <p className="text-muted-foreground text-center">
              No hay comentarios aún. Sé el primero en comentar.
            </p>
          </div>
        )}

        {!loading &&
          comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onDelete={deleteComment}
            />
          ))}
      </div>
    </div>
  );
}

interface CommentCardProps {
  comment: PropertyComment;
  onDelete: (commentId: string) => Promise<boolean>;
}

function CommentCard({ comment, onDelete }: CommentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm("¿Estás seguro de que quieres eliminar este comentario?")) {
      setIsDeleting(true);
      await onDelete(comment.id);
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-card bg-card rounded-lg border p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-base whitespace-pre-wrap">{comment.comment_text}</p>
          
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(comment.created_at)}</span>
            </div>
            {comment.created_by && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{comment.created_by}</span>
              </div>
            )}
            {comment.synced_to_airtable && (
              <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                Sincronizado con Airtable
              </span>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-shrink-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}




