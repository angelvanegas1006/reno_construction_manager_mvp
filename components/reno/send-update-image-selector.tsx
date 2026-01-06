"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Check, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';

type SupabaseProperty = Database['public']['Tables']['properties']['Row'];

interface Category {
  id: string;
  name: string;
  percentage: number;
}

interface CategoryUpdate {
  id: string;
  category_id: string;
  photos: string[] | null;
  created_at: string;
}

interface CategoryWithImages {
  category: Category;
  images: string[];
  updateId: string;
  updateDate: string;
}

interface SendUpdateImageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: SupabaseProperty;
  categories: Category[];
  onNext: (selectedImages: Record<string, string[]>) => void;
}

export function SendUpdateImageSelector({
  open,
  onOpenChange,
  property,
  categories,
  onNext,
}: SendUpdateImageSelectorProps) {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Record<string, Set<string>>>({});
  const [categoriesWithImages, setCategoriesWithImages] = useState<CategoryWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Detectar mobile/tablet
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

  // Obtener categorías con imágenes de updates recientes (últimos 30 minutos o el update actual)
  useEffect(() => {
    if (!open || categories.length === 0) {
      setCategoriesWithImages([]);
      setLoading(false);
      return;
    }

    const fetchCategoriesWithImages = async () => {
      setLoading(true);
      try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        
        // Obtener todos los updates recientes para todas las categorías
        const categoryIds = categories.map(cat => cat.id);
        
        const { data: updates, error } = await supabase
          .from('category_updates')
          .select('*')
          .eq('property_id', property.id)
          .in('category_id', categoryIds)
          .gte('created_at', thirtyMinutesAgo)
          .order('created_at', { ascending: false });

        if (error) {
          // Si la tabla no existe (404) o hay un error de relación, simplemente retornar vacío
          const errorCode = (error as any)?.code;
          const errorMessage = String(error.message || '');
          const statusCode = (error as any)?.status || (error as any)?.statusCode;
          const isEmptyObject = typeof error === 'object' && error !== null && Object.keys(error).length === 0;
          
          const isTableNotFound = 
            isEmptyObject ||
            statusCode === 404 ||
            !errorMessage ||
            errorCode === 'PGRST116' || 
            errorCode === '42P01' ||
            errorMessage.includes('relation') || 
            errorMessage.includes('does not exist') ||
            errorMessage.includes('not found') ||
            errorMessage.includes('category_updates') ||
            errorMessage.toLowerCase().includes('404');
          
          if (isTableNotFound) {
            // Tabla no existe aún - esto es normal si la migración no se ha ejecutado
            setCategoriesWithImages([]);
            setLoading(false);
            return;
          }
          throw error;
        }

        // Agrupar por categoría y obtener solo las que tienen imágenes
        const categoryMap = new Map<string, CategoryWithImages>();
        
        (updates || []).forEach((update: CategoryUpdate) => {
          if (update.photos && update.photos.length > 0) {
            const category = categories.find(cat => cat.id === update.category_id);
            if (category) {
              // Si ya existe esta categoría, usar el update más reciente
              const existing = categoryMap.get(update.category_id);
              if (!existing || new Date(update.created_at) > new Date(existing.updateDate)) {
                categoryMap.set(update.category_id, {
                  category,
                  images: update.photos,
                  updateId: update.id,
                  updateDate: update.created_at,
                });
              }
            }
          }
        });

        setCategoriesWithImages(Array.from(categoryMap.values()));
      } catch (err) {
        console.error('Error fetching categories with images:', err);
        setCategoriesWithImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoriesWithImages();
  }, [open, property.id, categories, supabase]);

  // Resetear selección cuando se abre/cierra
  useEffect(() => {
    if (!open) {
      setSelectedImages({});
    }
  }, [open]);

  const toggleImage = useCallback((categoryId: string, imageUrl: string) => {
    setSelectedImages(prev => {
      const categorySet = prev[categoryId] || new Set<string>();
      const newSet = new Set(categorySet);
      
      if (newSet.has(imageUrl)) {
        newSet.delete(imageUrl);
      } else {
        newSet.add(imageUrl);
      }
      
      return {
        ...prev,
        [categoryId]: newSet,
      };
    });
  }, []);

  const handleNext = useCallback(() => {
    // Convertir Sets a arrays
    const selectedImagesArray: Record<string, string[]> = {};
    Object.entries(selectedImages).forEach(([categoryId, imageSet]) => {
      if (imageSet.size > 0) {
        selectedImagesArray[categoryId] = Array.from(imageSet);
      }
    });
    
    onNext(selectedImagesArray);
  }, [selectedImages, onNext]);

  const handleClose = useCallback(() => {
    setSelectedImages({});
    onOpenChange(false);
  }, [onOpenChange]);

  const hasSelectedImages = useMemo(() => {
    return Object.values(selectedImages).some(set => set.size > 0);
  }, [selectedImages]);

  // Mobile: pantalla completa
  if (isMobileOrTablet) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-full h-full md:h-auto md:max-w-2xl p-0 gap-0">
          <div className="flex flex-col h-full md:h-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <DialogTitle className="text-lg font-semibold">
                  Seleccionar Imágenes
                </DialogTitle>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Cargando imágenes...</p>
                </div>
              ) : categoriesWithImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <p className="text-muted-foreground text-center">
                    No hay imágenes disponibles en las categorías actualizadas recientemente.
                  </p>
                  <p className="text-xs text-muted-foreground text-center px-4">
                    Primero actualiza el progreso de una categoría y agrega fotos para poder enviarlas al cliente.
                  </p>
                </div>
              ) : (
                categoriesWithImages.map(({ category, images, updateDate }) => (
                  <div key={category.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">{category.name}</Label>
                      <span className="text-xs text-muted-foreground">
                        {new Date(updateDate).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {images.map((imageUrl, index) => {
                        const isSelected = selectedImages[category.id]?.has(imageUrl) || false;
                        return (
                          <button
                            key={`${category.id}-${index}`}
                            type="button"
                            onClick={() => toggleImage(category.id, imageUrl)}
                            className={cn(
                              "relative aspect-square rounded-lg border-2 overflow-hidden transition-all",
                              isSelected
                                ? "border-[var(--prophero-blue-600)] ring-2 ring-[var(--prophero-blue-600)] ring-offset-2"
                                : "border-border hover:border-[var(--prophero-blue-400)]"
                            )}
                          >
                            <img
                              src={imageUrl}
                              alt={`${category.name} - Imagen ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-[var(--prophero-blue-600)]/20 flex items-center justify-center">
                                <div className="bg-[var(--prophero-blue-600)] rounded-full p-1.5">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-4 space-y-3">
              <Button
                onClick={handleNext}
                disabled={!hasSelectedImages || loading}
                className="w-full h-12 text-base font-medium bg-[var(--prophero-blue-600)] hover:bg-[var(--prophero-blue-700)]"
              >
                Continuar
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full h-12 text-base font-medium"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop/Tablet: Modal
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Seleccionar Imágenes por Categoría</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando imágenes...</p>
            </div>
          ) : categoriesWithImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <p className="text-muted-foreground text-center">
                No hay imágenes disponibles en las categorías actualizadas recientemente.
              </p>
              <p className="text-xs text-muted-foreground text-center px-4">
                Primero actualiza el progreso de una categoría y agrega fotos para poder enviarlas al cliente.
              </p>
            </div>
          ) : (
            categoriesWithImages.map(({ category, images, updateDate }) => (
              <div key={category.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">{category.name}</Label>
                  <span className="text-xs text-muted-foreground">
                    {new Date(updateDate).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {images.map((imageUrl, index) => {
                    const isSelected = selectedImages[category.id]?.has(imageUrl) || false;
                    return (
                      <button
                        key={`${category.id}-${index}`}
                        type="button"
                        onClick={() => toggleImage(category.id, imageUrl)}
                        className={cn(
                          "relative aspect-square rounded-lg border-2 overflow-hidden transition-all group",
                          isSelected
                            ? "border-[var(--prophero-blue-600)] ring-2 ring-[var(--prophero-blue-600)] ring-offset-2"
                            : "border-border hover:border-[var(--prophero-blue-400)]"
                        )}
                      >
                        <img
                          src={imageUrl}
                          alt={`${category.name} - Imagen ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[var(--prophero-blue-600)]/20 flex items-center justify-center">
                            <div className="bg-[var(--prophero-blue-600)] rounded-full p-1.5">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleNext}
            disabled={!hasSelectedImages || loading}
            className="bg-[var(--prophero-blue-600)] hover:bg-[var(--prophero-blue-700)]"
          >
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
