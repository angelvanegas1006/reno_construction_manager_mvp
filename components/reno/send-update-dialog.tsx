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
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';

type SupabaseProperty = Database['public']['Tables']['properties']['Row'];

interface Category {
  id: string;
  name: string;
  percentage: number;
}

interface SendUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: SupabaseProperty;
  categories: Category[];
}

interface UploadedImage {
  url: string;
  filename: string;
}

const WEBHOOK_URL = 'https://n8n.prod.prophero.com/webhook/envio_emailsupdates';
const MAX_IMAGES = 20;
const BUCKET_NAME = 'property-images';

export function SendUpdateDialog({
  open,
  onOpenChange,
  property,
  categories,
}: SendUpdateDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
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
    const filename = generateFilename(file);
    
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
        selectedImages: uploadedImages.map(img => ({
          url: img.url,
          filename: img.filename,
        })),
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

      toast.success('Update enviado correctamente al cliente');
      handleClose();
    } catch (error) {
      console.error('Error sending update:', error);
      toast.error(error instanceof Error ? error.message : 'Error al enviar el update');
    } finally {
      setIsSending(false);
    }
  }, [uploadedImages, categories, property]);

  const handleClose = useCallback(() => {
    setSelectedFiles([]);
    setUploadedImages([]);
    setIsUploading(false);
    setIsSending(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  }, [onOpenChange]);

  const totalImages = selectedFiles.length + uploadedImages.length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Update a Cliente</DialogTitle>
          <DialogDescription>
            Selecciona y sube hasta {MAX_IMAGES} imágenes para incluir en el update al cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label>Imágenes ({totalImages}/{MAX_IMAGES})</Label>
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
            disabled={uploadedImages.length === 0 || isSending || isUploading}
            className="flex items-center gap-2"
          >
            {isSending ? 'Enviando...' : 'Enviar Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

