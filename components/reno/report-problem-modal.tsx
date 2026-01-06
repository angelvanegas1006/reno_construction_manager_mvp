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
import { AlertCircle } from "lucide-react";

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
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("Por favor, describe el problema");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const timestamp = new Date().toISOString();
      
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
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Error al enviar el reporte: ${response.statusText}`);
      }

      // Success - reset form and close
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
            disabled={isSubmitting || !message.trim()}
          >
            {isSubmitting ? "Enviando..." : "Enviar Reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

