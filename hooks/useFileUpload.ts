"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { FileUpload } from "@/lib/property-storage";

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
  "video/mp4",
  "video/webm",
  "application/pdf",
];

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
  
  // Call onFilesChange after files state updates (deferred to avoid render-time updates)
  // Skip the initial mount to avoid calling with empty array
  useEffect(() => {
    // Skip initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    
    // Use setTimeout to defer to next tick, preventing render-time updates
    const timeoutId = setTimeout(() => {
      onFilesChangeRef.current(files);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [files]);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxFileSize * 1024 * 1024) {
      return `El archivo es demasiado grande. Máximo ${maxFileSize}MB`;
    }
    
    if (!acceptedTypes.includes(file.type)) {
      return `Tipo de archivo no soportado. Tipos permitidos: ${acceptedTypes.join(", ")}`;
    }
    
    return null;
  }, [maxFileSize, acceptedTypes]);

  const processFile = useCallback(async (file: File): Promise<FileUpload> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
          uploadedAt: new Date().toISOString(),
        });
      };
      
      reader.onerror = () => {
        reject(new Error("Error al procesar el archivo"));
      };
      
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

      // Use functional update to ensure we have the latest state
      // onFilesChange will be called automatically via useEffect when files state updates
      setFiles(prev => {
        return [...prev, ...processedFiles];
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
    // onFilesChange will be called automatically via useEffect when files state updates
    setFiles(prev => prev.filter((_, i) => i !== index));
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
