"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface UseSupabaseUsersReturn {
  users: AppUser[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener lista de usuarios de Supabase
 * Útil para @mentions y etiquetado de usuarios
 */
export function useSupabaseUsers(): UseSupabaseUsersReturn {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener usuarios desde API route (que tiene permisos admin)
      const response = await fetch("/api/users");
      
      if (!response.ok) {
        throw new Error("Error al obtener usuarios");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Error al cargar usuarios");
      setError(error);
      console.error("Error fetching users:", error);
      
      // Fallback: retornar usuarios vacíos
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
}

