"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoHomeHeader } from "@/components/reno/reno-home-header";
import { RenoHomeIndicators } from "@/components/reno/reno-home-indicators";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAssignedProjectsForForeman } from "@/hooks/useAssignedProjectsForForeman";
import { MyAssignedProjectsModal } from "@/components/reno/my-assigned-projects-modal";
import { RenoHomeAdminDashboard } from "@/components/reno/reno-home-admin-dashboard";
import { useMaturationProjects } from "@/hooks/useMaturationProjects";
import { useArchitectProjects } from "@/hooks/useArchitectProjects";
import { MaturationPhaseDistribution } from "@/components/reno/maturation-phase-distribution";
import { DonutChart } from "@/components/reno/donut-chart";
import { ArchitectRanking } from "@/components/reno/architect-ranking";
import { MaturationCalendar } from "@/components/reno/maturation-calendar";
import { MaturationTodoWidgets } from "@/components/reno/maturation-todo-widgets";
import { ArchitectTodoWidgets } from "@/components/reno/architect-todo-widgets";
import { ProjectTimelineOverview } from "@/components/reno/project-timeline-compact";
import {
  Building2,
  TrendingUp,
  Clock,
  CheckCircle,
  PencilRuler,
  DollarSign,
} from "lucide-react";
import {
  MATURATION_PHASE_LABELS,
  ARCHITECT_PHASE_LABELS,
} from "@/lib/reno-kanban-config";
import { trackEventWithDevice } from "@/lib/mixpanel";

type DashboardView = "units" | "projects" | "architect";

export default function RenoConstructionManagerHomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, role, isLoading } = useAppAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [dashboardView, setDashboardView] = useState<DashboardView>("units");
  const handleDashboardToggle = (view: DashboardView) => {
    setDashboardView(view);
    trackEventWithDevice("Dashboard View Toggled", { view });
  };
  const supabase = createClient();

  const { projects: assignedProjects, loading: assignedProjectsLoading } =
    useAssignedProjectsForForeman(role === "foreman" ? (user?.email ?? null) : null);

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

  const showViewToggle = role === "admin" || role === "construction_manager";

  const {
    projectsByPhase: matProjectsByPhase,
    allProjects: matAllProjects,
    loading: matLoading,
  } = useMaturationProjects();

  const {
    projectsByPhase: archProjectsByPhase,
    allProjects: archAllProjects,
    loading: archLoading,
  } = useArchitectProjects(null, true);

  const matTotalProjects = matAllProjects.length;
  const archTotalProjects = archAllProjects.length;

  const matInvestmentSegments = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of matAllProjects) {
      const type = p.investment_type?.trim() || "Otro";
      map.set(type, (map.get(type) || 0) + 1);
    }
    const colorMap: Record<string, string> = { Flip: "#3b82f6", Yield: "#f59e0b" };
    const fallbackColors = ["#8b5cf6", "#10b981", "#ef4444", "#ec4899", "#06b6d4"];
    let ci = 0;
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label,
        value,
        color: colorMap[label] || fallbackColors[ci++ % fallbackColors.length],
      }));
  }, [matAllProjects]);

  const matEcuSegments = useMemo(() => {
    let sinEcu = 0;
    let conEcu = 0;
    for (const p of matAllProjects) {
      if ((p as any).excluded_from_ecu === true) sinEcu++;
      else conEcu++;
    }
    return [
      { label: "Con ECU", value: conEcu, color: "#22c55e" },
      { label: "Sin ECU", value: sinEcu, color: "#f97316" },
    ];
  }, [matAllProjects]);

  const matRecentProjects = useMemo(() => {
    return [...matAllProjects]
      .sort((a, b) => {
        const da = a.updated_at || a.created_at || "";
        const db = b.updated_at || b.created_at || "";
        return db.localeCompare(da);
      })
      .slice(0, 8);
  }, [matAllProjects]);

  const archRecentProjects = useMemo(() => {
    return [...archAllProjects]
      .sort((a, b) => {
        const da = a.updated_at || a.created_at || "";
        const db = b.updated_at || b.created_at || "";
        return db.localeCompare(da);
      })
      .slice(0, 8);
  }, [archAllProjects]);

  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar 
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        {/* Header */}
        <RenoHomeHeader
          assignedProjectsCount={role === "foreman" ? assignedProjects.length : 0}
          onProjectsBadgeClick={role === "foreman" ? () => setIsProjectsModalOpen(true) : undefined}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 xl:px-12 py-4 md:py-6 lg:py-8 bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
          <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 px-4 lg:px-8">
            {/* View Toggle - solo admin/construction_manager */}
            {showViewToggle && (
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
                <button
                  onClick={() => handleDashboardToggle("units")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dashboardView === "units"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Datos Reno Units
                </button>
                <button
                  onClick={() => handleDashboardToggle("projects")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dashboardView === "projects"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Datos Reno Projects
                </button>
                <button
                  onClick={() => handleDashboardToggle("architect")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dashboardView === "architect"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Datos Arquitecto
                </button>
              </div>
            )}

            {dashboardView === "architect" ? (
              <>
                {archLoading ? (
                  <VistralLogoLoader className="min-h-[400px]" />
                ) : (
                  <>
                    {/* Architect KPIs */}
                    <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                      <Card className="bg-card border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <PencilRuler className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">Proyectos de Arquitecto</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xl md:text-2xl font-bold text-foreground">{archTotalProjects}</div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Total de proyectos con arquitecto asignado</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-card border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">Ingresos Arquitectos</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xl md:text-2xl font-bold text-foreground">12.450 &euro;</div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Dato estimado (pendiente de integración)</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-card border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">Media de Elaboración</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xl md:text-2xl font-bold text-foreground">18 días</div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Tiempo medio en elaboración de proyectos</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Architect Todo Widgets */}
                    <ArchitectTodoWidgets allProjects={archAllProjects} projectsByPhase={archProjectsByPhase} />

                    {/* Architect Ranking (full width) */}
                    <ArchitectRanking allProjects={archAllProjects} />

                    {/* Recent Projects */}
                    <div className="bg-card border rounded-lg p-4">
                      <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-violet-500" />
                        Últimos proyectos actualizados
                      </h3>
                      {archRecentProjects.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No hay proyectos de arquitecto
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-muted-foreground">
                                <th className="pb-2 pr-4 font-medium">Proyecto</th>
                                <th className="pb-2 pr-4 font-medium">Arquitecto</th>
                                <th className="pb-2 pr-4 font-medium">Fase</th>
                                <th className="pb-2 font-medium">Última actualización</th>
                              </tr>
                            </thead>
                            <tbody>
                              {archRecentProjects.map((p) => (
                                <tr
                                  key={p.id}
                                  className="border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                                  onClick={() =>
                                    router.push(`/reno/maturation-analyst/project/${p.id}?from=architect-home`)
                                  }
                                >
                                  <td className="py-2.5 pr-4">
                                    <div className="font-medium max-w-[200px] truncate">{p.name || "Sin nombre"}</div>
                                    {p.area_cluster && (
                                      <div className="text-xs text-muted-foreground">{p.area_cluster}</div>
                                    )}
                                  </td>
                                  <td className="py-2.5 pr-4 text-xs">
                                    {(p as any).architect || "Sin asignar"}
                                  </td>
                                  <td className="py-2.5 pr-4 text-xs">
                                    {ARCHITECT_PHASE_LABELS[p.reno_phase as string] ||
                                      MATURATION_PHASE_LABELS[p.reno_phase as string] ||
                                      p.project_status ||
                                      "—"}
                                  </td>
                                  <td className="py-2.5 text-xs text-muted-foreground">
                                    {p.updated_at
                                      ? new Date(p.updated_at).toLocaleDateString("es-ES", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : dashboardView === "units" ? (
              <>
                {supabaseLoading ? (
                  <VistralLogoLoader className="min-h-[400px]" />
                ) : (
                  <>
                    {/* Foreman Filter - Solo para construction_manager */}
                    {role === 'construction_manager' && (
                      <div className="bg-card border rounded-lg p-4">
                        <ForemanFilterCombobox
                          properties={(() => {
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

                    {/* Admin Dashboard - solo admin/construction_manager */}
                    {(role === 'admin' || role === 'construction_manager') && (
                      <RenoHomeAdminDashboard propertiesByPhase={propertiesByPhase} />
                    )}

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
                  </>
                )}
              </>
            ) : (
              <>
                {matLoading ? (
                  <VistralLogoLoader className="min-h-[400px]" />
                ) : (
                  <>
                    {/* Maturation KPIs - mismo diseño que Units */}
                    <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                      <Card className="bg-card border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">Proyectos en maduración</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xl md:text-2xl font-bold text-foreground">{matTotalProjects}</div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Total de proyectos en todas las fases de maduración</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-card border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">Proyectos técnicos en progreso</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xl md:text-2xl font-bold text-foreground">
                            {(matProjectsByPhase["technical-project-in-progress"] || []).length}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Proyectos en fase de proyecto técnico en progreso</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-card border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">Pendientes de validación</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xl md:text-2xl font-bold text-foreground">
                            {(matProjectsByPhase["pending-to-validate"] || []).length +
                              (matProjectsByPhase["ecuv-first-validation"] || []).length +
                              (matProjectsByPhase["ecuv-final-validation"] || []).length}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Proyectos pendientes de validación o validación ECU</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Todo Widgets */}
                    <MaturationTodoWidgets allProjects={matAllProjects} projectsByPhase={matProjectsByPhase} />

                    {/* Flip vs Yield + ECU */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-card border rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-4">Flip vs Yield</h3>
                        <DonutChart
                          segments={matInvestmentSegments}
                          centerValue={matTotalProjects}
                          centerLabel="proyectos"
                        />
                      </div>
                      <div className="bg-card border rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-4">Con ECU / Sin ECU</h3>
                        <DonutChart
                          segments={matEcuSegments}
                          centerValue={matTotalProjects}
                          centerLabel="proyectos"
                        />
                      </div>
                    </div>

                    {/* Phase Distribution + Architect Ranking */}
                    <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
                      <ArchitectRanking allProjects={matAllProjects} />
                      <MaturationPhaseDistribution projectsByPhase={matProjectsByPhase} />
                    </div>

                    {/* Calendar */}
                    <MaturationCalendar allProjects={matAllProjects} />

                    {/* Timeline compacto de todos los proyectos */}
                    <ProjectTimelineOverview allProjects={matAllProjects} />

                    {/* Recent Projects */}
                    <div className="bg-card border rounded-lg p-4">
                      <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-violet-500" />
                        Últimos proyectos actualizados
                      </h3>
                      {matRecentProjects.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No hay proyectos de maduración
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-muted-foreground">
                                <th className="pb-2 pr-4 font-medium">Proyecto</th>
                                <th className="pb-2 pr-4 font-medium">Tipo</th>
                                <th className="pb-2 pr-4 font-medium">Fase</th>
                                <th className="pb-2 font-medium">Última actualización</th>
                              </tr>
                            </thead>
                            <tbody>
                              {matRecentProjects.map((p) => (
                                <tr
                                  key={p.id}
                                  className="border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                                  onClick={() =>
                                    router.push(`/reno/maturation-analyst/project/${p.id}?from=maturation-home`)
                                  }
                                >
                                  <td className="py-2.5 pr-4">
                                    <div className="font-medium max-w-[200px] truncate">{p.name || "Sin nombre"}</div>
                                    {p.area_cluster && (
                                      <div className="text-xs text-muted-foreground">{p.area_cluster}</div>
                                    )}
                                  </td>
                                  <td className="py-2.5 pr-4">
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                      {p.investment_type || (p as any).type || "—"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 pr-4 text-xs">
                                    {MATURATION_PHASE_LABELS[p.reno_phase as string] || p.project_status || "—"}
                                  </td>
                                  <td className="py-2.5 text-xs text-muted-foreground">
                                    {p.updated_at
                                      ? new Date(p.updated_at).toLocaleDateString("es-ES", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {role === "foreman" && (
        <MyAssignedProjectsModal
          open={isProjectsModalOpen}
          onOpenChange={setIsProjectsModalOpen}
          projects={assignedProjects}
          loading={assignedProjectsLoading}
        />
      )}
    </div>
  );
}
