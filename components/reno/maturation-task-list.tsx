"use client";

import { useState, useCallback, useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { trackEventWithDevice } from "@/lib/mixpanel";
import type { ProjectRow } from "@/hooks/useSupabaseProject";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { AttachmentViewer } from "@/components/reno/attachment-viewer";

interface TaskDef {
  key: string;
  label: string;
  type: "text" | "date" | "boolean" | "attachment";
  field: string;
}

const TASKS_PHASES_1_3: TaskDef[] = [
  { key: "architect", label: "Definir Arquitecto", type: "text", field: "architect" },
  { key: "excluded_from_ecu", label: "Excluido de ECU", type: "boolean", field: "excluded_from_ecu" },
  { key: "draft_order_date", label: "Draft Order Date", type: "date", field: "draft_order_date" },
  { key: "measurement_date", label: "Measurement Date", type: "date", field: "measurement_date" },
  { key: "project_draft_date", label: "Project Draft Date", type: "date", field: "project_draft_date" },
  { key: "draft_plan", label: "Draft Plan", type: "attachment", field: "draft_plan" },
];

const TASKS_PHASE_4_BASE: TaskDef[] = [
  { key: "project_start_date", label: "Project Start Date", type: "date", field: "project_start_date" },
  { key: "estimated_project_end_date", label: "Estimated Project End Date", type: "date", field: "estimated_project_end_date" },
  { key: "project_end_date", label: "Project End Date", type: "date", field: "project_end_date" },
];

const TASK_ECU_CONTACT: TaskDef = { key: "ecu_contact", label: "ECU Contact", type: "text", field: "ecu_contact" };

const TASKS_PHASES_5_7: TaskDef[] = [
  { key: "ecu_delivery_date", label: "ECU Delivery Date", type: "date", field: "ecu_delivery_date" },
  { key: "estimated_first_correction_date", label: "Estimated First Correction Date", type: "date", field: "estimated_first_correction_date" },
  { key: "first_correction_date", label: "First Correction Date", type: "date", field: "first_correction_date" },
  { key: "definitive_validation_date", label: "Definitive Validation Date", type: "date", field: "definitive_validation_date" },
  { key: "technical_project_doc", label: "Technical Project Doc", type: "attachment", field: "technical_project_doc" },
  { key: "final_plan", label: "Final Plan", type: "attachment", field: "final_plan" },
  { key: "license_attachment", label: "License Attachment", type: "attachment", field: "license_attachment" },
];

const PHASES_1_3: RenoKanbanPhase[] = [
  "get-project-draft",
  "pending-to-validate",
  "pending-to-reserve-arras",
];

const PHASES_5_7: RenoKanbanPhase[] = [
  "ecuv-first-validation",
  "technical-project-fine-tuning",
  "ecuv-final-validation",
];

function getTasksForPhase(phase: RenoKanbanPhase, project: ProjectRow): TaskDef[] {
  if (PHASES_1_3.includes(phase)) return TASKS_PHASES_1_3;

  if (phase === "technical-project-in-progress") {
    const excludedFromEcu = project.excluded_from_ecu === true;
    const tasks = excludedFromEcu ? [] : [TASK_ECU_CONTACT];
    return [...tasks, ...TASKS_PHASE_4_BASE];
  }

  if (PHASES_5_7.includes(phase)) return TASKS_PHASES_5_7;

  if (phase === "pending-budget-from-renovator") return [];

  return [];
}

function getFieldValue(project: ProjectRow, field: string): unknown {
  return (project as any)[field] ?? null;
}

function formatDateForInput(value: unknown): string {
  if (!value || typeof value !== "string") return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
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
      const filePath = `maturation/${projectId}/${field}/${Date.now()}-${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from("project-attachments")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from("project-attachments")
        .getPublicUrl(data.path);

      const newAttachment = {
        url: urlData.publicUrl,
        filename: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
      };

      const existing = Array.isArray(value) ? value : [];
      const updated = [...existing, newAttachment];

      const { error: updateError } = await supabase
        .from("projects")
        .update({ [field]: updated, updated_at: new Date().toISOString() })
        .eq("id", projectId);

      if (updateError) throw new Error(updateError.message);

      await onRefetch();
      toast.success("Documento subido");
      trackEventWithDevice("Maturation Attachment Uploaded", {
        project_id: projectId,
        field,
        file_type: file.type,
        file_size: file.size,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <AttachmentViewer value={value} />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 text-xs text-[var(--prophero-blue-500)] hover:text-[var(--prophero-blue-600)] font-medium disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {uploading ? "Subiendo..." : "Subir documento"}
      </button>
    </div>
  );
}

interface MaturationTaskListProps {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
}

export function MaturationTaskList({ project, onRefetch }: MaturationTaskListProps) {
  const phase = (project.reno_phase ?? "get-project-draft") as RenoKanbanPhase;
  const tasks = getTasksForPhase(phase, project);
  const [savingField, setSavingField] = useState<string | null>(null);
  const supabase = createClient();

  const saveField = useCallback(
    async (field: string, value: unknown) => {
      setSavingField(field);
      try {
        const { error } = await supabase
          .from("projects")
          .update({ [field]: value, updated_at: new Date().toISOString() })
          .eq("id", project.id);
        if (error) throw new Error(error.message);
        await onRefetch();
        toast.success("Guardado");
        trackEventWithDevice("Maturation Task Saved", {
          project_id: project.id,
          field,
          phase: project.reno_phase,
        });
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al guardar");
      } finally {
        setSavingField(null);
      }
    },
    [supabase, project.id, onRefetch]
  );

  if (tasks.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Tareas</h2>
        <p className="text-muted-foreground text-sm">
          No hay tareas definidas para esta fase.
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
        {tasks.map((task) => {
          const isSaving = savingField === task.field;
          const isAttachment = task.type === "attachment";

          return (
            <div
              key={task.key}
              className="px-6 py-4 hover:bg-muted/30 transition-colors"
            >
              {isAttachment ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{task.label}</span>
                    {isSaving && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
                  </div>
                  <AttachmentUploadField
                    projectId={project.id}
                    field={task.field}
                    value={getFieldValue(project, task.field)}
                    onRefetch={onRefetch}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">{task.label}</span>
                  </div>

                  <div className="flex-shrink-0 w-56 flex items-center gap-2">
                    {isSaving && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />}

                    {task.type === "text" && (
                      <Input
                        className="h-8 text-sm flex-1"
                        placeholder="Sin definir"
                        defaultValue={String(getFieldValue(project, task.field) ?? "")}
                        onBlur={(e) => {
                          const newVal = e.target.value.trim() || null;
                          const current = getFieldValue(project, task.field);
                          if (newVal !== (current ?? null)) {
                            saveField(task.field, newVal);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                      />
                    )}

                    {task.type === "date" && (
                      <Input
                        type="date"
                        className="h-8 text-sm flex-1"
                        defaultValue={formatDateForInput(getFieldValue(project, task.field))}
                        onChange={(e) => {
                          const val = e.target.value;
                          saveField(task.field, val ? new Date(val).toISOString() : null);
                        }}
                      />
                    )}

                    {task.type === "boolean" && (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={getFieldValue(project, task.field) === true}
                          onCheckedChange={(checked) => saveField(task.field, checked)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {getFieldValue(project, task.field) === true ? "Sí" : "No"}
                        </span>
                      </div>
                    )}
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
