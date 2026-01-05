"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { RentTenant } from "@/lib/rent/types";

export function useRentTenants() {
  const [tenants, setTenants] = useState<RentTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTenants() {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('rent_tenants')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setTenants((data || []) as RentTenant[]);
      } catch (err: any) {
        console.error('Error fetching tenants:', err);
        setError(err.message || 'Error al cargar inquilinos');
      } finally {
        setLoading(false);
      }
    }

    fetchTenants();
  }, []); // Sin dependencias - solo se ejecuta una vez al montar

  return { tenants, loading, error };
}

