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
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { getTechnicalConstructionNamesFromForemanEmail, matchesTechnicalConstruction } from "@/lib/supabase/user-name-utils";
import { useAssignedProjectsForForeman } from "@/hooks/useAssignedProjectsForForeman";
import { needsUpdateThisWeek, calculateNextUpdateDate } from "@/lib/reno/update-calculator";
import { MyAssignedProjectsModal } from "@/components/reno/my-assigned-projects-modal";
import { RenoHomeAdminDashboard } from "@/components/reno/reno-home-admin-dashboard";
import { RenovatorAnalysisPanel } from "@/components/reno/renovator-analysis-panel";
import { useMaturationProjects } from "@/hooks/useMaturationProjects";
import { useArchitectProjects } from "@/hooks/useArchitectProjects";
import { DonutChart } from "@/components/reno/donut-chart";
import { MaturationPhaseDistribution } from "@/components/reno/maturation-phase-distribution";
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
  Timer,
  Ruler,
  FileText,
  Hammer,
  ShieldCheck,
} from "lucide-react";
import {
  MATURATION_PHASE_LABELS,
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
  
  // Compute work updates for this week using the same logic as the todo widget
  const updatesForThisWeek = useMemo(() => {
    if (!propertiesByPhase) return 0;

    const allRenoInProgress = propertiesByPhase['reno-in-progress'] || [];

    const filtered = role === 'foreman' && user?.email
      ? allRenoInProgress.filter(prop => {
          const tc = (prop as any).supabaseProperty?.["Technical construction"];
          return matchesTechnicalConstruction(tc, user.email);
        })
      : allRenoInProgress;

    return filtered.filter(prop => {
      let proxima = prop.proximaActualizacion;
      if (!proxima) {
        const renoStart = prop.inicio
          || (prop as any).supabaseProperty?.["Reno Start Date"]
          || (prop as any).supabaseProperty?.start_date;
        proxima = calculateNextUpdateDate(null, prop.renoType, renoStart) || undefined;
      }

      const needsTracking = (prop as any).supabaseProperty?.needs_foreman_notification || false;

      if (role === 'foreman' || role === 'construction_manager' || role === 'admin') {
        return needsTracking || needsUpdateThisWeek(proxima);
      }
      return needsUpdateThisWeek(proxima);
    }).length;
  }, [propertiesByPhase, role, user?.email]);

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

  const renoTypeSegments = useMemo(() => {
    if (!propertiesByPhase) return [];
    const allProps = Object.values(propertiesByPhase).flat();
    const counts: Record<string, number> = {};
    for (const p of allProps) {
      const rt = p.renoType?.trim() || "Sin definir";
      counts[rt] = (counts[rt] || 0) + 1;
    }
    const colorMap: Record<string, string> = {
      "Light Reno": "#60a5fa",
      "Medium Reno": "#f59e0b",
      "Major Reno": "#ef4444",
      "No Reno Needed": "#6b7280",
      "Sin definir": "#d1d5db",
    };
    return Object.entries(counts)
      .map(([label, value]) => ({
        label,
        value,
        color: colorMap[label] || "#94a3b8",
      }))
      .sort((a, b) => b.value - a.value);
  }, [propertiesByPhase]);

  const propertyTypeSegments = useMemo(() => {
    if (!propertiesByPhase) return [];
    const allProps = Object.values(propertiesByPhase).flat();
    const counts: Record<string, number> = {};
    for (const p of allProps) {
      const sp = (p as any).supabaseProperty;
      const raw = (sp?.type || "").toString().trim().toLowerCase();
      let label = "Unit";
      if (raw.includes("wip")) label = "WIP";
      else if (raw.includes("lot")) label = "Lot";
      else if (raw.includes("building")) label = "Building";
      else if (raw.includes("project")) label = "Project";
      else if (raw.includes("unit") || raw === "") label = "Unit";
      else label = "Otro";
      counts[label] = (counts[label] || 0) + 1;
    }
    const colorMap: Record<string, string> = {
      Unit: "#3b82f6",
      Building: "#8b5cf6",
      Project: "#f59e0b",
      WIP: "#10b981",
      Lot: "#ef4444",
      Otro: "#6b7280",
    };
    return Object.entries(counts)
      .map(([label, value]) => ({
        label,
        value,
        color: colorMap[label] || "#94a3b8",
      }))
      .sort((a, b) => b.value - a.value);
  }, [propertiesByPhase]);

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
    refetch: matRefetch,
  } = useMaturationProjects();

  const {
    projectsByPhase: archProjectsByPhase,
    allProjects: archAllProjects,
    loading: archLoading,
  } = useArchitectProjects(null, true);

  const [matSelectedQuarter, setMatSelectedQuarter] = useState<"all" | "Q1" | "Q2" | "Q3" | "Q4">("all");

  const matFilteredProjects = useMemo(() => {
    if (matSelectedQuarter === "all") return matAllProjects;
    const year = new Date().getFullYear();
    const qRanges: Record<string, [number, number]> = {
      Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11],
    };
    const [startMonth, endMonth] = qRanges[matSelectedQuarter];
    return matAllProjects.filter((p) => {
      const raw = (p as any).draft_order_date || p.created_at;
      if (!raw) return false;
      const d = new Date(raw);
      return d.getFullYear() === year && d.getMonth() >= startMonth && d.getMonth() <= endMonth;
    });
  }, [matAllProjects, matSelectedQuarter]);

  const MAT_ACTIVE_PHASES = new Set([
    "get-project-draft",
    "pending-to-validate",
    "pending-to-reserve-arras",
    "technical-project-in-progress",
    "ecuv-first-validation",
    "technical-project-fine-tuning",
    "ecuv-final-validation",
  ]);

  const matTotalProjects = matFilteredProjects.filter(
    (p) => MAT_ACTIVE_PHASES.has(p.reno_phase ?? "")
  ).length;
  const archTotalProjects = archAllProjects.length;

  const matAvgDays = useMemo(() => {
    const diff = (a: string | null | undefined, b: string | null | undefined): number | null => {
      if (!a || !b) return null;
      const da = new Date(a).getTime();
      const db = new Date(b).getTime();
      if (isNaN(da) || isNaN(db)) return null;
      return Math.round(Math.abs(db - da) / (1000 * 60 * 60 * 24));
    };
    const mean = (vals: (number | null)[]): number | null => {
      const valid = vals.filter((v): v is number => v !== null);
      if (valid.length === 0) return null;
      return Math.round(valid.reduce((s, v) => s + v, 0) / valid.length);
    };
    const ecuProjects = matFilteredProjects.filter((p) => (p as any).excluded_from_ecu !== true);
    return {
      measurement: mean(matFilteredProjects.map((p) => diff((p as any).draft_order_date, (p as any).measurement_date))),
      draft: mean(matFilteredProjects.map((p) => diff((p as any).measurement_date, (p as any).project_architect_date))),
      project: mean(matFilteredProjects.map((p) => diff((p as any).draft_validation_date, (p as any).project_end_date))),
      ecuFirstValidation: mean(ecuProjects.map((p) => diff((p as any).ecu_first_start_date, (p as any).ecu_first_end_date))),
    };
  }, [matFilteredProjects]);

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

  const archAvgDays = useMemo(() => {
    const diff = (a: string | null | undefined, b: string | null | undefined): number | null => {
      if (!a || !b) return null;
      const da = new Date(a).getTime();
      const db = new Date(b).getTime();
      if (isNaN(da) || isNaN(db)) return null;
      return Math.round(Math.abs(db - da) / (1000 * 60 * 60 * 24));
    };
    const mean = (vals: (number | null)[]): number | null => {
      const valid = vals.filter((v): v is number => v !== null);
      if (valid.length === 0) return null;
      return Math.round(valid.reduce((s, v) => s + v, 0) / valid.length);
    };
    return {
      measurement: mean(archAllProjects.map((p) => diff((p as any).draft_order_date, (p as any).measurement_date))),
      draft: mean(archAllProjects.map((p) => diff((p as any).measurement_date, (p as any).project_architect_date))),
      project: mean(archAllProjects.map((p) => diff((p as any).draft_validation_date, (p as any).project_end_date))),
      repairs: mean(archAllProjects.map((p) => diff((p as any).ecu_first_end_date, (p as any).arch_correction_date))),
    };
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
                    {/* Architect KPIs - tiempos medios dinámicos */}
                    <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
                      <ArchAvgTimeKpi label="Media Tiempos Medición" value={archAvgDays.measurement} limitDays={7} />
                      <ArchAvgTimeKpi label="Media Tiempos Anteproyecto" value={archAvgDays.draft} limitDays={14} />
                      <ArchAvgTimeKpi label="Media Tiempos Proyecto" value={archAvgDays.project} limitDays={28} />
                      <ArchAvgTimeKpi label="Media Tiempos Reparos" value={archAvgDays.repairs} limitDays={7} />
                    </div>

                    {/* Architect Todo Widgets */}
                    <ArchitectTodoWidgets allProjects={archAllProjects} projectsByPhase={archProjectsByPhase} />

                    {/* Timeline compacto */}
                    <ProjectTimelineOverview
                      allProjects={archAllProjects}
                      getProjectUrl={(p) => `/reno/maturation-analyst/project/${p.id}?tab=timeline`}
                    />
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

                    {/* Todo List Widgets - oculto para admin */}
                    {role !== 'admin' && (
                      <RenoHomeTodoWidgets propertiesByPhase={propertiesByPhase} />
                    )}

                    {/* Admin Dashboard - solo admin/construction_manager */}
                    {(role === 'admin' || role === 'construction_manager') && (
                      <RenoHomeAdminDashboard propertiesByPhase={propertiesByPhase} />
                    )}

                    {/* Análisis de Reformistas (admin) / Obras activas por reformista (otros) */}
                    {role === 'admin' ? (
                      <RenovatorAnalysisPanel propertiesByPhase={propertiesByPhase} />
                    ) : (
                      <RenoHomeRecentProperties properties={properties} propertiesByPhase={propertiesByPhase} />
                    )}

                    {/* Donut Charts - solo admin */}
                    {role === 'admin' && (
                      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
                        <Card className="bg-card">
                          <CardHeader>
                            <CardTitle className="text-lg font-semibold">Tipo de Reforma</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              Distribución de propiedades por tipo de reforma
                            </p>
                          </CardHeader>
                          <CardContent className="flex justify-center">
                            <DonutChart
                              segments={renoTypeSegments}
                              centerLabel="Total"
                              centerValue={renoTypeSegments.reduce((s, seg) => s + seg.value, 0)}
                            />
                          </CardContent>
                        </Card>
                        <Card className="bg-card">
                          <CardHeader>
                            <CardTitle className="text-lg font-semibold">Tipo de Vivienda</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              Distribución de propiedades por tipo de activo
                            </p>
                          </CardHeader>
                          <CardContent className="flex justify-center">
                            <DonutChart
                              segments={propertyTypeSegments}
                              centerLabel="Total"
                              centerValue={propertyTypeSegments.reduce((s, seg) => s + seg.value, 0)}
                            />
                          </CardContent>
                        </Card>
                      </div>
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

                    {/* Portfolio */}
                    <RenoHomePortfolio properties={properties} propertiesByPhase={propertiesByPhase} />
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
                            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">Pendiente de ECU</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xl md:text-2xl font-bold text-foreground">
                            {[
                              ...(matProjectsByPhase["ecuv-first-validation"] || []),
                              ...(matProjectsByPhase["ecuv-final-validation"] || []),
                            ].filter((p) => (p as any).excluded_from_ecu !== true).length}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Proyectos con ECU en fase de validación</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Todo Widgets */}
                    <MaturationTodoWidgets allProjects={matAllProjects} projectsByPhase={matProjectsByPhase} onRefetch={matRefetch} />

                    {/* Quarter filter + KPIs de tiempos medios */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Periodo:</span>
                        <div className="flex gap-1 border rounded-md">
                          {(["all", "Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
                            <button key={q} onClick={() => setMatSelectedQuarter(q)} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${matSelectedQuarter === q ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                              {q === "all" ? "Todo" : q}
                            </button>
                          ))}
                        </div>
                        {matSelectedQuarter !== "all" && (
                          <span className="text-xs text-muted-foreground">({matTotalProjects} proyectos)</span>
                        )}
                      </div>
                      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                        {([
                          { label: "Media Tiempo Medición", value: matAvgDays.measurement, limit: 7, icon: Ruler, desc: "Límite: 7 días" },
                          { label: "Media Tiempo Anteproyecto", value: matAvgDays.draft, limit: 14, icon: FileText, desc: "Límite: 14 días" },
                          { label: "Media Tiempo Proyecto", value: matAvgDays.project, limit: 28, icon: Hammer, desc: "Límite: 28 días" },
                          { label: "Media 1ª Validación ECU", value: matAvgDays.ecuFirstValidation, limit: 14, icon: ShieldCheck, desc: "Solo proyectos ECU" },
                        ] as const).map((kpi) => {
                          const color = kpi.value === null
                            ? "text-muted-foreground"
                            : kpi.value <= kpi.limit
                              ? "text-green-600 dark:text-green-400"
                              : kpi.value <= kpi.limit * 1.5
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400";
                          const Icon = kpi.icon;
                          return (
                            <Card key={kpi.label} className="bg-card border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <CardTitle className="text-[11px] md:text-xs font-medium text-muted-foreground truncate">{kpi.label}</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className={`text-xl md:text-2xl font-bold ${color}`}>{kpi.value !== null ? `${kpi.value}d` : "—"}</div>
                                <p className="text-[10px] text-muted-foreground mt-1">{kpi.desc}</p>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>

                    {/* Flip vs Yield + Con ECU / Sin ECU */}
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

                    {/* Análisis de Arquitectos (ancho completo) */}
                    <ArchitectRanking allProjects={matAllProjects} />

                    {/* Distribución por fase */}
                    <MaturationPhaseDistribution projectsByPhase={matProjectsByPhase} />

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

function ArchAvgTimeKpi({ label, value, limitDays }: { label: string; value: number | null; limitDays: number }) {
  const valueColor =
    value === null
      ? "text-foreground"
      : value <= limitDays
        ? "text-emerald-600 dark:text-emerald-400"
        : value <= limitDays * 1.5
          ? "text-amber-500"
          : "text-red-500";

  return (
    <Card className="bg-card border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Timer className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
            {label}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-xl md:text-2xl font-bold ${valueColor}`}>
          {value !== null ? `${value} días` : "—"}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Límite: {limitDays} días</p>
      </CardContent>
    </Card>
  );
}
