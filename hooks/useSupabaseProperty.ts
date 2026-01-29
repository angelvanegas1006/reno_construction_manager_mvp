"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Property = Database['public']['Tables']['properties']['Row'];
type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export function useSupabaseProperty(propertyId: string | null) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch property by ID (UUID) or by Unique ID From Engagements
  const fetchProperty = useCallback(async () => {
    if (!propertyId) {
      setProperty(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (fetchError?.code === 'PGRST116') {
        const { data: byUniqueId, error: uniqueIdError } = await supabase
          .from('properties')
          .select('*')
          .eq('"Unique ID From Engagements"', propertyId)
          .single();
        if (!uniqueIdError && byUniqueId) {
          setProperty(byUniqueId);
        } else {
          setProperty(null);
          setError(null);
        }
      } else if (fetchError) {
        throw fetchError;
      } else {
        setProperty(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching property');
      console.error('Error fetching property:', err);
      setProperty(null);
    } finally {
      setLoading(false);
    }
  }, [propertyId, supabase]);

  // Update property (use resolved property.id so it works when propertyId was Unique ID)
  const updateProperty = useCallback(async (updates: PropertyUpdate): Promise<boolean> => {
    const idToUse = property?.id ?? propertyId;
    if (!idToUse) return false;

    try {
      setError(null);

      const { data, error: updateError } = await supabase
        .from('properties')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', idToUse)
        .select()
        .single();

      if (updateError) throw updateError;

      setProperty(data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating property');
      console.error('Error updating property:', err);
      return false;
    }
  }, [property?.id, propertyId, supabase]);

  // Initial load
  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  return {
    property,
    loading,
    error,
    updateProperty,
    refetch: fetchProperty,
  };
}

