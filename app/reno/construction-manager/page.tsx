"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoHomeHeader } from "@/components/reno/reno-home-header";
import { RenoHomeIndicators } from "@/components/reno/reno-home-indicators";
import { RenoHomeTasks } from "@/components/reno/reno-home-tasks";
import { RenoHomeVisits } from "@/components/reno/reno-home-visits";
import { RenoHomeRecentProperties } from "@/components/reno/reno-home-recent-properties";
import { RenoHomePortfolio } from "@/components/reno/reno-home-portfolio";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { sortPropertiesByExpired, isPropertyExpired } from "@/lib/property-sorting";
import { toast } from "sonner";
import { useSupabaseKanbanProperties } from "@/hooks/useSupabaseKanbanProperties";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";

export default function RenoConstructionManagerHomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Load properties from Supabase
  const { propertiesByPhase, loading: supabaseLoading, error: supabaseError } = useSupabaseKanbanProperties();
  
  // Log when propertiesByPhase changes
  useEffect(() => {
    console.log('[RenoHomePage] 📊 propertiesByPhase changed:', {
      loading: supabaseLoading,
      error: supabaseError,
      hasPropertiesByPhase: !!propertiesByPhase,
      phaseCounts: propertiesByPhase ? Object.entries(propertiesByPhase).reduce((acc, [phase, props]) => {
        acc[phase] = props.length;
        return acc;
      }, {} as Record<string, number>) : null,
      timestamp: new Date().toISOString(),
    });
  }, [propertiesByPhase, supabaseLoading, supabaseError]);
  
  // Convert Supabase properties to Property format for home page
  const properties = useMemo(() => {
    console.log('[RenoHomePage] 🔄 Computing properties...', {
      loading: supabaseLoading,
      hasPropertiesByPhase: !!propertiesByPhase,
      timestamp: new Date().toISOString(),
    });

    if (supabaseLoading) {
      console.log('[RenoHomePage] ⏳ Still loading, returning empty array');
      return [];
    }
    
    if (!propertiesByPhase) {
      console.log('[RenoHomePage] ⚠️ No propertiesByPhase, returning empty array');
      return [];
    }
    
    // Flatten all properties from all phases
    // Properties are already converted to Property format by useSupabaseKanbanProperties
    const allProps: Property[] = [];
    Object.values(propertiesByPhase).forEach((phaseProperties, index) => {
      const phaseName = Object.keys(propertiesByPhase)[index];
      console.log('[RenoHomePage] 📦 Processing phase:', {
        phase: phaseName,
        count: phaseProperties.length,
      });
      allProps.push(...phaseProperties);
    });
    
    console.log('[RenoHomePage] ✅ Properties computed:', {
      total: allProps.length,
      timestamp: new Date().toISOString(),
    });
    
    return allProps;
  }, [propertiesByPhase, supabaseLoading]);
  
  // Log when properties change
  useEffect(() => {
    console.log('[RenoHomePage] 📋 Properties state changed:', {
      count: properties.length,
      sampleIds: properties.slice(0, 3).map(p => p.id),
      timestamp: new Date().toISOString(),
    });
  }, [properties]);
  
  // Show error if Supabase fetch failed
  useEffect(() => {
    if (supabaseError) {
      console.error('[RenoHomePage] ❌ Error loading properties:', supabaseError);
      toast.error(`Error al cargar propiedades: ${supabaseError}`);
    }
  }, [supabaseError]);

  // Helper to check if a date is today
  const isToday = (dateString?: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  
  // Helper to check if a property is expired
  const isExpired = (property: Property) => isPropertyExpired(property);


  // Helper to check if property is in a specific reno phase
  const isInRenoPhase = (property: Property, phase: RenoKanbanPhase) => {
    if (!propertiesByPhase) return false;
    return propertiesByPhase[phase]?.some(p => p.id === property.id) || false;
  };

  // Calculate indicators
  const indicators = useMemo(() => {
    // Obras Activas: only reno-in-progress
    const obrasActivas = propertiesByPhase?.['reno-in-progress']?.length || 0;

    // Visitas para hoy: properties that need update today (including expired ones from yesterday)
    const visitasParaHoy = properties.filter((p) => {
      return isToday(p.proximaActualizacion) || isExpired(p);
    }).length;

    // Total visitas del mes: simulated with dummy data
    const totalVisitasMes = 28; // Dummy for now

    // Deltas MoM (simulated)
    const obrasActivasDelta = { value: 12, isPositive: true };
    const visitasParaHoyDelta = { value: 5, isPositive: true };
    const totalVisitasMesDelta = { value: 8, isPositive: true };

    return {
      obrasActivas,
      visitasParaHoy,
      totalVisitasMes,
      obrasActivasDelta,
      visitasParaHoyDelta,
      totalVisitasMesDelta,
    };
  }, [properties]);

  // Get checks to execute today (initial-check and final-check with proximaActualizacion = today or expired)
  const checksForToday = useMemo(() => {
    const initialCheck = propertiesByPhase?.['initial-check'] || [];
    const finalCheck = propertiesByPhase?.['final-check'] || [];
    const allChecks = [...initialCheck, ...finalCheck];
    
    const filtered = allChecks.filter((p) => {
      return isToday(p.proximaActualizacion) || isExpired(p);
    });
    
    // Sort expired first
    return sortPropertiesByExpired(filtered);
  }, [propertiesByPhase]);

  // Get visits for today (reno-in-progress with proximaActualizacion = today or expired)
  const visitsForToday = useMemo(() => {
    const renoInProgress = propertiesByPhase?.['reno-in-progress'] || [];
    
    const filtered = renoInProgress.filter((p) => {
      return isToday(p.proximaActualizacion) || isExpired(p);
    });
    
    // Sort expired first
    return sortPropertiesByExpired(filtered);
  }, [propertiesByPhase]);

  // Handle property click - navigate to property detail or task (to be defined)
  const handlePropertyClick = (property: Property) => {
    // For now, navigate to property detail page
    // Later, this will open the task execution screen
    router.push(`/reno/construction-manager/property/${property.id}`);
  };

  // Handle add visit
  const handleAddVisit = () => {
    toast.info("Añadir nueva visita - Próximamente");
  };

  // Filter properties based on search query
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;
    const query = searchQuery.toLowerCase();
    return properties.filter((p) => 
      p.id.toLowerCase().includes(query) ||
      p.fullAddress.toLowerCase().includes(query) ||
      (p.price && p.price.toString().includes(query))
    );
  }, [properties, searchQuery]);

  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar />
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        {/* Header with Search and Filter */}
        <RenoHomeHeader 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--prophero-gray-50)] dark:bg-[var(--prophero-gray-950)]">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* KPIs */}
            <RenoHomeIndicators
              obrasActivas={indicators.obrasActivas}
              visitasParaHoy={indicators.visitasParaHoy}
              totalVisitasMes={indicators.totalVisitasMes}
              obrasActivasDelta={indicators.obrasActivasDelta}
              visitasParaHoyDelta={indicators.visitasParaHoyDelta}
              totalVisitasMesDelta={indicators.totalVisitasMesDelta}
            />

            {/* Tasks and Visits Row */}
            <div className="grid gap-6 md:grid-cols-2">
              <RenoHomeTasks
                checks={checksForToday}
                visits={visitsForToday}
                onPropertyClick={handlePropertyClick}
              />
              <RenoHomeVisits
                visits={visitsForToday}
                onPropertyClick={handlePropertyClick}
                onAddVisit={handleAddVisit}
              />
            </div>

            {/* Recent Properties and Portfolio Row */}
            <div className="grid gap-6 md:grid-cols-2">
              <RenoHomeRecentProperties properties={filteredProperties} />
              <RenoHomePortfolio properties={filteredProperties} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
