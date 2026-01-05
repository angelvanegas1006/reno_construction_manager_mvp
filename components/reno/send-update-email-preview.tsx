"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';

type SupabaseProperty = Database['public']['Tables']['properties']['Row'];

interface Category {
  id: string;
  name: string;
  percentage: number;
}

interface SendUpdateEmailPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: SupabaseProperty;
  categories: Category[];
  selectedImages: Record<string, string[]>;
  onSend: () => Promise<void>;
}

const WEBHOOK_URL = 'https://n8n.prod.prophero.com/webhook/envio_emailsupdates';

export function SendUpdateEmailPreview({
  open,
  onOpenChange,
  property,
  categories,
  selectedImages,
  onSend,
}: SendUpdateEmailPreviewProps) {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [categoryTexts, setCategoryTexts] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
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

  const [categoriesWithoutImages, setCategoriesWithoutImages] = useState<Category[]>([]);

  // Obtener categorías sin fotos pero con updates recientes (últimos 30 minutos)
  // También incluir categorías que tuvieron cambios de porcentaje aunque no tengan registro en category_updates
  useEffect(() => {
    if (!open || categories.length === 0) {
      setCategoriesWithoutImages([]);
      return;
    }

    const fetchCategoriesWithoutImages = async () => {
      try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const categoryIds = categories.map(cat => cat.id);
        
        const { data: updates, error } = await supabase
          .from('category_updates')
          .select('category_id, created_at, new_percentage, photos')
          .eq('property_id', property.id)
          .in('category_id', categoryIds)
          .gte('created_at', thirtyMinutesAgo)
          .order('created_at', { ascending: false });

        if (error) {
          const errorCode = (error as any)?.code;
          const errorMessage = String(error.message || '');
          const isTableNotFound = 
            !errorMessage ||
            errorCode === 'PGRST116' || 
            errorCode === '42P01' ||
            errorMessage.includes('relation') || 
            errorMessage.includes('does not exist') ||
            errorMessage.includes('not found') ||
            errorMessage.includes('category_updates');
          
          if (isTableNotFound) {
            // Si la tabla no existe, incluir todas las categorías con porcentaje > 0 que no tienen imágenes seleccionadas
            const categoriesWithoutImagesList = categories.filter(category => {
              if (selectedImages[category.id]) return false;
              return category.percentage > 0;
            });
            setCategoriesWithoutImages(categoriesWithoutImagesList);
            return;
          }
          console.error('Error fetching recent updates:', error);
          setCategoriesWithoutImages([]);
          return;
        }

        // Obtener IDs de categorías con updates recientes pero sin fotos
        const categoryIdsWithRecentUpdates = new Set(
          (updates || [])
            .filter(update => {
              // Incluir si no tiene fotos o las fotos están vacías
              return !update.photos || update.photos.length === 0;
            })
            .map(update => update.category_id)
        );

        // Filtrar categorías que no están en selectedImages pero tienen updates recientes SIN fotos
        // O categorías con porcentaje > 0 que no tienen imágenes seleccionadas
        const categoriesWithoutImagesList = categories.filter(category => {
          if (selectedImages[category.id]) return false; // Ya tiene imágenes seleccionadas
          
          // Incluir si:
          // 1. Tiene un update reciente sin fotos, O
          // 2. Tiene porcentaje > 0 (cambio reciente aunque no haya registro en category_updates)
          return (
            categoryIdsWithRecentUpdates.has(category.id) || 
            category.percentage > 0
          );
        });

        setCategoriesWithoutImages(categoriesWithoutImagesList);
      } catch (err) {
        console.error('Error fetching categories without images:', err);
        // En caso de error, incluir todas las categorías con porcentaje > 0 que no tienen imágenes
        const categoriesWithoutImagesList = categories.filter(category => {
          if (selectedImages[category.id]) return false;
          return category.percentage > 0;
        });
        setCategoriesWithoutImages(categoriesWithoutImagesList);
      }
    };

    fetchCategoriesWithoutImages();
  }, [open, property.id, categories, selectedImages, supabase]);

  // Inicializar textos dummy por categoría
  useEffect(() => {
    if (!open) return;
    
    const initialTexts: Record<string, string> = {};
    
    // Categorías con imágenes seleccionadas
    Object.keys(selectedImages).forEach(categoryId => {
      const category = categories.find(cat => cat.id === categoryId);
      if (category && !categoryTexts[categoryId]) {
        initialTexts[categoryId] = `Hemos avanzado en ${category.name} alcanzando un ${category.percentage}% de progreso.`;
      }
    });
    
    // Categorías sin fotos pero con updates recientes
    // Incluir todas las categorías sin imágenes que tienen porcentaje > 0
    categoriesWithoutImages.forEach(category => {
      if (!initialTexts[category.id] && !categoryTexts[category.id]) {
        initialTexts[category.id] = `Hemos avanzado en ${category.name} alcanzando un ${category.percentage}% de progreso.`;
      }
    });
    
    // También incluir cualquier categoría con porcentaje > 0 que no tenga imágenes seleccionadas
    // (por si acaso no se detectó en categoriesWithoutImages)
    categories.forEach(category => {
      if (
        category.percentage > 0 &&
        !selectedImages[category.id] &&
        !initialTexts[category.id] &&
        !categoryTexts[category.id]
      ) {
        initialTexts[category.id] = `Hemos avanzado en ${category.name} alcanzando un ${category.percentage}% de progreso.`;
      }
    });
    
    if (Object.keys(initialTexts).length > 0) {
      setCategoryTexts(prev => ({ ...prev, ...initialTexts }));
    }
  }, [open, selectedImages, categories, categoriesWithoutImages]);

  const handleTextChange = useCallback((categoryId: string, text: string) => {
    setCategoryTexts(prev => ({
      ...prev,
      [categoryId]: text,
    }));
  }, []);

  const generateEmailHTML = useCallback((): string => {
    // Cliente dummy temporal
    const clientName = 'Cliente'; // TODO: Obtener del campo cuando exista
    const clientEmail = property['Client email'] || 'cliente@example.com'; // Dummy
    
    // PropHero header - Usar logo de PropHero desde Google Drive
    // La imagen debe estar compartida públicamente en Google Drive
    const logoDriveId = "175Xighr2apmnSaTmmIQP_wKsj1c6iMFM";
    // URL estándar de Google Drive
    const logoUrl = `https://drive.google.com/uc?export=view&id=${logoDriveId}`;
    // URL alternativa usando el visor de Google Drive (más confiable para emails)
    const logoUrlAlt = `https://lh3.googleusercontent.com/d/${logoDriveId}`;
    
    const propHeroHeader = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 20px 20px 10px 20px;">
            <img src="${logoUrlAlt}" alt="PropHero" width="450" style="display: block; max-width: 450px; width: 100%; height: auto; border: 0;" onerror="this.onerror=null; this.src='${logoUrl}';" />
          </td>
        </tr>
      </table>
    `;
    
    // Categorías con imágenes
    const categoriesWithImagesHTML = Object.entries(selectedImages)
      .map(([categoryId, imageUrls]) => {
        const category = categories.find(cat => cat.id === categoryId);
        if (!category) return '';
        
        const text = categoryTexts[categoryId] || `Hemos avanzado en ${category.name} alcanzando un ${category.percentage}% de progreso.`;
        
        // Crear filas de imágenes (máximo 3 por fila)
        const imagesRows: string[] = [];
        for (let i = 0; i < imageUrls.length; i += 3) {
          const rowImages = imageUrls.slice(i, i + 3);
          const rowHTML = rowImages
            .map(url => `
              <td style="padding: 8px; vertical-align: top; width: ${100 / rowImages.length}%;">
                <img src="${url}" alt="${category.name} - Imagen ${i + 1}" width="180" style="display: block; max-width: 180px; width: 100%; border-radius: 8px; border: 1px solid #e5e5e5;" />
              </td>
            `)
            .join('');
          imagesRows.push(`<tr>${rowHTML}</tr>`);
        }
        
        return `
          <tr>
            <td style="padding: 20px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                <tr>
                  <td style="padding-bottom: 10px;">
                    <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">${category.name}</h2>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #666666; line-height: 1.6;">${text}</p>
                  </td>
                </tr>
                ${imagesRows.length > 0 ? `
                <tr>
                  <td style="padding-top: 15px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                      ${imagesRows.join('')}
                    </table>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
        `;
      })
      .join('');
    
    // Categorías sin fotos pero con updates recientes
    // Incluir todas las categorías sin imágenes que tienen porcentaje > 0, incluso si no tienen texto editado aún
    const categoriesWithoutImagesHTML = categoriesWithoutImages
      .map(category => {
        // Si no hay texto editado, usar el texto por defecto
        const text = categoryTexts[category.id] || `Hemos avanzado en ${category.name} alcanzando un ${category.percentage}% de progreso.`;
        
        return `
          <tr>
            <td style="padding: 20px 0; border-top: 1px solid #e5e5e5;">
              <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">${category.name}</h2>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #666666; line-height: 1.6;">${text}</p>
            </td>
          </tr>
        `;
      })
      .join('');
    
    // HTML completo compatible con email clients
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Update de Progreso - ${property['Unique ID From Engagements'] || 'Propiedad'}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px; width: 100%;">
                ${propHeroHeader}
                <tr>
                  <td style="padding: 10px 30px 30px 30px; background-color: #ffffff;">
                    <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">Update de Progreso</h1>
                    <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                      Estimado/a ${clientName},
                    </p>
                    <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                      Te compartimos el progreso actualizado de la obra:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                      ${categoriesWithImagesHTML}
                      ${categoriesWithoutImagesHTML}
                    </table>
                    <p style="margin: 30px 0 0 0; font-size: 16px; color: #666666; line-height: 1.6;">
                      Si tienes alguna pregunta o comentario, no dudes en contactarnos.
                    </p>
                    <p style="margin: 20px 0 0 0; font-size: 16px; color: #666666; line-height: 1.6;">
                      Saludos,<br>
                      Equipo PropHero
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    
    return html;
  }, [property, categories, selectedImages, categoryTexts, categoriesWithoutImages]);

  const handleSend = useCallback(async () => {
    setIsSending(true);
    try {
      // Primero guardar todos los cambios pendientes
      await onSend();
      
      // Generar HTML del correo
      const emailHTML = generateEmailHTML();
      
      // Preparar payload para n8n
      const payload = {
        to: property['Client email'] || 'cliente@example.com', // Dummy temporal
        subject: `Update de Progreso - ${property['Unique ID From Engagements'] || 'Propiedad'}`,
        html: emailHTML,
        propertyId: property.id,
        uniqueIdAirtable: property['Unique ID From Engagements'] || null,
        hubspotId: property['Hubspot ID'] || null,
      };
      
      // Llamar a n8n webhook (placeholder por ahora)
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Error al enviar el correo: ${response.statusText}`);
      }
      
      toast.success('Update enviado correctamente al cliente');
      handleClose();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Error al enviar el correo');
    } finally {
      setIsSending(false);
    }
  }, [onSend, generateEmailHTML, property]);

  const handleClose = useCallback(() => {
    setCategoryTexts({});
    setIsSending(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const emailHTML = useMemo(() => generateEmailHTML(), [generateEmailHTML]);

  // Mobile: pantalla completa
  if (isMobileOrTablet) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-full h-full md:h-auto md:max-w-4xl p-0 gap-0">
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
                  Previsualizar Correo
                </DialogTitle>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Editor de textos por categoría */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Editar Textos</Label>
                {Object.entries(selectedImages).map(([categoryId, imageUrls]) => {
                  const category = categories.find(cat => cat.id === categoryId);
                  if (!category) return null;
                  
                  return (
                    <div key={categoryId} className="space-y-2">
                      <Label className="text-sm font-medium">{category.name}</Label>
                      <Textarea
                        value={categoryTexts[categoryId] || ''}
                        onChange={(e) => handleTextChange(categoryId, e.target.value)}
                        placeholder={`Texto para ${category.name}...`}
                        rows={3}
                        className="resize-y text-sm"
                      />
                    </div>
                  );
                })}
                
                {/* Categorías sin fotos pero con updates */}
                {categoriesWithoutImages.map(category => (
                  <div key={category.id} className="space-y-2">
                    <Label className="text-sm font-medium">{category.name}</Label>
                    <Textarea
                      value={categoryTexts[category.id] || ''}
                      onChange={(e) => handleTextChange(category.id, e.target.value)}
                      placeholder={`Texto para ${category.name}...`}
                      rows={3}
                      className="resize-y text-sm"
                    />
                  </div>
                ))}
              </div>

              {/* Preview HTML */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Vista Previa</Label>
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe
                    srcDoc={emailHTML}
                    className="w-full h-[600px] border-0"
                    title="Email Preview"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 space-y-3">
              <Button
                onClick={handleSend}
                disabled={isSending}
                className="w-full h-12 text-base font-medium bg-[var(--prophero-blue-600)] hover:bg-[var(--prophero-blue-700)]"
              >
                {isSending ? 'Enviando...' : 'Enviar'}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSending}
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Previsualizar Correo</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-6 py-4">
          {/* Editor de textos */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Editar Textos</Label>
            {Object.entries(selectedImages).map(([categoryId]) => {
              const category = categories.find(cat => cat.id === categoryId);
              if (!category) return null;
              
              return (
                <div key={categoryId} className="space-y-2">
                  <Label className="text-sm font-medium">{category.name}</Label>
                  <Textarea
                    value={categoryTexts[categoryId] || ''}
                    onChange={(e) => handleTextChange(categoryId, e.target.value)}
                    placeholder={`Texto para ${category.name}...`}
                    rows={4}
                    className="resize-y text-sm"
                  />
                </div>
              );
            })}
            
            {/* Categorías sin fotos pero con updates */}
            {categoriesWithoutImages.map(category => (
              <div key={category.id} className="space-y-2">
                <Label className="text-sm font-medium">{category.name}</Label>
                <Textarea
                  value={categoryTexts[category.id] || ''}
                  onChange={(e) => handleTextChange(category.id, e.target.value)}
                  placeholder={`Texto para ${category.name}...`}
                  rows={4}
                  className="resize-y text-sm"
                />
              </div>
            ))}
          </div>

          {/* Preview HTML */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Vista Previa</Label>
            <div className="border rounded-lg overflow-hidden bg-white sticky top-0">
              <iframe
                srcDoc={emailHTML}
                className="w-full h-[700px] border-0"
                title="Email Preview"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending}
            className="bg-[var(--prophero-blue-600)] hover:bg-[var(--prophero-blue-700)]"
          >
            {isSending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
