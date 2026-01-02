"use client";

import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Upload, Image as ImageIcon, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';

type SupabaseProperty = Database['public']['Tables']['properties']['Row'];

interface Category {
  id: string;
  name: string;
  percentage: number;
}

interface SavedImage {
  id: string;
  url: string;
  filename: string;
}

interface SendUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: SupabaseProperty;
  categories: Category[];
  savedImages?: SavedImage[];
  onImagesSent?: () => void;
}

interface UploadedImage {
  url: string;
  filename: string;
}

const WEBHOOK_URL = 'https://n8n.prod.prophero.com/webhook/envio_emailsupdates';
const MAX_IMAGES = 20;
const BUCKET_NAME = 'inspection-images';

export function SendUpdateDialog({
  open,
  onOpenChange,
  property,
  categories,
  savedImages = [],
  onImagesSent,
}: SendUpdateDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedSavedImages, setSelectedSavedImages] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const generateFilename = (file: File): string => {
    const timestamp = Math.floor(Date.now() / 1000);
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    return `update_${timestamp}_${randomString}.${fileExtension}`;
  };

  const uploadImageToStorage = useCallback(async (file: File): Promise<UploadedImage> => {
    // Usar path organizado: propertyId/updates/filename
    const timestamp = Math.floor(Date.now() / 1000);
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `${property.id}/updates/update_${timestamp}_${randomString}.${fileExtension}`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Error al subir ${file.name}: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return {
      url: publicUrl,
      filename: filename,
    };
  }, [supabase]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Check total limit
    const totalFiles = selectedFiles.length + files.length;
    if (totalFiles > MAX_IMAGES) {
      toast.error(`Máximo ${MAX_IMAGES} imágenes permitidas`);
      return;
    }

    // Validate image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast.warning('Algunos archivos no son imágenes y fueron ignorados');
    }

    setSelectedFiles(prev => [...prev, ...imageFiles]);
  }, [selectedFiles.length]);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUploadImages = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast.error('Por favor, selecciona al menos una imagen');
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises = selectedFiles.map(file => uploadImageToStorage(file));
      const uploaded = await Promise.all(uploadPromises);
      setUploadedImages(uploaded);
      toast.success(`${uploaded.length} imagen(es) subida(s) correctamente`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error(error instanceof Error ? error.message : 'Error al subir las imágenes');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, uploadImageToStorage]);

  const handleSendUpdate = useCallback(async () => {
    if (uploadedImages.length === 0 && selectedFiles.length > 0) {
      toast.error('Por favor, sube las imágenes primero');
      return;
    }

    // Combinar imágenes guardadas seleccionadas con imágenes recién subidas
    const selectedSavedImagesArray = savedImages.filter(img => selectedSavedImages.has(img.id));
    const allSelectedImages = [
      ...selectedSavedImagesArray.map(img => ({ url: img.url, filename: img.filename })),
      ...uploadedImages.map(img => ({ url: img.url, filename: img.filename })),
    ];

    if (allSelectedImages.length === 0) {
      toast.error('Por favor, selecciona al menos una imagen');
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        categories: categories.map(cat => ({
          name: cat.name,
          percentage: cat.percentage,
        })),
        clientEmail: property['Client email'] ?? null,
        uniqueIdAirtable: property['Unique ID From Engagements'] ?? null,
        hubspotId: property['Hubspot ID'] ?? null,
        selectedImages: allSelectedImages,
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Error al enviar el update: ${response.statusText}`);
      }

      // Eliminar imágenes enviadas de la base de datos
      if (selectedSavedImages.size > 0) {
        const imageIdsToDelete = Array.from(selectedSavedImages);
        await supabase
          .from('property_images')
          .delete()
          .in('id', imageIdsToDelete);
      }

      toast.success('Update enviado correctamente al cliente');
      
      // Notificar que las imágenes fueron enviadas
      if (onImagesSent) {
        onImagesSent();
      }
      
      handleClose();
    } catch (error) {
      console.error('Error sending update:', error);
      toast.error(error instanceof Error ? error.message : 'Error al enviar el update');
    } finally {
      setIsSending(false);
    }
  }, [uploadedImages, selectedSavedImages, savedImages, categories, property, supabase, onImagesSent]);

  const handleClose = useCallback(() => {
    setSelectedFiles([]);
    setUploadedImages([]);
    setSelectedSavedImages(new Set());
    setIsUploading(false);
    setIsSending(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  }, [onOpenChange]);

  const handleToggleSavedImage = useCallback((imageId: string) => {
    setSelectedSavedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  }, []);

  const totalImages = selectedFiles.length + uploadedImages.length;
  const totalSelectedImages = selectedSavedImages.size + uploadedImages.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Update a Cliente</DialogTitle>
          <DialogDescription>
            Selecciona las imágenes guardadas o sube nuevas imágenes para incluir en el update al cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Imágenes Guardadas */}
          {savedImages.length > 0 && (
            <div className="space-y-2">
              <Label>Imágenes Guardadas - Selecciona las que quieres enviar</Label>
              <div className="grid grid-cols-3 gap-2">
                {savedImages.map((img) => (
                  <div 
                    key={img.id} 
                    className="relative group cursor-pointer"
                    onClick={() => handleToggleSavedImage(img.id)}
                  >
                    <div className="aspect-square rounded-lg border-2 overflow-hidden bg-muted relative transition-all">
                      <img
                        src={img.url}
                        alt={img.filename}
                        className="w-full h-full object-cover"
                      />
                      {selectedSavedImages.has(img.id) && (
                        <div className="absolute inset-0 bg-primary/20 border-2 border-primary" />
                      )}
                      <div className="absolute top-2 left-2 pointer-events-none">
                        <div className={cn(
                          "h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
                          selectedSavedImages.has(img.id)
                            ? "bg-primary border-primary"
                            : "bg-background border-border"
                        )}>
                          {selectedSavedImages.has(img.id) && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedSavedImages.size} de {savedImages.length} imagen{selectedSavedImages.size !== 1 ? 'es' : ''} seleccionada{selectedSavedImages.size !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* File Input para nuevas imágenes */}
          <div className="space-y-2">
            <Label>Subir Nuevas Imágenes ({totalImages}/{MAX_IMAGES})</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={totalImages >= MAX_IMAGES || isUploading || isSending}
                className="hidden"
                id="image-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={totalImages >= MAX_IMAGES || isUploading || isSending}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Seleccionar Imágenes
              </Button>
              {selectedFiles.length > 0 && (
                <Button
                  type="button"
                  onClick={handleUploadImages}
                  disabled={isUploading || isSending}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? 'Subiendo...' : 'Subir Imágenes'}
                </Button>
              )}
            </div>
          </div>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Imágenes seleccionadas ({selectedFiles.length})</Label>
              <div className="grid grid-cols-3 gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded Images Preview */}
          {uploadedImages.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-green-600" />
                Imágenes subidas ({uploadedImages.length})
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {uploadedImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
                      <img
                        src={img.url}
                        alt={img.filename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{img.filename}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories Summary */}
          <div className="space-y-2 pt-4 border-t">
            <Label>Resumen de Categorías</Label>
            <div className="space-y-1">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{cat.name}</span>
                  <span className="font-semibold">{cat.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading || isSending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSendUpdate}
            disabled={(uploadedImages.length === 0 && selectedSavedImages.size === 0) || isSending || isUploading}
            className="flex items-center gap-2"
          >
            {isSending ? 'Enviando...' : `Enviar Update${totalSelectedImages > 0 ? ` (${totalSelectedImages} imagen${totalSelectedImages !== 1 ? 'es' : ''})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

