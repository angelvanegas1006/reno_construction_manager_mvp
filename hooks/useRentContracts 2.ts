"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { RentContract } from "@/lib/rent/types";

export function useRentContracts() {
  const [contracts, setContracts] = useState<RentContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContracts() {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('rent_contracts')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setContracts((data || []) as RentContract[]);
      } catch (err: any) {
        console.error('Error fetching contracts:', err);
        setError(err.message || 'Error al cargar contratos');
      } finally {
        setLoading(false);
      }
    }

    fetchContracts();
  }, []);

  return { contracts, loading, error };
}


