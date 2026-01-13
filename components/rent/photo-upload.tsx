"use client";

import { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  className?: string;
}

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 20, className }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length === 0) return;

    const newPhotos: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          newPhotos.push(result);
          if (photos.length + newPhotos.length <= maxPhotos) {
            onPhotosChange([...photos, ...newPhotos]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }, [photos, maxPhotos, onPhotosChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length === 0) return;

    const newPhotos: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          newPhotos.push(result);
          if (photos.length + newPhotos.length <= maxPhotos) {
            onPhotosChange([...photos, ...newPhotos]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }, [photos, maxPhotos, onPhotosChange]);

  const removePhoto = useCallback((index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  }, [photos, onPhotosChange]);

  const movePhoto = useCallback((fromIndex: number, toIndex: number) => {
    const newPhotos = [...photos];
    const [removed] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, removed);
    onPhotosChange(newPhotos);
  }, [photos, onPhotosChange]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          photos.length >= maxPhotos && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          type="file"
          id="photo-upload"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          disabled={photos.length >= maxPhotos}
          className="hidden"
        />
        <label
          htmlFor="photo-upload"
          className={cn(
            "cursor-pointer flex flex-col items-center gap-2",
            photos.length >= maxPhotos && "cursor-not-allowed"
          )}
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div>
            <span className="text-sm font-medium text-primary hover:underline">
              Haz clic para subir
            </span>
            {" o arrastra y suelta"}
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WEBP hasta 10MB cada una
          </p>
          {photos.length >= maxPhotos && (
            <p className="text-xs text-destructive mt-2">
              Has alcanzado el límite de {maxPhotos} fotos
            </p>
          )}
        </label>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
            >
              <img
                src={photo}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                  {index > 0 && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => movePhoto(index, index - 1)}
                      title="Mover izquierda"
                    >
                      ←
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removePhoto(index)}
                    title="Eliminar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {index < photos.length - 1 && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => movePhoto(index, index + 1)}
                      title="Mover derecha"
                    >
                      →
                    </Button>
                  )}
                </div>
              </div>
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  Principal
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {photos.length} {photos.length === 1 ? 'foto' : 'fotos'} seleccionada{photos.length > 1 ? 's' : ''}
          {photos.length < maxPhotos && ` (máximo ${maxPhotos})`}
        </p>
      )}
    </div>
  );
}
















