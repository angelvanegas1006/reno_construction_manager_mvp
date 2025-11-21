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
import { getAllProperties, Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { sortPropertiesByExpired, isPropertyExpired } from "@/lib/property-sorting";
import { toast } from "sonner";

export default function RenoConstructionManagerHomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load properties from localStorage
  useEffect(() => {
    const loadProperties = () => {
      const props = getAllProperties();
      setProperties(props);
    };
    
    loadProperties();
    const interval = setInterval(loadProperties, 2000);
    return () => clearInterval(interval);
  }, []);

  // Helper to check if a date is today
  const isToday = (dateString?: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  
  // Helper to check if a property is expired
  const isExpired = (property: Property) => isPropertyExpired(property);


  // Helper to check if property is in reno phase (based on dummy IDs for demo)
  const isInRenoPhase = (property: Property, phaseIds: string[]) => {
    return phaseIds.includes(property.id);
  };

  // Calculate indicators
  const indicators = useMemo(() => {
    // Obras Activas: only reno-in-progress (using dummy IDs for demo)
    // IDs 4463806, 4463807, 4463808 are in "reno-in-progress"
    const obrasActivas = properties.filter((p) => {
      return isInRenoPhase(p, ["4463806", "4463807", "4463808"]);
    }).length;

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
  // IDs 4463801, 4463802, 4463803 are in "initial-check"
  // ID 4463811 is in "final-check"
  const checksForToday = useMemo(() => {
    const filtered = properties.filter((p) => {
      const isInitialCheck = isInRenoPhase(p, ["4463801", "4463802", "4463803"]);
      const isFinalCheck = isInRenoPhase(p, ["4463811"]);
      
      return (isInitialCheck || isFinalCheck) && 
             (isToday(p.proximaActualizacion) || isExpired(p));
    });
    
    // Sort expired first
    return sortPropertiesByExpired(filtered);
  }, [properties]);

  // Get visits for today (reno-in-progress with proximaActualizacion = today or expired)
  // IDs 4463806, 4463807, 4463808 are in "reno-in-progress"
  const visitsForToday = useMemo(() => {
    const filtered = properties.filter((p) => {
      const isRenoInProgress = isInRenoPhase(p, ["4463806", "4463807", "4463808"]);
      return isRenoInProgress && 
             (isToday(p.proximaActualizacion) || isExpired(p));
    });
    
    // Sort expired first
    return sortPropertiesByExpired(filtered);
  }, [properties]);

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
