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

  // Fetch property by ID
  const fetchProperty = useCallback(async () => {
    if (!propertyId) {
      setProperty(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (fetchError) {
        // PGRST116 means "not found" - this is expected for non-existent properties
        if (fetchError.code === 'PGRST116') {
          setProperty(null);
          setError(null); // Don't treat "not found" as an error
          return;
        }
        throw fetchError;
      }
      
      setProperty(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching property');
      console.error('Error fetching property:', err);
      setProperty(null);
    } finally {
      setLoading(false);
    }
  }, [propertyId, supabase]);

  // Update property
  const updateProperty = useCallback(async (updates: PropertyUpdate): Promise<boolean> => {
    if (!propertyId) return false;

    try {
      setError(null);
      
      const { data, error: updateError } = await supabase
        .from('properties')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId)
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
  }, [propertyId, supabase]);

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

