"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FolderKanban, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { ArchitectProjectSidebar } from "@/components/reno/architect-project-sidebar";
import { ArchitectTaskList } from "@/components/reno/architect-task-list";
import { useSupabaseProject } from "@/hooks/useSupabaseProject";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { ARCHITECT_PHASE_LABELS } from "@/lib/reno-kanban-config";
import type { ProjectRow } from "@/hooks/useSupabaseProject";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

        {/* Content + Sidebar (no tabs, just tasks) */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 lg:p-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000] pb-24">
            <div className="max-w-4xl mx-auto">
              <ArchitectTaskList project={project} onRefetch={handleRefetch} />
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
