"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Ban, Lightbulb } from "lucide-react";
import { useSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";
import { cn } from "@/lib/utils";

type ReportType = "blocker" | "idea";

interface ReportProblemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyName: string;
  onSuccess?: () => void;
}

const WEBHOOK_URL = "https://n8n.prod.prophero.com/webhook/88e5639a-7639-4f5c-8d40-128eeb60b712";

export function ReportProblemModal({
  open,
  onOpenChange,
  propertyName,
  onSuccess,
}: ReportProblemModalProps) {
  const { user } = useSupabaseAuthContext();
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reportType) {
      setError("Por favor, selecciona el tipo de reporte");
      return;
    }
    if (!message.trim()) {
      setError("Por favor, describe el problema");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const timestamp = new Date().toISOString();

      const userInfo = user
        ? {
            userId: user.id,
            userEmail: user.email ?? null,
            userName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null,
          }
        : null;

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: {
            propertyName: propertyName,
            message: message.trim(),
            timestamp: timestamp,
            user: userInfo,
            type: reportType,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Error al enviar el reporte: ${response.statusText}`);
      }

      // Success - reset form and close
      setReportType(null);
      setMessage("");
      setError(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el reporte");
      console.error("Error reporting problem:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReportType(null);
      setMessage("");
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reportar Problema</DialogTitle>
          <DialogDescription>
            Describe el problema que has encontrado con esta propiedad. Tu reporte será enviado al equipo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="property-name">Propiedad</Label>
            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
              {propertyName}
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              ¿Qué tipo de reporte es? <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setReportType("blocker");
                  setError(null);
                }}
                disabled={isSubmitting}
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-lg border-2 px-4 py-3 text-left transition-colors",
                  reportType === "blocker"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600"
                    : "border-border hover:border-amber-300 dark:hover:border-amber-800"
                )}
              >
                <Ban className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                <div>
                  <span className="font-medium">Blocker</span>
                  <p className="text-xs text-muted-foreground">Bloquea mi trabajo del día de hoy</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportType("idea");
                  setError(null);
                }}
                disabled={isSubmitting}
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-lg border-2 px-4 py-3 text-left transition-colors",
                  reportType === "idea"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-600"
                    : "border-border hover:border-blue-300 dark:hover:border-blue-800"
                )}
              >
                <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                <div>
                  <span className="font-medium">Idea / Propuesta</span>
                  <p className="text-xs text-muted-foreground">Mejora o sugerencia</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="problem-message">
              Descripción del problema <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="problem-message"
              placeholder="Describe el problema que has encontrado..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError(null);
              }}
              rows={5}
              disabled={isSubmitting}
              className="resize-none"
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !reportType || !message.trim()}
          >
            {isSubmitting ? "Enviando..." : "Enviar Reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

