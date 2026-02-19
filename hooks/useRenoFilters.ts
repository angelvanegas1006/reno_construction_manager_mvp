"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { use } from 'react';
import { getTechnicalConstructionNamesFromForemanEmail } from '@/lib/supabase/user-name-utils';
import { logger } from '@/lib/utils/logger';

export interface RenoFilters {
  renovatorNames: string[];
  technicalConstructors: string[];
  areaClusters: string[];
  delayedWorks: boolean;
  propertyTypes: string[]; // Unit, Building (type en Supabase)
  // Foreman emails (for construction_manager role)
  foremanEmails: string[];
}

const log = logger.tagged('useRenoFilters');

/**
 * Unified hook for managing filters in Reno Construction Manager
 * Handles URL synchronization, localStorage persistence, and filter conversion
 */
const KANBAN_PATH = '/reno/construction-manager/kanban';
const KANBAN_PROJECTS_PATH = '/reno/construction-manager/kanban-projects';
const LAST_KANBAN_PATH_KEY = 'reno-last-kanban-path';

const EMPTY_FILTERS: RenoFilters = {
  renovatorNames: [],
  technicalConstructors: [],
  areaClusters: [],
  delayedWorks: false,
  propertyTypes: [],
  foremanEmails: [],
};

function isKanbanPath(path: string) {
  return path === KANBAN_PATH || path === KANBAN_PROJECTS_PATH;
}

export function useRenoFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const unwrappedSearchParams = searchParams instanceof Promise ? use(searchParams) : searchParams;

  // Initialize filters from URL params or localStorage
  const [filters, setFilters] = useState<RenoFilters>(() => {
    // Try to restore from localStorage first
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('reno-filters');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            renovatorNames: parsed.renovatorNames || [],
            technicalConstructors: parsed.technicalConstructors || [],
            areaClusters: parsed.areaClusters || [],
            delayedWorks: parsed.delayedWorks || false,
            propertyTypes: parsed.propertyTypes || [],
            foremanEmails: parsed.foremanEmails || [],
          };
        } catch (e) {
          log.error('Failed to parse saved filters:', e);
        }
      }
    }

    return { ...EMPTY_FILTERS };
  });

  // Clear filters when switching between the two kanbans (Units vs Proyectos/WIP)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = typeof pathname === 'string' ? pathname : '';
    if (!isKanbanPath(current)) return;
    const lastPath = sessionStorage.getItem(LAST_KANBAN_PATH_KEY);
    const switchedFromOtherKanban =
      lastPath !== null &&
      lastPath !== current &&
      isKanbanPath(lastPath);
    if (switchedFromOtherKanban) {
      setFilters(() => ({ ...EMPTY_FILTERS }));
    }
    sessionStorage.setItem(LAST_KANBAN_PATH_KEY, current);
  }, [pathname]);

  // Read foreman filter from URL params on mount
  useEffect(() => {
    const foremanParam = unwrappedSearchParams.get('foreman');
    if (foremanParam) {
      const emails = foremanParam.split(',').filter(Boolean);
      setFilters(prev => ({
        ...prev,
        foremanEmails: emails,
        // Also convert to technicalConstructors for kanban compatibility
        technicalConstructors: (() => {
          const technicalConstructorNames = new Set<string>();
          emails.forEach((email: string) => {
            const names = getTechnicalConstructionNamesFromForemanEmail(email);
            names.forEach(name => technicalConstructorNames.add(name));
          });
          return Array.from(technicalConstructorNames);
        })(),
      }));
    }
  }, [unwrappedSearchParams]);

  // Sync foreman emails to URL params (for construction_manager role)
  useEffect(() => {
    const currentForemanParam = unwrappedSearchParams.get('foreman');
    const currentForemanEmails = currentForemanParam 
      ? currentForemanParam.split(',').filter(Boolean).sort()
      : [];
    const newForemanEmails = filters.foremanEmails.sort();
    
    // Compare arrays to avoid unnecessary updates
    const isEqual = currentForemanEmails.length === newForemanEmails.length &&
      currentForemanEmails.every((email: string, index: number) => email === newForemanEmails[index]);
    
    if (isEqual) return;
    
    const params = new URLSearchParams(unwrappedSearchParams.toString());
    
    if (filters.foremanEmails.length > 0) {
      params.set('foreman', filters.foremanEmails.join(','));
    } else {
      params.delete('foreman');
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [filters.foremanEmails, router, unwrappedSearchParams]);

  // Persist filters to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('reno-filters', JSON.stringify(filters));
      } catch (e) {
        log.error('Failed to save filters to localStorage:', e);
      }
    }
  }, [filters]);

  // Update filters function
  const updateFilters = useCallback((updates: Partial<RenoFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...updates,
      // If foremanEmails change, also update technicalConstructors
      ...(updates.foremanEmails !== undefined && {
        technicalConstructors: (() => {
          const technicalConstructorNames = new Set<string>();
          updates.foremanEmails!.forEach((email: string) => {
            const names = getTechnicalConstructionNamesFromForemanEmail(email);
            names.forEach(name => technicalConstructorNames.add(name));
          });
          return Array.from(technicalConstructorNames);
        })(),
      }),
    }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS });
  }, []);

  // Get filter badge count (for UI display)
  const filterBadgeCount = useMemo(() => {
    return (
      filters.renovatorNames.length +
      filters.technicalConstructors.length +
      filters.areaClusters.length +
      (filters.delayedWorks ? 1 : 0) +
      (filters.propertyTypes?.length ?? 0) +
      filters.foremanEmails.length
    );
  }, [filters]);

  return {
    filters,
    updateFilters,
    resetFilters,
    filterBadgeCount,
  };
}

