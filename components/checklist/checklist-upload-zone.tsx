"use client";

import { useCallback, useEffect, useState } from "react";
import * as React from "react";
import { Upload, X, Camera, Video, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChecklistUploadZone as ChecklistUploadZoneType, FileUpload, cameraActiveRef } from "@/lib/checklist-storage";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ChecklistUploadZoneProps {
  title: string;
  description: string;
  uploadZone: ChecklistUploadZoneType;
  onUpdate: (uploadZone: ChecklistUploadZoneType) => void;
  isRequired?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  /** Límite de tamaño para fotos en MB. Por defecto 2048 (2GB) = sin tope práctico. */
  maxPhotoSizeMB?: number;
  /** Límite de tamaño para videos en MB. Por defecto 2048 (2GB) = sin tope práctico. */
  maxVideoSizeMB?: number;
  hideTitle?: boolean; // Para ocultar el título cuando se muestra fuera del Card
  readOnly?: boolean; // Si es true, el componente es solo lectura
}

// Sin límite práctico: fotos y videos 2GB por defecto
const DEFAULT_MAX_PHOTO_SIZE_MB = 2048;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/3gpp", "video/mpeg"];

// Videos: sin tope práctico (2GB cubre grabaciones largas de inspección)
const DEFAULT_MAX_VIDEO_SIZE_MB = 2048;

export function ChecklistUploadZone({
  title,
  description,
  uploadZone,
  onUpdate,
  isRequired = false,
  maxFiles = 10,
  maxSizeMB = DEFAULT_MAX_PHOTO_SIZE_MB,
  maxPhotoSizeMB = DEFAULT_MAX_PHOTO_SIZE_MB,
  maxVideoSizeMB = DEFAULT_MAX_VIDEO_SIZE_MB,
  hideTitle = false,
  readOnly = false,
}: ChecklistUploadZoneProps) {
  const { t } = useI18n();
  
  // Detectar si estamos en mobile o tablet (no desktop)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  // Modo ráfaga: permite tomar varias fotos seguidas sin salir del flujo de cámara
  const [cameraBurstActive, setCameraBurstActive] = useState(false);
  const [burstStartCount, setBurstStartCount] = useState(0);
  
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return;
    
    const checkMobileOrTablet = () => {
      // Considerar mobile/tablet si el ancho es menor a 1024px (lg breakpoint) o si es un dispositivo móvil/tablet
      const isSmallScreen = window.innerWidth < 1024;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobileOrTablet(isSmallScreen || isMobileDevice);
    };
    
    checkMobileOrTablet();
    window.addEventListener('resize', checkMobileOrTablet);
    return () => window.removeEventListener('resize', checkMobileOrTablet);
  }, []);
  const handlePhotosChange = useCallback((files: FileUpload[]) => {
    // Use ref to get latest uploadZone value to avoid stale closure
    const currentUploadZone = uploadZoneRef.current;
    console.log('[ChecklistUploadZone] 📝 handlePhotosChange called:', {
      filesCount: files.length,
      files: files.map(f => ({ id: f.id, name: f.name, hasData: !!f.data, dataLength: f.data?.length || 0 })),
      currentUploadZonePhotos: currentUploadZone.photos.length
    });
    const updatedZone = {
      ...currentUploadZone,
      photos: files,
    };
    console.log('[ChecklistUploadZone] 📤 Calling onUpdate with:', {
      zoneId: updatedZone.id,
      photosCount: updatedZone.photos.length,
      photos: updatedZone.photos.map(p => ({ id: p.id, name: p.name, hasData: !!p.data }))
    });
    onUpdate(updatedZone);
  }, [onUpdate]);

  const handleVideosChange = useCallback((files: FileUpload[]) => {
    // Use ref to get latest uploadZone value to avoid stale closure
    const currentUploadZone = uploadZoneRef.current;
    onUpdate({
      ...currentUploadZone,
      videos: files,
    });
  }, [onUpdate]);

  // Refs para inputs de galería separados (sin capture)
  const photoGalleryInputRef = React.useRef<HTMLInputElement>(null);
  const videoGalleryInputRef = React.useRef<HTMLInputElement>(null);

  // Track processed file IDs to avoid duplicates
  const processedPhotoIdsRef = React.useRef<Set<string>>(new Set());
  const processedVideoIdsRef = React.useRef<Set<string>>(new Set());
  
  // Use ref to always get latest uploadZone value
  const uploadZoneRef = React.useRef(uploadZone);
  React.useEffect(() => {
    uploadZoneRef.current = uploadZone;
  }, [uploadZone]);

  // Initialize refs with existing file IDs and sync when uploadZone changes
  // Also sync when uploadZone itself changes (not just length) to catch when photos are loaded from Supabase
  React.useEffect(() => {
    processedPhotoIdsRef.current.clear();
    processedVideoIdsRef.current.clear();
    uploadZone.photos.forEach(p => processedPhotoIdsRef.current.add(p.id));
    uploadZone.videos.forEach(v => processedVideoIdsRef.current.add(v.id));
    console.log('[ChecklistUploadZone] 🔄 Synced processed IDs:', {
      photosCount: uploadZone.photos.length,
      videosCount: uploadZone.videos.length,
      photoIds: Array.from(processedPhotoIdsRef.current),
      videoIds: Array.from(processedVideoIdsRef.current),
      photosWithData: uploadZone.photos.filter(p => p.data).length,
    });
  }, [uploadZone.photos.length, uploadZone.videos.length, uploadZone]);

  const photosHook = useFileUpload({
    maxFileSize: maxPhotoSizeMB,
    acceptedTypes: PHOTO_TYPES,
    onFilesChange: useCallback((allFiles) => {
      // Desactivar flag de cámara: ya recibimos el archivo del picker
      cameraActiveRef.current = false;

      // Filter to only include photos
      const photos = allFiles.filter(f => 
        f.type && f.type.startsWith("image/")
      );
      
      // Get current photo IDs from uploadZone (use ref to get latest value)
      const currentUploadZone = uploadZoneRef.current;
      const currentPhotoIds = new Set(currentUploadZone.photos.map(p => p.id));
      
      // Find new photos that aren't already in uploadZone
      const newPhotos = photos.filter(p => {
        // If already processed or already in uploadZone, skip
        if (processedPhotoIdsRef.current.has(p.id) || currentPhotoIds.has(p.id)) {
          return false;
        }
        processedPhotoIdsRef.current.add(p.id);
        return true;
      });
      
      // Only update if there are new photos
      if (newPhotos.length > 0) {
        const updatedPhotos = [...currentUploadZone.photos, ...newPhotos];
        console.log('[ChecklistUploadZone] 📸 Adding new photos:', {
          newCount: newPhotos.length,
          totalCount: updatedPhotos.length,
          newPhotos: newPhotos.map(p => ({ 
            id: p.id, 
            name: p.name, 
            hasData: !!p.data, 
            dataLength: p.data?.length || 0,
            dataPreview: p.data?.substring(0, 100),
            type: p.type,
            size: p.size
          })),
          currentPhotos: currentUploadZone.photos.map(p => ({ id: p.id, name: p.name, hasData: !!p.data }))
        });
        console.log('[ChecklistUploadZone] 🔄 Calling handlePhotosChange with', updatedPhotos.length, 'photos');
        handlePhotosChange(updatedPhotos);
      } else if (photos.length === 0 && currentUploadZone.photos.length > 0) {
        // Don't overwrite existing photos if hook returns empty array
        console.log('[ChecklistUploadZone] ⚠️ Hook returned empty array but uploadZone has photos, skipping update');
      }
    }, [handlePhotosChange]),
  });

  const videosHook = useFileUpload({
    maxFileSize: maxVideoSizeMB,
    acceptedTypes: VIDEO_TYPES,
    onFilesChange: useCallback((allFiles) => {
      // Desactivar flag de cámara: ya recibimos el archivo del picker
      cameraActiveRef.current = false;

      // Filter to include videos: by type OR by blob URL (videos use blob URLs, images use data: URLs)
      const videos = allFiles.filter(f => 
        (f.type && f.type.startsWith("video/")) || (f.data && f.data.startsWith("blob:"))
      );
      
      // Get current video IDs from uploadZone (use ref to get latest value)
      const currentUploadZone = uploadZoneRef.current;
      const currentVideoIds = new Set(currentUploadZone.videos.map(v => v.id));
      
      // Find new videos that aren't already in uploadZone
      const newVideos = videos.filter(v => {
        // If already processed or already in uploadZone, skip
        if (processedVideoIdsRef.current.has(v.id) || currentVideoIds.has(v.id)) {
          return false;
        }
        processedVideoIdsRef.current.add(v.id);
        return true;
      });
      
      // Only update if there are new videos
      if (newVideos.length > 0) {
        console.log('[ChecklistUploadZone] 🎥 Adding new videos:', newVideos.length, 'Total videos:', currentUploadZone.videos.length + newVideos.length);
        handleVideosChange([...currentUploadZone.videos, ...newVideos]);
      } else if (videos.length === 0 && currentUploadZone.videos.length > 0) {
        // Don't overwrite existing videos if hook returns empty array
        console.log('[ChecklistUploadZone] ⚠️ Hook returned empty array but uploadZone has videos, skipping update');
      }
    }, [handleVideosChange]),
  });

  // Helper: marcar cámara/galería como activa para suprimir save-on-leave
  const markCameraActive = useCallback(() => {
    cameraActiveRef.current = true;
    // Failsafe: si el usuario cancela el picker sin seleccionar archivo,
    // handleFileSelect nunca se llama. Resetear tras 120s para evitar bloquear saves indefinidamente.
    setTimeout(() => { cameraActiveRef.current = false; }, 120_000);
  }, []);

  // Modo ráfaga: abre la cámara nativa sin salir del modo burst
  const openCameraInBurst = useCallback(() => {
    if (!readOnly && photosHook.fileInputRef.current) {
      markCameraActive();
      photosHook.fileInputRef.current.accept = PHOTO_TYPES.join(",");
      photosHook.fileInputRef.current.capture = "environment";
      photosHook.fileInputRef.current.multiple = true;
      photosHook.fileInputRef.current.click();
    }
  }, [readOnly, photosHook.fileInputRef, markCameraActive]);

  // Iniciar modo ráfaga: guarda el conteo actual de fotos y abre la cámara
  const startCameraBurst = useCallback(() => {
    setCameraBurstActive(true);
    setBurstStartCount(uploadZoneRef.current.photos.length);
    openCameraInBurst();
  }, [openCameraInBurst]);

  // Tomar otra foto en modo ráfaga (no resetea el estado burst)
  const handleBurstTakeAnother = useCallback(() => {
    openCameraInBurst();
  }, [openCameraInBurst]);

  const [localError, setLocalError] = React.useState<string | null>(null);

  // Unified drop handler that routes files to the correct hook
  const handleUnifiedDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    if (readOnly) return;
    photosHook.handleDragLeave(e);
    videosHook.handleDragLeave(e);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (droppedFiles.length === 0) return;

    // Separate photos and videos
    const photos: File[] = [];
    const videos: File[] = [];
    const errors: string[] = [];

    droppedFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        photos.push(file);
      } else if (file.type.startsWith("video/")) {
        videos.push(file);
      } else {
        errors.push(`${file.name}: Tipo de archivo no soportado. Solo se permiten imágenes y videos.`);
      }
    });

    // Process photos by directly calling the hook's internal addFiles logic
    // We'll use the file input refs to trigger the hooks' file selection handlers
    if (photos.length > 0) {
      // Create a temporary file input and trigger the photos hook
      const tempInput = document.createElement('input');
      tempInput.type = 'file';
      tempInput.multiple = true;
      tempInput.accept = PHOTO_TYPES.join(',');
      
      // Create a FileList-like object
      const dataTransfer = new DataTransfer();
      photos.forEach(photo => dataTransfer.items.add(photo));
      
      // Access the input's files property
      Object.defineProperty(tempInput, 'files', {
        value: dataTransfer.files,
        writable: false,
      });
      
      // Create a synthetic change event
      const changeEvent = new Event('change', { bubbles: true });
      Object.defineProperty(changeEvent, 'target', {
        value: tempInput,
        writable: false,
      });
      
      photosHook.handleFileSelect(changeEvent as any);
    }

    if (videos.length > 0) {
      // Create a temporary file input and trigger the videos hook
      const tempInput = document.createElement('input');
      tempInput.type = 'file';
      tempInput.multiple = true;
      tempInput.accept = VIDEO_TYPES.join(',');
      
      // Create a FileList-like object
      const dataTransfer = new DataTransfer();
      videos.forEach(video => dataTransfer.items.add(video));
      
      // Access the input's files property
      Object.defineProperty(tempInput, 'files', {
        value: dataTransfer.files,
        writable: false,
      });
      
      // Create a synthetic change event
      const changeEvent = new Event('change', { bubbles: true });
      Object.defineProperty(changeEvent, 'target', {
        value: tempInput,
        writable: false,
      });
      
      videosHook.handleFileSelect(changeEvent as any);
    }

    // Show errors if any
    if (errors.length > 0) {
      setLocalError(errors.join("\n"));
    } else {
      setLocalError(null);
    }
  }, [photosHook, videosHook]);

  const handleRemovePhoto = useCallback((index: number) => {
    const photoToRemove = uploadZone.photos[index];
    if (photoToRemove) {
      processedPhotoIdsRef.current.delete(photoToRemove.id);
    }
    const newPhotos = uploadZone.photos.filter((_, i) => i !== index);
    onUpdate({
      ...uploadZone,
      photos: newPhotos,
    });
    // Clear error when removing files
    setLocalError(null);
  }, [uploadZone, onUpdate]);

  const handleRemoveVideo = useCallback((index: number) => {
    const videoToRemove = uploadZone.videos[index];
    if (videoToRemove) {
      processedVideoIdsRef.current.delete(videoToRemove.id);
    }
    const newVideos = uploadZone.videos.filter((_, i) => i !== index);
    onUpdate({
      ...uploadZone,
      videos: newVideos,
    });
    // Clear error when removing files
    setLocalError(null);
  }, [uploadZone, onUpdate]);

  // Update local error when hook errors change
  useEffect(() => {
    if (photosHook.error || videosHook.error) {
      setLocalError(photosHook.error || videosHook.error || null);
    } else {
      setLocalError(null);
    }
  }, [photosHook.error, videosHook.error]);

  return (
    <div className="space-y-4">
      {!hideTitle && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold leading-tight">
              {title} {isRequired && (
                <span className="text-red-500">
                  <span className="text-red-500">*</span>
                  <span className="ml-1 text-red-500">{t.formLabels.required}</span>
                </span>
              )}
            </Label>
            <span className="text-xs text-muted-foreground leading-normal">
              {uploadZone.photos.length} foto(s), {uploadZone.videos.length} video(s)
            </span>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
      )}
      {hideTitle && (
        <div className="flex items-center justify-end mb-2">
          <span className="text-xs text-muted-foreground leading-normal">
            {uploadZone.photos.length} foto(s), {uploadZone.videos.length} video(s)
          </span>
        </div>
      )}

      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          (photosHook.isDragOver || videosHook.isDragOver)
            ? "border-[var(--prophero-blue-500)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]/20"
            : "border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] bg-white dark:bg-card hover:border-[var(--prophero-gray-400)] dark:hover:border-[var(--prophero-gray-500)]"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          photosHook.handleDragOver(e);
          videosHook.handleDragOver(e);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          photosHook.handleDragLeave(e);
          videosHook.handleDragLeave(e);
        }}
        onDrop={readOnly ? undefined : handleUnifiedDrop}
      >
        <Upload className="h-8 w-8 mx-auto text-[var(--prophero-gray-400)] mb-2" />
        <p className="text-sm text-[var(--prophero-gray-600)] dark:text-[var(--prophero-gray-400)] mb-2">
          Arrastra y suelta archivos aquí
        </p>
        <p className="text-xs text-[var(--prophero-gray-500)] dark:text-[var(--prophero-gray-500)] mb-3">
          O haz clic para explorar (fotos y videos: sin límite de tamaño)
        </p>
        
        {/* Inputs para cámara (con capture) */}
        <input
          ref={photosHook.fileInputRef}
          type="file"
          multiple
          accept={PHOTO_TYPES.join(",")}
          onChange={photosHook.handleFileSelect}
          capture={isMobileOrTablet ? "environment" : undefined}
          className="hidden"
        />
        <input
          ref={videosHook.fileInputRef}
          type="file"
          multiple
          accept={VIDEO_TYPES.join(",")}
          onChange={videosHook.handleFileSelect}
          capture={isMobileOrTablet ? "environment" : undefined}
          className="hidden"
        />
        {/* Inputs separados para galería (SIN capture) – en iOS/Android, capture
            hace que el picker abra directamente la cámara. Con un input separado
            sin capture, el picker muestra la galería correctamente. */}
        <input
          ref={photoGalleryInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={photosHook.handleFileSelect}
          className="hidden"
        />
        <input
          ref={videoGalleryInputRef}
          type="file"
          multiple
          accept="video/*"
          onChange={videosHook.handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {isMobileOrTablet ? (
            <>
              {/* Botón de cámara con modo ráfaga: abre la cámara nativa y entra en burst mode */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startCameraBurst}
                disabled={readOnly}
                className="flex items-center gap-1"
              >
                <Camera className="h-4 w-4" />
                Tomar fotos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!readOnly && photoGalleryInputRef.current) {
                    markCameraActive();
                    photoGalleryInputRef.current.click();
                  }
                }}
                disabled={readOnly}
                className="flex items-center gap-1"
              >
                <ImageIcon className="h-4 w-4" />
                Galería
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!readOnly && videosHook.fileInputRef.current) {
                    markCameraActive();
                    videosHook.fileInputRef.current.accept = VIDEO_TYPES.join(",");
                    videosHook.fileInputRef.current.capture = "environment";
                    videosHook.fileInputRef.current.multiple = true;
                    videosHook.fileInputRef.current.click();
                  }
                }}
                disabled={readOnly}
                className="flex items-center gap-1"
              >
                <Video className="h-4 w-4" />
                Grabar video
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!readOnly && videoGalleryInputRef.current) {
                    markCameraActive();
                    videoGalleryInputRef.current.click();
                  }
                }}
                disabled={readOnly}
                className="flex items-center gap-1"
              >
                <Video className="h-4 w-4" />
                Video galería
              </Button>
            </>
          ) : (
            <>
              {/* Botones para desktop: solo selección de archivos */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => !readOnly && photosHook.fileInputRef.current?.click()}
                disabled={readOnly}
                className="flex items-center gap-1"
              >
                <ImageIcon className="h-4 w-4" />
                Subir fotos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => !readOnly && videosHook.fileInputRef.current?.click()}
                disabled={readOnly}
                className="flex items-center gap-1"
              >
                <Video className="h-4 w-4" />
                Subir videos
              </Button>
            </>
          )}
        </div>
      </div>

      {/* File Grid */}
      {(() => {
        console.log('[ChecklistUploadZone] 🖼️ Rendering file grid:', {
          photosCount: uploadZone.photos.length,
          videosCount: uploadZone.videos.length,
          photos: uploadZone.photos.map(p => ({ id: p.id, name: p.name, hasData: !!p.data, dataLength: p.data?.length || 0 }))
        });
        return (uploadZone.photos.length > 0 || uploadZone.videos.length > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
            {/* Photos */}
            {uploadZone.photos.map((file, index) => {
              // Debug: Log file data
              if (!file.data) {
                console.log('[ChecklistUploadZone] ⚠️ Photo without data:', { id: file.id, name: file.name, index, file });
              } else {
                console.log('[ChecklistUploadZone] ✅ Photo with data:', { id: file.id, name: file.name, index, dataLength: file.data.length, dataPreview: file.data.substring(0, 50) });
              }
              return (
                <div
                  key={file.id || `photo-${index}`}
                  className="relative group aspect-square rounded-lg border border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)]"
                >
                  <div className="w-full h-full rounded-lg overflow-hidden">
                    {file.data ? (
                      <img
                        src={file.data}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          if (process.env.NODE_ENV === 'development') {
                            console.error('[ChecklistUploadZone] ❌ Error loading image:', { id: file.id, name: file.name, data: file.data?.substring(0, 50) });
                          }
                        }}
                        onLoad={() => {
                          if (process.env.NODE_ENV === 'development') {
                            console.log('[ChecklistUploadZone] ✅ Image loaded:', { id: file.id, name: file.name });
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center flex-col">
                        <ImageIcon className="h-8 w-8 text-[var(--prophero-gray-400)]" />
                        <span className="text-xs text-[var(--prophero-gray-400)] mt-2 text-center px-2">{file.name}</span>
                        <span className="text-xs text-red-500 mt-1">No data</span>
                      </div>
                    )}
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full shadow-md opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-20 border-2 border-white dark:border-gray-800"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          
            {/* Videos */}
            {uploadZone.videos.map((file, index) => (
              <div
                key={file.id || `video-${index}`}
                className="relative group aspect-square rounded-lg border border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] flex items-center justify-center"
              >
                <Video className="h-8 w-8 text-[var(--prophero-gray-400)]" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-xs text-foreground truncate bg-black/50 text-white px-1 py-0.5 rounded">{file.name}</p>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVideo(index)}
                    className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full shadow-md opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-20 border-2 border-white dark:border-gray-800"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {localError && (
        <p className="text-sm text-red-500 mt-2">{localError}</p>
      )}

      {/* Barra de modo ráfaga: fixed en la parte inferior de la pantalla para que siempre sea visible en movil */}
      {cameraBurstActive && isMobileOrTablet && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-blue-600 text-white p-4 shadow-lg safe-area-bottom" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <span className="text-base font-semibold">
              {uploadZone.photos.length - burstStartCount} foto{uploadZone.photos.length - burstStartCount !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-3">
              <Button
                type="button"
                size="sm"
                onClick={handleBurstTakeAnother}
                className="bg-white text-blue-700 hover:bg-blue-50 font-semibold px-4"
              >
                <Camera className="h-4 w-4 mr-1" />
                Otra foto
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setCameraBurstActive(false); cameraActiveRef.current = false; }}
                className="border-white text-white hover:bg-blue-700 font-semibold px-4"
              >
                Listo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

