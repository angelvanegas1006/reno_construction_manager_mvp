"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { toast } from 'sonner';

type DynamicCategory = Database['public']['Tables']['property_dynamic_categories']['Row'];
type CategoryUpdate = Database['public']['Tables']['property_dynamic_categories']['Update'];
type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

interface UseDynamicCategoriesReturn {
  categories: DynamicCategory[];
  loading: boolean;
  error: string | null;
  updateCategoryPercentage: (categoryId: string, percentage: number) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  saveAllProgress: (propertyId: string, percentages: Record<string, number>) => Promise<boolean>;
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
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          last_update: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
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
    percentages: Record<string, number>
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

      // Update all changed categories in parallel
      const updatePromises = categoriesToUpdate.map(cat => {
        const newPercentage = percentages[cat.id];
        return supabase
          .from('property_dynamic_categories')
          .update({
            percentage: newPercentage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cat.id);
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

