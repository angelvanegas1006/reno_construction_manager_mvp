"use client";

import { useCallback } from "react";
import { Upload, X, Camera, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/lib/property-storage";
import { useFileUpload } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils";

interface DniUploadZoneProps {
  files: FileUpload[];
  onFilesChange: (files: FileUpload[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const MAX_FILE_SIZE = 5; // MB
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export function DniUploadZone({
  files,
  onFilesChange,
  maxFiles = 10,
  maxSizeMB = MAX_FILE_SIZE,
}: DniUploadZoneProps) {
  const uploadHook = useFileUpload({
    maxFileSize: maxSizeMB,
    acceptedTypes: ACCEPTED_TYPES,
    onFilesChange,
  });

  const handleRemoveFile = useCallback((index: number) => {
    uploadHook.removeFile(index);
  }, [uploadHook]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">
          DNI/NIF/CIF <span className="text-danger">*</span>
        </Label>
        <span className="text-xs text-muted-foreground">
          {files.length} archivo(s)
        </span>
      </div>
      
      <p className="text-xs text-muted-foreground">
        DNI/NIF/CIF/NIE son documentos válidos. Puedes subir múltiples archivos.
      </p>

      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          uploadHook.isDragOver
            ? "border-brand-500 bg-brand-50 dark:bg-brand-950/20"
            : "border-v-gray-300 dark:border-v-gray-600 hover:border-v-gray-400 dark:hover:border-v-gray-500"
        )}
        onDragOver={uploadHook.handleDragOver}
        onDragLeave={uploadHook.handleDragLeave}
        onDrop={uploadHook.handleDrop}
      >
        <Upload className="h-8 w-8 mx-auto text-v-gray-400 mb-2" />
        <p className="text-sm text-v-gray-600 dark:text-v-gray-400 mb-2">
          Arrastra archivos aquí o haz clic para explorar
        </p>
        <p className="text-xs text-v-gray-500 dark:text-v-gray-500">
          Máx. {maxFiles} archivos, {maxSizeMB}MB cada uno
        </p>
        
        <input
          ref={uploadHook.fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={uploadHook.handleFileSelect}
          className="hidden"
        />

        <div className="flex gap-2 justify-center mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => uploadHook.fileInputRef.current?.click()}
            className="flex items-center gap-1"
          >
            <Camera className="h-4 w-4" />
            Subir archivo
          </Button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, fileIndex) => (
            <div
              key={file.id || fileIndex}
              className="flex items-center justify-between p-3 bg-background dark:bg-v-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <File className="h-4 w-4 text-v-gray-500" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-v-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFile(fileIndex)}
                className="text-danger hover:text-danger"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {uploadHook.error && (
        <p className="text-sm text-danger">{uploadHook.error}</p>
      )}
    </div>
  );
}






