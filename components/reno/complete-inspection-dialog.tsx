"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface CompleteInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicUrl: string;
}

export function CompleteInspectionDialog({
  open,
  onOpenChange,
  publicUrl,
}: CompleteInspectionDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("URL copiada al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Error al copiar la URL");
      console.error("Error copying to clipboard:", err);
    }
  };

  const handleOpenLink = () => {
    window.open(publicUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            ✅ Inspección Completada
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            La inspección ha sido completada exitosamente. Puedes compartir esta URL pública para que otros puedan ver la inspección.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              URL Pública de la Inspección
            </label>
            <div className="flex gap-2">
              <Input
                value={publicUrl}
                readOnly
                className="flex-1 font-mono text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                title="Copiar URL"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Esta URL es pública y no requiere autenticación. Cualquier persona con el enlace puede ver la inspección.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleOpenLink}
            className="w-full sm:w-auto"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir en nueva pestaña
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

