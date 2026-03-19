"use client";

import { useState, use, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, Calendar, ExternalLink, FolderKanban, FolderOpen, MapPin, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertyTabs } from "@/components/layout/property-tabs";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { ProjectStatusSidebar } from "@/components/reno/project-status-sidebar";
import { useI18n } from "@/lib/i18n";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { PROJECT_KANBAN_PHASE_LABELS } from "@/lib/reno-kanban-config";
import { useSupabaseProject } from "@/hooks/useSupabaseProject";
import type { PropertyRow } from "@/hooks/useSupabaseProject";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyMap } from "@/components/reno/property-map";
import { createClient } from "@/lib/supabase/client";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { useProjectFinalCheck } from "@/hooks/useProjectFinalCheck";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

function parseAreaClusterDisplay(raw: string | null | undefined): string | null {
  const s = (raw ?? "").toString().trim();
  if (!s || ["[]", "[\"\"]", "['']"].includes(s.replace(/\s/g, ""))) return null;
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      const parts = parsed.filter((x) => x != null && String(x).trim() !== "");
      if (parts.length === 0) return null;
      return parts.map((x) => String(x).trim()).join(", ");
    }
  } catch {
    /* plain string */
  }
  return s;
}

export default function RenoProjectDetailPage() {
  const paramsPromise = useParams();
  const router = useRouter();
  const searchParamsPromise = useSearchParams();
  const unwrappedParams = paramsPromise instanceof Promise ? use(paramsPromise) : paramsPromise;
  const unwrappedSearchParams = searchParamsPromise instanceof Promise ? use(searchParamsPromise) : searchParamsPromise;
  const viewMode = unwrappedSearchParams?.get("viewMode") || "kanban";
  const sourcePage = unwrappedSearchParams?.get("from") || null;

  const projectId = (() => {
    if (!unwrappedParams) return null;
    const id = unwrappedParams.id;
    return id && typeof id === "string" ? id : null;
  })();

  const { t } = useI18n();
  const { user, role, isLoading: authLoading } = useAppAuth();
  const { project, properties, loading, error, refetch } = useSupabaseProject(projectId);
  const { finalCheck, loading: finalCheckLoading, startFinalCheck } = useProjectFinalCheck(projectId);
  const [activeTab, setActiveTab] = useState("propiedades");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [startingCheck, setStartingCheck] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (authLoading || loading || !project || !user || role !== "foreman") return;
    const assigned = project.assigned_site_manager_email?.trim().toLowerCase();
    const userEmail = user.email?.trim().toLowerCase();
    if (assigned && userEmail && assigned !== userEmail) {
      router.push("/reno/construction-manager/kanban");
      toast.error("No tienes acceso a este proyecto");
    }
  }, [authLoading, loading, project, user, role, router]);

  const handleAssignSiteManagerProject = useCallback(
    async (projId: string, email: string | null) => {
      try {
        const { error: projectError } = await supabase
          .from("projects")
          .update({
            assigned_site_manager_email: email,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projId);
        if (projectError) throw projectError;

        const { error: propsError } = await supabase
          .from("properties")
          .update({
            assigned_site_manager_email: email,
            updated_at: new Date().toISOString(),
          })
          .eq("project_id", projId);
        if (propsError) throw propsError;

        await refetch();
        toast.success("Jefe de obra asignado");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al asignar";
        toast.error(msg);
      }
    },
    [supabase, refetch]
  );

  const tabs = [
    { id: "propiedades", label: "Propiedades del proyecto" },
    { id: "tareas", label: "Tareas" },
    { id: "resumen", label: "Resumen" },
    { id: "estado", label: "Estado del proyecto" },
  ];

  const getRenoPhaseLabel = (phase: RenoKanbanPhase | string | null): string => {
    if (!phase) return "N/A";
    if (PROJECT_KANBAN_PHASE_LABELS[phase]) return PROJECT_KANBAN_PHASE_LABELS[phase];
    const phaseLabels: Record<string, string> = {
      "upcoming-settlements": t.kanban.upcomingSettlements,
      "initial-check": t.kanban.initialCheck,
      "reno-budget-renovator": t.kanban.renoBudgetRenovator,
      "reno-budget-client": t.kanban.renoBudgetClient,
      "reno-budget-start": t.kanban.renoBudgetStart,
      "reno-budget": t.kanban.renoBudget,
      "upcoming": t.kanban.upcoming,
      "reno-in-progress": t.kanban.renoInProgress,
      "furnishing": t.kanban.furnishing,
      "final-check": t.kanban.finalCheck,
      "cleaning": t.kanban.cleaning,
      "furnishing-cleaning": t.kanban.furnishingCleaning,
      "reno-fixes": t.kanban.renoFixes,
      "done": t.kanban.done,
      "orphaned": "Orphaned",
    };
    return phaseLabels[phase] || String(phase);
  };

  const renderTabContent = () => {
    if (!project) {
      return (
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <p className="text-muted-foreground">Cargando proyecto...</p>
        </div>
      );
    }
    switch (activeTab) {
      case "propiedades":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Propiedades del proyecto</h2>
            {properties.length === 0 ? (
              <p className="text-muted-foreground">No hay propiedades asociadas a este proyecto.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((prop) => (
                  <PropertyCard key={prop.id} property={prop} getRenoPhaseLabel={getRenoPhaseLabel} />
                ))}
              </div>
            )}
          </div>
        );
      case "resumen":
        return (
          <div className="space-y-6">
            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Resumen</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Nombre del proyecto</dt>
                  <dd className="font-medium">{project.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Fase del proyecto</dt>
                  <dd>{getRenoPhaseLabel(project.reno_phase as RenoKanbanPhase)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Número de propiedades</dt>
                  <dd>{properties.length}</dd>
                </div>
                {project.project_unique_id && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Project ID</dt>
                    <dd className="font-mono text-sm">{project.project_unique_id}</dd>
                  </div>
                )}
                {project.investment_type && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Investment type</dt>
                    <dd>{project.investment_type}</dd>
                  </div>
                )}
                {parseAreaClusterDisplay(project.area_cluster) != null && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Area cluster</dt>
                    <dd>{parseAreaClusterDisplay(project.area_cluster)}</dd>
                  </div>
                )}
                {project.airtable_project_id && (
                  <div>
                    <dt className="text-sm text-muted-foreground">ID Airtable</dt>
                    <dd className="font-mono text-sm">{project.airtable_project_id}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Carpeta Drive */}
            {project.drive_folder && (
              <div className="bg-card rounded-lg border p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  Carpeta Drive
                </h3>
                <a
                  href={project.drive_folder}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  Abrir carpeta del proyecto
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}

            {/* Mapa de ubicación */}
            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Ubicación del proyecto
              </h3>
              <PropertyMap
                address={
                  project.project_address ||
                  (properties[0]?.address ?? properties[0]?.name ?? "") ||
                  (project.name ?? "")
                }
                areaCluster={parseAreaClusterDisplay(project.area_cluster) ?? undefined}
              />
            </div>
          </div>
        );
      case "tareas":
        return (
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Tareas</h2>
            {finalCheckLoading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : finalCheck ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Final Check {finalCheck.status === "completed" ? "completado" : "en curso"}.
                </p>
                <Button
                  onClick={() =>
                    router.push(
                      `/reno/construction-manager/project/${projectId}/final-check?from=project`
                    )
                  }
                >
                  {finalCheck.status === "completed"
                    ? "Ver informe Final Check"
                    : "Continuar Final Check"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Inicia el Final Check del proyecto para reportar el estado de cada vivienda y mobiliario.
                </p>
                <Button
                  disabled={startingCheck || properties.length === 0}
                  onClick={async () => {
                    setStartingCheck(true);
                    try {
                      const checkId = await startFinalCheck(project.assigned_site_manager_email ?? null);
                      if (checkId) {
                        toast.success("Final Check iniciado");
                        router.push(
                          `/reno/construction-manager/project/${projectId}/final-check?from=project`
                        );
                      } else {
                        toast.error("Error al iniciar Final Check");
                      }
                    } finally {
                      setStartingCheck(false);
                    }
                  }}
                >
                  {startingCheck ? "Iniciando..." : "Iniciar Final Check del proyecto"}
                </Button>
                {properties.length === 0 && (
                  <p className="text-sm text-warning dark:text-warning">
                    Añade al menos una propiedad al proyecto para poder iniciar el Final Check.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      case "estado":
        return (
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Estado del proyecto</h2>
            <p className="text-muted-foreground mb-2">Fase actual:</p>
            <p className="font-medium">{getRenoPhaseLabel(project.reno_phase as RenoKanbanPhase)}</p>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 items-center justify-center">
          <VistralLogoLoader />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-lg font-semibold text-foreground mb-2">
            {error ? "Error al cargar el proyecto" : "Proyecto no encontrado"}
          </p>
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                viewMode === "list"
                  ? "/reno/construction-manager/kanban-projects?viewMode=list"
                  : "/reno/construction-manager/kanban-projects"
              )
            }
          >
            Volver al Kanban Proyectos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b bg-card dark:bg-v-gray-900 px-3 md:px-4 lg:px-6 py-4 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                onClick={() => {
                  const url =
                    sourcePage === "kanban-projects"
                      ? viewMode === "list"
                        ? "/reno/construction-manager/kanban-projects?viewMode=list&from=kanban-projects"
                        : "/reno/construction-manager/kanban-projects?from=kanban-projects"
                      : viewMode === "list"
                        ? "/reno/construction-manager/kanban-projects?viewMode=list"
                        : "/reno/construction-manager/kanban-projects";
                  router.push(url);
                }}
                className="flex items-center gap-1 md:gap-2 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden md:inline">Atrás</span>
              </Button>
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                  <FolderKanban className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">
                    {project.name ?? "Proyecto sin nombre"}
                  </h1>
                  <div className="mt-1 text-sm text-muted-foreground">
                    <span>Estado: {getRenoPhaseLabel(project.reno_phase as RenoKanbanPhase)}</span>
                    <span className="mx-2">·</span>
                    <span>{properties.length} propiedad{properties.length !== 1 ? "es" : ""}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden"
                aria-label="Abrir panel"
              >
                <Info className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <PropertyTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex flex-1 overflow-hidden pt-2">
          <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 lg:p-6 bg-background dark:bg-background pb-24">
            <div className="max-w-4xl mx-auto">{renderTabContent()}</div>
          </div>
          <div className="hidden lg:block h-full min-h-0 w-[320px] flex-shrink-0 border-l bg-card dark:bg-v-gray-900">
            <ProjectStatusSidebar
              project={project}
              onAssign={handleAssignSiteManagerProject}
            />
          </div>
        </div>
      </div>

      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-[85vw] max-w-sm bg-card dark:bg-v-gray-900 border-l z-50 lg:hidden shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-card dark:bg-v-gray-900 border-b p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">Proyecto</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-md hover:bg-accent"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ProjectStatusSidebar
              project={project}
              onAssign={(id, email) => {
                void handleAssignSiteManagerProject(id, email);
                setIsSidebarOpen(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function PropertyCard({
  property,
  getRenoPhaseLabel,
}: {
  property: PropertyRow;
  getRenoPhaseLabel: (phase: RenoKanbanPhase | string | null) => string;
}) {
  const router = useRouter();
  const { t, language } = useI18n();
  const address = property.address ?? property.name ?? property.id;
  const phase = (property.reno_phase ?? "reno-in-progress") as RenoKanbanPhase;

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    const locale = language === "es" ? "es-ES" : "en-US";
    return d.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const daysToVisit = property.days_to_visit ?? null;
  const daysToStartReno =
    (property as Record<string, unknown>)["Days to Start Reno (Since RSD)"] ??
    (property as Record<string, unknown>)["Days to Start Reno (Sice RSD)"];
  const renoDuration = (property as Record<string, unknown>)["Reno Duration"];
  const daysToPropertyReady = (property as Record<string, unknown>)["Days to Property Ready"];
  const nextUpdate = property.next_update ?? null;
  const realSettlementDate = (property as Record<string, unknown>)["Real Settlement Date"] as string | null | undefined;

  const budgetPhases: RenoKanbanPhase[] = [
    "reno-budget-renovator",
    "reno-budget-client",
    "reno-budget-start",
    "reno-budget",
  ];
  const showDaysToVisit =
    (phase === "upcoming-settlements" || phase === "initial-check") &&
    daysToVisit !== null &&
    daysToVisit !== undefined;
  const showDaysToStartReno =
    budgetPhases.includes(phase) &&
    daysToStartReno !== null &&
    daysToStartReno !== undefined;
  const showRenoDuration =
    phase === "reno-in-progress" &&
    renoDuration !== null &&
    renoDuration !== undefined;
  const showDaysToPropertyReady =
    (phase === "furnishing" || phase === "final-check" || phase === "cleaning") &&
    daysToPropertyReady !== null &&
    daysToPropertyReady !== undefined;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:bg-accent/50",
        "border border-border"
      )}
      onClick={() =>
        router.push(
          `/reno/construction-manager/property/${property.id}?from=kanban-projects`
        )
      }
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium truncate">{address}</span>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>

        {/* Tag de fase */}
        <div className="mb-3">
          <Badge variant="secondary" className="text-xs font-medium">
            {getRenoPhaseLabel(phase)}
          </Badge>
        </div>

        {/* Métricas según fase */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {showDaysToVisit && (
            <div>
              <span className="font-medium">Días para visitar:</span> {Number(daysToVisit)} días
            </div>
          )}
          {showDaysToStartReno && (
            <div>
              <span className="font-medium">Días para iniciar obra:</span> {Number(daysToStartReno)} días
            </div>
          )}
          {showRenoDuration && (
            <div>
              <span className="font-medium">Duración de la obra:</span> {Number(renoDuration)} días
            </div>
          )}
          {showDaysToPropertyReady && (
            <div>
              <span className="font-medium">Días para propiedad lista:</span> {Number(daysToPropertyReady)} días
            </div>
          )}
          {realSettlementDate && (phase === "upcoming-settlements" || phase === "initial-check") && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>Escrituración: {formatDate(realSettlementDate)}</span>
            </div>
          )}
          {nextUpdate && (phase === "reno-in-progress" || phase === "final-check") && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>Próxima actualización: {formatDate(nextUpdate)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
