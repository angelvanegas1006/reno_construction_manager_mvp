"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileUpload } from "@/hooks/useFileUpload";
import { FileUpload as FileUploadType } from "@/lib/property-storage";
import { uploadRenoInProgressPhotos } from "@/lib/n8n/webhook-caller";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RenoInProgressPhotoUploadProps {
  propertyId: string;
  className?: string;
}

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;
const MAX_FILES = 20;

export function RenoInProgressPhotoUpload({
  propertyId,
  className,
}: RenoInProgressPhotoUploadProps) {
  const [photos, setPhotos] = useState<FileUploadType[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<Set<string>>(new Set());

  const photosHook = useFileUpload({
    maxFileSize: MAX_SIZE_MB,
    acceptedTypes: PHOTO_TYPES,
    onFilesChange: useCallback((files: FileUploadType[]) => {
      // Filtrar solo fotos
      const photoFiles = files.filter(f => f.type && f.type.startsWith("image/"));
      setPhotos(photoFiles);
    }, []),
  });

  // Subir fotos al webhook
  const handleUpload = useCallback(async () => {
    if (!propertyId || photos.length === 0) {
      toast.error("No hay fotos para subir");
      return;
    }

    // Filtrar solo fotos que no se han subido aún
    const photosToUpload = photos.filter(p => !uploadedPhotos.has(p.id));
    
    if (photosToUpload.length === 0) {
      toast.info("Todas las fotos ya han sido subidas");
      return;
    }

    setIsUploading(true);

    try {
      // Validar que las fotos tengan datos
      const photosWithData = photosToUpload.filter(photo => {
        if (!photo.data || photo.data.trim() === '') {
          console.warn('[RenoInProgressPhotoUpload] ⚠️ Photo without data:', photo.name);
          return false;
        }
        return true;
      });

      if (photosWithData.length === 0) {
        toast.error("Error al subir fotos", {
          description: "Las fotos no tienen datos válidos. Por favor, vuelve a seleccionarlas.",
        });
        setIsUploading(false);
        return;
      }

      // Convertir FileUpload a formato esperado por el webhook
      const photoUrls = photosWithData.map(photo => ({
        url: photo.data!,
        filename: photo.name,
      }));

      console.log('[RenoInProgressPhotoUpload] 📤 Subiendo fotos:', {
        propertyId,
        photosCount: photoUrls.length,
        photoSizes: photoUrls.map(p => ({ filename: p.filename, urlLength: p.url.length })),
        totalPayloadSize: JSON.stringify(photoUrls).length,
      });

      // Subir fotos de 1 en 1 en móvil (fotos de cámara pueden ser 3-8MB en base64)
      // En desktop usar lotes de 2 para equilibrar velocidad vs límite body (~1MB)
      const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const BATCH_SIZE = isMobile ? 1 : 2;
      const uploadedBatchPhotos: string[] = [];
      const failedBatchPhotos: string[] = [];
      
      for (let i = 0; i < photoUrls.length; i += BATCH_SIZE) {
        const batch = photoUrls.slice(i, i + BATCH_SIZE);
        const batchPhotoIds = photosWithData.slice(i, i + BATCH_SIZE).map(p => p.id);
        
        console.log(`[RenoInProgressPhotoUpload] 📤 Subiendo lote ${Math.floor(i / BATCH_SIZE) + 1} de ${Math.ceil(photoUrls.length / BATCH_SIZE)}:`, {
          batchSize: batch.length,
          photos: batch.map(p => p.filename),
        });
        
        const batchSuccess = await uploadRenoInProgressPhotos(propertyId, batch);
        
        if (batchSuccess) {
          // Marcar las fotos de este lote como subidas
          batchPhotoIds.forEach(id => uploadedBatchPhotos.push(id));
          console.log(`[RenoInProgressPhotoUpload] ✅ Lote ${Math.floor(i / BATCH_SIZE) + 1} subido correctamente`);
        } else {
          // Marcar las fotos de este lote como fallidas
          batchPhotoIds.forEach(id => failedBatchPhotos.push(id));
          console.error(`[RenoInProgressPhotoUpload] ❌ Error en lote ${Math.floor(i / BATCH_SIZE) + 1}`);
          // Continuar con el siguiente lote aunque este falle
        }
      }

      // Actualizar estado con las fotos subidas exitosamente
      if (uploadedBatchPhotos.length > 0) {
        const newUploadedPhotos = new Set(uploadedPhotos);
        uploadedBatchPhotos.forEach(id => newUploadedPhotos.add(id));
        setUploadedPhotos(newUploadedPhotos);
        
        // Limpiar solo las fotos subidas exitosamente
        setPhotos(prev => prev.filter(p => !newUploadedPhotos.has(p.id)));
        
        toast.success("Fotos subidas correctamente", {
          description: `${uploadedBatchPhotos.length} foto${uploadedBatchPhotos.length > 1 ? 's' : ''} subida${uploadedBatchPhotos.length > 1 ? 's' : ''} al Drive${failedBatchPhotos.length > 0 ? ` (${failedBatchPhotos.length} fallaron)` : ''}`,
        });
      }
      
      // Mostrar error si alguna foto falló
      if (failedBatchPhotos.length > 0) {
        toast.error("Algunas fotos no se pudieron subir", {
          description: `${failedBatchPhotos.length} foto${failedBatchPhotos.length > 1 ? 's' : ''} no se ${failedBatchPhotos.length > 1 ? 'pudieron' : 'pudo'} subir. Verifica que la propiedad tenga una carpeta de Drive configurada o contacta al administrador.`,
          duration: 6000,
        });
      }
      
      // Si todas fallaron, mostrar error general
      if (uploadedBatchPhotos.length === 0 && failedBatchPhotos.length > 0) {
        toast.error("Error al subir fotos", {
          description: "No se pudieron subir las fotos. Verifica que la propiedad tenga una carpeta de Drive configurada o contacta al administrador.",
          duration: 6000,
        });
      }
    } catch (error) {
      console.error('[RenoInProgressPhotoUpload] ❌ Error:', error);
      toast.error("Error al subir fotos", {
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
      });
    } finally {
      setIsUploading(false);
    }
  }, [propertyId, photos, uploadedPhotos]);

  const removePhoto = useCallback((index: number) => {
    const photo = photos[index];
    setPhotos(prev => prev.filter((_, i) => i !== index));
    // Remover de uploadedPhotos si estaba marcada como subida
    if (photo && uploadedPhotos.has(photo.id)) {
      const newUploadedPhotos = new Set(uploadedPhotos);
      newUploadedPhotos.delete(photo.id);
      setUploadedPhotos(newUploadedPhotos);
    }
  }, [photos, uploadedPhotos]);

  const hasUnuploadedPhotos = photos.some(p => !uploadedPhotos.has(p.id));

  return (
    <div className={cn("space-y-4", className)}>
      <div className="bg-card rounded-lg border p-4 md:p-6 shadow-sm">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
          <ImageIcon className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
          <span>Fotos de Avance de Obra</span>
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Sube fotos del progreso de la obra. Las fotos se guardarán en la carpeta de Drive de la propiedad.
        </p>

        {/* Drop Zone */}
        <div
          onDragOver={photosHook.handleDragOver}
          onDragLeave={photosHook.handleDragLeave}
          onDrop={photosHook.handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            photosHook.isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            photos.length >= MAX_FILES && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={photosHook.fileInputRef}
            type="file"
            multiple
            accept={PHOTO_TYPES.join(",")}
            onChange={photosHook.handleFileSelect}
            disabled={photos.length >= MAX_FILES || isUploading}
            className="hidden"
          />
          <label
            htmlFor="reno-photo-upload"
            className={cn(
              "cursor-pointer flex flex-col items-center gap-2",
              (photos.length >= MAX_FILES || isUploading) && "cursor-not-allowed"
            )}
            onClick={(e) => {
              if (photos.length >= MAX_FILES || isUploading) {
                e.preventDefault();
                return;
              }
              photosHook.fileInputRef.current?.click();
            }}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <span className="text-sm font-medium text-primary hover:underline">
                Haz clic para subir
              </span>
              {" o arrastra y suelta"}
            </div>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP hasta {MAX_SIZE_MB}MB cada una (máximo {MAX_FILES} fotos)
            </p>
            {photos.length >= MAX_FILES && (
              <p className="text-xs text-destructive mt-2">
                Has alcanzado el límite de {MAX_FILES} fotos
              </p>
            )}
          </label>
        </div>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo, index) => {
                const isUploaded = uploadedPhotos.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                  >
                    <img
                      src={photo.data || ""}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    {isUploaded && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                        Subida
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removePhoto(index)}
                          title="Eliminar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Upload Button */}
            {hasUnuploadedPhotos && (
              <Button
                onClick={handleUpload}
                disabled={isUploading || !hasUnuploadedPhotos}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo fotos...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir {photos.filter(p => !uploadedPhotos.has(p.id)).length} foto{photos.filter(p => !uploadedPhotos.has(p.id)).length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}

            <p className="text-sm text-muted-foreground text-center">
              {photos.length} {photos.length === 1 ? 'foto' : 'fotos'} seleccionada{photos.length > 1 ? 's' : ''}
              {photos.length < MAX_FILES && ` (máximo ${MAX_FILES})`}
            </p>
          </div>
        )}

        {photosHook.error && (
          <p className="text-sm text-destructive mt-2">{photosHook.error}</p>
        )}
      </div>
    </div>
  );
}

