"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Property = Database['public']['Tables']['properties']['Row'];
type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export function useSupabaseProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch all properties
  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setProperties(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching properties');
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Fetch single property by ID
  const fetchPropertyById = useCallback(async (id: string): Promise<Property | null> => {
    try {
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching property');
      console.error('Error fetching property:', err);
      return null;
    }
  }, [supabase]);

  // Create property
  const createProperty = useCallback(async (property: PropertyInsert): Promise<Property | null> => {
    try {
      setError(null);
      
      const { data, error: insertError } = await supabase
        .from('properties')
        .insert(property)
        .select()
        .single();

      if (insertError) throw insertError;
      
      // Refresh properties list
      await fetchProperties();
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating property');
      console.error('Error creating property:', err);
      return null;
    }
  }, [supabase, fetchProperties]);

  // Update property
  const updateProperty = useCallback(async (id: string, updates: PropertyUpdate): Promise<Property | null> => {
    try {
      setError(null);
      
      const { data, error: updateError } = await supabase
        .from('properties')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      // Refresh properties list
      await fetchProperties();
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating property');
      console.error('Error updating property:', err);
      return null;
    }
  }, [supabase, fetchProperties]);

  // Delete property
  const deleteProperty = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      // Refresh properties list
      await fetchProperties();
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting property');
      console.error('Error deleting property:', err);
      return false;
    }
  }, [supabase, fetchProperties]);

  // Initial load
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  return {
    properties,
    loading,
    error,
    fetchProperties,
    fetchPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
  };
}

