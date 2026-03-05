"use client";

import { useState, useCallback, useRef, DragEvent } from "react";
import { Loader2, FileUp, Clock, CheckCircle2, AlertTriangle, Info, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { trackEventWithDevice } from "@/lib/mixpanel";
import type { ProjectRow } from "@/hooks/useSupabaseProject";
import { AttachmentViewer } from "@/components/reno/attachment-viewer";
import { CheckProForm } from "@/components/reno/check-pro-form";
import type { CheckProData } from "@/components/reno/check-pro-form";
import { cn } from "@/lib/utils";

type ArchitectPhase =
  | "arch-pending-measurement"
  | "arch-preliminary-project"
  | "arch-pending-validation"
  | "arch-technical-project"
  | "arch-ecu-first-validation"
  | "arch-technical-adjustments"
  | "arch-ecu-final-validation"
  | "arch-obra-empezar"
  | "arch-completed";

function hasValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  return !!v;
}

function getArchitectPhase(project: ProjectRow): ArchitectPhase {
  const pa = project as any;
  const statusRaw = (pa.project_status ?? project.reno_phase ?? "") as string;
  const status = statusRaw.trim().toLowerCase();

  const ADVANCED_STATUSES: Record<string, ArchitectPhase> = {
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

/* ------------------------------------------------------------------ */
/*  Drag-and-drop attachment upload                                     */
/* ------------------------------------------------------------------ */

function AttachmentUploadField({
  projectId,
  field,
  value,
  onRefetch,
  onUploadComplete,
  description,
}: {
  projectId: string;
  field: string;
  value: unknown;
  onRefetch: () => Promise<void>;
  onUploadComplete?: () => void;
  description?: string;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const safeName = file.name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `architect/${projectId}/${field}/${Date.now()}-${safeName}`;
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
      trackEventWithDevice("Architect Attachment Uploaded", { project_id: projectId, field, filename: file.name });
      onUploadComplete?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
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
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors",
          isDragging
            ? "border-[var(--prophero-blue-500)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]/20"
            : "border-border hover:border-muted-foreground/40 hover:bg-muted/30",
          uploading && "pointer-events-none opacity-60",
        )}
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
              <span className="text-sm font-medium text-[var(--prophero-blue-500)]">Haz clic para subir</span>
              <span className="text-sm text-muted-foreground"> o arrastra aquí</span>
            </div>
            {description ? (
              <span className="text-xs text-muted-foreground">{description}</span>
            ) : (
              <span className="text-xs text-muted-foreground">PDF, DOC, XLS, DWG, imágenes</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Read-only info banner                                               */
/* ------------------------------------------------------------------ */

function ReadOnlyBanner({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40 border border-border">
      {icon ?? <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Upload section with title                                           */
/* ------------------------------------------------------------------ */

function UploadSection({
  title,
  description,
  projectId,
  field,
  value,
  onRefetch,
  onUploadComplete,
}: {
  title: string;
  description?: string;
  projectId: string;
  field: string;
  value: unknown;
  onRefetch: () => Promise<void>;
  onUploadComplete?: () => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{title}</span>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <AttachmentUploadField
        projectId={projectId}
        field={field}
        value={value}
        onRefetch={onRefetch}
        onUploadComplete={onUploadComplete}
        description={description}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Phase-specific renders                                              */
/* ------------------------------------------------------------------ */

function PhaseMedicion({
  project,
  saveField,
  savingField,
}: {
  project: ProjectRow;
  saveField: (field: string, value: unknown) => Promise<void>;
  savingField: string | null;
}) {
  const p = project as any;

  return (
    <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground">Fecha de Medición</span>
        </div>
        <div className="flex-shrink-0 w-56 flex items-center gap-2">
          {savingField === "measurement_date" && (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
          )}
          <Input
            type="date"
            className="h-8 text-sm flex-1"
            defaultValue={(() => {
              if (!p.measurement_date) return "";
              try { return new Date(p.measurement_date).toISOString().slice(0, 10); } catch { return ""; }
            })()}
            onChange={(e) => {
              const val = e.target.value;
              saveField("measurement_date", val ? new Date(val).toISOString() : null);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PhaseAnteproyecto({
  project,
  onRefetch,
}: {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
}) {
  const p = project as any;
  const supabase = createClient();
  const [sending, setSending] = useState(false);
  const latestCheckProRef = useRef<CheckProData | null>((p.check_pro_data as CheckProData | null) ?? null);

  const hasAttachment = hasValue(p.architect_attachments);
  const hasCheckPro = hasValue(p.check_pro_data) || hasValue(latestCheckProRef.current);
  const canSend = hasAttachment && hasCheckPro;

  const handleSendToPropHero = async () => {
    setSending(true);
    try {
      // 1. Save latest Check Pro data first
      if (latestCheckProRef.current) {
        const { error: saveErr } = await supabase
          .from("projects")
          .update({ check_pro_data: latestCheckProRef.current, updated_at: new Date().toISOString() })
          .eq("id", project.id);
        if (saveErr) throw new Error(saveErr.message);
      }

      // 2. Generate Check Pro HTML report (uses freshly saved data)
      const reportRes = await fetch("/api/check-pro/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      if (!reportRes.ok) {
        const errData = await reportRes.json().catch(() => ({}));
        console.warn("Check Pro report generation failed:", errData);
      }

      // 3. Mark as sent
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("projects")
        .update({ project_architect_date: now, updated_at: now })
        .eq("id", project.id);
      if (error) throw new Error(error.message);

      if (project.airtable_project_id) {
        fetch("/api/airtable/projects/update-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            airtable_project_id: project.airtable_project_id,
            field_name: "Project end date",
            field_value: now.slice(0, 10),
          }),
        }).catch(() => console.warn("Airtable project_architect_date sync failed"));
      }

      await onRefetch();
      toast.success("Anteproyecto enviado a PropHero");
      trackEventWithDevice("Architect Send To PropHero", { project_id: project.id });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-0 divide-y">
      <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
        <UploadSection
          title="Plano de anteproyecto"
          projectId={project.id}
          field="architect_attachments"
          value={p.architect_attachments}
          onRefetch={onRefetch}
          onUploadComplete={() => {
            if (!p.project_draft_date) {
              const now = new Date().toISOString();
              supabase
                .from("projects")
                .update({ project_draft_date: now, updated_at: now })
                .eq("id", project.id)
                .then(() => onRefetch());
              if (project.airtable_project_id) {
                fetch("/api/airtable/projects/update-field", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    airtable_project_id: project.airtable_project_id,
                    field_name: "Project draft date",
                    field_value: now.slice(0, 10),
                  }),
                }).catch(() => console.warn("Airtable project_draft_date sync failed"));
              }
            }
          }}
        />
      </div>

      <div className="px-6 py-4">
        <CheckProForm
          projectId={project.id}
          initialData={(p.check_pro_data as CheckProData | null) ?? null}
          onRefetch={onRefetch}
          onDataChange={(d) => { latestCheckProRef.current = d; }}
        />
      </div>

      <div className="px-6 py-5">
        <button
          onClick={handleSendToPropHero}
          disabled={!canSend || sending}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
            canSend
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Enviar a PropHero
        </button>
        {!canSend && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            {!hasAttachment && !hasCheckPro
              ? "Sube el plano de anteproyecto y completa el Check Pro para enviar"
              : !hasAttachment
                ? "Sube el plano de anteproyecto para poder enviar"
                : "Completa el Check Pro para poder enviar"}
          </p>
        )}
      </div>
    </div>
  );
}

function PhaseProyectoTecnico({
  project,
  onRefetch,
}: {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
}) {
  const p = project as any;
  const supabase = createClient();
  const [confirming, setConfirming] = useState(false);

  const hasProjectDoc = hasValue(p.arch_project_doc);

  const handleConfirmUpload = async () => {
    setConfirming(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("projects")
        .update({ project_end_date: now, updated_at: now })
        .eq("id", project.id);
      if (error) throw new Error(error.message);

      if (project.airtable_project_id) {
        fetch("/api/airtable/projects/update-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            airtable_project_id: project.airtable_project_id,
            field_name: "Project end date",
            field_value: now.slice(0, 10),
          }),
        }).catch(() => console.warn("Airtable project_end_date sync failed"));
      }

      await onRefetch();
      toast.success("Proyecto entregado a PropHero");
      trackEventWithDevice("Architect Deliver Project", { project_id: project.id });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al confirmar");
    } finally {
      setConfirming(false);
    }
  };

  const alreadyConfirmed = p.project_end_date != null;

  return (
    <div className="space-y-0 divide-y">
      <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
        <UploadSection
          title="Mediciones"
          description="Formato editable finalizados"
          projectId={project.id}
          field="arch_measurements_doc"
          value={p.arch_measurements_doc}
          onRefetch={onRefetch}
        />
      </div>
      <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
        <UploadSection
          title="Proyecto"
          description="PDF del proyecto (se permiten múltiples archivos)"
          projectId={project.id}
          field="arch_project_doc"
          value={p.arch_project_doc}
          onRefetch={onRefetch}
        />
      </div>
      <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
        <UploadSection
          title="Proyecto CAD"
          description="Plantas, alzados y secciones"
          projectId={project.id}
          field="arch_project_cad_doc"
          value={p.arch_project_cad_doc}
          onRefetch={onRefetch}
        />
      </div>
      <div className="px-6 py-5">
        {alreadyConfirmed ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Proyecto entregado el{" "}
              {new Date(p.project_end_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        ) : (
          <>
            <button
              onClick={handleConfirmUpload}
              disabled={!hasProjectDoc || confirming}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                hasProjectDoc
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Entregar proyecto a PropHero
            </button>
            {!hasProjectDoc && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Sube al menos el PDF del proyecto para poder entregar
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PhaseAjustesTecnicos({
  project,
  onRefetch,
  saveField,
  savingField,
}: {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
  saveField: (field: string, value: unknown) => Promise<void>;
  savingField: string | null;
}) {
  const p = project as any;
  const supabase = createClient();
  const [confirming, setConfirming] = useState(false);

  const maturationNotes = p.ecu_validation_notes || p.ecu_reparos_notes || null;
  const maturationDocs = p.ecu_reparos_doc;

  const hasCorrectedDoc = hasValue(p.arch_corrected_project_doc);
  const alreadySent = p.arch_correction_date != null;

  const handleSendToPropHero = async () => {
    setConfirming(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("projects")
        .update({ arch_correction_date: now, updated_at: now })
        .eq("id", project.id);
      if (error) throw new Error(error.message);

      await onRefetch();
      toast.success("Correcciones enviadas a PropHero");
      trackEventWithDevice("Architect Send Corrections", { project_id: project.id });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al confirmar");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-0 divide-y">
      {(maturationNotes || maturationDocs) && (
        <div className="px-6 py-4 bg-amber-50/50 dark:bg-amber-950/10">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Notas del equipo de PropHero</span>
          </div>
          {maturationNotes && (
            <p className="text-sm text-foreground/80 whitespace-pre-wrap mb-3">{maturationNotes}</p>
          )}
          {maturationDocs && <AttachmentViewer value={maturationDocs} />}
        </div>
      )}

      <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
        <UploadSection
          title="Proyecto corregido"
          description="PDF del proyecto con las correcciones aplicadas"
          projectId={project.id}
          field="arch_corrected_project_doc"
          value={p.arch_corrected_project_doc}
          onRefetch={onRefetch}
        />
      </div>

      <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
        <UploadSection
          title="Mediciones corregidas"
          description="Formato editable finalizados"
          projectId={project.id}
          field="arch_corrected_measurements_doc"
          value={p.arch_corrected_measurements_doc}
          onRefetch={onRefetch}
        />
      </div>

      <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Notas referentes al proyecto</span>
            {savingField === "architect_notes" && (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            )}
          </div>
          <Textarea
            className="text-sm min-h-[100px] resize-y"
            placeholder="Escribe notas sobre las correcciones..."
            defaultValue={p.architect_notes ?? ""}
            onBlur={(e) => {
              const newVal = e.target.value.trim() || null;
              if (newVal !== (p.architect_notes ?? null)) {
                saveField("architect_notes", newVal);
              }
            }}
          />
        </div>
      </div>

      <div className="px-6 py-5">
        {alreadySent ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Correcciones enviadas el{" "}
              {new Date(p.arch_correction_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        ) : (
          <>
            <button
              onClick={handleSendToPropHero}
              disabled={!hasCorrectedDoc || confirming}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                hasCorrectedDoc
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar correcciones a PropHero
            </button>
            {!hasCorrectedDoc && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Sube al menos el PDF del proyecto corregido para poder enviar
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PhaseObraEmpezar({
  project,
  onRefetch,
}: {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
}) {
  const p = project as any;

  return (
    <div className="space-y-0 divide-y">
      <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
        <UploadSection
          title="Documentación de seguridad y salud"
          projectId={project.id}
          field="arch_safety_doc"
          value={p.arch_safety_doc}
          onRefetch={onRefetch}
        />
      </div>
      <div className="px-6 py-4 hover:bg-muted/30 transition-colors">
        <UploadSection
          title="Acta de aprobación"
          projectId={project.id}
          field="arch_approval_doc"
          value={p.arch_approval_doc}
          onRefetch={onRefetch}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

interface ArchitectTaskListProps {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
}

export function ArchitectTaskList({ project, onRefetch }: ArchitectTaskListProps) {
  const archPhase = getArchitectPhase(project);
  const [savingField, setSavingField] = useState<string | null>(null);
  const supabase = createClient();

  const saveField = useCallback(
    async (field: string, value: unknown) => {
      setSavingField(field);
      try {
        const updates: Record<string, unknown> = {
          [field]: value,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("projects")
          .update(updates)
          .eq("id", project.id);
        if (error) throw new Error(error.message);

        if (field === "measurement_date" && project.airtable_project_id && value) {
          fetch("/api/airtable/projects/update-field", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              airtable_project_id: project.airtable_project_id,
              field_name: "Measurement date",
              field_value: (value as string).slice(0, 10),
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
    [supabase, project.id, project.airtable_project_id, onRefetch, archPhase],
  );

  const renderPhaseContent = () => {
    switch (archPhase) {
      case "arch-pending-measurement":
        return <PhaseMedicion project={project} saveField={saveField} savingField={savingField} />;

      case "arch-preliminary-project":
        return <PhaseAnteproyecto project={project} onRefetch={onRefetch} />;

      case "arch-pending-validation":
        return (
          <div className="px-6 py-6">
            <ReadOnlyBanner
              message="Proyecto pendiente de revisión por el equipo de PropHero. ¡Te avisaremos cuando esté revisado!"
              icon={<Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />}
            />
          </div>
        );

      case "arch-technical-project":
        return <PhaseProyectoTecnico project={project} onRefetch={onRefetch} />;

      case "arch-ecu-first-validation":
        return (
          <div className="px-6 py-6">
            <ReadOnlyBanner
              message="Proyecto en primera validación ECU. No hay tareas activas para el arquitecto en esta fase."
              icon={<Clock className="h-5 w-5 text-blue-500 flex-shrink-0" />}
            />
          </div>
        );

      case "arch-technical-adjustments":
        return (
          <PhaseAjustesTecnicos
            project={project}
            onRefetch={onRefetch}
            saveField={saveField}
            savingField={savingField}
          />
        );

      case "arch-ecu-final-validation":
        return (
          <div className="px-6 py-6">
            <ReadOnlyBanner
              message="Proyecto en validación final ECU. El estado de la validación se gestiona desde el equipo de PropHero."
              icon={<Clock className="h-5 w-5 text-blue-500 flex-shrink-0" />}
            />
          </div>
        );

      case "arch-obra-empezar":
        return <PhaseObraEmpezar project={project} onRefetch={onRefetch} />;

      case "arch-completed":
        return (
          <div className="px-6 py-6">
            <ReadOnlyBanner
              message="Proyecto finalizado. No hay tareas pendientes."
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold">Tareas</h2>
      </div>
      {renderPhaseContent()}
    </div>
  );
}
