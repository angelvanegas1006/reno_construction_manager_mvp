"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  FolderKanban,
  Info,
  X,
  Building2,
  Calendar,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertyTabs } from "@/components/layout/property-tabs";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { ArchitectProjectSidebar } from "@/components/reno/architect-project-sidebar";
import { ArchitectTaskList } from "@/components/reno/architect-task-list";
import { useSupabaseProject } from "@/hooks/useSupabaseProject";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { ARCHITECT_PHASE_LABELS } from "@/lib/reno-kanban-config";
import type { ProjectRow } from "@/hooks/useSupabaseProject";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trackEventWithDevice } from "@/lib/mixpanel";

const STATUSES_EARLY = new Set(["get project draft", "pending to validate"]);

function hasAttachments(value: unknown): boolean {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") {
    try { return JSON.parse(value).length > 0; } catch { return false; }
  }
  return false;
}

function resolveArchitectPhase(project: ProjectRow): string {
  const pa = project as any;
  const statusRaw = (pa.project_status ?? project.reno_phase ?? "") as string;
  const status = statusRaw.trim().toLowerCase();

  if (STATUSES_EARLY.has(status)) {
    const hasSqm = pa.usable_square_meters != null && pa.usable_square_meters !== "";
    if (!hasSqm) return "arch-pending-measurement";
    if (!hasAttachments(pa.architect_attachments)) return "arch-preliminary-project";
    return "arch-completed";
  }
  if (status === "technical project in progress") {
    if (!hasAttachments(pa.architect_attachments)) return "arch-technical-project";
    return "arch-completed";
  }
  if (status === "technical project fine-tuning") {
    if (!hasAttachments(pa.architect_attachments)) return "arch-technical-adjustments";
    return "arch-completed";
  }
  return "arch-completed";
}

function getArchitectPhaseLabel(project: ProjectRow): string {
  const phase = resolveArchitectPhase(project);
  return ARCHITECT_PHASE_LABELS[phase] ?? phase;
}

export default function ArchitectProjectDetailPage() {
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

  const projectId = (() => {
    if (!unwrappedParams) return null;
    const id = unwrappedParams.id;
    return id && typeof id === "string" ? id : null;
  })();

  const { user, role, isLoading: authLoading } = useAppAuth();
  const { project, loading, error, refetch } = useSupabaseProject(projectId);
  const [activeTab, setActiveTab] = useState("tareas");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const tabs = [
    { id: "tareas", label: "Tareas" },
    { id: "resumen", label: "Resumen del proyecto" },
  ];

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    trackEventWithDevice("Architect Tab Changed", { tab: tabId, project_id: projectId });
  }, [projectId]);

  useEffect(() => {
    if (project && !loading) {
      trackEventWithDevice("Architect Project Viewed", {
        project_id: project.id,
        project_name: project.name,
        phase: project.reno_phase,
      });
    }
  }, [project?.id, loading]);

  useEffect(() => {
    if (authLoading || !user || !role) return;
    if (
      role !== "architect" &&
      role !== "admin" &&
      role !== "construction_manager" &&
      role !== "maduration_analyst"
    ) {
      router.push("/login");
      toast.error("No tienes permisos para acceder a esta página");
    }
  }, [authLoading, user, role, router]);

  const handleRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

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
                  ? "/reno/architect/kanban?viewMode=list"
                  : "/reno/architect/kanban";
              router.push(url);
            }}
          >
            Volver al Kanban
          </Button>
        </div>
      </div>
    );
  }

  const p = project as any;

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
                  const base = "/reno/architect/kanban";
                  const params = new URLSearchParams();
                  if (viewMode === "list") params.set("viewMode", "list");
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
                      Fase: {getArchitectPhaseLabel(project)}
                    </span>
                    {p.usable_square_meters != null && (
                      <>
                        <span>·</span>
                        <span>{p.usable_square_meters} m²</span>
                      </>
                    )}
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
            <div className="max-w-4xl mx-auto">
              {activeTab === "tareas" ? (
                <ArchitectTaskList project={project} onRefetch={handleRefetch} />
              ) : (
                <ArchitectSummary project={project} />
              )}
            </div>
          </div>
          <div className="hidden lg:block h-full min-h-0 w-[320px] flex-shrink-0 border-l bg-card dark:bg-[var(--prophero-gray-900)] overflow-y-auto">
            <ArchitectProjectSidebar project={project} />
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
            <ArchitectProjectSidebar project={project} />
          </div>
        </>
      )}
    </div>
  );
}

function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return "—";
  }
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

function ArchitectSummary({ project }: { project: ProjectRow }) {
  const p = project as any;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-lg border p-4 shadow-sm text-center overflow-hidden">
          <p className="text-2xl font-bold text-foreground">
            {p.usable_square_meters != null ? `${p.usable_square_meters} m²` : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Metros cuadrados</p>
        </div>
        <div className="bg-card rounded-lg border p-4 shadow-sm text-center overflow-hidden">
          <p className="text-2xl font-bold text-foreground">
            {p.properties_to_convert && String(p.properties_to_convert).trim() && String(p.properties_to_convert).trim() !== "0"
              ? String(p.properties_to_convert).trim()
              : (p.est_properties ?? "—")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Propiedades</p>
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

      {/* Project info */}
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
            <SummaryField label="Dirección" value={p.project_address} />
            <SummaryField label="Excluido ECU" value={p.excluded_from_ecu === true ? "Sí" : p.excluded_from_ecu === false ? "No" : null} />
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/30">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Fechas
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <SummaryField label="Fecha de Encargo Anteproyecto" value={formatDate(p.draft_order_date)} />
            <SummaryField label="Fecha de Medición" value={formatDate(p.measurement_date)} />
            <SummaryField label="Fecha del Anteproyecto" value={formatDate(p.project_draft_date)} />
            <SummaryField label="Fecha de Inicio del Proyecto" value={formatDate(p.project_start_date)} />
            <SummaryField label="Fecha Estimada de Fin" value={formatDate(p.estimated_project_end_date)} />
            <SummaryField label="Fecha de Fin del Proyecto" value={formatDate(p.project_end_date)} />
          </div>
        </div>
      </div>

      {/* Location */}
      {p.project_address && (
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            Ubicación del proyecto
          </h3>
          <p className="text-sm text-muted-foreground">{p.project_address}</p>
        </div>
      )}
    </div>
  );
}
