"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoHomeHeader } from "@/components/reno/reno-home-header";
import { RenoHomeIndicators } from "@/components/reno/reno-home-indicators";
import { RenoHomeTodoWidgets } from "@/components/reno/reno-home-todo-widgets";
import { VisitsCalendar } from "@/components/reno/visits-calendar";
import { RenoHomeRecentProperties } from "@/components/reno/reno-home-recent-properties";
import { RenoHomePortfolio } from "@/components/reno/reno-home-portfolio";
import { RenoHomeLoader } from "@/components/reno/reno-home-loader";
import { ForemanFilterCombobox } from "@/components/reno/foreman-filter-combobox";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
// import { GoogleCalendarConnect } from "@/components/auth/google-calendar-connect"; // Movido al calendario como botón pequeño
import { sortPropertiesByExpired, isPropertyExpired } from "@/lib/property-sorting";
import { toast } from "sonner";
import { useSupabaseKanbanProperties } from "@/hooks/useSupabaseKanbanProperties";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { createClient } from "@/lib/supabase/client";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { matchesTechnicalConstruction } from "@/lib/supabase/user-name-utils";

export default function RenoConstructionManagerHomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role, isLoading } = useAppAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedForemanEmails, setSelectedForemanEmails] = useState<string[]>([]);
  const supabase = createClient();

  // Unwrap searchParams if it's a Promise (Next.js 16+)
  const unwrappedSearchParams = searchParams instanceof Promise ? use(searchParams) : searchParams;

  // Leer filtro de foreman desde URL params al cargar
  useEffect(() => {
    const foremanParam = unwrappedSearchParams.get('foreman');
    if (foremanParam) {
      const emails = foremanParam.split(',').filter(Boolean);
      // Solo actualizar si es diferente para evitar loops
      setSelectedForemanEmails(prev => {
        const prevStr = prev.sort().join(',');
        const newStr = emails.sort().join(',');
        return prevStr === newStr ? prev : emails;
      });
    } else {
      // Si no hay parámetro en URL y tenemos emails seleccionados, limpiar
      setSelectedForemanEmails(prev => prev.length > 0 ? [] : prev);
    }
  }, [unwrappedSearchParams]);

  // Guardar filtro en URL params cuando cambia (solo si es diferente)
  useEffect(() => {
    if (role !== 'construction_manager') return;
    
    const currentForemanParam = unwrappedSearchParams.get('foreman');
    const currentForemanEmails = currentForemanParam 
      ? currentForemanParam.split(',').filter(Boolean).sort()
      : [];
    const newForemanEmails = selectedForemanEmails.sort();
    
    // Comparar arrays ordenados para evitar actualizaciones innecesarias
    const isEqual = currentForemanEmails.length === newForemanEmails.length &&
      currentForemanEmails.every((email, index) => email === newForemanEmails[index]);
    
    if (isEqual) return; // No actualizar si ya está sincronizado
    
    const params = new URLSearchParams(unwrappedSearchParams.toString());
    
    if (selectedForemanEmails.length > 0) {
      params.set('foreman', selectedForemanEmails.join(','));
    } else {
      params.delete('foreman');
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [selectedForemanEmails, role, router, searchParams]);

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

  // Load properties from Supabase
  const { propertiesByPhase: rawPropertiesByPhase, loading: supabaseLoading, error: supabaseError } = useSupabaseKanbanProperties();
  
  // Filtrar propertiesByPhase por foreman seleccionados (solo para construction_manager)
  const propertiesByPhase = useMemo(() => {
    if (!rawPropertiesByPhase) return undefined;
    
    // Si no hay filtro o no es construction_manager, devolver sin filtrar
    if (role !== 'construction_manager' || selectedForemanEmails.length === 0 || !user?.email) {
      return rawPropertiesByPhase;
    }
    
    // Filtrar cada fase por foreman seleccionados
    const filtered: Record<string, Property[]> = {};
    
    Object.entries(rawPropertiesByPhase).forEach(([phase, phaseProperties]) => {
      filtered[phase] = phaseProperties.filter((property) => {
        const technicalConstruction = (property as any).supabaseProperty?.["Technical construction"];
        if (!technicalConstruction) return false;
        
        // Verificar si el foreman de la propiedad está en la lista seleccionada
        return selectedForemanEmails.some(email => 
          matchesTechnicalConstruction(technicalConstruction, email)
        );
      });
    });
    
    return filtered;
  }, [rawPropertiesByPhase, selectedForemanEmails, role, user?.email]);
  
  // Load visits for this week (from estimatedVisitDate)
  const [visitsForThisWeek, setVisitsForThisWeek] = useState<number>(0);
  const [loadingVisits, setLoadingVisits] = useState(true);
  
  useEffect(() => {
    const fetchVisitsForThisWeek = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        endOfWeek.setHours(23, 59, 59, 999);
        
        // Get all properties with estimatedVisitDate within this week
        const { data, error } = await supabase
          .from("properties")
          .select("id, \"Estimated Visit Date\"")
          .not("\"Estimated Visit Date\"", "is", null)
          .gte("\"Estimated Visit Date\"", today.toISOString().split('T')[0])
          .lte("\"Estimated Visit Date\"", endOfWeek.toISOString().split('T')[0]);
        
        if (error) {
          console.error("Error fetching visits for this week:", error);
          setVisitsForThisWeek(0);
        } else {
          setVisitsForThisWeek(data?.length || 0);
        }
      } catch (error) {
        console.error("Error fetching visits for this week:", error);
        setVisitsForThisWeek(0);
      } finally {
        setLoadingVisits(false);
      }
    };
    
    fetchVisitsForThisWeek();
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

    // Visitas para esta semana: propiedades con estimatedVisitDate dentro de esta semana
    // Se carga desde Supabase en el useEffect anterior
    const visitasParaEstaSemana = visitsForThisWeek;

    // Total visitas del mes: simulated with dummy data
    const totalVisitasMes = 28; // Dummy for now

    return {
      obrasActivas,
      visitasParaEstaSemana,
      totalVisitasMes,
    };
  }, [properties, visitsForThisWeek]);


  // Handle property click - navigate to property detail or task
  const handlePropertyClick = (property: Property) => {
    router.push(`/reno/construction-manager/property/${property.id}`);
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
        <div className="flex-1 overflow-y-auto px-3 md:px-4 lg:px-6 py-3 md:py-4 lg:py-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
          {supabaseLoading ? (
            <RenoHomeLoader className="min-h-[400px]" />
          ) : (
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
              {/* Foreman Filter - Solo para construction_manager */}
              {role === 'construction_manager' && (
                <div className="bg-card border rounded-lg p-4">
                  <ForemanFilterCombobox
                    properties={(() => {
                      // Obtener todas las propiedades sin filtrar para el combobox
                      if (!propertiesByPhase) return [];
                      const allProps: Property[] = [];
                      Object.values(propertiesByPhase).forEach((phaseProperties) => {
                        allProps.push(...phaseProperties);
                      });
                      return allProps;
                    })()}
                    selectedForemanEmails={selectedForemanEmails}
                    onSelectionChange={setSelectedForemanEmails}
                    placeholder={t.dashboard?.foremanFilter?.filterByForeman || "Filtrar por jefe de obra..."}
                    label={t.dashboard?.foremanFilter?.filterByConstructionManager || "Filtrar por Gerente de Construcción"}
                  />
                </div>
              )}

              {/* KPIs */}
              <RenoHomeIndicators
                obrasActivas={indicators.obrasActivas}
                visitasParaHoy={indicators.visitasParaEstaSemana}
                totalVisitasMes={indicators.totalVisitasMes}
              />

              {/* Todo List Widgets */}
              <RenoHomeTodoWidgets propertiesByPhase={propertiesByPhase} />

              {/* Calendar Row */}
              <VisitsCalendar
                propertiesByPhase={propertiesByPhase}
                onPropertyClick={handlePropertyClick}
                onAddVisit={handleAddVisit}
              />

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
