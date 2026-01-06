"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Property = Database['public']['Tables']['properties']['Row'];
type PropertyActivity = Database['public']['Tables']['property_activities']['Row'];
type PropertyImage = Database['public']['Tables']['property_images']['Row'];
type PropertyInspection = Database['public']['Tables']['property_inspections']['Row'];

interface TestSupabaseData {
  properties: Property[];
  propertyActivities: PropertyActivity[];
  propertyImages: PropertyImage[];
  propertyInspections: PropertyInspection[];
  loading: boolean;
  error: string | null;
}

export function useTestSupabase() {
  const [data, setData] = useState<TestSupabaseData>({
    properties: [],
    propertyActivities: [],
    propertyImages: [],
    propertyInspections: [],
    loading: true,
    error: null,
  });

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        // Fetch all data in parallel
        const [propertiesResult, activitiesResult, imagesResult, inspectionsResult] = await Promise.all([
          supabase.from('properties').select('*').limit(10),
          supabase.from('property_activities').select('*').limit(10),
          supabase.from('property_images').select('*').limit(10),
          supabase.from('property_inspections').select('*').limit(10),
        ]);

        // Check for errors
        if (propertiesResult.error) throw propertiesResult.error;
        if (activitiesResult.error) throw activitiesResult.error;
        if (imagesResult.error) throw imagesResult.error;
        if (inspectionsResult.error) throw inspectionsResult.error;

        setData({
          properties: propertiesResult.data || [],
          propertyActivities: activitiesResult.data || [],
          propertyImages: imagesResult.data || [],
          propertyInspections: inspectionsResult.data || [],
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching data from Supabase:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        }));
      }
    }

    fetchData();
  }, [supabase]);

  return data;
}

