"use client";

import { forwardRef, useCallback } from "react";
import { Info, Upload, X, Camera, Video, File, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PropertyData, FileUpload } from "@/lib/property-storage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormState } from "@/hooks/useFormState";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useI18n } from "@/lib/i18n";

interface DocumentacionSectionProps {
  data: PropertyData;
  onUpdate: (updates: Partial<PropertyData>) => void;
  onContinue?: () => void;
}

const MAX_FILE_SIZE = 64; // MB
const ACCEPTED_TYPES = [
  "video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/webm",
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  "application/pdf"
];

export const DocumentacionSection = forwardRef<HTMLDivElement, DocumentacionSectionProps>(
  ({ data, onUpdate, onContinue }, ref) => {
    const { t } = useI18n();
    // Use form state hook for controlled components
    const { formData, updateField } = useFormState({
      initialData: data,
      onUpdate,
    });

    // File upload hooks for each type
    const videoUpload = useFileUpload({
      maxFileSize: MAX_FILE_SIZE,
      acceptedTypes: ACCEPTED_TYPES,
      onFilesChange: (files) => updateField("videoGeneral", files),
    });

    const notaSimpleUpload = useFileUpload({
      maxFileSize: MAX_FILE_SIZE,
      acceptedTypes: ACCEPTED_TYPES,
      onFilesChange: (files) => updateField("notaSimpleRegistro", files),
    });

    const certificadoUpload = useFileUpload({
      maxFileSize: MAX_FILE_SIZE,
      acceptedTypes: ACCEPTED_TYPES,
      onFilesChange: (files) => updateField("certificadoEnergetico", files),
    });

    // Memoized handlers
    const handleCameraCapture = useCallback((field: "videoGeneral") => {
      if (typeof window === "undefined" || !navigator.mediaDevices) {
        toast.error("La cámara no está disponible en este dispositivo");
        return;
      }

      try {
        if (field === "videoGeneral" && videoUpload.fileInputRef.current) {
          videoUpload.fileInputRef.current.click();
        }
      } catch (error) {
        toast.error("Error al acceder a la cámara");
      }
    }, [videoUpload]);

    const handleVideoCapture = useCallback((field: "videoGeneral") => {
      if (typeof window === "undefined" || !navigator.mediaDevices) {
        toast.error("La cámara no está disponible en este dispositivo");
        return;
      }

      try {
        if (field === "videoGeneral" && videoUpload.fileInputRef.current) {
          videoUpload.fileInputRef.current.click();
        }
      } catch (error) {
        toast.error("Error al acceder a la cámara");
      }
    }, [videoUpload]);

    const renderDropZone = useCallback((
      field: "videoGeneral" | "notaSimpleRegistro" | "certificadoEnergetico",
      title: string,
      description: string,
      isRequired: boolean,
      isOptional?: boolean
    ) => {
      const files = formData[field] || [];
      const uploadHook = field === "videoGeneral" ? videoUpload : 
                        field === "notaSimpleRegistro" ? notaSimpleUpload : 
                        certificadoUpload;

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">
              {title} {isRequired && <span className="text-red-500">*</span>}
              {isOptional && <span className="text-xs text-muted-foreground font-normal ml-1">(Opcional)</span>}
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
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-[var(--prophero-gray-500)] dark:text-[var(--prophero-gray-500)]">
              Máximo {MAX_FILE_SIZE}MB por archivo
            </p>
            
            {/* Hidden file input */}
            <input
              ref={uploadHook.fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES.join(",")}
              onChange={uploadHook.handleFileSelect}
              className="hidden"
            />

            {/* Mobile camera/video buttons */}
            <div className="flex gap-2 justify-center mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCameraCapture(field as "videoGeneral")}
                className="flex items-center gap-1"
              >
                <Camera className="h-4 w-4" />
                Foto
              </Button>
              {field === "videoGeneral" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleVideoCapture(field as "videoGeneral")}
                  className="flex items-center gap-1"
                >
                  <Video className="h-4 w-4" />
                  Video
                </Button>
              )}
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={file.id || index}
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
                    onClick={() => uploadHook.removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Error display */}
          {uploadHook.error && (
            <p className="text-sm text-red-500">{uploadHook.error}</p>
          )}
        </div>
      );
    }, [formData, videoUpload, notaSimpleUpload, certificadoUpload, handleCameraCapture, handleVideoCapture]);

    return (
      <div ref={ref} className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t.property.sections.documentation}</h1>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]/20 border border-[var(--prophero-blue-200)] dark:border-[var(--prophero-blue-800)] rounded-lg">
          <Info className="h-5 w-5 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--prophero-blue-900)] dark:text-[var(--prophero-blue-200)]">
              Documentos requeridos para la revisión inicial
            </p>
            <p className="text-sm text-[var(--prophero-blue-800)] dark:text-[var(--prophero-blue-300)] mt-1">
              Sube los documentos necesarios para que PropHero pueda revisar la propiedad.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Video General */}
          {renderDropZone(
            "videoGeneral",
            "Video general de la propiedad",
            "Sube un video mostrando la propiedad por dentro y por fuera. Puedes usar la cámara del móvil.",
            true
          )}

          {/* Nota Simple del Registro */}
          {renderDropZone(
            "notaSimpleRegistro",
            "Nota simple del registro",
            "Documento oficial que acredita la propiedad y su estado registral.",
            true
          )}

          {/* Certificado energético */}
          {renderDropZone(
            "certificadoEnergetico",
            "Certificado energético",
            "Documento que certifica la eficiencia energética de la propiedad.",
            true
          )}
        </div>

        {/* Continue Button */}
        {onContinue && (
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={() => {
                onUpdate(formData);
                onContinue();
              }} 
              size="lg"
            >
              {t.common.continue}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

DocumentacionSection.displayName = "DocumentacionSection";