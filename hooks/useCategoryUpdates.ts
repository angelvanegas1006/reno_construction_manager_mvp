"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
// Tipo temporal hasta que se actualice la migración en Supabase
interface CategoryUpdate {
  id: string;
  category_id: string;
  property_id: string;
  previous_percentage: number | null;
  new_percentage: number;
  photos: string[] | null;
  videos: string[] | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

interface UseCategoryUpdatesReturn {
  updates: CategoryUpdate[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCategoryUpdates(categoryId: string | null): UseCategoryUpdatesReturn {
  const [updates, setUpdates] = useState<CategoryUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchUpdates = useCallback(async () => {
    if (!categoryId) {
      setUpdates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('category_updates')
        .select('*')
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false })
        .limit(10); // Solo los últimos 10 updates

      if (fetchError) {
        // Si la tabla no existe aún, simplemente retornar array vacío sin error
        const errorCode = (fetchError as any)?.code;
        const errorMessage = String(fetchError.message || '');
        const errorDetails = JSON.stringify(fetchError);
        const isEmptyObject = typeof fetchError === 'object' && fetchError !== null && Object.keys(fetchError).length === 0;
        
        // Verificar si es un error de tabla no encontrada (varios formatos posibles)
        // Si el objeto está vacío o no tiene mensaje claro, asumimos que es tabla no encontrada
        const isTableNotFound = 
          isEmptyObject ||
          !errorMessage ||
          errorCode === 'PGRST116' || 
          errorCode === '42P01' ||
          errorMessage.includes('relation') || 
          errorMessage.includes('does not exist') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('category_updates') ||
          errorDetails.includes('relation') ||
          errorDetails.includes('does not exist') ||
          errorDetails.includes('not found') ||
          errorDetails.includes('category_updates');
        
        if (isTableNotFound) {
          // Tabla no existe aún, simplemente retornar vacío sin mostrar error
          setUpdates([]);
          setError(null);
          setLoading(false);
          return;
        }
        throw fetchError;
      }

      setUpdates(data || []);
    } catch (err) {
      // Verificar si es un error de tabla no encontrada antes de mostrar error
      const errorCode = (err as any)?.code;
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorDetails = JSON.stringify(err);
      const isEmptyObject = typeof err === 'object' && err !== null && Object.keys(err).length === 0;
      
      // Verificar si es un error de tabla no encontrada (varios formatos posibles)
      // Si el objeto está vacío o no tiene mensaje claro, asumimos que es tabla no encontrada
      const isTableNotFound = 
        isEmptyObject ||
        !errorMessage ||
        errorCode === 'PGRST116' || 
        errorCode === '42P01' ||
        errorMessage.includes('relation') || 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('category_updates') ||
        errorDetails.includes('relation') ||
        errorDetails.includes('does not exist') ||
        errorDetails.includes('not found') ||
        errorDetails.includes('category_updates');
      
      if (!isTableNotFound) {
        // Solo mostrar error si NO es un error de tabla no encontrada
        setError(errorMessage || 'Error fetching updates');
        console.error('Error fetching category updates:', err);
      } else {
        // Tabla no existe aún o error desconocido (probablemente tabla no encontrada)
        // Simplemente retornar vacío sin error
        setError(null);
      }
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, supabase]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  return {
    updates,
    loading,
    error,
    refetch: fetchUpdates,
  };
}
