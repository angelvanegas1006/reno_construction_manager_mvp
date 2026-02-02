"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoHomeHeader } from "@/components/reno/reno-home-header";
import { RenoHomeIndicators } from "@/components/reno/reno-home-indicators";
import { RenoHomeTodoWidgets } from "@/components/reno/reno-home-todo-widgets";
import { VisitsCalendar } from "@/components/reno/visits-calendar";
import { RenoHomeRecentProperties } from "@/components/reno/reno-home-recent-properties";
import { RenoHomePortfolio } from "@/components/reno/reno-home-portfolio";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { RenoHomeUpdateRequests } from "@/components/reno/reno-home-update-requests";
import { ForemanFilterCombobox } from "@/components/reno/foreman-filter-combobox";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { sortPropertiesByExpired, isPropertyExpired } from "@/lib/property-sorting";
import { toast } from "sonner";
import { useRenoProperties } from "@/contexts/reno-properties-context";
import { useRenoFilters } from "@/hooks/useRenoFilters";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { createClient } from "@/lib/supabase/client";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { getTechnicalConstructionNamesFromForemanEmail } from "@/lib/supabase/user-name-utils";

export default function RenoConstructionManagerHomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, role, isLoading } = useAppAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const supabase = createClient();

  // Use shared properties context instead of fetching independently
  const { propertiesByPhase: rawPropertiesByPhase, loading: supabaseLoading, error: supabaseError } = useRenoProperties();
  
  // Use unified filters hook
  const { filters, updateFilters } = useRenoFilters();
  const selectedForemanEmails = filters.foremanEmails;

  // Protect route: redirect if user doesn't have required role
  useEffect(() => {
    if (isLoading) return;
    
    if (!user || !role) {
      router.push("/login");
      return;
    }

    // Only allow foreman, admin, and construction_manager roles
    if (role !== 'foreman' && role !== 'admin' && role !== 'construction_manager') {
      router.push("/login");
      toast.error("No tienes permisos para acceder a esta página");
    }
  }, [user, role, isLoading, router]);

  // Filter propertiesByPhase by selected foreman (only for construction_manager)
  // Note: Foreman filtering is now handled in useRenoFilters hook
  const propertiesByPhase = useMemo(() => {
    if (!rawPropertiesByPhase) return undefined;
    
    // If no foreman filter or not construction_manager, return unfiltered
    if (role !== 'construction_manager' || selectedForemanEmails.length === 0) {
      return rawPropertiesByPhase;
    }
    
    // Filter each phase by selected foreman
    const filtered: Record<string, Property[]> = {};
    
    Object.entries(rawPropertiesByPhase).forEach(([phase, phaseProperties]) => {
      filtered[phase] = phaseProperties.filter((property) => {
        const technicalConstruction = (property as any).supabaseProperty?.["Technical construction"];
        if (!technicalConstruction) return false;
        
        // Check if property's foreman is in selected list
        return selectedForemanEmails.some(email => {
          const names = getTechnicalConstructionNamesFromForemanEmail(email);
          return names.some(name => 
            technicalConstruction === name || 
            (typeof technicalConstruction === 'string' && technicalConstruction.includes(name))
          );
        });
      });
    });
    
    return filtered;
  }, [rawPropertiesByPhase, selectedForemanEmails, role]);
  
  // Load work updates for this week (only from reno-in-progress properties with next_update)
  const [updatesForThisWeek, setUpdatesForThisWeek] = useState<number>(0);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  
  useEffect(() => {
    const calculateUpdatesForThisWeek = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        endOfWeek.setHours(23, 59, 59, 999);
        
        // Get all properties in reno-in-progress with next_update within this week
        const { data: workUpdates, error: workUpdatesError } = await supabase
          .from("properties")
          .select("id, next_update, reno_phase")
          .eq("reno_phase", "reno-in-progress")
          .not("next_update", "is", null)
          .gte("next_update", today.toISOString().split('T')[0])
          .lte("next_update", endOfWeek.toISOString().split('T')[0]);
        
        if (workUpdatesError) {
          console.error("Error fetching work updates for this week:", workUpdatesError);
          setUpdatesForThisWeek(0);
        } else {
          setUpdatesForThisWeek(workUpdates?.length || 0);
        }
      } catch (error) {
        console.error("Error calculating updates for this week:", error);
        setUpdatesForThisWeek(0);
      } finally {
        setLoadingUpdates(false);
      }
    };
    
    calculateUpdatesForThisWeek();
  }, [supabase]);

  // Convert Supabase properties to Property format for home page
  const properties = useMemo(() => {
    if (supabaseLoading) {
      return [];
    }
    
    if (!propertiesByPhase) {
      return [];
    }
    
    // Flatten all properties from all phases
    // Properties are already filtered by foreman in propertiesByPhase if needed
    const allProps: Property[] = [];
    Object.values(propertiesByPhase).forEach((phaseProperties) => {
      allProps.push(...phaseProperties);
    });
    
    return allProps;
  }, [propertiesByPhase, supabaseLoading, selectedForemanEmails, role, user?.email]);
  
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
    // Obras Activas: all properties between reno-in-progress and cleaning
    // Includes: reno-in-progress, furnishing, final-check, and cleaning
    const obrasActivas = (
      (propertiesByPhase?.['reno-in-progress']?.length || 0) +
      (propertiesByPhase?.['furnishing']?.length || 0) +
      (propertiesByPhase?.['final-check']?.length || 0) +
      (propertiesByPhase?.['cleaning']?.length || 0)
    );

    // Actualizaciones para esta semana: solo actualizaciones de seguimiento de obra (reno-in-progress con next_update)
    // Se carga desde Supabase en el useEffect anterior
    const actualizacionesParaEstaSemana = updatesForThisWeek;

    // Viviendas que se firman esta semana: propiedades con realSettlementDate dentro de esta semana
    // Usar propertiesByPhase para respetar el filtrado por foreman
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);
    
    let viviendasQueSeFirmanEstaSemana = 0;
    if (propertiesByPhase) {
      // Contar propiedades con realSettlementDate dentro de esta semana
      // propertiesByPhase ya está filtrado por foreman si corresponde
      Object.values(propertiesByPhase).flat().forEach((property) => {
        if (property.realSettlementDate) {
          const settlementDate = new Date(property.realSettlementDate);
          settlementDate.setHours(0, 0, 0, 0);
          
          if (settlementDate >= today && settlementDate <= endOfWeek) {
            viviendasQueSeFirmanEstaSemana++;
          }
        }
      });
    }

    return {
      obrasActivas,
      actualizacionesParaEstaSemana,
      viviendasQueSeFirmanEstaSemana,
    };
  }, [properties, updatesForThisWeek, propertiesByPhase]);


  // Handle property click - navigate to property detail or task
  const handlePropertyClick = (property: Property) => {
    router.push(`/reno/construction-manager/property/${property.id}?from=home`);
  };

  // Handle add visit
  const handleAddVisit = () => {
    toast.info(t.dashboard?.addVisit || "Añadir nueva visita - Próximamente");
  };


  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar 
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        {/* Header */}
        <RenoHomeHeader />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 xl:px-12 py-4 md:py-6 lg:py-8 bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
          {supabaseLoading ? (
            <VistralLogoLoader className="min-h-[400px]" />
          ) : (
            <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 px-4 lg:px-8">
              {/* Foreman Filter - Solo para construction_manager */}
              {role === 'construction_manager' && (
                <div className="bg-card border rounded-lg p-4">
                  <ForemanFilterCombobox
                    properties={(() => {
                      // Get all properties unfiltered for the combobox
                      if (!rawPropertiesByPhase) return [];
                      const allProps: Property[] = [];
                      Object.values(rawPropertiesByPhase).forEach((phaseProperties) => {
                        allProps.push(...phaseProperties);
                      });
                      return allProps;
                    })()}
                    selectedForemanEmails={selectedForemanEmails}
                    onSelectionChange={(emails) => updateFilters({ foremanEmails: emails })}
                    placeholder={t.dashboard?.foremanFilter?.filterByForeman || "Filtrar por jefe de obra..."}
                    label={t.dashboard?.foremanFilter?.filterByConstructionManager || "Filtrar por Jefe de obra"}
                  />
                </div>
              )}

              {/* KPIs */}
              <RenoHomeIndicators
                obrasActivas={indicators.obrasActivas}
                actualizacionesParaEstaSemana={indicators.actualizacionesParaEstaSemana}
                viviendasQueSeFirmanEstaSemana={indicators.viviendasQueSeFirmanEstaSemana}
              />

              {/* Todo List Widgets */}
              <RenoHomeTodoWidgets propertiesByPhase={propertiesByPhase} />

              {/* Calendar Row */}
              <VisitsCalendar
                propertiesByPhase={propertiesByPhase}
                onPropertyClick={handlePropertyClick}
                onAddVisit={handleAddVisit}
              />

              {/* Update Requests Section - Solo para construction_manager */}
              {role === 'construction_manager' && (
                <RenoHomeUpdateRequests
                  propertiesByPhase={propertiesByPhase}
                  selectedForemanEmails={selectedForemanEmails}
                />
              )}

              {/* Recent Properties and Portfolio Row */}
              <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
                <RenoHomeRecentProperties properties={properties} propertiesByPhase={propertiesByPhase} />
                <RenoHomePortfolio properties={properties} propertiesByPhase={propertiesByPhase} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
