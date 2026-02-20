"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { convertSupabasePropertyToProperty } from "@/lib/supabase/property-converter";
import type { Property } from "@/lib/property-storage";
import type { Database } from "@/lib/supabase/types";

type SupabaseProperty = Database["public"]["Tables"]["properties"]["Row"];

/**
 * Hook que obtiene TODAS las propiedades con project_id desde Supabase,
 * agrupadas por project_id. No depende del contexto del kanban (que filtra por fase).
 * Usado en la vista L1 (Proyectos) para mostrar el conteo correcto de propiedades por proyecto.
 */
export function usePropertiesByProjectId(): {
  propertiesByProjectId: Record<string, Property[]>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<Record<string, Property[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: e } = await supabase
        .from("properties")
        .select("*")
        .not("project_id", "is", null);

      if (e) {
        setError(e.message);
        setData({});
        return;
      }

      const map: Record<string, Property[]> = {};
      const list = (rows ?? []) as SupabaseProperty[];
      for (const row of list) {
        const projectId = row.project_id;
        if (!projectId) continue;
        const converted = convertSupabasePropertyToProperty(row);
        const withSupabase = { ...converted, supabaseProperty: row } as Property & {
          supabaseProperty?: SupabaseProperty;
        };
        if (!map[projectId]) map[projectId] = [];
        map[projectId].push(withSupabase);
      }
      setData(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { propertiesByProjectId: data, loading, error, refetch: fetch };
}
