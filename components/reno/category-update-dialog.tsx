"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Video, Image as ImageIcon, X, Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_FILES = 10;
const MAX_SIZE_MB = 50; // 50MB para videos
const BUCKET_NAME = 'category-updates';

interface CategoryUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
  propertyId: string;
  previousPercentage: number;
  newPercentage: number;
  onConfirm: (data: {
    photos: string[];
    videos: string[];
    notes?: string;
  }) => Promise<void>;
}

export function CategoryUpdateDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  propertyId,
  previousPercentage,
  newPercentage,
  onConfirm,
}: CategoryUpdateDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Detectar si estamos en mobile o tablet
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkMobileOrTablet = () => {
      const isSmallScreen = window.innerWidth < 1024;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobileOrTablet(isSmallScreen || isMobileDevice);
    };
    
    checkMobileOrTablet();
    window.addEventListener('resize', checkMobileOrTablet);
    return () => window.removeEventListener('resize', checkMobileOrTablet);
  }, []);

  // Resetear estado cuando se abre/cierra el dialog
  useEffect(() => {
    if (!open) {
      setSelectedFiles([]);
      setUploadedPhotos([]);
      setUploadedVideos([]);
      setNotes("");
      setIsUploading(false);
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  }, [open]);

  const generateFilename = (file: File): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop() || (file.type.startsWith('video/') ? 'mp4' : 'jpg');
    return `${propertyId}/${categoryId}/update_${timestamp}_${randomString}.${fileExtension}`;
  };

  const uploadFileToStorage = useCallback(async (file: File): Promise<string> => {
    const filename = generateFilename(file);
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      // Si el bucket no existe, intentar crearlo o mostrar error
      if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
        throw new Error(`Bucket '${BUCKET_NAME}' no encontrado. Por favor crea el bucket en Supabase Dashboard → Storage → Create bucket → Nombre: "${BUCKET_NAME}"`);
      }
      throw new Error(`Error al subir ${file.name}: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return publicUrl;
  }, [supabase, propertyId, categoryId]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, accept: string) => {
    const files = Array.from(e.target.files || []);
    
    // Validar tamaño y tipo
    const validFiles = files.filter(file => {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_SIZE_MB) {
        toast.error(`${file.name} es muy grande (máximo ${MAX_SIZE_MB}MB)`);
        return false;
      }
      return true;
    });

    const totalFiles = selectedFiles.length + validFiles.length;
    if (totalFiles > MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} archivos permitidos`);
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  }, [selectedFiles.length]);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => {
      const removed = prev[index];
      const updated = prev.filter((_, i) => i !== index);
      
      // También remover de uploadedPhotos o uploadedVideos si ya estaba subido
      if (removed.type.startsWith('image/')) {
        setUploadedPhotos(prevPhotos => prevPhotos.filter((_, i) => i !== index));
      } else if (removed.type.startsWith('video/')) {
        setUploadedVideos(prevVideos => prevVideos.filter((_, i) => i !== index));
      }
      
      return updated;
    });
  }, []);

  const handleUploadFiles = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast.error('Por favor, selecciona al menos un archivo');
      return;
    }

    setIsUploading(true);
    try {
      const photos: string[] = [];
      const videos: string[] = [];

      for (const file of selectedFiles) {
        const url = await uploadFileToStorage(file);
        if (file.type.startsWith('image/')) {
          photos.push(url);
        } else if (file.type.startsWith('video/')) {
          videos.push(url);
        }
      }

      setUploadedPhotos(photos);
      setUploadedVideos(videos);
      toast.success(`${selectedFiles.length} archivo(s) subido(s) correctamente`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error(error instanceof Error ? error.message : 'Error al subir los archivos');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, uploadFileToStorage]);

  const handleConfirm = useCallback(async () => {
    // Si hay archivos seleccionados pero no subidos, subirlos primero
    if (selectedFiles.length > 0 && uploadedPhotos.length === 0 && uploadedVideos.length === 0) {
      await handleUploadFiles();
      // Esperar un momento para que se actualicen los estados
      await new Promise(resolve => setTimeout(resolve, 500));
      // Re-evaluar después de subir
      return;
    }

    setIsSaving(true);
    try {
      await onConfirm({
        photos: uploadedPhotos,
        videos: uploadedVideos,
        notes: notes.trim() || undefined,
      });
      // No cerrar el dialog aquí, el componente padre lo manejará
    } catch (error) {
      console.error('Error saving update:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar el update');
      setIsSaving(false);
    }
  }, [uploadedPhotos, uploadedVideos, notes, selectedFiles, handleUploadFiles, onConfirm]);

  const handleSkip = useCallback(async () => {
    // Guardar sin fotos/videos
    setIsSaving(true);
    try {
      await onConfirm({
        photos: [],
        videos: [],
        notes: notes.trim() || undefined,
      });
      // No cerrar el dialog aquí, el componente padre lo manejará
    } catch (error) {
      console.error('Error saving update:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar el update');
      setIsSaving(false);
    }
  }, [notes, onConfirm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Actualizar Progreso: {categoryName}</DialogTitle>
          <DialogDescription>
            De {previousPercentage}% a {newPercentage}% • Agrega fotos o videos opcionales para documentar el avance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Notas opcionales */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega notas sobre este update..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Selección de archivos */}
          <div className="space-y-2">
            <Label>Fotos o Videos (opcional)</Label>
            <div className="flex flex-wrap gap-2">
              {/* Botón para seleccionar archivos */}
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
                disabled={isUploading || isSaving}
              >
                <ImageIcon className="h-4 w-4" />
                Seleccionar archivos
              </Button>

              {/* Botón para tomar foto/video en mobile/tablet */}
              {isMobileOrTablet && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-2"
                    disabled={isUploading || isSaving}
                  >
                    <Camera className="h-4 w-4" />
                    Cámara
                  </Button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*,video/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, 'image/*,video/*')}
                  />
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'image/*,video/*')}
              />
            </div>

            {/* Lista de archivos seleccionados */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2 mt-2">
                <div className="text-sm text-muted-foreground">
                  {selectedFiles.length} archivo(s) seleccionado(s)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative group border rounded-lg p-2 bg-muted/50"
                    >
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                      ) : (
                        <Video className="h-8 w-8 mx-auto text-muted-foreground" />
                      )}
                      <p className="text-xs truncate mt-1">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Botón para subir archivos */}
                {selectedFiles.length > 0 && uploadedPhotos.length === 0 && uploadedVideos.length === 0 && (
                  <Button
                    type="button"
                    onClick={handleUploadFiles}
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Subir archivos
                      </>
                    )}
                  </Button>
                )}

                {/* Mostrar archivos subidos */}
                {(uploadedPhotos.length > 0 || uploadedVideos.length > 0) && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✅ {uploadedPhotos.length + uploadedVideos.length} archivo(s) subido(s) correctamente
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading || isSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isUploading || isSaving}
            >
              Guardar sin fotos
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isUploading || isSaving || (selectedFiles.length > 0 && uploadedPhotos.length === 0 && uploadedVideos.length === 0)}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
