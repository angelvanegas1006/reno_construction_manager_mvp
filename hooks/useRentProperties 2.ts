"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { RentProperty } from "@/lib/rent/types";

export function useRentProperties() {
  const [properties, setProperties] = useState<RentProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProperties() {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('rent_properties')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setProperties((data || []) as RentProperty[]);
      } catch (err: any) {
        console.error('Error fetching properties:', err);
        setError(err.message || 'Error al cargar propiedades');
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, []);

  return { properties, loading, error };
}


