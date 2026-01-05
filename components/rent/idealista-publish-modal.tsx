"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/rent/photo-upload";
import { Loader2, ExternalLink } from "lucide-react";
import { RentProperty } from "@/lib/rent/types";
import { getPhotosByPropertyId } from "@/lib/rent/dummy-data";

interface IdealistaPublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: RentProperty | null;
  onPublish: (data: {
    description?: string;
    photos: string[];
  }) => Promise<void>;
}

export function IdealistaPublishModal({
  open,
  onOpenChange,
  property,
  onPublish,
}: IdealistaPublishModalProps) {
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar fotos existentes cuando se abre el modal
  useEffect(() => {
    if (open && property) {
      const existingPhotos = getPhotosByPropertyId(property.id);
      setPhotos(existingPhotos);
      setDescription(property.description || "");
      setError(null);
    }
  }, [open, property]);

  const handlePublish = async () => {
    if (!property) return;

    // Validaciones
    if (photos.length === 0) {
      setError("Debes subir al menos una foto");
      return;
    }

    if (!description || description.trim().length < 50) {
      setError("La descripción debe tener al menos 50 caracteres");
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      await onPublish({
        description: description.trim(),
        photos,
      });
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Error al publicar en Idealista");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publicar en Idealista</DialogTitle>
          <DialogDescription>
            Completa la información necesaria para publicar esta propiedad en Idealista
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Información de la propiedad */}
          <div className="space-y-2">
            <Label>Propiedad</Label>
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{property.address}</p>
              <p className="text-sm text-muted-foreground">
                {property.bedrooms} hab. • {property.bathrooms} baños • {property.square_meters} m²
              </p>
              <p className="text-sm font-semibold text-primary mt-1">
                {new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(property.monthly_rent || 0)}/mes
              </p>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Descripción <span className="text-muted-foreground">(mínimo 50 caracteres)</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe la propiedad, sus características, ubicación, servicios cercanos..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {description.length} / 50 caracteres mínimo
            </p>
          </div>

          {/* Fotos */}
          <div className="space-y-2">
            <Label>Fotos de la propiedad</Label>
            <PhotoUpload
              photos={photos}
              onPhotosChange={setPhotos}
              maxPhotos={20}
            />
            <p className="text-xs text-muted-foreground">
              La primera foto será la foto principal. Puedes reordenarlas arrastrando.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || photos.length === 0 || description.length < 50}
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Publicar en Idealista
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}













