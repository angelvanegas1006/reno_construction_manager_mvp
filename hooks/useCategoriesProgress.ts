"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';

interface CategoriesProgress {
  [propertyId: string]: number; // percentage (0-100)
}

interface UseCategoriesProgressReturn {
  progressByPropertyId: CategoriesProgress;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and calculate average progress from dynamic categories
 * for multiple properties in reno-in-progress phase
 */
export function useCategoriesProgress(propertyIds: string[]): UseCategoriesProgressReturn {
  const [progressByPropertyId, setProgressByPropertyId] = useState<CategoriesProgress>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propertyIds.length === 0) {
      setProgressByPropertyId({});
      setLoading(false);
      return;
    }

    async function fetchProgress() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all categories for the given property IDs
        const { data: categories, error: categoriesError } = await supabase
          .from('property_dynamic_categories')
          .select('property_id, percentage')
          .in('property_id', propertyIds);

        if (categoriesError) {
          throw categoriesError;
        }

        // Calculate average progress for each property
        const progress: CategoriesProgress = {};
        
        // Group categories by property_id
        const categoriesByProperty: Record<string, number[]> = {};
        categories?.forEach(cat => {
          if (!categoriesByProperty[cat.property_id]) {
            categoriesByProperty[cat.property_id] = [];
          }
          categoriesByProperty[cat.property_id].push(cat.percentage || 0);
        });

        // Calculate average for each property
        Object.entries(categoriesByProperty).forEach(([propertyId, percentages]) => {
          if (percentages.length > 0) {
            const sum = percentages.reduce((acc, p) => acc + p, 0);
            const average = Math.round(sum / percentages.length);
            progress[propertyId] = average;
          } else {
            progress[propertyId] = 0;
          }
        });

        // Set 0 for properties without categories
        propertyIds.forEach(id => {
          if (!(id in progress)) {
            progress[id] = 0;
          }
        });

        setProgressByPropertyId(progress);
      } catch (err: any) {
        console.error('[useCategoriesProgress] Error fetching progress:', err);
        setError(err.message || 'Error al obtener el progreso');
        setProgressByPropertyId({});
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();
  }, [propertyIds]); // Re-fetch when property IDs change

  return {
    progressByPropertyId,
    loading,
    error,
  };
}
