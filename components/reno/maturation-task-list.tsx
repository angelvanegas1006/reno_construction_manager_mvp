"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, PencilRuler, AlertTriangle, CheckCircle2, FileText, ExternalLink, Paperclip, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { trackEventWithDevice } from "@/lib/mixpanel";
import type { ProjectRow } from "@/hooks/useSupabaseProject";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { AttachmentViewer } from "@/components/reno/attachment-viewer";
import { ArchitectSelectorModal } from "@/components/reno/architect-selector-modal";
import { EcuContactSelectorModal } from "@/components/reno/ecu-contact-selector-modal";
import { PdfViewer } from "@/components/reno/pdf-viewer";
import { cn } from "@/lib/utils";
import { insertArchitectNotification } from "@/hooks/useArchitectNotifications";
import { sendArchitectEmailAlert } from "@/lib/webhook/architect-email-alert";

/* ------------------------------------------------------------------ */
/*  Task definitions                                                   */
/* ------------------------------------------------------------------ */

interface TaskDef {
  key: string;
  label: string;
  type:
    | "text"
    | "date"
    | "boolean"
    | "attachment"
    | "architect-selector"
    | "ecu-contact-selector"
    | "readonly-date"
    | "inverted-boolean"
    | "checkbox"
    | "textarea";
  field: string;
}

/* -- Fase 1: Get Project Draft ------------------------------------ */
const TASKS_GET_PROJECT_DRAFT: TaskDef[] = [
  { key: "architect", label: "Asignación de Arquitecto", type: "architect-selector", field: "architect" },
  { key: "has_eq", label: "¿El proyecto necesita ECU?", type: "inverted-boolean", field: "excluded_from_ecu" },
  { key: "draft_order_date", label: "Fecha de Encargo Anteproyecto", type: "readonly-date", field: "draft_order_date" },
];

/* -- Fase 2: Pendiente de Validación ------------------------------ */
const TASKS_PENDING_TO_VALIDATE: TaskDef[] = [
  { key: "has_eq", label: "¿El proyecto necesita ECU?", type: "inverted-boolean", field: "excluded_from_ecu" },
  { key: "project_review_done", label: "Revisión del proyecto", type: "checkbox", field: "project_review_done" },
  { key: "financial_review_done", label: "Revisar financial", type: "checkbox", field: "financial_review_done" },
];

/* -- Fase 3: Proyecto Técnico en Progreso ------------------------- */
const TASKS_TECHNICAL_PROJECT_BASE: TaskDef[] = [
  { key: "ecu_uploaded", label: "¿Se ha subido a la EQ?", type: "checkbox", field: "ecu_uploaded" },
  { key: "project_start_date", label: "Fecha de Inicio del Proyecto", type: "date", field: "project_start_date" },
  { key: "estimated_project_end_date", label: "Fecha Estimada de Fin del Proyecto", type: "date", field: "estimated_project_end_date" },
  { key: "project_end_date", label: "Fecha de Fin del Proyecto", type: "date", field: "project_end_date" },
];

const TASK_ECU_CONTACT: TaskDef = { key: "ecu_contact", label: "Contacto ECU", type: "text", field: "ecu_contact" };

/* -- Fase 4: ECU Primera Validación ------------------------------- */
const TASKS_ECU_FIRST: TaskDef[] = [];

/* -- Fase 5: Ajuste Proyecto Técnico ------------------------------ */
const TASKS_FINE_TUNING: TaskDef[] = [
  { key: "ecu_reuploaded", label: "¿Se ha vuelto a subir a la EQ?", type: "checkbox", field: "ecu_reuploaded" },
];

/* -- Fases 5-7 shared dates -------------------------------------- */
const TASKS_PHASES_5_7_DATES: TaskDef[] = [
  { key: "ecu_delivery_date", label: "Fecha de Entrega ECU", type: "date", field: "ecu_delivery_date" },
  { key: "estimated_first_correction_date", label: "Fecha Est. Primera Corrección", type: "date", field: "estimated_first_correction_date" },
  { key: "first_correction_date", label: "Fecha de Primera Corrección", type: "date", field: "first_correction_date" },
  { key: "definitive_validation_date", label: "Fecha de Validación Definitiva", type: "date", field: "definitive_validation_date" },
];

/* ------------------------------------------------------------------ */
/*  Phase -> task mapping                                              */
/* ------------------------------------------------------------------ */

function getTasksForPhase(phase: RenoKanbanPhase, project: ProjectRow): TaskDef[] {
  switch (phase) {
    case "get-project-draft":
      return TASKS_GET_PROJECT_DRAFT;

    case "pending-to-validate":
    case "pending-to-reserve-arras":
      return TASKS_PENDING_TO_VALIDATE;

    case "technical-project-in-progress":
      return [];

    case "ecuv-first-validation":
      return TASKS_ECU_FIRST;

    case "technical-project-fine-tuning":
      return [];

    case "ecuv-final-validation":
      return [];

    default:
      return [];
  }
}

function shouldShowTechnicalProjectDocs(phase: RenoKanbanPhase): boolean {
  return phase === "technical-project-in-progress";
}

function shouldShowEcuFirstBlock(phase: RenoKanbanPhase): boolean {
  return phase === "ecuv-first-validation";
}

function shouldShowFineTuningBlock(phase: RenoKanbanPhase): boolean {
  return phase === "technical-project-fine-tuning";
}

function shouldShowBudgetBlock(phase: RenoKanbanPhase): boolean {
  return phase === "ecuv-first-validation" || phase === "technical-project-fine-tuning" || phase === "pending-budget-from-renovator";
}

function shouldShowEcuValidationFlow(phase: RenoKanbanPhase): boolean {
  return phase === "ecuv-final-validation";
}

const ECU_CONTACT_PHASES: RenoKanbanPhase[] = [
  "get-project-draft",
  "pending-to-validate",
  "pending-to-reserve-arras",
  "technical-project-in-progress",
  "ecuv-first-validation",
  "technical-project-fine-tuning",
  "ecuv-final-validation",
];

function shouldShowEcuContactTask(phase: RenoKanbanPhase, project: ProjectRow): boolean {
  const p = project as any;
  const hasEcu = p.excluded_from_ecu !== true;
  const missingContact = !p.ecu_contact || String(p.ecu_contact).trim() === "";
  return hasEcu && missingContact && ECU_CONTACT_PHASES.includes(phase);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Architect Deliverables Block (for Pendiente de Validación)         */
/* ------------------------------------------------------------------ */

function ArchitectDeliverablesBlock({ project }: { project: ProjectRow }) {
  const p = project as any;
  const attachments = p.architect_attachments;
  const reportUrl = p.check_pro_report_url as string | null;
  const hasAttachments = attachments != null &&
    (Array.isArray(attachments) ? attachments.length > 0 : !!attachments);

  const [viewingPdf, setViewingPdf] = useState<string | null>(null);

  if (!hasAttachments && !reportUrl) return null;

  const attachmentList: { url: string; filename: string }[] = Array.isArray(attachments)
    ? attachments
    : [];

  const pdfAttachments = attachmentList.filter(
    (a) => /\.pdf(\?|$)/i.test(a.url) || /\.pdf$/i.test(a.filename)
  );
  const nonPdfAttachments = attachmentList.filter(
    (a) => !/\.pdf(\?|$)/i.test(a.url) && !/\.pdf$/i.test(a.filename)
  );

  return (
    <div className="mx-6 my-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/10">
      <div className="px-4 py-3 border-b bg-blue-50/80 dark:bg-blue-950/20 rounded-t-lg">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-300">
          <PencilRuler className="h-4 w-4" />
          Documentación del Arquitecto
        </h3>
      </div>
      <div className="px-4 py-3 space-y-4">
        {/* PDF documents with inline viewer */}
        {pdfAttachments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Planos de Anteproyecto</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {pdfAttachments.map((att, i) => (
                <button
                  key={i}
                  onClick={() => setViewingPdf(viewingPdf === att.url ? null : att.url)}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                    viewingPdf === att.url
                      ? "bg-blue-100 border-blue-300 text-blue-800"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{att.filename}</span>
                </button>
              ))}
            </div>
            {viewingPdf && (
              <div className="mt-2 rounded-lg overflow-hidden border">
                <PdfViewer fileUrl={viewingPdf} fileName="plano.pdf" />
              </div>
            )}
          </div>
        )}

        {/* Non-PDF attachments */}
        {nonPdfAttachments.length > 0 && (
          <div className="space-y-2">
            {pdfAttachments.length === 0 && (
              <div className="flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Planos de Anteproyecto</span>
              </div>
            )}
            <AttachmentViewer value={nonPdfAttachments} />
          </div>
        )}

        {/* Check Pro report */}
        {reportUrl && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Informe Check Pro</span>
            </div>
            <button
              onClick={() => window.open(`/api/proxy-html?url=${encodeURIComponent(reportUrl)}`, "_blank")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-sm font-medium text-blue-700 transition-colors shadow-sm"
            >
              <FileText className="h-4 w-4" />
              Ver informe Check Pro
              <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-60" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Request Project Button (Pendiente de Validación → Proyecto Técnico)*/
/* ------------------------------------------------------------------ */

function RequestProjectButton({
  project,
  onRefetch,
}: {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [moving, setMoving] = useState(false);
  const p = project as any;

  const reviewDone = p.project_review_done === true;
  const financialDone = p.financial_review_done === true;
  const canRequest = reviewDone && financialDone;

  if (!canRequest) return null;

  const handleRequest = async () => {
    setMoving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("projects")
        .update({
          reno_phase: "technical-project-in-progress",
          project_status: "Technical project in progress",
          draft_validation_date: now,
          updated_at: now,
        })
        .eq("id", project.id);

      if (error) throw new Error(error.message);

      if (project.airtable_project_id) {
        fetch("/api/airtable/projects/update-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            airtable_project_id: project.airtable_project_id,
            field_name: "Project status",
            field_value: "Technical project in progress",
          }),
        }).catch(() => console.warn("Airtable phase sync failed"));
      }

      if (p.architect) {
        insertArchitectNotification({
          projectId: project.id,
          architectName: p.architect,
          type: "phase_advance",
          message: `El proyecto "${project.name || project.project_unique_id}" ha pasado a Proyecto Técnico en Progreso. ¡Es tu turno!`,
        }).catch(() => {});

        const deadlineDate28 = new Date(Date.now() + 28 * 86400000).toISOString().split("T")[0];
        sendArchitectEmailAlert({
          alertType: "project_confirmation",
          architectName: p.architect,
          projectName: project.name || project.project_unique_id || "",
          areaCluster: p.area_cluster,
          architectFee: p.architect_fee ?? null,
          deadlineDate: deadlineDate28,
        }).then((r) => {
          if (!r.success) toast.error(r.error ?? "Error al enviar email al arquitecto");
        });
      }

      toast.success("Proyecto solicitado al arquitecto");
      trackEventWithDevice("Maturation Request Project", {
        project_id: project.id,
        from: project.reno_phase,
        to: "technical-project-in-progress",
      });
      await onRefetch();
      router.push("/reno/maturation-analyst/kanban");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al solicitar proyecto");
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="px-6 py-5 border-t">
      <button
        onClick={handleRequest}
        disabled={moving}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
      >
        {moving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Solicitar proyecto al arquitecto
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Technical Project Docs Block (Proyecto Técnico en Progreso)        */
/* ------------------------------------------------------------------ */

function TechnicalProjectDocsBlock({
  project,
  onRefetch,
}: {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
}) {
  const p = project as any;
  const router = useRouter();
  const supabase = createClient();
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const docSections = [
    { label: "Mediciones", value: p.arch_measurements_doc },
    { label: "Proyecto (PDF)", value: p.arch_project_doc },
    { label: "Proyecto CAD", value: p.arch_project_cad_doc },
  ];

  const deliveryDate = p.project_end_date;
  const hasProjectDoc = (() => {
    const v = p.arch_project_doc;
    return v != null && (Array.isArray(v) ? v.length > 0 : !!v);
  })();
  const hasDocs = docSections.some((s) => {
    const v = s.value;
    return v != null && (Array.isArray(v) ? v.length > 0 : !!v);
  });

  const handleAdvanceToEcu = async () => {
    setAdvancing(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("projects")
        .update({
          reno_phase: "ecuv-first-validation",
          project_status: "Ecu first validation",
          ecu_first_start_date: now,
          updated_at: now,
        })
        .eq("id", project.id);
      if (error) throw new Error(error.message);

      if (project.airtable_project_id) {
        fetch("/api/airtable/projects/update-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            airtable_project_id: project.airtable_project_id,
            field_name: "Project status",
            field_value: "Ecu first validation",
          }),
        }).catch(() => console.warn("Airtable phase sync failed"));
      }

      toast.success("Proyecto movido a ECU Primera Validación");
      trackEventWithDevice("Maturation Advance to ECU", {
        project_id: project.id,
        from: "technical-project-in-progress",
        to: "ecuv-first-validation",
      });
      await onRefetch();
      router.push("/reno/maturation-analyst/kanban");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al avanzar de fase");
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="mx-6 my-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/10">
      <div className="px-4 py-3 border-b bg-blue-50/80 dark:bg-blue-950/20 rounded-t-lg">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-300">
          <PencilRuler className="h-4 w-4" />
          Documentación del Proyecto Técnico
        </h3>
        {deliveryDate && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Entregado el {new Date(deliveryDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        )}
      </div>
      <div className="px-4 py-3 space-y-4">
        {!hasDocs && !deliveryDate && (
          <p className="text-sm text-muted-foreground italic">
            El arquitecto aún no ha subido la documentación del proyecto técnico.
          </p>
        )}
        {docSections.map((section) => {
          const arr: { url: string; filename: string }[] = Array.isArray(section.value) ? section.value : [];
          if (arr.length === 0) return null;

          const pdfs = arr.filter((a) => /\.pdf(\?|$)/i.test(a.url) || /\.pdf$/i.test(a.filename));
          const others = arr.filter((a) => !/\.pdf(\?|$)/i.test(a.url) && !/\.pdf$/i.test(a.filename));

          return (
            <div key={section.label} className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{section.label}</span>
              </div>
              {pdfs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pdfs.map((att, i) => (
                    <button
                      key={i}
                      onClick={() => setViewingPdf(viewingPdf === att.url ? null : att.url)}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                        viewingPdf === att.url
                          ? "bg-blue-100 border-blue-300 text-blue-800"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{att.filename}</span>
                    </button>
                  ))}
                </div>
              )}
              {viewingPdf && pdfs.some((a) => a.url === viewingPdf) && (
                <div className="mt-2 rounded-lg overflow-hidden border">
                  <PdfViewer fileUrl={viewingPdf} fileName="proyecto.pdf" />
                </div>
              )}
              {others.length > 0 && <AttachmentViewer value={others} />}
            </div>
          );
        })}
      </div>
      {/* Advance to ECU button */}
      {hasProjectDoc && (
        <div className="px-4 py-4 border-t">
          <button
            onClick={handleAdvanceToEcu}
            disabled={advancing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {advancing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Avanzar a ECU Primera Validación
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AttachmentUploadField                                              */
/* ------------------------------------------------------------------ */

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
      const safeName = file.name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `maturation/${projectId}/${field}/${Date.now()}-${safeName}`;
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

/* ------------------------------------------------------------------ */
/*  ECU Validation Flow (Fase 6)                                       */
/* ------------------------------------------------------------------ */

function EcuValidationFlow({
  project,
  onRefetch,
}: {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const p = project as any;
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<"ok" | "ko" | null>(null);
  const [notes, setNotes] = useState<string>(p.ecu_reparos_notes ?? "");
  const [saving, setSaving] = useState(false);

  const techDoc: { url: string; filename: string }[] = Array.isArray(p.technical_project_doc) ? p.technical_project_doc : [];
  const correctedDoc: { url: string; filename: string }[] = Array.isArray(p.arch_corrected_project_doc) ? p.arch_corrected_project_doc : [];
  const allDocs = correctedDoc.length > 0 ? correctedDoc : techDoc;
  const hasDoc = allDocs.length > 0;

  const handleReject = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("projects")
        .update({
          reno_phase: "technical-project-fine-tuning",
          project_status: "Technical project fine-tuning",
          ecu_reparos_notes: notes || null,
          ecu_validation_result: "rejected",
          ecu_final_end_date: now,
          arch_correction_date: null,
          updated_at: now,
        })
        .eq("id", project.id);
      if (error) throw new Error(error.message);

      if (project.airtable_project_id) {
        fetch("/api/airtable/projects/update-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            airtable_project_id: project.airtable_project_id,
            field_name: "Project status",
            field_value: "Technical project fine-tuning",
          }),
        }).catch(() => console.warn("Airtable sync failed"));
      }

      if (p.architect) {
        insertArchitectNotification({
          projectId: project.id,
          architectName: p.architect,
          type: "phase_advance",
          message: `El proyecto "${project.name || project.project_unique_id}" requiere ajustes técnicos. PropHero ha enviado notas de corrección.`,
        }).catch(() => {});

        sendArchitectEmailAlert({
          alertType: "ecu_repairs",
          architectName: p.architect,
          projectName: project.name || project.project_unique_id || "",
          areaCluster: p.area_cluster,
        }).then((r) => {
          if (!r.success) toast.error(r.error ?? "Error al enviar email al arquitecto");
        });
      }

      toast.success("Proyecto enviado a Ajuste Proyecto Técnico");
      trackEventWithDevice("Maturation ECU Final Reject", { project_id: project.id });
      await onRefetch();
      router.push("/reno/maturation-analyst/kanban");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("projects")
        .update({
          reno_phase: "pending-budget-from-renovator",
          project_status: "Pending to budget (from renovator)",
          ecu_validation_result: "approved",
          ecu_final_end_date: now,
          updated_at: now,
        })
        .eq("id", project.id);
      if (error) throw new Error(error.message);

      if (project.airtable_project_id) {
        fetch("/api/airtable/projects/update-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            airtable_project_id: project.airtable_project_id,
            field_name: "Project status",
            field_value: "Pending to budget (from renovator)",
          }),
        }).catch(() => console.warn("Airtable sync failed"));
      }

      if (p.architect) {
        sendArchitectEmailAlert({
          alertType: "ecu_certificates_received",
          architectName: p.architect,
          projectName: project.name || project.project_unique_id || "",
          areaCluster: p.area_cluster,
          architectFee: p.architect_fee ?? null,
        }).then((r) => {
          if (!r.success) toast.error(r.error ?? "Error al enviar email al arquitecto");
        });
      }

      toast.success("Proyecto aprobado — Pendiente Presupuesto Renovador");
      trackEventWithDevice("Maturation ECU Final Approve", { project_id: project.id });
      await onRefetch();
      router.push("/reno/maturation-analyst/kanban");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="divide-y">
      <div>
        <div className="px-6 py-3 bg-muted/30">
          <h3 className="text-sm font-semibold">Tareas</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          {/* Show current project docs */}
          {allDocs.length > 0 && (() => {
            const pdfs = allDocs.filter((a) => /\.pdf(\?|$)/i.test(a.url) || /\.pdf$/i.test(a.filename));
            const others = allDocs.filter((a) => !/\.pdf(\?|$)/i.test(a.url) && !/\.pdf$/i.test(a.filename));
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {correctedDoc.length > 0 ? "Proyecto corregido" : "Documento del Proyecto"}
                  </span>
                </div>
                {pdfs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pdfs.map((att, i) => (
                      <button
                        key={i}
                        onClick={() => setViewingPdf(viewingPdf === att.url ? null : att.url)}
                        className={cn(
                          "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                          viewingPdf === att.url
                            ? "bg-blue-100 border-blue-300 text-blue-800"
                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{att.filename}</span>
                      </button>
                    ))}
                  </div>
                )}
                {viewingPdf && pdfs.some((a) => a.url === viewingPdf) && (
                  <div className="rounded-lg overflow-hidden border">
                    <PdfViewer fileUrl={viewingPdf} fileName="proyecto.pdf" />
                  </div>
                )}
                {others.length > 0 && <AttachmentViewer value={others} />}
              </div>
            );
          })()}

          {hasDoc && (
            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">
                ¿El proyecto está correctamente completado?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setValidationResult("ok")}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all",
                    validationResult === "ok"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/50"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 inline mr-1.5" />
                  Sí, correcto
                </button>
                <button
                  onClick={() => setValidationResult("ko")}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all",
                    validationResult === "ko"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50/50"
                  )}
                >
                  <AlertTriangle className="h-4 w-4 inline mr-1.5" />
                  No, necesita ajustes
                </button>
              </div>

              {validationResult === "ko" && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                  <label className="text-sm font-medium text-foreground">Notas para el arquitecto</label>
                  <Textarea
                    className="text-sm min-h-[80px] bg-white"
                    placeholder="Describe los ajustes necesarios..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <button
                    onClick={handleReject}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Guardar y enviar a Ajuste Proyecto Técnico
                  </button>
                </div>
              )}

              {validationResult === "ok" && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="text-sm text-muted-foreground">
                    El proyecto se moverá a la fase de <strong>Pendiente Presupuesto Renovador</strong>.
                  </p>
                  <button
                    onClick={handleApprove}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Aprobar y avanzar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ECU First Validation Block (Fase 4)                                */
/* ------------------------------------------------------------------ */

function EcuFirstValidationBlock({
  project,
  onRefetch,
}: {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
}) {
  const p = project as any;
  const router = useRouter();
  const supabase = createClient();
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<"ok" | "ko" | null>(null);
  const [notes, setNotes] = useState<string>(p.ecu_validation_notes ?? "");
  const [saving, setSaving] = useState(false);

  const techDoc: { url: string; filename: string }[] = Array.isArray(p.technical_project_doc) ? p.technical_project_doc : [];
  const hasDoc = techDoc.length > 0;

  const handleReject = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("projects")
        .update({
          reno_phase: "technical-project-fine-tuning",
          project_status: "Technical project fine-tuning",
          ecu_validation_notes: notes || null,
          ecu_validation_result: "rejected",
          ecu_first_end_date: now,
          updated_at: now,
        })
        .eq("id", project.id);
      if (error) throw new Error(error.message);

      if (project.airtable_project_id) {
        fetch("/api/airtable/projects/update-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            airtable_project_id: project.airtable_project_id,
            field_name: "Project status",
            field_value: "Technical project fine-tuning",
          }),
        }).catch(() => console.warn("Airtable sync failed"));
      }

      if (p.architect) {
        insertArchitectNotification({
          projectId: project.id,
          architectName: p.architect,
          type: "phase_advance",
          message: `El proyecto "${project.name || project.project_unique_id}" requiere ajustes técnicos tras la primera validación ECU. PropHero ha enviado notas de corrección.`,
        }).catch(() => {});

        sendArchitectEmailAlert({
          alertType: "ecu_repairs",
          architectName: p.architect,
          projectName: project.name || project.project_unique_id || "",
          areaCluster: p.area_cluster,
        }).then((r) => {
          if (!r.success) toast.error(r.error ?? "Error al enviar email al arquitecto");
        });
      }

      toast.success("Proyecto enviado a Ajuste Proyecto Técnico");
      trackEventWithDevice("Maturation ECU Reject", { project_id: project.id });
      await onRefetch();
      router.push("/reno/maturation-analyst/kanban");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("projects")
        .update({
          reno_phase: "pending-budget-from-renovator",
          project_status: "Pending to budget (from renovator)",
          ecu_validation_result: "approved",
          ecu_first_end_date: now,
          updated_at: now,
        })
        .eq("id", project.id);
      if (error) throw new Error(error.message);

      if (project.airtable_project_id) {
        fetch("/api/airtable/projects/update-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            airtable_project_id: project.airtable_project_id,
            field_name: "Project status",
            field_value: "Pending to budget (from renovator)",
          }),
        }).catch(() => console.warn("Airtable sync failed"));
      }

      if (p.architect) {
        sendArchitectEmailAlert({
          alertType: "ecu_certificates_received",
          architectName: p.architect,
          projectName: project.name || project.project_unique_id || "",
          areaCluster: p.area_cluster,
          architectFee: p.architect_fee ?? null,
        }).then((r) => {
          if (!r.success) toast.error(r.error ?? "Error al enviar email al arquitecto");
        });
      }

      toast.success("Proyecto aprobado — Pendiente Presupuesto Renovador");
      trackEventWithDevice("Maturation ECU Approve", { project_id: project.id });
      await onRefetch();
      router.push("/reno/maturation-analyst/kanban");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="divide-y">
      {/* ── Tareas ── */}
      <div>
        <div className="px-6 py-3 bg-muted/30">
          <h3 className="text-sm font-semibold">Tareas</h3>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Documento del Proyecto</span>
            <AttachmentUploadField
              projectId={project.id}
              field="technical_project_doc"
              value={p.technical_project_doc}
              onRefetch={onRefetch}
            />
          </div>

          {techDoc.length > 0 && (() => {
            const pdfs = techDoc.filter((a) => /\.pdf(\?|$)/i.test(a.url) || /\.pdf$/i.test(a.filename));
            const others = techDoc.filter((a) => !/\.pdf(\?|$)/i.test(a.url) && !/\.pdf$/i.test(a.filename));
            return (
              <div className="space-y-2">
                {pdfs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pdfs.map((att, i) => (
                      <button
                        key={i}
                        onClick={() => setViewingPdf(viewingPdf === att.url ? null : att.url)}
                        className={cn(
                          "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                          viewingPdf === att.url
                            ? "bg-blue-100 border-blue-300 text-blue-800"
                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{att.filename}</span>
                      </button>
                    ))}
                  </div>
                )}
                {viewingPdf && pdfs.some((a) => a.url === viewingPdf) && (
                  <div className="rounded-lg overflow-hidden border">
                    <PdfViewer fileUrl={viewingPdf} fileName="proyecto.pdf" />
                  </div>
                )}
                {others.length > 0 && <AttachmentViewer value={others} />}
              </div>
            );
          })()}

          {hasDoc && (
            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">
                ¿El proyecto está correctamente completado?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setValidationResult("ok")}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all",
                    validationResult === "ok"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/50"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 inline mr-1.5" />
                  Sí, correcto
                </button>
                <button
                  onClick={() => setValidationResult("ko")}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all",
                    validationResult === "ko"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50/50"
                  )}
                >
                  <AlertTriangle className="h-4 w-4 inline mr-1.5" />
                  No, necesita ajustes
                </button>
              </div>

              {validationResult === "ko" && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                  <label className="text-sm font-medium text-foreground">Notas para el arquitecto</label>
                  <Textarea
                    className="text-sm min-h-[80px] bg-white"
                    placeholder="Describe los ajustes necesarios..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <button
                    onClick={handleReject}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Guardar y enviar a Ajuste Proyecto Técnico
                  </button>
                </div>
              )}

              {validationResult === "ok" && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="text-sm text-muted-foreground">
                    El proyecto se moverá a la fase de <strong>Pendiente Presupuesto Renovador</strong>.
                  </p>
                  <button
                    onClick={handleApprove}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Aprobar y avanzar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fine Tuning Block (Fase 5: Ajuste Proyecto Técnico)                */
/* ------------------------------------------------------------------ */

function FineTuningBlock({
  project,
  onRefetch,
}: {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
}) {
  const p = project as any;
  const router = useRouter();
  const supabase = createClient();
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const correctedDocs: { url: string; filename: string }[] = Array.isArray(p.arch_corrected_project_doc) ? p.arch_corrected_project_doc : [];
  const correctedMeasurements: { url: string; filename: string }[] = Array.isArray(p.arch_corrected_measurements_doc) ? p.arch_corrected_measurements_doc : [];
  const originalDocs: { url: string; filename: string }[] = Array.isArray(p.arch_project_doc) ? p.arch_project_doc : [];
  const correctionDate = p.arch_correction_date;
  const hasCorrected = correctedDocs.length > 0;
  const projectDocs = hasCorrected ? correctedDocs : originalDocs;
  const hasAnyDocs = projectDocs.length > 0;

  const handleAdvance = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("projects")
        .update({
          reno_phase: "ecuv-final-validation",
          project_status: "Ecu final validation",
          ecu_reuploaded: true,
          ecu_final_start_date: now,
          updated_at: now,
        })
        .eq("id", project.id);
      if (error) throw new Error(error.message);

      if (project.airtable_project_id) {
        fetch("/api/airtable/projects/update-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            airtable_project_id: project.airtable_project_id,
            field_name: "Project status",
            field_value: "Ecu final validation",
          }),
        }).catch(() => console.warn("Airtable sync failed"));
      }

      toast.success("Proyecto movido a ECU Validación Final");
      trackEventWithDevice("Maturation Advance to ECU Final", {
        project_id: project.id,
        from: "technical-project-fine-tuning",
        to: "ecuv-final-validation",
      });
      await onRefetch();
      router.push("/reno/maturation-analyst/kanban");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al avanzar");
    } finally {
      setSaving(false);
    }
  };

  const renderDocSection = (
    label: string,
    docs: { url: string; filename: string }[]
  ) => {
    if (docs.length === 0) return null;
    const pdfs = docs.filter((a) => /\.pdf(\?|$)/i.test(a.url) || /\.pdf$/i.test(a.filename));
    const others = docs.filter((a) => !/\.pdf(\?|$)/i.test(a.url) && !/\.pdf$/i.test(a.filename));
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        {pdfs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pdfs.map((att, i) => (
              <button
                key={i}
                onClick={() => setViewingPdf(viewingPdf === att.url ? null : att.url)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                  viewingPdf === att.url
                    ? "bg-blue-100 border-blue-300 text-blue-800"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                )}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{att.filename}</span>
              </button>
            ))}
          </div>
        )}
        {viewingPdf && pdfs.some((a) => a.url === viewingPdf) && (
          <div className="rounded-lg overflow-hidden border">
            <PdfViewer fileUrl={viewingPdf} fileName="documento.pdf" />
          </div>
        )}
        {others.length > 0 && <AttachmentViewer value={others} />}
      </div>
    );
  };

  return (
    <div className="divide-y">
      <div>
        <div className="px-6 py-3 bg-muted/30">
          <h3 className="text-sm font-semibold">Documentación corregida del arquitecto</h3>
          {correctionDate && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Enviada el {new Date(correctionDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="px-6 py-4 space-y-4">
          {!hasAnyDocs && (
            <p className="text-sm text-muted-foreground italic">
              El arquitecto aún no ha subido la documentación corregida.
            </p>
          )}
          {renderDocSection(hasCorrected ? "Proyecto corregido (PDF)" : "Proyecto del arquitecto (PDF)", projectDocs)}
          {hasCorrected && renderDocSection("Mediciones corregidas", correctedMeasurements)}

          {hasAnyDocs && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">
                ¿Se ha vuelto a subir a la ECU?
              </p>
              <button
                onClick={handleAdvance}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Sí, avanzar a ECU Validación Final
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Budget block (Fases 4 y 5)                                         */
/* ------------------------------------------------------------------ */

function BudgetReformBlock({
  project,
  onRefetch,
  showAdvance = false,
}: {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
  showAdvance?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [advancing, setAdvancing] = useState(false);
  const p = project as any;

  const budgetDoc = Array.isArray(p.renovator_budget_doc) ? p.renovator_budget_doc : [];
  const hasBudget = budgetDoc.length > 0;

  const handleAdvanceToRenoStart = async () => {
    setAdvancing(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("projects")
        .update({
          reno_phase: "obra-a-empezar",
          project_status: "Reno to start",
          updated_at: now,
        })
        .eq("id", project.id);
      if (error) throw new Error(error.message);

      if (project.airtable_project_id) {
        fetch("/api/airtable/projects/update-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            airtable_project_id: project.airtable_project_id,
            field_name: "Project status",
            field_value: "Reno to start",
          }),
        }).catch(() => console.warn("Airtable sync failed"));
      }

      toast.success("Proyecto movido a Obra a Empezar");
      trackEventWithDevice("Maturation Phase Moved", {
        project_id: project.id,
        from: "pending-budget-from-renovator",
        to: "obra-a-empezar",
      });
      await onRefetch();
      router.push("/reno/maturation-analyst/kanban");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al avanzar");
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div>
      <div className="px-6 py-3 bg-muted/30 border-t">
        <h3 className="text-sm font-semibold">Tareas presupuesto reforma</h3>
      </div>
      <div className="px-6 py-4 space-y-4">
        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground">Presupuesto del reformista</span>
          <AttachmentUploadField
            projectId={project.id}
            field="renovator_budget_doc"
            value={getFieldValue(project, "renovator_budget_doc")}
            onRefetch={onRefetch}
          />
        </div>

        {showAdvance && hasBudget && (
          <div className="border-t pt-4">
            <button
              onClick={handleAdvanceToRenoStart}
              disabled={advancing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all disabled:opacity-50"
            >
              {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Avanzar a Obra a Empezar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface MaturationTaskListProps {
  project: ProjectRow;
  onRefetch: () => Promise<void>;
}

export function MaturationTaskList({ project, onRefetch }: MaturationTaskListProps) {
  const phase = (project.reno_phase ?? "get-project-draft") as RenoKanbanPhase;
  const tasks = getTasksForPhase(phase, project);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [architectModalOpen, setArchitectModalOpen] = useState(false);
  const [ecuContactModalOpen, setEcuContactModalOpen] = useState(false);
  const supabase = createClient();

  const showBudget = shouldShowBudgetBlock(phase);
  const showEcuContactTask = shouldShowEcuContactTask(phase, project);
  const showEcuFlow = shouldShowEcuValidationFlow(phase);
  const showTechDocs = shouldShowTechnicalProjectDocs(phase);
  const showEcuFirst = shouldShowEcuFirstBlock(phase);
  const showFineTuning = shouldShowFineTuningBlock(phase);

  const saveField = useCallback(
    async (field: string, value: unknown) => {
      setSavingField(field);
      try {
        const updates: Record<string, unknown> = {
          [field]: value,
          updated_at: new Date().toISOString(),
        };

        if (field === "architect" && value && !(project as any).draft_order_date) {
          updates.draft_order_date = new Date().toISOString();
        }

        const { error } = await supabase
          .from("projects")
          .update(updates)
          .eq("id", project.id);
        if (error) throw new Error(error.message);

        if (field === "excluded_from_ecu" && project.airtable_project_id) {
          fetch("/api/airtable/projects/update-ecu", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              airtable_project_id: project.airtable_project_id,
              excluded_from_ecu: value === true,
            }),
          }).catch(() => console.warn("Airtable ECU sync failed"));
        }

        if (field === "architect" && updates.draft_order_date && project.airtable_project_id) {
          fetch("/api/airtable/projects/update-field", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              airtable_project_id: project.airtable_project_id,
              field_name: "Draft order date",
              field_value: (updates.draft_order_date as string).slice(0, 10),
            }),
          }).catch(() => console.warn("Airtable draft_order_date sync failed"));
        }

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
    [supabase, project.id, project.airtable_project_id, onRefetch, project.reno_phase, project.draft_order_date]
  );

  const hasContent = tasks.length > 0 || showBudget || showEcuFlow || showTechDocs || showEcuFirst || showFineTuning || showEcuContactTask;

  if (!hasContent) {
    return (
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Tareas</h2>
        <p className="text-muted-foreground text-sm">
          No hay tareas definidas para esta fase.
        </p>
      </div>
    );
  }

  const showArchitectDeliverables = phase === "pending-to-validate" || phase === "pending-to-reserve-arras";

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold">Tareas</h2>
      </div>

      {/* Architect deliverables (Pendiente de Validación) */}
      {showArchitectDeliverables && (
        <ArchitectDeliverablesBlock project={project} />
      )}

      {/* Technical project docs (Proyecto Técnico en Progreso) */}
      {showTechDocs && (
        <TechnicalProjectDocsBlock project={project} onRefetch={onRefetch} />
      )}

      {/* Standard tasks */}
      {tasks.length > 0 && (
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

                      {task.type === "architect-selector" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-sm flex-1 justify-start font-normal"
                          onClick={() => setArchitectModalOpen(true)}
                        >
                          <PencilRuler className="h-3.5 w-3.5 mr-2 flex-shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {(getFieldValue(project, task.field) as string) || "Sin asignar"}
                          </span>
                        </Button>
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

                      {task.type === "readonly-date" && (() => {
                        const raw = getFieldValue(project, task.field);
                        if (!raw) return <span className="text-sm text-muted-foreground italic">Se genera automáticamente</span>;
                        const d = new Date(raw as string);
                        return (
                          <span className="text-sm text-foreground">
                            {d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        );
                      })()}

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

                      {task.type === "inverted-boolean" && (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={getFieldValue(project, task.field) !== true}
                            onCheckedChange={(checked) => saveField(task.field, !checked)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {getFieldValue(project, task.field) !== true ? "Sí" : "No"}
                          </span>
                        </div>
                      )}

                      {task.type === "checkbox" && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={getFieldValue(project, task.field) === true}
                            onCheckedChange={(checked) => saveField(task.field, checked === true)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {getFieldValue(project, task.field) === true ? "Hecho" : "Pendiente"}
                          </span>
                        </div>
                      )}

                      {task.type === "textarea" && (
                        <Textarea
                          className="text-sm min-h-[60px] flex-1"
                          placeholder="Sin notas"
                          defaultValue={String(getFieldValue(project, task.field) ?? "")}
                          onBlur={(e) => {
                            const newVal = e.target.value.trim() || null;
                            const current = getFieldValue(project, task.field);
                            if (newVal !== (current ?? null)) {
                              saveField(task.field, newVal);
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ECU Contact task — siempre visible si proyecto tiene ECU y falta el contacto */}
      {showEcuContactTask && (
        <div className="border-t">
          <div className="px-6 py-3 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-800/40">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              Contacto ECU pendiente
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">Contacto ECU</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-sm flex-1 justify-start font-normal max-w-[220px]"
                onClick={() => setEcuContactModalOpen(true)}
              >
                <span className="truncate text-muted-foreground italic">Sin asignar</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Request project to architect (Pendiente de Validación) */}
      {showArchitectDeliverables && (
        <RequestProjectButton project={project} onRefetch={onRefetch} />
      )}

      {/* ECU First Validation block (fase 4) */}
      {showEcuFirst && (
        <EcuFirstValidationBlock project={project} onRefetch={onRefetch} />
      )}

      {/* Fine Tuning block (fase 5) */}
      {showFineTuning && (
        <FineTuningBlock project={project} onRefetch={onRefetch} />
      )}

      {/* Budget reform block (fases 4 y 5) */}
      {showBudget && (
        <BudgetReformBlock project={project} onRefetch={onRefetch} showAdvance={phase === "pending-budget-from-renovator"} />
      )}

      {/* ECU Validation Flow (fase 6) */}
      {showEcuFlow && (
        <EcuValidationFlow
          project={project}
          onRefetch={onRefetch}
        />
      )}

      <ArchitectSelectorModal
        open={architectModalOpen}
        onOpenChange={setArchitectModalOpen}
        currentArchitect={(getFieldValue(project, "architect") as string) ?? null}
        airtableProjectId={project.airtable_project_id ?? null}
        onSelect={async ({ name, email, fee }) => {
          await saveField("architect", name);
          if (fee != null) {
            await supabase.from("projects").update({ architect_fee: fee }).eq("id", project.id);
          }
          sendArchitectEmailAlert({
            alertType: "new_project",
            architectName: name,
            architectEmail: email,
            projectName: project.name || project.project_unique_id || "",
            areaCluster: (project as any).area_cluster,
            architectFee: fee,
          }).then((r) => {
            if (!r.success) toast.error(r.error ?? "Error al enviar email al arquitecto");
          });
        }}
      />

      <EcuContactSelectorModal
        open={ecuContactModalOpen}
        onOpenChange={setEcuContactModalOpen}
        currentContact={(getFieldValue(project, "ecu_contact") as string) ?? null}
        airtableProjectId={project.airtable_project_id ?? null}
        onSelect={async ({ id, name }) => {
          await saveField("ecu_contact", name);
          await saveField("ecu_contact_airtable_id", id);
        }}
      />
    </div>
  );
}
