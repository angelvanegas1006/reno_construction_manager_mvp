"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, X, Camera, File, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/lib/property-storage";
import { useFileUpload } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  title: string;
  description: string;
  files: FileUpload[];
  onFilesChange: (files: FileUpload[]) => void;
  isRequired?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

const DEFAULT_MAX_SIZE = 5; // MB
const DEFAULT_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export function FileUploadZone({
  title,
  description,
  files,
  onFilesChange,
  isRequired = false,
  maxFiles = 10,
  maxSizeMB = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
}: FileUploadZoneProps) {
  // Detectar si estamos en mobile o tablet (no desktop)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  
  useEffect(() => {
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

  const uploadHook = useFileUpload({
    maxFileSize: maxSizeMB,
    acceptedTypes,
    onFilesChange,
  });

  const handleRemoveFile = useCallback((index: number) => {
    uploadHook.removeFile(index);
  }, [uploadHook]);

  // Verificar si acepta imágenes para mostrar opciones de cámara
  const acceptsImages = acceptedTypes.some(type => type.startsWith('image/'));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">
          {title} {isRequired && <span className="text-red-500">*</span>}
        </Label>
        <span className="text-xs text-muted-foreground">
          {files.length} archivo(s)
        </span>
      </div>
      
      <p className="text-xs text-muted-foreground">{description}</p>

      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          uploadHook.isDragOver
            ? "border-[var(--prophero-blue-500)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]/20"
            : "border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] hover:border-[var(--prophero-gray-400)] dark:hover:border-[var(--prophero-gray-500)]"
        )}
        onDragOver={uploadHook.handleDragOver}
        onDragLeave={uploadHook.handleDragLeave}
        onDrop={uploadHook.handleDrop}
      >
        <Upload className="h-8 w-8 mx-auto text-[var(--prophero-gray-400)] mb-2" />
        <p className="text-sm text-[var(--prophero-gray-600)] dark:text-[var(--prophero-gray-400)] mb-2">
          Arrastra archivos aquí o haz clic para explorar
        </p>
        <p className="text-xs text-[var(--prophero-gray-500)] dark:text-[var(--prophero-gray-500)]">
          Máx. {maxFiles} archivos, {maxSizeMB}MB cada uno
        </p>
        
        <input
          ref={uploadHook.fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={uploadHook.handleFileSelect}
          capture={isMobileOrTablet && acceptsImages ? "environment" : undefined}
          className="hidden"
        />

        <div className="flex gap-2 justify-center mt-3">
          {isMobileOrTablet && acceptsImages ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (uploadHook.fileInputRef.current) {
                    uploadHook.fileInputRef.current.accept = "image/*";
                    uploadHook.fileInputRef.current.capture = "environment";
                    uploadHook.fileInputRef.current.click();
                  }
                }}
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
                  if (uploadHook.fileInputRef.current) {
                    uploadHook.fileInputRef.current.accept = acceptedTypes.join(",");
                    uploadHook.fileInputRef.current.removeAttribute('capture');
                    uploadHook.fileInputRef.current.click();
                  }
                }}
                className="flex items-center gap-1"
              >
                <File className="h-4 w-4" />
                Galería
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => uploadHook.fileInputRef.current?.click()}
              className="flex items-center gap-1"
            >
              <Upload className="h-4 w-4" />
              Subir archivo
            </Button>
          )}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, fileIndex) => (
            <div
              key={file.id || fileIndex}
              className="flex items-center justify-between p-3 bg-[var(--prophero-gray-50)] dark:bg-[var(--prophero-gray-800)] rounded-lg"
            >
              <div className="flex items-center gap-3">
                <File className="h-4 w-4 text-[var(--prophero-gray-500)]" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-[var(--prophero-gray-500)]">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFile(fileIndex)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {uploadHook.error && (
        <p className="text-sm text-red-500">{uploadHook.error}</p>
      )}
    </div>
  );
}






