"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppAuth } from "@/lib/auth/app-auth-context";

export interface AssignedProject {
  id: string;
  name: string | null;
  reno_phase: string | null;
  project_status: string | null;
  assigned_site_manager_email: string | null;
}

interface UseAssignedProjectsReturn {
  projects: AssignedProject[];
  count: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useAssignedProjects(): UseAssignedProjectsReturn {
  const { user, role, isLoading: authLoading } = useAppAuth();
  const [projects, setProjects] = useState<AssignedProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (authLoading || !user?.email || role !== "foreman") {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, reno_phase, project_status, assigned_site_manager_email")
        .eq("assigned_site_manager_email", user.email)
        .neq("reno_phase", "orphaned");

      if (error) {
        setProjects([]);
      } else {
        setProjects((data as AssignedProject[]) ?? []);
      }
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email, role, authLoading]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, count: projects.length, loading, refetch: fetchProjects };
}
