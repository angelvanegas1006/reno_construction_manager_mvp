"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook para obtener todos los renovadores únicos desde Supabase
 */
export function useRenovators() {
  const [renovators, setRenovators] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchRenovators() {
      try {
        setIsLoading(true);
        setError(null);
        
        const supabase = createClient();
        
        // Obtener todas las propiedades y filtrar en el código
        // Esto evita problemas con campos que tienen espacios en el nombre
        const { data, error: fetchError } = await supabase
          .from('properties')
          .select('*');

        if (fetchError) {
          console.error('[useRenovators] Error en la consulta:', fetchError);
          throw fetchError;
        }

        console.log('[useRenovators] Datos recibidos de Supabase:', data?.length || 0, 'registros');
        if (data && data.length > 0) {
          console.log('[useRenovators] Primer registro de ejemplo:', data[0]);
          console.log('[useRenovators] Claves del primer registro:', Object.keys(data[0]));
        }

        // Extraer valores únicos y ordenarlos
        const uniqueRenovators = new Set<string>();
        
        data?.forEach((property: any) => {
          // Intentar diferentes formas de acceder al campo
          const renovatorName = property['Renovator name'] || property['Renovator Name'] || property.renovator_name;
          console.log('[useRenovators] Renovator name encontrado:', renovatorName, 'para propiedad', property.id);
          if (renovatorName && typeof renovatorName === 'string' && renovatorName.trim()) {
            uniqueRenovators.add(renovatorName.trim());
          }
        });

        const sortedRenovators = Array.from(uniqueRenovators).sort();
        console.log('[useRenovators] Renovadores únicos encontrados:', sortedRenovators.length, sortedRenovators);
        setRenovators(sortedRenovators);
      } catch (err) {
        console.error('Error fetching renovators:', err);
        setError(err instanceof Error ? err : new Error('Error al obtener renovadores'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchRenovators();
  }, []);

  return { renovators, isLoading, error };
}

