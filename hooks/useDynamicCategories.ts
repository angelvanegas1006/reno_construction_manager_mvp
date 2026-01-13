"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { toast } from 'sonner';

type DynamicCategory = Database['public']['Tables']['property_dynamic_categories']['Row'];
type CategoryUpdate = Database['public']['Tables']['property_dynamic_categories']['Update'];
type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

interface CategoryUpdateData {
  photos?: string[];
  videos?: string[];
  notes?: string;
}

interface UseDynamicCategoriesReturn {
  categories: DynamicCategory[];
  loading: boolean;
  error: string | null;
  updateCategoryPercentage: (categoryId: string, percentage: number) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  saveAllProgress: (
    propertyId: string, 
    percentages: Record<string, number>,
    updates?: Record<string, CategoryUpdateData>
  ) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useDynamicCategories(propertyId: string | null): UseDynamicCategoriesReturn {
  const [categories, setCategories] = useState<DynamicCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchCategories = useCallback(async () => {
    if (!propertyId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('property_dynamic_categories')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setCategories(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching categories');
      console.error('Error fetching dynamic categories:', err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId, supabase]);

  const updateCategoryPercentage = useCallback(async (categoryId: string, percentage: number): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('property_dynamic_categories')
        .update({
          percentage: percentage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', categoryId);

      if (updateError) throw updateError;

      // Update local state
      setCategories(prev => prev.map(cat =>
        cat.id === categoryId ? { ...cat, percentage, updated_at: new Date().toISOString() } : cat
      ));

      return true;
    } catch (err) {
      console.error('Error updating category percentage:', err);
      toast.error('Error al actualizar el porcentaje');
      return false;
    }
  }, [supabase]);

  const deleteCategory = useCallback(async (categoryId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('property_dynamic_categories')
        .delete()
        .eq('id', categoryId);

      if (deleteError) throw deleteError;

      // Update local state
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));

      toast.success('Categoría eliminada');
      return true;
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error('Error al eliminar la categoría');
      return false;
    }
  }, [supabase]);

  const updatePropertyLastUpdate = useCallback(async (propertyId: string): Promise<boolean> => {
    try {
      // First, get the property to get renovation_type
      const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('renovation_type')
        .eq('id', propertyId)
        .single();

      if (fetchError) throw fetchError;

      const lastUpdateDate = new Date().toISOString();
      
      // Calculate next_update based on renovation_type
      // When user saves progress, calculate from last_update (resets the cycle)
      const { calculateNextUpdateDateFromLastUpdate } = await import('@/lib/reno/update-calculator');
      const nextUpdateDate = calculateNextUpdateDateFromLastUpdate(lastUpdateDate, property?.renovation_type);

      const updateData: any = {
        last_update: lastUpdateDate,
        updated_at: new Date().toISOString(),
      };

      if (nextUpdateDate) {
        updateData.next_update = nextUpdateDate;
      }

      const { error: updateError } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', propertyId);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      console.error('Error updating property last_update:', err);
      return false;
    }
  }, [supabase]);

  const saveAllProgress = useCallback(async (
    propertyId: string,
    percentages: Record<string, number>,
    updates?: Record<string, CategoryUpdateData>
  ): Promise<boolean> => {
    try {
      setError(null);

      // Solo actualizar categorías con cambios reales
      const categoriesToUpdate = categories.filter(cat => {
        const newPercentage = percentages[cat.id];
        return newPercentage !== undefined && newPercentage !== cat.percentage;
      });

      if (categoriesToUpdate.length === 0) {
        toast.info('No hay cambios para guardar');
        return true;
      }

      // Obtener el usuario actual para guardar created_by
      const { data: { user } } = await supabase.auth.getUser();
      const createdBy = user?.id || null;

      // Update all changed categories in parallel
      const updatePromises = categoriesToUpdate.map(async (cat) => {
        const newPercentage = percentages[cat.id];
        const previousPercentage = cat.percentage ?? 0;
        
        // Actualizar la categoría
        const { error: updateError } = await supabase
          .from('property_dynamic_categories')
          .update({
            percentage: newPercentage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cat.id);

        if (updateError) {
          return { error: updateError };
        }

        // Siempre crear un category_update cuando se guarda el progreso (para historial)
        // Incluso si no hay fotos/videos/notas, queremos registrar el cambio de porcentaje
        const updateData = updates?.[cat.id];
        const { error: insertError } = await supabase
          .from('category_updates')
          .insert({
            category_id: cat.id,
            property_id: propertyId,
            previous_percentage: previousPercentage,
            new_percentage: newPercentage,
            photos: updateData?.photos || [],
            videos: updateData?.videos || [],
            notes: updateData?.notes || undefined,
            created_by: createdBy,
            // category_text se actualizará después cuando se genere el texto para el email
          });

        if (insertError) {
          console.error(`Error saving update for category ${cat.id}:`, insertError);
          // No fallar el guardado si solo falla el insert del update
        }

        return { error: null };
      });

      const results = await Promise.all(updatePromises);
      const hasErrors = results.some(result => result.error);

      if (hasErrors) {
        throw new Error('Error al guardar algunas categorías');
      }

      // Update property last_update (triggers automatic next_update recalculation)
      await updatePropertyLastUpdate(propertyId);

      // Refresh categories
      await fetchCategories();

      toast.success('Progreso guardado correctamente');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar el progreso';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [supabase, updatePropertyLastUpdate, fetchCategories, categories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    updateCategoryPercentage,
    deleteCategory,
    saveAllProgress,
    refetch: fetchCategories,
  };
}

