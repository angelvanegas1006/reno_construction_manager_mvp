"use client";

import { useCallback, useEffect, useState } from "react";
import * as React from "react";
import { Upload, X, Camera, Video, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChecklistUploadZone as ChecklistUploadZoneType, FileUpload } from "@/lib/checklist-storage";
import { useFileUpload } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils";

interface ChecklistUploadZoneProps {
  title: string;
  description: string;
  uploadZone: ChecklistUploadZoneType;
  onUpdate: (uploadZone: ChecklistUploadZoneType) => void;
  isRequired?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  hideTitle?: boolean; // Para ocultar el título cuando se muestra fuera del Card
  readOnly?: boolean; // Si es true, el componente es solo lectura
}

const DEFAULT_MAX_SIZE = 5; // MB
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function ChecklistUploadZone({
  title,
  description,
  uploadZone,
  onUpdate,
  isRequired = false,
  maxFiles = 10,
  maxSizeMB = DEFAULT_MAX_SIZE,
  hideTitle = false,
  readOnly = false,
}: ChecklistUploadZoneProps) {
  // Detectar si estamos en mobile o tablet (no desktop)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  
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
    maxFileSize: maxSizeMB,
    acceptedTypes: PHOTO_TYPES,
    onFilesChange: useCallback((allFiles) => {
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
    maxFileSize: maxSizeMB * 10, // Videos can be larger
    acceptedTypes: VIDEO_TYPES,
    onFilesChange: useCallback((allFiles) => {
      // Filter to only include videos
      const videos = allFiles.filter(f => 
        f.type && f.type.startsWith("video/")
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
          O haz clic para explorar (máx. {maxFiles} archivos, {maxSizeMB}MB cada uno)
        </p>
        
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

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {isMobileOrTablet ? (
            <>
              {/* Botones para mobile: captura directa desde cámara */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!readOnly && photosHook.fileInputRef.current) {
                    photosHook.fileInputRef.current.accept = PHOTO_TYPES.join(",");
                    photosHook.fileInputRef.current.capture = "environment";
                    photosHook.fileInputRef.current.multiple = true;
                    photosHook.fileInputRef.current.click();
                  }
                }}
                disabled={readOnly}
                className="flex items-center gap-1"
              >
                <Camera className="h-4 w-4" />
                Tomar foto
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!readOnly && photosHook.fileInputRef.current) {
                    photosHook.fileInputRef.current.accept = PHOTO_TYPES.join(",");
                    photosHook.fileInputRef.current.removeAttribute('capture');
                    photosHook.fileInputRef.current.multiple = true;
                    photosHook.fileInputRef.current.click();
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
                  if (!readOnly && videosHook.fileInputRef.current) {
                    videosHook.fileInputRef.current.accept = VIDEO_TYPES.join(",");
                    videosHook.fileInputRef.current.removeAttribute('capture');
                    videosHook.fileInputRef.current.multiple = true;
                    videosHook.fileInputRef.current.click();
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
                  className="relative group aspect-square rounded-lg overflow-hidden border border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)]"
                >
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
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          
            {/* Videos */}
            {uploadZone.videos.map((file, index) => (
              <div
                key={file.id || `video-${index}`}
                className="relative group aspect-square rounded-lg overflow-hidden border border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] flex items-center justify-center"
              >
                <Video className="h-8 w-8 text-[var(--prophero-gray-400)]" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-xs text-foreground truncate bg-black/50 text-white px-1 py-0.5 rounded">{file.name}</p>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVideo(index)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="h-3 w-3" />
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
    </div>
  );
}

