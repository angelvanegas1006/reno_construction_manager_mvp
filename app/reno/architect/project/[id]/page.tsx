"use client";

import { useState, useEffect, useCallback, use } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  FolderKanban,
  FolderOpen,
  Info,
  X,
  Building2,
  Calendar,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertyTabs } from "@/components/layout/property-tabs";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { ArchitectProjectSidebar } from "@/components/reno/architect-project-sidebar";
import { ArchitectTaskList } from "@/components/reno/architect-task-list";
import { ProjectDocumentationTab } from "@/components/reno/project-documentation-tab";

const PdfViewer = dynamic(
  () => import("@/components/reno/pdf-viewer").then((mod) => ({ default: mod.PdfViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full border rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center" style={{ minHeight: "400px" }}>
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando visor de PDF...</p>
        </div>
      </div>
    ),
  }
);
import { useSupabaseProject } from "@/hooks/useSupabaseProject";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { ARCHITECT_PHASE_LABELS } from "@/lib/reno-kanban-config";
import type { ProjectRow } from "@/hooks/useSupabaseProject";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trackEventWithDevice } from "@/lib/mixpanel";

function hasValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return !!v;
}

function resolveArchitectPhase(project: ProjectRow): string {
  const pa = project as any;
  const statusRaw = (pa.project_status ?? project.reno_phase ?? "") as string;
  const status = statusRaw.trim().toLowerCase();

  const ADVANCED_STATUSES: Record<string, string> = {
    "technical project in progress": "arch-technical-project",
    "ecuv first validation": "arch-ecu-first-validation",
    "ecu first validation": "arch-ecu-first-validation",
    "technical project fine-tuning": "arch-technical-adjustments",
    "technical project fine tuning": "arch-technical-adjustments",
    "ecuv final validation": "arch-ecu-final-validation",
    "ecu final validation": "arch-ecu-final-validation",
    "reno to start": "arch-obra-empezar",
    "pending to start reno": "arch-obra-empezar",
    "pending to budget from renovator": "arch-completed",
    "pending to budget (from renovator)": "arch-completed",
    "reno in progress": "arch-completed",
  };

  if (ADVANCED_STATUSES[status]) return ADVANCED_STATUSES[status];

  const hasMeasurement = hasValue(pa.measurement_date);
  const hasSentToPropHero = hasValue(pa.project_architect_date);

  if (!hasMeasurement) return "arch-pending-measurement";
  if (!hasSentToPropHero) return "arch-preliminary-project";
  return "arch-pending-validation";
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
    { id: "documentacion", label: "Documentación" },
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
        <header className="border-b bg-card dark:bg-v-gray-900 px-3 md:px-4 lg:px-6 py-4 md:py-6">
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
          <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 lg:p-6 bg-background dark:bg-background pb-24">
            <div className="max-w-4xl mx-auto">
              {activeTab === "tareas" && (
                <ArchitectTaskList project={project} onRefetch={handleRefetch} />
              )}
              {activeTab === "documentacion" && (
                <ProjectDocumentationTab project={project} />
              )}
              {activeTab === "resumen" && (
                <ArchitectSummary project={project} />
              )}
            </div>
          </div>
          <div className="hidden lg:block h-full min-h-0 w-[320px] flex-shrink-0 border-l bg-card dark:bg-v-gray-900 overflow-y-auto">
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
          <div className="fixed right-0 top-0 h-full w-[85vw] max-w-sm bg-card dark:bg-v-gray-900 border-l z-50 lg:hidden shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-card dark:bg-v-gray-900 border-b p-4 flex items-center justify-between z-10">
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
            <SummaryField label="Ejecutor de Renovación" value={p.renovation_executor} />
            <SummaryField label="ECU" value={p.excluded_from_ecu === true ? "Sin ECU" : p.excluded_from_ecu === false ? "Con ECU" : null} />
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

      {/* Documents */}
      <ArchitectDocumentsSection project={project} />

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

/* ------------------------------------------------------------------ */
/*  Documents Section with inline PDF Viewer                           */
/* ------------------------------------------------------------------ */

type ArchDocSection = {
  label: string;
  attachments?: { url: string; filename: string }[];
  externalUrl?: string;
};

function ArchitectDocumentsSection({ project }: { project: ProjectRow }) {
  const p = project as any;
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const sections: ArchDocSection[] = [
    {
      label: "Planos de Anteproyecto",
      attachments: Array.isArray(p.architect_attachments) ? p.architect_attachments : [],
    },
    {
      label: "Informe Check Pro",
      externalUrl: (p.check_pro_report_url as string) || undefined,
    },
    {
      label: "Mediciones",
      attachments: Array.isArray(p.arch_measurements_doc) ? p.arch_measurements_doc : [],
    },
    {
      label: "Proyecto (PDF)",
      attachments: Array.isArray(p.arch_project_doc) ? p.arch_project_doc : [],
    },
    {
      label: "Proyecto CAD",
      attachments: Array.isArray(p.arch_project_cad_doc) ? p.arch_project_cad_doc : [],
    },
  ];

  const hasDocs = sections.some(
    (s) => (s.attachments && s.attachments.length > 0) || s.externalUrl
  );
  if (!hasDocs) return null;

  const isPdfFile = (url: string) => /\.pdf(\?|$)/i.test(url);

  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/30">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-muted-foreground" />
          Documentación
        </h2>
      </div>
      <div className="p-4 md:p-6 space-y-4">
        {sections.map((section) => {
          if (section.externalUrl) {
            return (
              <div key={section.label} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {section.label}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `/api/proxy-html?url=${encodeURIComponent(section.externalUrl!)}`,
                        "_blank"
                      )
                    }
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver informe
                  </Button>
                </div>
              </div>
            );
          }

          const atts = section.attachments ?? [];
          if (atts.length === 0) return null;

          const pdfs = atts.filter((a) => isPdfFile(a.url));
          const nonPdfs = atts.filter((a) => !isPdfFile(a.url));

          return (
            <div key={section.label} className="space-y-3">
              {pdfs.map((att, idx) => {
                const docKey = `${section.label}-${idx}`;
                const isExpanded = expandedDoc === docKey;
                const proxyUrl = att.url.startsWith("http")
                  ? `/api/proxy-pdf?url=${encodeURIComponent(att.url)}`
                  : att.url;

                return (
                  <div key={docKey} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedDoc(isExpanded ? null : docKey)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                        <h3 className="text-base font-semibold">
                          {pdfs.length === 1 ? section.label : `${section.label} ${idx + 1}`}
                        </h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(proxyUrl, "_blank");
                        }}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir en nueva pestaña
                      </Button>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <PdfViewer fileUrl={proxyUrl} fileName={att.filename} />
                      </div>
                    )}
                  </div>
                );
              })}
              {nonPdfs.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {section.label}
                    {pdfs.length > 0 && " (otros archivos)"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {nonPdfs.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
                      >
                        {att.filename}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
