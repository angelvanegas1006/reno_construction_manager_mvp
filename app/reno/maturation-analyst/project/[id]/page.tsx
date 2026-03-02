"use client";

import { useState, use } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  FolderKanban,
  FolderOpen,
  MapPin,
  Info,
  X,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertyTabs } from "@/components/layout/property-tabs";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { MaturationProjectSidebar } from "@/components/reno/maturation-project-sidebar";
import { MaturationTaskList } from "@/components/reno/maturation-task-list";
import { useI18n } from "@/lib/i18n";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { MATURATION_PHASE_LABELS } from "@/lib/reno-kanban-config";
import { useSupabaseProject } from "@/hooks/useSupabaseProject";
import type { PropertyRow } from "@/hooks/useSupabaseProject";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyMap } from "@/components/reno/property-map";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useEffect, useCallback } from "react";
import { trackEventWithDevice } from "@/lib/mixpanel";

function parseAreaClusterDisplay(raw: string | null | undefined): string | null {
  const s = (raw ?? "").toString().trim();
  if (!s || ["[]", '[""]', "['']"].includes(s.replace(/\s/g, ""))) return null;
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      const parts = parsed.filter((x: unknown) => x != null && String(x).trim() !== "");
      if (parts.length === 0) return null;
      return parts.map((x: unknown) => String(x).trim()).join(", ");
    }
  } catch {
    /* plain string */
  }
  return s;
}

export default function MaturationProjectDetailPage() {
  const paramsPromise = useParams();
  const router = useRouter();
  const searchParamsPromise = useSearchParams();
  const unwrappedParams =
    paramsPromise instanceof Promise ? use(paramsPromise) : paramsPromise;
  const unwrappedSearchParams =
    searchParamsPromise instanceof Promise
      ? use(searchParamsPromise)
      : searchParamsPromise;
  const viewMode = unwrappedSearchParams?.get("viewMode") || "kanban";
  const sourcePage = unwrappedSearchParams?.get("from") || null;

  const projectId = (() => {
    if (!unwrappedParams) return null;
    const id = unwrappedParams.id;
    return id && typeof id === "string" ? id : null;
  })();

  const { t, language } = useI18n();
  const { user, role, isLoading: authLoading } = useAppAuth();
  const { project, properties, loading, error, refetch } =
    useSupabaseProject(projectId);
  const [activeTab, setActiveTab] = useState("tareas");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (project && !loading) {
      trackEventWithDevice("Maturation Project Viewed", {
        project_id: project.id,
        project_name: project.name,
        phase: project.reno_phase,
      });
    }
  }, [project?.id, loading]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    trackEventWithDevice("Maturation Tab Changed", {
      tab,
      project_id: projectId,
    });
  }, [projectId]);

  useEffect(() => {
    if (authLoading || !user || !role) return;
    if (
      role !== "maduration_analyst" &&
      role !== "admin" &&
      role !== "construction_manager"
    ) {
      router.push("/login");
      toast.error("No tienes permisos para acceder a esta página");
    }
  }, [authLoading, user, role, router]);

  const tabs = [
    { id: "tareas", label: "Tareas" },
    { id: "resumen", label: "Resumen" },
    { id: "propiedades", label: "Propiedades del proyecto" },
  ];

  const getPhaseLabel = (phase: string | null): string => {
    if (!phase) return "N/A";
    return MATURATION_PHASE_LABELS[phase] ?? phase;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    const locale = language === "es" ? "es-ES" : "en-US";
    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
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
      case "tareas":
        return <MaturationTaskList project={project} onRefetch={refetch} />;

      case "resumen": {
        const p = project as any;
        return (
          <div className="space-y-6">
            {/* KPI summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-card rounded-lg border p-4 shadow-sm text-center overflow-hidden">
                <p className="text-2xl font-bold text-foreground">{p.properties_to_convert && String(p.properties_to_convert).trim() && String(p.properties_to_convert).trim() !== "0" ? String(p.properties_to_convert).trim() : (p.est_properties ?? "—")}</p>
                <p className="text-xs text-muted-foreground mt-1">Propiedades</p>
              </div>
              <div className="bg-card rounded-lg border p-4 shadow-sm text-center overflow-hidden">
                <p className="text-sm font-bold text-foreground leading-tight min-h-[2rem] flex items-center justify-center">{getPhaseLabel(project.reno_phase)}</p>
                <p className="text-xs text-muted-foreground mt-1">Fase actual</p>
              </div>
              <div className="bg-card rounded-lg border p-4 shadow-sm text-center overflow-hidden">
                <p className="text-2xl font-bold text-foreground truncate">{p.type ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">Tipo</p>
              </div>
              <div className="bg-card rounded-lg border p-4 shadow-sm text-center overflow-hidden">
                <p className="text-lg font-bold text-foreground truncate">{project.investment_type ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">Tipo de Inversión</p>
              </div>
            </div>

            {/* Project info card */}
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  Información del proyecto
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <SummaryField label="Nombre" value={project.name} />
                  <SummaryField label="ID del Proyecto" value={project.project_unique_id} mono />
                  <SummaryField label="Clúster de Zona" value={parseAreaClusterDisplay(project.area_cluster)} />
                  <SummaryField label="Estado de la Oferta" value={p.offer_status} />
                  <SummaryField label="Arquitecto" value={p.architect} />
                  <SummaryField label="Contacto ECU" value={p.ecu_contact} />
                  <SummaryField label="Scouter" value={p.scouter} />
                  <SummaryField label="Excluido ECU" value={p.excluded_from_ecu === true ? "Sí" : p.excluded_from_ecu === false ? "No" : null} />
                </div>
              </div>
            </div>

            {/* Dates card */}
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  Fechas
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <SummaryField label="Fecha inicio" value={formatDate(p.project_start_date)} />
                  <SummaryField label="Fecha fin estimada" value={formatDate(p.estimated_project_end_date)} />
                  <SummaryField label="Fecha fin" value={formatDate(p.project_end_date)} />
                  <SummaryField label="Fecha de Firma" value={formatDate(p.settlement_date)} />
                  <SummaryField label="Fecha Límite ARRAS" value={formatDate(p.arras_deadline)} />
                  <SummaryField label="Fecha de Encargo Anteproyecto" value={formatDate(p.draft_order_date)} />
                  <SummaryField label="Fecha de Medición" value={formatDate(p.measurement_date)} />
                  <SummaryField label="Fecha del Anteproyecto" value={formatDate(p.project_draft_date)} />
                </div>
              </div>
            </div>

            {/* Drive + Location */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {project.drive_folder && (
                <div className="bg-card rounded-lg border p-6 shadow-sm">
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
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

            </div>

            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Ubicación del proyecto
              </h3>
              <PropertyMap
                address={
                  project.project_address ||
                  (properties[0]?.address ?? properties[0]?.name ?? "") ||
                  (project.name ?? "")
                }
                areaCluster={
                  parseAreaClusterDisplay(project.area_cluster) ?? undefined
                }
              />
            </div>
          </div>
        );
      }

      case "propiedades":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Propiedades del proyecto
            </h2>
            {properties.length === 0 ? (
              <p className="text-muted-foreground">
                No hay propiedades asociadas a este proyecto.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    getPhaseLabel={getPhaseLabel}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
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
            onClick={() => {
              const url =
                viewMode === "list"
                  ? "/reno/maturation-analyst/kanban?viewMode=list"
                  : "/reno/maturation-analyst/kanban";
              router.push(url);
            }}
          >
            Volver al Kanban Maduración
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-card dark:bg-[var(--prophero-gray-900)] px-3 md:px-4 lg:px-6 py-4 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                onClick={() => {
                  const base = "/reno/maturation-analyst/kanban";
                  const params = new URLSearchParams();
                  if (viewMode === "list") params.set("viewMode", "list");
                  if (sourcePage) params.set("from", sourcePage);
                  const qs = params.toString();
                  router.push(qs ? `${base}?${qs}` : base);
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
                  <div className="mt-1 text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                    {project.project_unique_id && (
                      <>
                        <span className="font-semibold">{project.project_unique_id}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>
                      Fase: {getPhaseLabel(project.reno_phase)}
                    </span>
                    <span>·</span>
                    <span>
                      Propiedades: {(project as any).properties_to_convert && String((project as any).properties_to_convert).trim() && String((project as any).properties_to_convert).trim() !== "0" ? String((project as any).properties_to_convert).trim() : ((project as any).est_properties ?? "—")}
                    </span>
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

        {/* Tabs */}
        <PropertyTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Content + Sidebar */}
        <div className="flex flex-1 overflow-hidden pt-2">
          <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 lg:p-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000] pb-24">
            <div className="max-w-4xl mx-auto">{renderTabContent()}</div>
          </div>
          <div className="hidden lg:block h-full min-h-0 w-[320px] flex-shrink-0 border-l bg-card dark:bg-[var(--prophero-gray-900)] overflow-y-auto">
            <MaturationProjectSidebar project={project} />
          </div>
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-[85vw] max-w-sm bg-card dark:bg-[var(--prophero-gray-900)] border-l z-50 lg:hidden shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-card dark:bg-[var(--prophero-gray-900)] border-b p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">Info del Proyecto</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-md hover:bg-accent"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <MaturationProjectSidebar project={project} />
          </div>
        </>
      )}
    </div>
  );
}

function SummaryField({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  const display = value && value !== "—" ? value : null;
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</dt>
      <dd className={cn("mt-1 text-sm font-medium", mono && "font-mono", !display && "text-muted-foreground italic")}>
        {display ?? "—"}
      </dd>
    </div>
  );
}

function PropertyCard({
  property,
  getPhaseLabel,
  formatDate,
}: {
  property: PropertyRow;
  getPhaseLabel: (phase: string | null) => string;
  formatDate: (dateString: string | null | undefined) => string;
}) {
  const router = useRouter();
  const address = property.address ?? property.name ?? property.id;
  const phase = property.reno_phase ?? null;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:bg-accent/50",
        "border border-border"
      )}
      onClick={() =>
        router.push(
          `/reno/construction-manager/property/${property.id}?from=maturation-project`
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
        {phase && (
          <Badge variant="secondary" className="text-xs font-medium">
            {getPhaseLabel(phase)}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
