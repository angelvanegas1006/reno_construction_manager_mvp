"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Loader2, Trash2 } from 'lucide-react';
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
  const [isGeneratingTexts, setIsGeneratingTexts] = useState(false);
  const [generationErrors, setGenerationErrors] = useState<Record<string, string>>({});
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set()); // Categorías excluidas del update
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

  // Obtener categorías sin fotos pero con updates MUY recientes (últimos 2 minutos)
  // Solo incluir categorías que se acaban de guardar justo antes de enviar el update
  useEffect(() => {
    if (!open || categories.length === 0) {
      setCategoriesWithoutImages([]);
      return;
    }

    const fetchCategoriesWithoutImages = async () => {
      try {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const categoryIds = categories.map(cat => cat.id);
        
        const { data: updates, error } = await supabase
          .from('category_updates')
          .select('category_id, created_at, new_percentage, photos')
          .eq('property_id', property.id)
          .in('category_id', categoryIds)
          .gte('created_at', twoMinutesAgo)
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
            // Si la tabla no existe, no incluir ninguna categoría sin imágenes
            // Solo se incluirán las que tienen imágenes seleccionadas
            setCategoriesWithoutImages([]);
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

        // Filtrar categorías que no están en selectedImages pero tienen updates MUY recientes SIN fotos
        // Solo incluir categorías con updates de los últimos 2 minutos (justo después de guardar)
        const categoriesWithoutImagesList = categories.filter(category => {
          if (selectedImages[category.id]) return false; // Ya tiene imágenes seleccionadas
          
          // Solo incluir si tiene un update muy reciente sin fotos
          return categoryIdsWithRecentUpdates.has(category.id);
        });

        setCategoriesWithoutImages(categoriesWithoutImagesList);
      } catch (err) {
        console.error('Error fetching categories without images:', err);
        // En caso de error, no incluir ninguna categoría (solo las que tienen imágenes seleccionadas)
        setCategoriesWithoutImages([]);
      }
    };

    fetchCategoriesWithoutImages();
  }, [open, property.id, categories, selectedImages, supabase]);

  // Generar textos con Gemini al abrir el modal
  useEffect(() => {
    if (!open || categories.length === 0) return;

    const generateTextsWithGemini = async () => {
      // Obtener solo categorías con avances MUY recientes (últimos 2 minutos)
      // Esto asegura que solo incluimos categorías que se acaban de guardar justo antes de enviar
      const categoriesWithProgress = [
        // Categorías con imágenes seleccionadas (siempre incluir si tienen imágenes)
        ...Object.keys(selectedImages).map(catId => {
          const cat = categories.find(c => c.id === catId);
          return cat && cat.percentage > 0 ? cat : null;
        }).filter(Boolean) as Category[],
        // Categorías sin imágenes pero con updates muy recientes (ya filtradas por categoriesWithoutImages)
        ...categoriesWithoutImages
      ];

      // Eliminar duplicados
      const uniqueCategories = Array.from(
        new Map(categoriesWithProgress.map(cat => [cat.id, cat])).values()
      );

      if (uniqueCategories.length === 0) return;

      setIsGeneratingTexts(true);
      setGenerationErrors({});

      try {
        // Obtener información completa de las categorías desde Supabase
        const categoryIds = uniqueCategories.map(cat => cat.id);
        
        // Obtener información de las categorías (activities_text)
        const { data: categoriesData } = await supabase
          .from('property_dynamic_categories')
          .select('id, activities_text')
          .in('id', categoryIds);

        // Obtener los últimos updates de cada categoría (solo los MUY recientes - últimos 2 minutos)
        // Esto asegura que solo incluimos categorías que se acaban de guardar justo antes de enviar
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: updatesData } = await supabase
          .from('category_updates')
          .select('category_id, previous_percentage, new_percentage, notes, created_at')
          .eq('property_id', property.id)
          .in('category_id', categoryIds)
          .gte('created_at', twoMinutesAgo)
          .order('created_at', { ascending: false });

        // Crear un mapa de updates por categoría (último update de cada una)
        const updatesMap = new Map<string, any>();
        if (updatesData) {
          updatesData.forEach((update: any) => {
            if (!updatesMap.has(update.category_id)) {
              updatesMap.set(update.category_id, update);
            }
          });
        }

        // Crear un mapa de categorías con su información completa
        const categoriesMap = new Map<string, any>();
        if (categoriesData) {
          categoriesData.forEach((cat: any) => {
            categoriesMap.set(cat.id, cat);
          });
        }

        // Filtrar categorías excluidas
        const categoriesToGenerate = uniqueCategories.filter(cat => !excludedCategories.has(cat.id));

        // Generar textos en paralelo para todas las categorías (excepto las excluidas)
        const generationPromises = categoriesToGenerate.map(async (category) => {
          try {
            const categoryInfo = categoriesMap.get(category.id);
            const update = updatesMap.get(category.id);
            
            const categoryData = {
              categoryName: category.name,
              currentPercentage: category.percentage,
              previousPercentage: update?.previous_percentage ?? undefined,
              activities: categoryInfo?.activities_text ?? undefined,
              notes: update?.notes ?? undefined,
              updateDate: update?.created_at ?? undefined,
            };

            const response = await fetch('/api/generate-category-text', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ categoryData }),
            });

            if (!response.ok) {
              // Intentar obtener más información del error
              let errorMessage = `Error ${response.status}: ${response.statusText}`;
              try {
                const errorData = await response.json();
                // Si es un error de cuota, mostrar mensaje más claro
                if (errorData.error === 'Cuota de OpenAI excedida' || errorData.message?.includes('quota')) {
                  errorMessage = 'Cuota de OpenAI excedida. Por favor, verifica tu plan y facturación.';
                  console.error(`[Generate Category Text] ⚠️ Cuota excedida para ${category.name}`);
                } else {
                  errorMessage = errorData.error || errorData.message || errorMessage;
                }
                if (errorData.details) {
                  console.error(`[Generate Category Text] Error details for ${category.name}:`, errorData.details);
                }
              } catch (e) {
                const errorText = await response.text();
                console.error(`[Generate Category Text] Error response text for ${category.name}:`, errorText);
              }
              throw new Error(errorMessage);
            }

            const { text } = await response.json();
            return { categoryId: category.id, text };
          } catch (error: any) {
            console.error(`Error generando texto para categoría ${category.id}:`, error);
            // Mantener texto por defecto en caso de error
            const defaultText = `Hemos avanzado en ${category.name} alcanzando un ${category.percentage}% de progreso.`;
            const errorMessage = error?.message?.includes('Cuota') 
              ? 'Cuota de OpenAI excedida. Se usó texto por defecto.'
              : 'Error al generar texto. Se usó texto por defecto.';
            setGenerationErrors(prev => ({
              ...prev,
              [category.id]: errorMessage,
            }));
            return { categoryId: category.id, text: defaultText };
          }
        });

        const results = await Promise.all(generationPromises);
        
        // Actualizar los textos generados
        const generatedTexts: Record<string, string> = {};
        results.forEach(({ categoryId, text }) => {
          generatedTexts[categoryId] = text;
        });

        setCategoryTexts(prev => ({ ...prev, ...generatedTexts }));

        // Generar resumen final con IA (solo para categorías no excluidas)
        try {
          const summaryInfo = categoriesToGenerate.map(cat => {
            const catText = generatedTexts[cat.id] || `Avance en ${cat.name}`;
            return `${cat.name}: ${catText}`;
          }).join('\n');

          const summaryResponse = await fetch('/api/generate-category-text', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              categoryData: {
                categoryName: 'Resumen General',
                currentPercentage: categoriesToGenerate.length > 0 
                  ? Math.round(categoriesToGenerate.reduce((sum, cat) => sum + cat.percentage, 0) / categoriesToGenerate.length)
                  : 0,
                activities: `Avances realizados:\n${summaryInfo}\n\nEscribe un párrafo corto (2-3 frases máximo) en español, positivo y profesional, que resuma el progreso general de la obra. Debe sonar natural, como escrito por un jefe de obra, y cerrar el update de manera positiva. NO menciones porcentajes.`,
              }
            }),
          });

          if (summaryResponse.ok) {
            const { text: summaryText } = await summaryResponse.json();
            setCategoryTexts(prev => ({ ...prev, _summary: summaryText }));
          }
        } catch (error) {
          console.error('Error generando resumen final:', error);
          // No es crítico, continuar sin resumen
        }
      } catch (error) {
        console.error('Error generando textos con Gemini:', error);
        toast.error('Error al generar textos automáticamente. Se usarán textos por defecto.');
      } finally {
        setIsGeneratingTexts(false);
      }
    };

    // Esperar un momento para que se carguen las categorías sin imágenes
    const timeoutId = setTimeout(() => {
      generateTextsWithGemini();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [open, categories, selectedImages, categoriesWithoutImages, property.id, supabase, excludedCategories]);

  const handleTextChange = useCallback((categoryId: string, text: string) => {
    setCategoryTexts(prev => ({
      ...prev,
      [categoryId]: text,
    }));
  }, []);

  // Función para quitar números del inicio de los nombres de categorías
  const cleanCategoryName = (name: string): string => {
    // Quitar números y espacios al inicio (ej: "6 CUARTO DE BAÑO" → "CUARTO DE BAÑO")
    return name.replace(/^\d+\s+/, '').trim();
  };

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
    
    // Categorías con imágenes (excluyendo las eliminadas)
    const categoriesWithImagesHTML = Object.entries(selectedImages)
      .filter(([categoryId]) => !excludedCategories.has(categoryId))
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
              <td style="padding: 6px; vertical-align: top; width: ${100 / rowImages.length}%;">
                <img src="${url}" alt="${category.name} - Imagen ${i + 1}" width="180" style="display: block; max-width: 180px; width: 100%; border-radius: 6px; border: 1px solid #e5e5e5;" />
              </td>
            `)
            .join('');
          imagesRows.push(`<tr>${rowHTML}</tr>`);
        }
        
        return `
          <tr>
            <td style="padding: 12px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                <tr>
                  <td style="padding-bottom: 6px;">
                    <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a; line-height: 1.4;">${cleanCategoryName(category.name)}</h2>
                    <p style="margin: 6px 0 0 0; font-size: 15px; color: #333333; line-height: 1.5;">${text}</p>
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
    
    // Categorías sin fotos pero con updates recientes (excluyendo las eliminadas)
    const categoriesWithoutImagesHTML = categoriesWithoutImages
      .filter(category => !excludedCategories.has(category.id))
      .map(category => {
        // Si no hay texto editado, usar el texto por defecto
        const text = categoryTexts[category.id] || `Hemos avanzado en ${category.name} alcanzando un ${category.percentage}% de progreso.`;
        
        return `
          <tr>
            <td style="padding: 12px 0; border-top: 1px solid #e5e5e5;">
              <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a; line-height: 1.4;">${cleanCategoryName(category.name)}</h2>
              <p style="margin: 6px 0 0 0; font-size: 15px; color: #333333; line-height: 1.5;">${text}</p>
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
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; font-size: 15px; line-height: 1.5; color: #333333;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 15px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px; width: 100%;">
                ${propHeroHeader}
                <tr>
                  <td style="padding: 20px 25px; background-color: #ffffff;">
                    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #1a1a1a; line-height: 1.4;">Update de Progreso</h1>
                    <p style="margin: 0 0 15px 0; font-size: 15px; color: #333333; line-height: 1.5;">
                      Estimado/a ${clientName},
                    </p>
                    <p style="margin: 0 0 15px 0; font-size: 15px; color: #333333; line-height: 1.5;">
                      Te compartimos el progreso actualizado de la obra:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                      ${categoriesWithImagesHTML}
                      ${categoriesWithoutImagesHTML}
                    </table>
                    ${categoryTexts._summary ? `
                    <p style="margin: 15px 0 0 0; font-size: 15px; color: #333333; line-height: 1.5;">
                      ${categoryTexts._summary}
                    </p>
                    ` : ''}
                    <p style="margin: 20px 0 0 0; font-size: 15px; color: #333333; line-height: 1.5;">
                      Si tienes alguna pregunta o comentario, no dudes en contactarnos.
                    </p>
                    <p style="margin: 15px 0 0 0; font-size: 15px; color: #333333; line-height: 1.5;">
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
  }, [property, categories, selectedImages, categoryTexts, categoriesWithoutImages, excludedCategories]);

  const handleSend = useCallback(async () => {
    setIsSending(true);
    try {
      // Primero guardar todos los cambios pendientes
      await onSend();
      
      // Generar HTML del correo (incluye todas las fotos embebidas)
      const emailHTML = generateEmailHTML();
      
      // Obtener email del cliente
      const clientEmail = property['Client email'];
      if (!clientEmail) {
        toast.error('No se encontró el email del cliente');
        return;
      }
      
      // Obtener Unique ID From Engagements
      const uniqueIdAirtable = property['Unique ID From Engagements'];
      if (!uniqueIdAirtable) {
        toast.error('No se encontró el Unique ID From Engagements');
        return;
      }
      
      // Preparar payload para n8n webhook
      // El HTML ya incluye todas las imágenes embebidas como URLs
      const payload = {
        to: clientEmail,
        subject: `Update de Progreso - ${uniqueIdAirtable}`,
        html: emailHTML, // HTML completo con todas las fotos
        uniqueIdAirtable: uniqueIdAirtable,
        propertyId: property.id,
        hubspotId: property['Hubspot ID'] || null,
      };
      
      console.log('[Send Update Email] Enviando payload al webhook:', {
        to: clientEmail,
        uniqueIdAirtable,
        htmlLength: emailHTML.length,
        hasImages: emailHTML.includes('<img'),
      });
      
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
      
      // Guardar HTML en client_update_emails
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: saveError } = await supabase
        .from('client_update_emails')
        .insert({
          property_id: property.id,
          html_content: emailHTML,
          client_email: clientEmail,
          subject: `Update de Progreso - ${uniqueIdAirtable}`,
          created_by: user?.id || null,
        });
      
      if (saveError) {
        console.error('[Send Update Email] Error guardando HTML en historial:', saveError);
        // No fallar el envío si solo falla el guardado del historial
      } else {
        console.log('[Send Update Email] ✅ HTML guardado en historial');
      }
      
      // Actualizar category_updates más recientes con los textos generados
      // Buscar los updates más recientes de cada categoría que tiene texto generado (excluyendo las eliminadas)
      const categoryIdsWithText = Object.keys(categoryTexts)
        .filter(id => id !== '_summary' && !excludedCategories.has(id));
      
      if (categoryIdsWithText.length > 0) {
        const updatePromises = categoryIdsWithText.map(async (categoryId) => {
          const text = categoryTexts[categoryId];
          if (!text) return;
          
          // Buscar el update más reciente de esta categoría sin texto
          const { data: recentUpdate, error: findError } = await supabase
            .from('category_updates')
            .select('id')
            .eq('category_id', categoryId)
            .eq('property_id', property.id)
            .is('category_text', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (findError) {
            console.error(`[Send Update Email] Error buscando update para categoría ${categoryId}:`, findError);
            return;
          }
          
          if (recentUpdate) {
            // Actualizar con el texto generado
            const { error: updateError } = await supabase
              .from('category_updates')
              .update({ category_text: text })
              .eq('id', recentUpdate.id);
            
            if (updateError) {
              console.error(`[Send Update Email] Error actualizando texto para categoría ${categoryId}:`, updateError);
            } else {
              console.log(`[Send Update Email] ✅ Texto actualizado para categoría ${categoryId}`);
            }
          } else {
            console.warn(`[Send Update Email] ⚠️ No se encontró update reciente sin texto para categoría ${categoryId}`);
          }
        });
        
        await Promise.all(updatePromises);
        console.log('[Send Update Email] ✅ Textos de categorías actualizados en historial');
      }
      
      toast.success('Update enviado correctamente al cliente');
      handleClose();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Error al enviar el correo');
    } finally {
      setIsSending(false);
    }
  }, [onSend, generateEmailHTML, property, categoryTexts, excludedCategories, supabase]);

  const handleClose = useCallback(() => {
    setCategoryTexts({});
    setExcludedCategories(new Set());
    setIsSending(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleExcludeCategory = useCallback((categoryId: string) => {
    setExcludedCategories(prev => {
      const newSet = new Set(prev);
      newSet.add(categoryId);
      return newSet;
    });
    // También eliminar el texto generado para esta categoría
    setCategoryTexts(prev => {
      const newTexts = { ...prev };
      delete newTexts[categoryId];
      return newTexts;
    });
  }, []);

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
              {/* Indicador de carga al generar textos */}
              {isGeneratingTexts && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Generando textos automáticamente con IA...
                  </span>
                </div>
              )}
              
              {/* Editor de textos por categoría */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Editar Textos</Label>
                {Object.entries(selectedImages)
                  .filter(([categoryId]) => !excludedCategories.has(categoryId))
                  .map(([categoryId, imageUrls]) => {
                  const category = categories.find(cat => cat.id === categoryId);
                  if (!category) return null;
                  
                  return (
                    <div key={categoryId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{category.name}</Label>
                        {!isGeneratingTexts && categoryTexts[categoryId] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcludeCategory(categoryId)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar esta categoría del update"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {isGeneratingTexts && !categoryTexts[categoryId] ? (
                        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Generando...</span>
                        </div>
                      ) : (
                      <Textarea
                        value={categoryTexts[categoryId] || ''}
                        onChange={(e) => handleTextChange(categoryId, e.target.value)}
                        placeholder={`Texto para ${category.name}...`}
                        rows={3}
                        className="resize-y text-sm"
                          disabled={isGeneratingTexts}
                        />
                      )}
                      {generationErrors[categoryId] && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {generationErrors[categoryId]}
                        </p>
                      )}
                    </div>
                  );
                })}
                
                {/* Categorías sin fotos pero con updates */}
                {categoriesWithoutImages
                  .filter(category => !excludedCategories.has(category.id))
                  .map(category => (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{category.name}</Label>
                      {!isGeneratingTexts && categoryTexts[category.id] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExcludeCategory(category.id)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Eliminar esta categoría del update"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {isGeneratingTexts && !categoryTexts[category.id] ? (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Generando...</span>
                      </div>
                    ) : (
                      <Textarea
                        value={categoryTexts[category.id] || ''}
                        onChange={(e) => handleTextChange(category.id, e.target.value)}
                        placeholder={`Texto para ${category.name}...`}
                        rows={3}
                        className="resize-y text-sm"
                        disabled={isGeneratingTexts}
                      />
                    )}
                    {generationErrors[category.id] && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {generationErrors[category.id]}
                      </p>
                    )}
                  </div>
                ))}
                
                {/* Resumen final editable */}
                {categoryTexts._summary && (
                  <div className="space-y-2 mt-4 pt-4 border-t">
                    <Label className="text-sm font-medium">Resumen Final</Label>
                    {isGeneratingTexts && !categoryTexts._summary ? (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Generando...</span>
                      </div>
                    ) : (
                      <Textarea
                        value={categoryTexts._summary || ''}
                        onChange={(e) => handleTextChange('_summary', e.target.value)}
                        placeholder="Resumen del progreso general..."
                        rows={3}
                        className="resize-y text-sm"
                        disabled={isGeneratingTexts}
                      />
                    )}
                  </div>
                )}
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
                disabled={isSending || isGeneratingTexts}
                className="w-full h-12 text-base font-medium bg-[var(--prophero-blue-600)] hover:bg-[var(--prophero-blue-700)]"
              >
                {isSending ? 'Enviando...' : isGeneratingTexts ? 'Generando textos...' : 'Enviar'}
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
            {/* Indicador de carga al generar textos */}
            {isGeneratingTexts && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Generando textos automáticamente con IA...
                </span>
              </div>
            )}
            
            <Label className="text-base font-semibold">Editar Textos</Label>
            {Object.entries(selectedImages)
              .filter(([categoryId]) => !excludedCategories.has(categoryId))
              .map(([categoryId]) => {
              const category = categories.find(cat => cat.id === categoryId);
              if (!category) return null;
              
              return (
                <div key={categoryId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{category.name}</Label>
                    {!isGeneratingTexts && categoryTexts[categoryId] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExcludeCategory(categoryId)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Eliminar esta categoría del update"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {isGeneratingTexts && !categoryTexts[categoryId] ? (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Generando...</span>
                    </div>
                  ) : (
                  <Textarea
                    value={categoryTexts[categoryId] || ''}
                    onChange={(e) => handleTextChange(categoryId, e.target.value)}
                    placeholder={`Texto para ${category.name}...`}
                    rows={4}
                    className="resize-y text-sm"
                      disabled={isGeneratingTexts}
                    />
                  )}
                  {generationErrors[categoryId] && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {generationErrors[categoryId]}
                    </p>
                  )}
                </div>
              );
            })}
            
            {/* Categorías sin fotos pero con updates */}
            {categoriesWithoutImages
              .filter(category => !excludedCategories.has(category.id))
              .map(category => (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{category.name}</Label>
                  {!isGeneratingTexts && categoryTexts[category.id] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExcludeCategory(category.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Eliminar esta categoría del update"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {isGeneratingTexts && !categoryTexts[category.id] ? (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Generando...</span>
                  </div>
                ) : (
                  <Textarea
                    value={categoryTexts[category.id] || ''}
                    onChange={(e) => handleTextChange(category.id, e.target.value)}
                    placeholder={`Texto para ${category.name}...`}
                    rows={4}
                    className="resize-y text-sm"
                    disabled={isGeneratingTexts}
                  />
                )}
                {generationErrors[category.id] && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {generationErrors[category.id]}
                  </p>
                )}
              </div>
            ))}
            
            {/* Resumen final editable */}
            {categoryTexts._summary && (
              <div className="space-y-2 mt-4 pt-4 border-t">
                <Label className="text-sm font-medium">Resumen Final</Label>
                {isGeneratingTexts && !categoryTexts._summary ? (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Generando...</span>
                  </div>
                ) : (
                  <Textarea
                    value={categoryTexts._summary || ''}
                    onChange={(e) => handleTextChange('_summary', e.target.value)}
                    placeholder="Resumen del progreso general..."
                    rows={4}
                    className="resize-y text-sm"
                    disabled={isGeneratingTexts}
                  />
                )}
              </div>
            )}
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
            disabled={isSending || isGeneratingTexts}
            className="bg-[var(--prophero-blue-600)] hover:bg-[var(--prophero-blue-700)]"
          >
            {isSending ? 'Enviando...' : isGeneratingTexts ? 'Generando textos...' : 'Enviar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
