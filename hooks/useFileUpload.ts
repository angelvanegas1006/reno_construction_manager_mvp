"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { FileUpload } from "@/lib/property-storage";
import { compressImageDataUrlIfNeeded } from "@/lib/image-compress";

interface UseFileUploadProps {
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  onFilesChange: (files: FileUpload[]) => void;
}

interface UseFileUploadReturn {
  files: FileUpload[];
  isDragOver: boolean;
  isUploading: boolean;
  error: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCameraCapture: () => void;
  handleVideoCapture: () => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
}

const DEFAULT_MAX_SIZE = 64; // MB
const DEFAULT_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png", 
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/3gpp",
  "video/mpeg",
  "application/pdf",
];

/**
 * Infer MIME type from file extension when file.type is empty.
 * Common on mobile browsers (iOS Safari, some Android) for camera captures.
 */
/**
 * Store para mantener referencia al File original de videos.
 * Los videos son demasiado grandes para convertir a base64 (readAsDataURL agota la memoria en movil).
 * Se usa blob URL para preview y el File original para subida directa a Storage.
 */
const videoFileStore = new Map<string, File>();

/** Obtener el File original de un video por su FileUpload id */
export function getOriginalVideoFile(fileUploadId: string): File | undefined {
  return videoFileStore.get(fileUploadId);
}

/** Limpiar referencia de un video del store (al eliminar de la UI) */
export function removeOriginalVideoFile(fileUploadId: string): void {
  const file = videoFileStore.get(fileUploadId);
  if (file) {
    videoFileStore.delete(fileUploadId);
  }
}

function inferMimeType(file: File): string {
  if (file.type && file.type !== "") return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const extMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    gif: "image/gif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    "3gp": "video/3gpp",
    mpeg: "video/mpeg",
    mpg: "video/mpeg",
    avi: "video/x-msvideo",
    pdf: "application/pdf",
  };
  return extMap[ext] || "";
}

export function useFileUpload({
  maxFileSize = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  onFilesChange,
}: UseFileUploadProps): UseFileUploadReturn {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onFilesChangeRef = useRef(onFilesChange);
  const isInitialMountRef = useRef(true);
  
  // Keep ref updated with latest callback
  useEffect(() => {
    onFilesChangeRef.current = onFilesChange;
  }, [onFilesChange]);
  
  // Call onFilesChange after files state updates (useEffect = post-commit, evita render-time updates)
  // Sin setTimeout para propagar fotos más rápido en móvil (evita perder fotos al guardar rápido)
  useEffect(() => {
    // Skip initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    onFilesChangeRef.current(files);
  }, [files]);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxFileSize * 1024 * 1024) {
      return `El archivo es demasiado grande. Máximo ${maxFileSize}MB`;
    }
    
    const mimeType = inferMimeType(file);
    if (!acceptedTypes.includes(mimeType)) {
      // Fallback: if MIME is still unknown, allow image/* and video/* based on extension
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const imageExts = ["jpg", "jpeg", "png", "webp", "heic", "heif", "gif"];
      const videoExts = ["mp4", "mov", "webm", "3gp", "mpeg", "mpg", "avi", "m4v"];
      const hasImageType = acceptedTypes.some(t => t.startsWith("image/"));
      const hasVideoType = acceptedTypes.some(t => t.startsWith("video/"));
      
      if (hasImageType && imageExts.includes(ext)) {
        console.log(`[useFileUpload] 📱 Allowing image by extension fallback: ${file.name} (type="${file.type}", ext="${ext}")`);
        return null;
      }
      if (hasVideoType && videoExts.includes(ext)) {
        console.log(`[useFileUpload] 📱 Allowing video by extension fallback: ${file.name} (type="${file.type}", ext="${ext}")`);
        return null;
      }
      
      return `Tipo de archivo no soportado. Tipos permitidos: ${acceptedTypes.join(", ")}`;
    }
    
    return null;
  }, [maxFileSize, acceptedTypes]);

  // Comprimir imágenes al añadirlas (1.5 MB umbral) para no llenar memoria con muchas fotos
  const IMAGE_COMPRESS_THRESHOLD_BYTES = 1.5 * 1024 * 1024;

  const processFile = useCallback(async (file: File): Promise<FileUpload> => {
    const resolvedType = inferMimeType(file);
    const isVideo = resolvedType.startsWith('video/') || file.type.startsWith('video/');

    // Videos: NO usar readAsDataURL (agota la memoria en movil para archivos grandes).
    // Guardar el File original y usar blob URL para referencia en la UI.
    if (isVideo) {
      const blobUrl = URL.createObjectURL(file);
      const fileUpload: FileUpload = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: resolvedType || file.type,
        size: file.size,
        data: blobUrl,
        uploadedAt: new Date().toISOString(),
      };
      videoFileStore.set(fileUpload.id, file);
      console.log(`[useFileUpload] 🎥 Video stored with blob URL (${(file.size / (1024 * 1024)).toFixed(1)}MB):`, file.name);
      return fileUpload;
    }

    // Imagenes: usar readAsDataURL + compresion (archivos pequenos, necesitan preview inline)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        let data = reader.result as string;
        if (data.startsWith("data:image/")) {
          try {
            data = await compressImageDataUrlIfNeeded(data, IMAGE_COMPRESS_THRESHOLD_BYTES);
          } catch (_) { /* usar original */ }
        }
        const fileUpload: FileUpload = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: resolvedType || file.type,
          size: file.size,
          data,
          uploadedAt: new Date().toISOString(),
        };
        resolve(fileUpload);
      };
      reader.onerror = () => reject(new Error("Error al procesar el archivo"));
      reader.readAsDataURL(file);
    });
  }, []);

  const addFiles = useCallback(async (newFiles: File[]) => {
    setIsUploading(true);
    setError(null);

    try {
      const validFiles: File[] = [];
      const errors: string[] = [];

      // Validate all files first
      for (const file of newFiles) {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
        } else {
          validFiles.push(file);
        }
      }

      if (errors.length > 0) {
        setError(errors.join("\n"));
      }

      if (validFiles.length === 0) {
        return;
      }

      // Process valid files
      const processedFiles = await Promise.all(
        validFiles.map(file => processFile(file))
      );

      console.log('[useFileUpload] ✅ All files processed:', {
        count: processedFiles.length,
        files: processedFiles.map(f => ({
          id: f.id,
          name: f.name,
          hasData: !!f.data,
          dataLength: f.data?.length || 0
        }))
      });

      // Use functional update to ensure we have the latest state
      // onFilesChange will be called automatically via useEffect when files state updates
      setFiles(prev => {
        const updated = [...prev, ...processedFiles];
        console.log('[useFileUpload] 📝 Setting files state:', {
          prevCount: prev.length,
          newCount: processedFiles.length,
          totalCount: updated.length,
          allFiles: updated.map(f => ({ id: f.id, name: f.name, hasData: !!f.data }))
        });
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar archivos");
    } finally {
      setIsUploading(false);
    }
  }, [validateFile, processFile, onFilesChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [addFiles]);

  const handleCameraCapture = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.capture = "environment";
      fileInputRef.current.click();
    }
  }, []);

  const handleVideoCapture = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "video/*";
      fileInputRef.current.capture = "environment";
      fileInputRef.current.click();
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const fileToRemove = prev[index];
      // Limpiar blob URL y store de video si aplica
      if (fileToRemove?.data?.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.data);
        removeOriginalVideoFile(fileToRemove.id);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearFiles = useCallback(() => {
    // onFilesChange will be called automatically via useEffect when files state updates
    setFiles([]);
  }, []);

  return {
    files,
    isDragOver,
    isUploading,
    error,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    handleCameraCapture,
    handleVideoCapture,
    removeFile,
    clearFiles,
  };
}
