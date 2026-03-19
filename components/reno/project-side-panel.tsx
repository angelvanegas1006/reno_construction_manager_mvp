"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  MapPin, Calendar, User, Wrench, ExternalLink, FileText,
  FolderOpen, Key, Building2, Home, Euro, Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import {
  PROJECT_KANBAN_PHASE_LABELS,
  MATURATION_PHASE_LABELS,
  ARCHITECT_PHASE_LABELS,
  type RenoKanbanPhase,
} from "@/lib/reno-kanban-config";

interface ProjectSidePanelProps {
  project: ProjectRow;
  viewMode?: string;
  fromParam?: string;
}

const ALL_PHASE_LABELS: Record<string, string> = {
  ...PROJECT_KANBAN_PHASE_LABELS,
  ...MATURATION_PHASE_LABELS,
  ...ARCHITECT_PHASE_LABELS,
};

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "—"; }
}

function cleanField(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/[\[\]"]/g, "").trim() || null;
}

function isUrl(s: unknown): boolean {
  if (!s || typeof s !== "string") return false;
  return s.startsWith("http://") || s.startsWith("https://");
}

function hasValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  return true;
}

function resolveArchitectPhase(p: ProjectRow): RenoKanbanPhase {
  const pa = p as any;
  const statusRaw = (pa.project_status ?? p.reno_phase ?? "") as string;
  const status = statusRaw.trim().toLowerCase();

  const ADVANCED: Record<string, RenoKanbanPhase> = {
    "technical project in progress": "arch-technical-project",
    "ecuv first validation": "arch-ecu-first-validation",
    "ecu first validation": "arch-ecu-first-validation",
    "technical project fine-tuning": "arch-technical-adjustments",
    "technical project fine tuning": "arch-technical-adjustments",
    "ecuv final validation": "arch-ecu-final-validation",
    "ecu final validation": "arch-ecu-final-validation",
    "reno to start": "arch-obra-empezar",
    "pending to start reno": "arch-obra-empezar",
    "pending to budget from renovator": "arch-obra-empezar",
    "pending to budget (from renovator)": "arch-obra-empezar",
    "reno in progress": "arch-obra-en-progreso",
  };

  if (ADVANCED[status]) return ADVANCED[status];

  if (!hasValue(pa.measurement_date)) return "arch-pending-measurement";
  if (!hasValue(pa.project_architect_date)) return "arch-preliminary-project";
  return "arch-pending-validation";
}

export function ProjectSidePanel({ project, viewMode = "list", fromParam = "kanban" }: ProjectSidePanelProps) {
  const p = project;
  const isArchitect = fromParam === "architect-kanban";
  const phase = isArchitect ? resolveArchitectPhase(p) : (p.reno_phase || "");
  const phaseLabel = ALL_PHASE_LABELS[phase] || p.project_status || phase;

  const detailUrl = useMemo(() => {
    let basePath: string;
    if (fromParam === "maturation-kanban") {
      basePath = `/reno/maturation-analyst/project/${p.id}`;
    } else if (fromParam === "architect-kanban") {
      basePath = `/reno/architect/project/${p.id}`;
    } else {
      basePath = `/reno/construction-manager/project/${p.id}`;
    }
    return `${basePath}?viewMode=${viewMode}&from=${fromParam}`;
  }, [p.id, fromParam, viewMode]);

  const area = cleanField(p.area_cluster);
  const architect = cleanField(p.architect);
  const scouter = cleanField(p.scouter);
  const ecuContact = cleanField(p.ecu_contact);
  const renovator = cleanField(p.renovator);
  const renovationExecutor = cleanField(p.renovation_executor);
  const keysLocation = p.project_keys_location;

  const propertiesCount = (() => {
    const ptc = p.properties_to_convert;
    const ptcS = ptc != null ? String(ptc).trim() : "";
    if (ptcS && ptcS !== "0") return ptcS;
    return p.est_properties ?? "—";
  })();

  const typeRaw = (p.type ?? "").trim();
  const typeLower = typeRaw.toLowerCase();
  const investType = (p.investment_type ?? "").trim().toLowerCase();

  const typeBadge = useMemo(() => {
    if (!typeRaw) return null;
    if (typeLower === "project") return { cls: "bg-brand-600 text-white", label: typeRaw };
    if (typeLower === "wip") return { cls: "bg-sky-200 dark:bg-neutral-700/40 text-sky-800 dark:text-neutral-200 border border-sky-300 dark:border-neutral-600/50", label: typeRaw };
    if (typeLower === "new build") return { cls: "bg-brand-200 dark:bg-neutral-700/40 text-brand-800 dark:text-neutral-200 border border-brand-200 dark:border-neutral-600/50", label: typeRaw };
    return { cls: "bg-muted text-muted-foreground border border-border", label: typeRaw };
  }, [typeRaw, typeLower]);

  const investBadge = useMemo(() => {
    if (isArchitect) return null;
    if (investType.includes("flip")) return { cls: "border-success text-success dark:text-success bg-success-subtle dark:bg-success/30", label: "Flip" };
    if (investType.includes("yield")) return { cls: "border-brand text-brand-700 dark:text-neutral-400 bg-brand-50 dark:bg-card/10", label: "Yield" };
    if (p.investment_type) return { cls: "border-border text-muted-foreground", label: p.investment_type };
    return null;
  }, [investType, p.investment_type, isArchitect]);

  const infoItems = useMemo(() => {
    const items: { icon: typeof MapPin; label: string; value: string }[] = [];
    if (area) items.push({ icon: MapPin, label: "Zona", value: area });
    if (architect) items.push({ icon: Building2, label: "Arquitecto", value: architect });
    if (!isArchitect && scouter) items.push({ icon: User, label: "Scouter", value: scouter });
    if (renovator) items.push({ icon: Wrench, label: "Renovador", value: renovator });
    if (renovationExecutor) items.push({ icon: Wrench, label: "Ejecutor", value: renovationExecutor });
    if (ecuContact) items.push({ icon: Landmark, label: "Contacto ECU", value: ecuContact });
    if (!isArchitect && keysLocation) items.push({ icon: Key, label: "Llaves", value: keysLocation });
    return items;
  }, [area, architect, scouter, renovator, renovationExecutor, ecuContact, keysLocation, isArchitect]);

  const datesData = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    if (p.settlement_date) items.push({ label: "Liquidación", value: formatDate(p.settlement_date) });
    if (p.project_start_date) items.push({ label: "Inicio proyecto", value: formatDate(p.project_start_date) });
    if (p.arras_deadline) items.push({ label: "Deadline arras", value: formatDate(p.arras_deadline) });
    if (p.draft_order_date) items.push({ label: "Encargo anteproyecto", value: formatDate(p.draft_order_date) });
    if (p.measurement_date) items.push({ label: "Medición", value: formatDate(p.measurement_date) });
    if (p.project_draft_date) items.push({ label: "Borrador proyecto", value: formatDate(p.project_draft_date) });
    if (p.est_reno_start_date) items.push({ label: "Arranque est.", value: formatDate(p.est_reno_start_date) });
    if (p.reno_start_date) items.push({ label: "Inicio obra", value: formatDate(p.reno_start_date) });
    if (p.estimated_project_end_date) items.push({ label: "Fin proyecto est.", value: formatDate(p.estimated_project_end_date) });
    if (p.project_end_date) items.push({ label: "Fin proyecto", value: formatDate(p.project_end_date) });
    if (p.est_reno_end_date) items.push({ label: "Fin obra est.", value: formatDate(p.est_reno_end_date) });
    if (p.reno_end_date) items.push({ label: "Fin obra", value: formatDate(p.reno_end_date) });
    if (p.ecu_delivery_date) items.push({ label: "Entrega ECU", value: formatDate(p.ecu_delivery_date) });
    if (p.first_correction_date) items.push({ label: "Primera corrección", value: formatDate(p.first_correction_date) });
    if (p.definitive_validation_date) items.push({ label: "Validación definitiva", value: formatDate(p.definitive_validation_date) });
    return items;
  }, [p]);

  type PhaseTimelineItem = {
    phaseLabel: string;
    dateValue: string | null;
    limitDate: string | null;
    limitDays: number;
    daysTaken: number | null;
    status: "completed-on-time" | "completed-late" | "in-progress" | "in-progress-late" | "pending";
    isCurrent: boolean;
  };

  const ARCHITECT_PHASES_ORDER = [
    { key: "arch-pending-measurement", label: "Medición", dateField: "measurement_date", baseDateField: "draft_order_date", limitDays: 7 },
    { key: "arch-preliminary-project", label: "Anteproyecto", dateField: "project_draft_date", baseDateField: "measurement_date", limitDays: 14 },
    { key: "arch-pending-validation", label: "Validación PropHero", dateField: "draft_validation_date", baseDateField: "project_draft_date", limitDays: 0 },
    { key: "arch-technical-project", label: "Proyecto Técnico", dateField: "project_architect_date", baseDateField: "draft_validation_date", limitDays: 28 },
    { key: "arch-ecu-first-validation", label: "ECU 1ª Validación", dateField: "ecu_first_start_date", baseDateField: "project_architect_date", limitDays: 28 },
    { key: "arch-technical-adjustments", label: "Ajustes Técnicos", dateField: "ecu_first_end_date", baseDateField: "ecu_first_end_date", limitDays: 7 },
    { key: "arch-ecu-final-validation", label: "ECU Validación Final", dateField: "definitive_validation_date", baseDateField: "ecu_first_end_date", limitDays: 0 },
  ];

  const MATURATION_MILESTONES = [
    { label: "Medición", dateField: "measurement_date", baseDateField: "draft_order_date", limitDays: 7 },
    { label: "Anteproyecto", dateField: "project_draft_date", baseDateField: "measurement_date", limitDays: 14 },
    { label: "Proyecto Técnico", dateField: "project_architect_date", baseDateField: "draft_validation_date", limitDays: 28 },
    { label: "ECU 1ª Validación", dateField: "ecu_first_start_date", baseDateField: "project_architect_date", limitDays: 28 },
    { label: "Ajustes Técnicos", dateField: "ecu_first_end_date", baseDateField: "ecu_first_end_date", limitDays: 7 },
    { label: "ECU Validación Final", dateField: "definitive_validation_date", baseDateField: "ecu_first_end_date", limitDays: 0 },
  ];

  function buildTimeline(phasesOrder: typeof ARCHITECT_PHASES_ORDER, currentPhaseKey: string): PhaseTimelineItem[] {
    const currentIdx = phasesOrder.findIndex((ph) => ph.key === currentPhaseKey);

    return phasesOrder.map((ph, idx) => {
      const dateVal = (p as any)[ph.dateField] || null;
      const baseVal = (p as any)[ph.baseDateField] || null;
      let limitDate: string | null = null;
      if (baseVal && ph.limitDays > 0) {
        const base = new Date(baseVal);
        if (!isNaN(base.getTime())) {
          limitDate = new Date(base.getTime() + ph.limitDays * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      let daysTaken: number | null = null;
      if (baseVal && dateVal) {
        const diff = new Date(dateVal).getTime() - new Date(baseVal).getTime();
        daysTaken = Math.round(diff / (24 * 60 * 60 * 1000));
      } else if (baseVal && !dateVal) {
        const diff = Date.now() - new Date(baseVal).getTime();
        daysTaken = Math.round(diff / (24 * 60 * 60 * 1000));
      }

      const isCurrent = idx === currentIdx;
      const isPast = currentIdx >= 0 ? idx < currentIdx : false;

      let status: PhaseTimelineItem["status"] = "pending";
      if (isPast) {
        if (dateVal && limitDate && new Date(dateVal).getTime() > new Date(limitDate).getTime()) {
          status = "completed-late";
        } else {
          status = "completed-on-time";
        }
      } else if (isCurrent) {
        if (dateVal) {
          if (limitDate && new Date(dateVal).getTime() > new Date(limitDate).getTime()) {
            status = "completed-late";
          } else {
            status = "completed-on-time";
          }
        } else if (limitDate && Date.now() > new Date(limitDate).getTime()) {
          status = "in-progress-late";
        } else {
          status = "in-progress";
        }
      }

      return {
        phaseLabel: ph.label,
        dateValue: dateVal,
        limitDate,
        limitDays: ph.limitDays,
        daysTaken,
        status,
        isCurrent,
      };
    });
  }

  const architectTimeline = useMemo((): PhaseTimelineItem[] => {
    if (!isArchitect) return [];
    return buildTimeline(ARCHITECT_PHASES_ORDER, resolveArchitectPhase(p));
  }, [isArchitect, p, phase]);

  const isMaturation = fromParam === "maturation-kanban";

  const maturationTimeline = useMemo((): PhaseTimelineItem[] => {
    if (!isMaturation) return [];

    return MATURATION_MILESTONES.map((ms, idx) => {
      const dateVal = (p as any)[ms.dateField] || null;
      const baseVal = (p as any)[ms.baseDateField] || null;
      let limitDate: string | null = null;
      if (baseVal && ms.limitDays > 0) {
        const base = new Date(baseVal);
        if (!isNaN(base.getTime())) {
          limitDate = new Date(base.getTime() + ms.limitDays * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      let daysTaken: number | null = null;
      if (baseVal && dateVal) {
        const diff = new Date(dateVal).getTime() - new Date(baseVal).getTime();
        daysTaken = Math.round(diff / (24 * 60 * 60 * 1000));
      } else if (baseVal && !dateVal) {
        const diff = Date.now() - new Date(baseVal).getTime();
        daysTaken = Math.round(diff / (24 * 60 * 60 * 1000));
      }

      const hasDate = !!dateVal;
      const isCurrent = !hasDate && (idx === 0 || !!(p as any)[MATURATION_MILESTONES[idx - 1]?.dateField]);

      let status: PhaseTimelineItem["status"] = "pending";
      if (hasDate) {
        if (limitDate && new Date(dateVal).getTime() > new Date(limitDate).getTime()) {
          status = "completed-late";
        } else {
          status = "completed-on-time";
        }
      } else if (isCurrent) {
        if (limitDate && Date.now() > new Date(limitDate).getTime()) {
          status = "in-progress-late";
        } else if (baseVal) {
          status = "in-progress";
        }
      }

      return {
        phaseLabel: ms.label,
        dateValue: dateVal,
        limitDate,
        limitDays: ms.limitDays,
        daysTaken,
        status,
        isCurrent,
      };
    });
  }, [isMaturation, p]);

  const docs = useMemo(() => {
    const items: { label: string; url: string }[] = [];
    if (isUrl(p.draft_plan)) items.push({ label: "Planos anteproyecto", url: String(p.draft_plan) });
    if (isUrl(p.technical_project_doc)) items.push({ label: "Proyecto técnico", url: String(p.technical_project_doc) });
    if (isUrl(p.final_plan)) items.push({ label: "Planos finales", url: String(p.final_plan) });
    if (isUrl(p.license_attachment)) items.push({ label: "Licencia", url: String(p.license_attachment) });
    // Drive folder is now shown in the header
    if (p.architect_attachments) {
      const atts = Array.isArray(p.architect_attachments) ? p.architect_attachments : [];
      atts.forEach((att: any, i: number) => {
        const url = typeof att === "string" ? att : att?.url;
        if (isUrl(url)) items.push({ label: `Adjunto arquitecto ${i + 1}`, url });
      });
    }
    return items;
  }, [p, isArchitect]);

  const notes = useMemo(() => {
    const items: { label: string; text: string }[] = [];
    if (p.project_set_up_team_notes) items.push({ label: "Notas equipo", text: p.project_set_up_team_notes });
    if (p.project_validation_notes) items.push({ label: "Notas validación", text: p.project_validation_notes });
    if (p.architect_notes) items.push({ label: "Notas arquitecto", text: p.architect_notes });
    return items;
  }, [p]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="pb-3 mb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-muted-foreground tracking-wide mb-0.5">
              {p.project_unique_id || p.id?.slice(0, 8)}
            </p>
            <h2 className="text-base font-semibold text-foreground leading-tight break-words">
              {p.name || "Sin nombre"}
            </h2>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2 flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground leading-tight">Nº de Propiedades</p>
                <p className="text-base font-bold leading-tight">{propertiesCount}</p>
              </div>
            </div>
            {!isArchitect && isUrl(p.drive_folder) && (
              <a href={String(p.drive_folder)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border/60 bg-card px-3 py-2 flex items-center gap-2 hover:bg-accent/60 transition-colors">
                <FolderOpen className="h-4 w-4 text-brand dark:text-neutral-400" />
                <span className="text-xs font-medium text-brand dark:text-neutral-400">Carpeta Drive</span>
                <ExternalLink className="h-3 w-3 text-brand/60 ml-auto" />
              </a>
            )}
          </div>
        </div>
        {p.project_address && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            {p.project_address}
          </p>
        )}
        {area && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            {area}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <Badge variant="secondary" className="text-[11px] h-5">{phaseLabel}</Badge>
          {typeBadge && (
            <span className={cn("inline-flex items-center rounded-full text-[11px] font-medium px-2 py-0.5 h-5", typeBadge.cls)}>
              {typeBadge.label}
            </span>
          )}
          {investBadge && (
            <Badge variant="outline" className={cn("text-[11px] h-5", investBadge.cls)}>
              {investBadge.label}
            </Badge>
          )}
          {p.excluded_from_ecu === true ? (
            <Badge variant="outline" className="text-[11px] h-5 border-warning text-warning dark:text-warning bg-warning-subtle dark:bg-warning/30">Ayto</Badge>
          ) : p.excluded_from_ecu === false ? (
            <Badge variant="outline" className="text-[11px] h-5 border-brand text-brand-700 dark:text-neutral-400 bg-brand-50 dark:bg-card/10">ECU</Badge>
          ) : null}
        </div>
        <Link href={detailUrl}>
          <Button variant="outline" size="sm" className="mt-2.5 w-full text-xs gap-1.5 h-8">
            <ExternalLink className="h-3 w-3" />
            Ver detalle completo
          </Button>
        </Link>
      </div>

      <Separator className="mb-3" />

      {/* Info + Propiedades — Grid layout */}
      <div className="grid grid-cols-1 gap-3 mb-3">
        {/* Info section */}
        {infoItems.length > 0 && (
          <div className="rounded-lg border border-border/60 bg-card p-3">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Información</h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {infoItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-1.5 text-xs min-w-0">
                    <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground flex-shrink-0">{item.label}:</span>
                    <span className="font-medium truncate">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats row */}
        {((!isArchitect && p.renovation_spend != null) || p.reno_duration != null) && (
          <div className="grid grid-cols-2 gap-2">
            {!isArchitect && p.renovation_spend != null && (
              <div className="rounded-lg border border-border/60 bg-card p-2.5 flex items-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-tight">Gasto reno.</p>
                  <p className="text-sm font-semibold">{p.renovation_spend.toLocaleString("es-ES")} €</p>
                </div>
              </div>
            )}
            {p.reno_duration != null && (
              <div className="rounded-lg border border-border/60 bg-card p-2.5 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-tight">Duración</p>
                  <p className="text-sm font-semibold">{p.reno_duration} días</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fechas clave (para todos los roles) */}
      {datesData.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-card p-3 mb-3">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fechas clave</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {datesData.map((d) => (
              <div key={d.label} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-muted-foreground">{d.label}</span>
                <span className="font-medium tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tiempos por fase — tabla compartida para architect y maturation */}
      {(() => {
        const timeline = isArchitect ? architectTimeline : isMaturation ? maturationTimeline : [];
        if (timeline.length === 0) return null;
        return (
          <div className="rounded-lg border border-border/60 bg-card p-3 mb-3">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tiempos por fase</h3>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left font-semibold text-muted-foreground pb-1.5 pr-2">Fase</th>
                  <th className="text-center font-semibold text-muted-foreground pb-1.5 px-1">Plazo</th>
                  <th className="text-center font-semibold text-muted-foreground pb-1.5 px-1">Real</th>
                  <th className="text-center font-semibold text-muted-foreground pb-1.5 px-1">Límite</th>
                  <th className="text-center font-semibold text-muted-foreground pb-1.5 pl-1">Días</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((item, idx) => {
                  const isLate = item.status === "completed-late" || item.status === "in-progress-late";
                  const rowBg = item.isCurrent ? "bg-brand-50/60 dark:bg-card/[0.08]" : "";
                  const dotColor =
                    item.status === "completed-on-time" ? "bg-success" :
                    item.status === "completed-late" ? "bg-danger" :
                    item.status === "in-progress-late" ? "bg-warning" :
                    item.status === "in-progress" ? "bg-brand" :
                    "bg-muted-foreground/30";

                  return (
                    <tr key={idx} className={cn("border-b border-border/30 last:border-0", rowBg)}>
                      <td className="py-1.5 pr-2">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />
                          <span className={cn(
                            "font-medium truncate",
                            item.isCurrent && "text-foreground font-semibold",
                            item.status === "pending" && "text-muted-foreground",
                          )}>
                            {item.phaseLabel}
                          </span>
                          {item.isCurrent && (
                            <span className="text-[8px] bg-brand-100 dark:bg-neutral-700/40 text-brand-700 dark:text-neutral-300 px-1 py-px rounded-full font-medium leading-none flex-shrink-0">Actual</span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-1 text-center tabular-nums text-muted-foreground">
                        {item.limitDays > 0 ? `${item.limitDays}d` : "—"}
                      </td>
                      <td className="py-1.5 px-1 text-center tabular-nums">
                        {item.dateValue ? (
                          <span className={cn(isLate ? "text-destructive font-medium" : "text-foreground")}>
                            {formatDate(item.dateValue)}
                          </span>
                        ) : item.status === "in-progress" || item.status === "in-progress-late" ? (
                          <span className={cn("italic text-[10px]", isLate ? "text-destructive" : "text-muted-foreground")}>En curso</span>
                        ) : item.status === "pending" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="text-success dark:text-success">✓</span>
                        )}
                      </td>
                      <td className="py-1.5 px-1 text-center tabular-nums text-muted-foreground">
                        {item.limitDays > 0 && item.limitDate ? formatDate(item.limitDate) : "—"}
                      </td>
                      <td className="py-1.5 pl-1 text-center tabular-nums">
                        {item.daysTaken != null && item.limitDays > 0 ? (
                          <span className={cn(
                            "font-medium",
                            isLate ? "text-destructive" : "text-success dark:text-success",
                          )}>
                            {item.daysTaken}d
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Documentos */}
      {docs.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-card p-3 mb-3">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Documentos</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {docs.map((d) => (
              <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-brand dark:text-neutral-400 hover:underline truncate">
                {d.label.toLowerCase().includes("drive") ? <FolderOpen className="h-3 w-3 flex-shrink-0" /> : <FileText className="h-3 w-3 flex-shrink-0" />}
                <span className="truncate">{d.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Notas */}
      {notes.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-card p-3 mb-3">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notas</h3>
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.label}>
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{n.label}</p>
                <p className="text-xs text-foreground bg-muted/30 rounded-md p-3 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">{n.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
