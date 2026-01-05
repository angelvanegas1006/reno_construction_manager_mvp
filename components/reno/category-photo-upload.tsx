"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChecklistUploadZone } from "@/components/checklist/checklist-upload-zone";
import { ChecklistUploadZone as ChecklistUploadZoneType } from "@/lib/checklist-storage";

const BUCKET_NAME = 'category-updates';

interface CategoryPhotoUploadProps {
  categoryId: string;
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    photos: string[];
    videos: string[];
    notes?: string;
  }) => void;
  onUploadZoneChange?: (uploadZone: ChecklistUploadZoneType) => void; // Callback para pasar el uploadZone completo
  initialData?: {
    photos: string[];
    videos: string[];
    notes?: string;
  };
}

export function CategoryPhotoUpload({
  categoryId,
  propertyId,
  open,
  onOpenChange,
  onSave,
  onUploadZoneChange,
  initialData,
}: CategoryPhotoUploadProps) {
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [uploadZone, setUploadZone] = useState<ChecklistUploadZoneType>(() => {
    // Convertir URLs a formato FileUpload
    const photos = (initialData?.photos || []).map((url, index) => ({
      id: `photo-${Date.now()}-${index}`,
      name: `photo-${index + 1}.jpg`,
      type: 'image/jpeg',
      size: 0,
      data: url, // URL ya subida
      uploadedAt: new Date().toISOString(),
    }));
    
    const videos = (initialData?.videos || []).map((url, index) => ({
      id: `video-${Date.now()}-${index}`,
      name: `video-${index + 1}.mp4`,
      type: 'video/mp4',
      size: 0,
      data: url, // URL ya subida
      uploadedAt: new Date().toISOString(),
    }));

    return {
      id: `${categoryId}-photos-videos`,
      photos,
      videos,
    };
  });

  // Solo inicializar cuando se abre por primera vez o cuando initialData cambia significativamente
  const prevOpenRef = useRef(false);
  const prevInitialDataRef = useRef<string>('');
  
  useEffect(() => {
    const currentInitialDataKey = JSON.stringify({
      photos: initialData?.photos || [],
      videos: initialData?.videos || [],
      notes: initialData?.notes || '',
    });
    
    // Solo resetear cuando se abre después de estar cerrado, o cuando initialData cambia
    if (open && !prevOpenRef.current) {
      // Se está abriendo por primera vez o después de estar cerrado
      setNotes(initialData?.notes || "");
      const photos = (initialData?.photos || []).map((url, index) => ({
        id: `photo-${Date.now()}-${index}`,
        name: `photo-${index + 1}.jpg`,
        type: 'image/jpeg',
        size: 0,
        data: url,
        uploadedAt: new Date().toISOString(),
      }));
      
      const videos = (initialData?.videos || []).map((url, index) => ({
        id: `video-${Date.now()}-${index}`,
        name: `video-${index + 1}.mp4`,
        type: 'video/mp4',
        size: 0,
        data: url,
        uploadedAt: new Date().toISOString(),
      }));

      setUploadZone({
        id: `${categoryId}-photos-videos`,
        photos,
        videos,
      });
      
      prevInitialDataRef.current = currentInitialDataKey;
    } else if (!open && prevOpenRef.current) {
      // Se está cerrando - no resetear aquí, mantener el estado para la próxima apertura
      // Solo resetear si initialData cambió significativamente
      if (currentInitialDataKey !== prevInitialDataRef.current) {
        setNotes(initialData?.notes || "");
        const photos = (initialData?.photos || []).map((url, index) => ({
          id: `photo-${Date.now()}-${index}`,
          name: `photo-${index + 1}.jpg`,
          type: 'image/jpeg',
          size: 0,
          data: url,
          uploadedAt: new Date().toISOString(),
        }));
        
        const videos = (initialData?.videos || []).map((url, index) => ({
          id: `video-${Date.now()}-${index}`,
          name: `video-${index + 1}.mp4`,
          type: 'video/mp4',
          size: 0,
          data: url,
          uploadedAt: new Date().toISOString(),
        }));

        setUploadZone({
          id: `${categoryId}-photos-videos`,
          photos,
          videos,
        });
        
        prevInitialDataRef.current = currentInitialDataKey;
      }
    }
    
    prevOpenRef.current = open;
  }, [open, initialData, categoryId]);

  // Guardar automáticamente cuando cambia el uploadZone (solo URLs ya subidas)
  // Usar useRef para evitar loops infinitos
  const prevDataRef = useRef<string>('');
  const onSaveRef = useRef(onSave);
  
  // Mantener onSave actualizado en el ref
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);
  
  useEffect(() => {
    if (!open) return;
    
    // Extraer URLs ya subidas (no base64) para guardar en onSave
    // Las fotos en base64 se pasan a través de onUploadZoneChange para subirlas después
    const photos = uploadZone.photos
      .filter(p => p.data && p.data.startsWith('http'))
      .map(p => p.data)
      .sort();
    
    const videos = uploadZone.videos
      .filter(v => v.data && v.data.startsWith('http'))
      .map(v => v.data)
      .sort();

    const currentData = JSON.stringify({ photos, videos, notes: notes.trim() });
    
    // Solo guardar si realmente cambió (solo URLs ya subidas)
    // Las nuevas fotos en base64 se manejarán cuando se guarde el progreso completo
    if (currentData !== prevDataRef.current) {
      prevDataRef.current = currentData;
      onSaveRef.current({
        photos,
        videos,
        notes: notes.trim() || undefined,
      });
    }
  }, [uploadZone.photos.length, uploadZone.videos.length, uploadZone.photos.map(p => p.data).join(','), uploadZone.videos.map(v => v.data).join(','), notes, open]);

  const handleUploadZoneUpdate = useCallback((updatedZone: ChecklistUploadZoneType) => {
    setUploadZone(updatedZone);
    // Pasar el uploadZone completo al componente padre para que pueda subirlo después
    if (onUploadZoneChange) {
      onUploadZoneChange(updatedZone);
    }
    // No llamar onSave aquí - se manejará en el useEffect
  }, [onUploadZoneChange]);

  const handleNotesChange = useCallback((newNotes: string) => {
    setNotes(newNotes);
    // Guardar automáticamente cuando se cambian las notas
    const photos = uploadZone.photos
      .filter(p => p.data && p.data.startsWith('http'))
      .map(p => p.data);
    
    const videos = uploadZone.videos
      .filter(v => v.data && v.data.startsWith('http'))
      .map(v => v.data);

    if (photos.length > 0 || videos.length > 0 || newNotes.trim()) {
      onSave({
        photos,
        videos,
        notes: newNotes.trim() || undefined,
      });
    }
  }, [uploadZone, onSave]);

  if (!open) return null;

  return (
    <div className="mt-4 pt-4 border-t space-y-4 bg-muted/30 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Fotos/Videos del update (opcional)</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <Label className="text-xs sm:text-sm">Notas (opcional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          onBlur={() => {
            // Guardar cuando se pierde el foco
            const photos = uploadZone.photos
              .filter(p => p.data && p.data.startsWith('http'))
              .map(p => p.data);
            
            const videos = uploadZone.videos
              .filter(v => v.data && v.data.startsWith('http'))
              .map(v => v.data);

            if (photos.length > 0 || videos.length > 0 || notes.trim()) {
              onSave({
                photos,
                videos,
                notes: notes.trim() || undefined,
              });
            }
          }}
          placeholder="Agrega notas sobre este update..."
          rows={6}
          className="resize-y text-sm sm:text-base min-h-[150px] sm:min-h-[100px] leading-relaxed w-full"
        />
      </div>

      {/* ChecklistUploadZone - misma experiencia que el checklist */}
      <ChecklistUploadZone
        title="Fotos/Videos"
        description="Añade fotos o videos del progreso de esta categoría"
        uploadZone={uploadZone}
        onUpdate={handleUploadZoneUpdate}
        isRequired={false}
        maxFiles={10}
        maxSizeMB={50}
        hideTitle={true}
      />
    </div>
  );
}
