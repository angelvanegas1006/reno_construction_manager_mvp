"use client";

import { useState, useCallback, useRef, DragEvent } from "react";
import { Loader2, Upload, FileUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { trackEventWithDevice } from "@/lib/mixpanel";
import type { ProjectRow } from "@/hooks/useSupabaseProject";
import { AttachmentViewer } from "@/components/reno/attachment-viewer";

type ArchitectPhase =
  | "arch-pending-measurement"
  | "arch-preliminary-project"
  | "arch-technical-project"
  | "arch-technical-adjustments"
  | "arch-completed";

const STATUSES_EARLY = new Set(["get project draft", "pending to validate"]);

function hasAttachments(value: unknown): boolean {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") {
    try { return JSON.parse(value).length > 0; } catch { return false; }
  }
  return false;
}

function getArchitectPhase(project: ProjectRow): ArchitectPhase {
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

function AttachmentUploadField({
  projectId,
  field,
  value,
  onRefetch,
}: {
  projectId: string;
  field: string;
  value: unknown;
  onRefetch: () => Promise<void>;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const filePath = `architect/${projectId}/${field}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("project-attachments")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from("project-attachments")
        .getPublicUrl(filePath);

      const existingRaw = value;
      let existingArr: { url: string; filename: string }[] = [];
      if (Array.isArray(existingRaw)) {
        existingArr = existingRaw;
      } else if (typeof existingRaw === "string") {
        try { existingArr = JSON.parse(existingRaw); } catch { /* ignore */ }
      }

      const newArr = [...existingArr, { url: urlData.publicUrl, filename: file.name }];

      const { error: dbError } = await supabase
        .from("projects")
        .update({ [field]: newArr, updated_at: new Date().toISOString() })
        .eq("id", projectId);

      if (dbError) throw new Error(dbError.message);

      await onRefetch();
      toast.success("Documento subido");
      trackEventWithDevice("Architect Attachment Uploaded", {
        project_id: projectId,
        field,
        filename: file.name,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
      fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const hasExisting = (() => {
    if (Array.isArray(value) && value.length > 0) return true;
    if (typeof value === "string") {
      try { return JSON.parse(value).length > 0; } catch { return false; }
    }
    return false;
  })();

  return (
    <div className="space-y-3">
      {hasExisting && <AttachmentViewer value={value} />}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.dwg,.dxf"
      />
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
          px-4 py-6 cursor-pointer transition-colors
          ${isDragging
            ? "border-[var(--prophero-blue-500)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]/20"
            : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
          }
          ${uploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <span className="text-sm text-muted-foreground">Subiendo documento...</span>
          </>
        ) : (
          <>
            <FileUp className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <span className="text-sm font-medium text-[var(--prophero-blue-500)]">
                Haz clic para subir
              </span>
              <span className="text-sm text-muted-foreground"> o arrastra aquí</span>
            </div>
            <span className="text-xs text-muted-foreground">
              PDF, DOC, XLS, DWG, imágenes
            </span>
          </>
        )}
      </div>
    </div>
  );
}

interface ArchitectTaskListProps {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
}

export function ArchitectTaskList({ project, onRefetch }: ArchitectTaskListProps) {
  const archPhase = getArchitectPhase(project);
  const [savingField, setSavingField] = useState<string | null>(null);
  const supabase = createClient();
  const p = project as any;

  const saveField = useCallback(
    async (field: string, value: unknown) => {
      setSavingField(field);
      try {
        const updates: Record<string, unknown> = {
          [field]: value,
          updated_at: new Date().toISOString(),
        };

        // Auto-timestamp: measurement_date cuando se rellenan m² por primera vez
        if (field === "usable_square_meters" && value != null && !(project as any).measurement_date) {
          updates.measurement_date = new Date().toISOString();
        }

        const { error } = await supabase
          .from("projects")
          .update(updates)
          .eq("id", project.id);
        if (error) throw new Error(error.message);

        // Write-back a Airtable si se generó timestamp de measurement_date (formato YYYY-MM-DD)
        if (field === "usable_square_meters" && updates.measurement_date && project.airtable_project_id) {
          fetch("/api/airtable/projects/update-field", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              airtable_project_id: project.airtable_project_id,
              field_name: "Measurement date",
              field_value: (updates.measurement_date as string).slice(0, 10),
            }),
          }).catch(() => console.warn("Airtable measurement_date sync failed"));
        }

        await onRefetch();
        toast.success("Guardado");
        trackEventWithDevice("Architect Task Saved", {
          project_id: project.id,
          field,
          phase: archPhase,
        });
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al guardar");
      } finally {
        setSavingField(null);
      }
    },
    [supabase, project.id, project.airtable_project_id, onRefetch, archPhase]
  );

  if (archPhase === "arch-completed") {
    return (
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Tareas</h2>
        <p className="text-muted-foreground text-sm">
          Proyecto finalizado. No hay tareas pendientes.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold">Tareas</h2>
      </div>

      <div className="divide-y">
        {/* M2 usables - only in Pendiente de Medición */}
        {archPhase === "arch-pending-measurement" && (
          <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">Metros cuadrados usables</span>
              </div>
              <div className="flex-shrink-0 w-56 flex items-center gap-2">
                {savingField === "usable_square_meters" && (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
                )}
                <Input
                  type="number"
                  className="h-8 text-sm flex-1"
                  placeholder="ej 220"
                  defaultValue={p.usable_square_meters != null ? String(p.usable_square_meters) : ""}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const newVal = raw ? parseFloat(raw) : null;
                    const current = p.usable_square_meters ?? null;
                    if (newVal !== current) {
                      saveField("usable_square_meters", newVal);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Notes - all phases except completed */}
        <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Notas Referentes al proyecto</span>
              {savingField === "architect_notes" && (
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
              )}
            </div>
            <Textarea
              className="text-sm min-h-[100px] resize-y"
              placeholder="Escribe notas sobre el proyecto..."
              defaultValue={p.architect_notes ?? ""}
              onBlur={(e) => {
                const newVal = e.target.value.trim() || null;
                const current = p.architect_notes ?? null;
                if (newVal !== current) {
                  saveField("architect_notes", newVal);
                }
              }}
            />
          </div>
        </div>

        {/* Attachments - phases 2, 3, 4 (not pending-measurement, not completed) */}
        {archPhase !== "arch-pending-measurement" && (() => {
          const attachmentTitle =
            archPhase === "arch-preliminary-project" ? "Anteproyecto" :
            archPhase === "arch-technical-project" ? "Proyecto" :
            archPhase === "arch-technical-adjustments" ? "Proyecto con Ajustes técnicos" :
            "Documentos adjuntos";
          return (
          <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">{attachmentTitle}</span>
              <AttachmentUploadField
                projectId={project.id}
                field="architect_attachments"
                value={p.architect_attachments}
                onRefetch={onRefetch}
              />
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
