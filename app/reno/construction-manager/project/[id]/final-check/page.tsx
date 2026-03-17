"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, FileDown, ClipboardCheck, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { useSupabaseProject } from "@/hooks/useSupabaseProject";
import { useProjectFinalCheck } from "@/hooks/useProjectFinalCheck";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LocalDwellingState = Record<string, { estado_vivienda: string; estado_mobiliario: string }>;

export default function ProjectFinalCheckPage() {
  const paramsPromise = useParams();
  const unwrappedParams = paramsPromise instanceof Promise ? use(paramsPromise) : paramsPromise;
  const projectId = (() => {
    if (!unwrappedParams) return null;
    const id = unwrappedParams.id;
    return id && typeof id === "string" ? id : null;
  })();

  const router = useRouter();
  const supabase = createClient();
  const { project, properties, loading: projectLoading } = useSupabaseProject(projectId);
  const { finalCheck, loading: checkLoading, saveDwelling, refetch, startFinalCheck } = useProjectFinalCheck(projectId);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [startingCheck, setStartingCheck] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [localState, setLocalState] = useState<LocalDwellingState>({});
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!finalCheck?.dwellings || initializedRef.current) return;
    const state: LocalDwellingState = {};
    finalCheck.dwellings.forEach((d) => {
      state[d.id] = {
        estado_vivienda: d.estado_vivienda ?? "",
        estado_mobiliario: d.estado_mobiliario ?? "",
      };
    });
    setLocalState(state);
    initializedRef.current = true;
  }, [finalCheck?.dwellings]);

  const propertyById = useCallback(
    (id: string) => properties.find((p) => p.id === id),
    [properties]
  );

  const handleFieldChange = useCallback(
    (dwellingId: string, field: "estado_vivienda" | "estado_mobiliario", value: string) => {
      setLocalState((prev) => ({
        ...prev,
        [dwellingId]: { ...prev[dwellingId], [field]: value },
      }));
      setDirtyIds((prev) => new Set(prev).add(dwellingId));
    },
    []
  );

  const localStateRef = useRef(localState);
  localStateRef.current = localState;

  const handleSaveDwelling = useCallback(
    async (dwellingId: string) => {
      const local = localStateRef.current[dwellingId];
      if (!local) return;
      setSavingId(dwellingId);
      await saveDwelling(dwellingId, {
        estado_vivienda: local.estado_vivienda || null,
        estado_mobiliario: local.estado_mobiliario || null,
      });
      setSavingId(null);
      setDirtyIds((prev) => {
        const next = new Set(prev);
        next.delete(dwellingId);
        return next;
      });
      setSavedId(dwellingId);
      setTimeout(() => setSavedId(null), 2000);
    },
    [saveDwelling]
  );

  const handleSaveAll = useCallback(async () => {
    const ids = Array.from(dirtyIds);
    if (ids.length === 0) {
      toast.info("No hay cambios pendientes");
      return;
    }
    for (const id of ids) {
      await handleSaveDwelling(id);
    }
    toast.success("Todos los cambios guardados");
  }, [dirtyIds, handleSaveDwelling]);

  const handleCompleteAndDownload = useCallback(async () => {
    if (!finalCheck?.id) return;
    setCompleting(true);
    try {
      const { error } = await supabase
        .from("project_final_checks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", finalCheck.id);
      if (error) {
        toast.error(error.message);
        setCompleting(false);
        return;
      }
      await refetch();
      const url = `/api/project-final-check/${finalCheck.id}/pdf`;
      window.open(url, "_blank");
      toast.success("Informe generado. Descarga el PDF.");
    } catch (e) {
      toast.error("Error al finalizar");
    } finally {
      setCompleting(false);
    }
  }, [finalCheck?.id, supabase, refetch]);

  if (projectLoading || checkLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <VistralLogoLoader className="min-h-[200px]" size="lg" />
      </div>
    );
  }

  if (!projectId || !project) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-lg font-semibold text-foreground">Proyecto no encontrado</p>
        <Button
          variant="outline"
          onClick={() => router.push("/reno/construction-manager")}
        >
          Volver al inicio
        </Button>
      </div>
    );
  }

  if (!finalCheck) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <ClipboardCheck className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            Final Check: {project.name ?? "Proyecto"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            No hay ningún Final Check iniciado para este proyecto.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            disabled={startingCheck || properties.length === 0}
            onClick={async () => {
              setStartingCheck(true);
              try {
                const checkId = await startFinalCheck(project.assigned_site_manager_email ?? null);
                if (checkId) {
                  toast.success("Final Check iniciado");
                  await refetch();
                } else {
                  toast.error("Error al iniciar Final Check");
                }
              } finally {
                setStartingCheck(false);
              }
            }}
          >
            {startingCheck ? "Iniciando..." : "Iniciar Final Check"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/reno/construction-manager/project/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver al proyecto
          </Button>
        </div>
        {properties.length === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            El proyecto no tiene propiedades asociadas todavía.
          </p>
        )}
      </div>
    );
  }

  const dwellings = finalCheck.dwellings ?? [];
  const isCompleted = finalCheck.status === "completed";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b bg-card px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.push(
                    `/reno/construction-manager/project/${projectId}?from=project`
                  )
                }
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Atrás
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Final Check: {project.name ?? "Proyecto"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {dwellings.length} vivienda{dwellings.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {!isCompleted && (
              <div className="flex items-center gap-2">
                {dirtyIds.size > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleSaveAll}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Guardar todo ({dirtyIds.size})
                  </Button>
                )}
                <Button
                  onClick={handleCompleteAndDownload}
                  disabled={completing}
                  className="flex items-center gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  {completing ? "Generando..." : "Finalizar y generar informe"}
                </Button>
              </div>
            )}
            {isCompleted && (
              <Button
                variant="outline"
                onClick={() =>
                  window.open(
                    `/api/project-final-check/${finalCheck.id}/pdf`,
                    "_blank"
                  )
                }
              >
                <FileDown className="h-4 w-4 mr-2" />
                Descargar informe PDF
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col border-r bg-card overflow-y-auto">
          <div className="p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-2">
              Viviendas
            </p>
            {dwellings.map((d) => {
              const prop = propertyById(d.property_id);
              const label = prop?.address ?? prop?.name ?? d.property_id.slice(0, 8);
              const hasContent =
                (d.estado_vivienda?.trim()?.length ?? 0) > 0 ||
                (d.estado_mobiliario?.trim()?.length ?? 0) > 0;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() =>
                    sectionRefs.current[d.id]?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm truncate transition-colors",
                    hasContent
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
          <div className="max-w-2xl mx-auto space-y-8">
            {dwellings.map((d) => {
              const prop = propertyById(d.property_id);
              const address = prop?.address ?? prop?.name ?? d.property_id;
              const local = localState[d.id];
              const isDirty = dirtyIds.has(d.id);
              const isSaving = savingId === d.id;
              const justSaved = savedId === d.id;
              return (
                <div
                  key={d.id}
                  ref={(el) => {
                    sectionRefs.current[d.id] = el;
                  }}
                  className="bg-card rounded-lg border p-6 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">
                      {address}
                    </h2>
                    {isSaving && (
                      <span className="text-xs text-muted-foreground">Guardando...</span>
                    )}
                    {justSaved && !isSaving && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Guardado
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`vivienda-${d.id}`}>
                        Estado de la vivienda
                      </Label>
                      <Textarea
                        id={`vivienda-${d.id}`}
                        className="mt-1 min-h-[100px]"
                        placeholder="Describe el estado de la vivienda..."
                        value={local?.estado_vivienda ?? d.estado_vivienda ?? ""}
                        disabled={isCompleted}
                        onChange={(e) =>
                          handleFieldChange(d.id, "estado_vivienda", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`mobiliario-${d.id}`}>
                        Estado del mobiliario
                      </Label>
                      <Textarea
                        id={`mobiliario-${d.id}`}
                        className="mt-1 min-h-[100px]"
                        placeholder="Describe el estado del mobiliario..."
                        value={local?.estado_mobiliario ?? d.estado_mobiliario ?? ""}
                        disabled={isCompleted}
                        onChange={(e) =>
                          handleFieldChange(d.id, "estado_mobiliario", e.target.value)
                        }
                      />
                    </div>
                    {!isCompleted && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant={isDirty ? "default" : "outline"}
                          disabled={!isDirty || isSaving}
                          onClick={() => handleSaveDwelling(d.id)}
                          className="flex items-center gap-1.5"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {isSaving ? "Guardando..." : "Guardar"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
