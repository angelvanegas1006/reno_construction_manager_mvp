"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  MapPin, Calendar, User, Wrench, ExternalLink, FileText,
  FolderOpen, Key, Building2, Home, Users, Euro, Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import {
  PROJECT_KANBAN_PHASE_LABELS,
  MATURATION_PHASE_LABELS,
  ARCHITECT_PHASE_LABELS,
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

export function ProjectSidePanel({ project, viewMode = "list", fromParam = "kanban" }: ProjectSidePanelProps) {
  const p = project;
  const phase = p.reno_phase || "";
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
    if (typeLower === "project") return { cls: "bg-blue-600 text-white", label: typeRaw };
    if (typeLower === "wip") return { cls: "bg-sky-200 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700/50", label: typeRaw };
    if (typeLower === "new build") return { cls: "bg-blue-200 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800/50", label: typeRaw };
    return { cls: "bg-muted text-muted-foreground border border-border", label: typeRaw };
  }, [typeRaw, typeLower]);

  const investBadge = useMemo(() => {
    if (investType.includes("flip")) return { cls: "border-green-600 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30", label: "Flip" };
    if (investType.includes("yield")) return { cls: "border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30", label: "Yield" };
    if (p.investment_type) return { cls: "border-border text-muted-foreground", label: p.investment_type };
    return null;
  }, [investType, p.investment_type]);

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

  const docs = useMemo(() => {
    const items: { label: string; url: string }[] = [];
    if (isUrl(p.draft_plan)) items.push({ label: "Planos anteproyecto", url: String(p.draft_plan) });
    if (isUrl(p.technical_project_doc)) items.push({ label: "Proyecto técnico", url: String(p.technical_project_doc) });
    if (isUrl(p.final_plan)) items.push({ label: "Planos finales", url: String(p.final_plan) });
    if (isUrl(p.license_attachment)) items.push({ label: "Licencia", url: String(p.license_attachment) });
    if (isUrl(p.drive_folder)) items.push({ label: "Carpeta Drive", url: String(p.drive_folder) });
    if (p.architect_attachments) {
      const atts = Array.isArray(p.architect_attachments) ? p.architect_attachments : [];
      atts.forEach((att: any, i: number) => {
        const url = typeof att === "string" ? att : att?.url;
        if (isUrl(url)) items.push({ label: `Adjunto arquitecto ${i + 1}`, url });
      });
    }
    return items;
  }, [p]);

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
      <div className="pb-4 mb-4 border-b border-border">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-0.5">
              {p.project_unique_id || p.id?.slice(0, 8)}
            </p>
            <h2 className="text-lg font-semibold text-foreground leading-tight break-words">
              {p.name || "Sin nombre"}
            </h2>
            {p.project_address && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                {p.project_address}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">{phaseLabel}</Badge>
          {typeBadge && (
            <span className={cn("inline-flex items-center rounded-full text-xs font-medium px-2 py-0.5", typeBadge.cls)}>
              {typeBadge.label}
            </span>
          )}
          {investBadge && (
            <Badge variant="outline" className={cn("text-xs", investBadge.cls)}>
              {investBadge.label}
            </Badge>
          )}
          {p.excluded_from_ecu === true ? (
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">Ayto</Badge>
          ) : p.excluded_from_ecu === false ? (
            <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">ECU</Badge>
          ) : null}
        </div>
        <Link href={detailUrl}>
          <Button variant="outline" size="sm" className="mt-3 w-full text-xs gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Ver detalle completo
          </Button>
        </Link>
      </div>

      {/* Info básica */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Información</h3>
        <div className="space-y-2">
          {area && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Zona:</span>
              <span className="font-medium">{area}</span>
            </div>
          )}
          {architect && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Arquitecto:</span>
              <span className="font-medium">{architect}</span>
            </div>
          )}
          {scouter && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Scouter:</span>
              <span className="font-medium">{scouter}</span>
            </div>
          )}
          {renovator && (
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Renovador:</span>
              <span className="font-medium">{renovator}</span>
            </div>
          )}
          {renovationExecutor && (
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Ejecutor:</span>
              <span className="font-medium">{renovationExecutor}</span>
            </div>
          )}
          {ecuContact && (
            <div className="flex items-center gap-2 text-sm">
              <Landmark className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Contacto ECU:</span>
              <span className="font-medium">{ecuContact}</span>
            </div>
          )}
          {keysLocation && (
            <div className="flex items-center gap-2 text-sm">
              <Key className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Llaves:</span>
              <span className="font-medium">{keysLocation}</span>
            </div>
          )}
        </div>
      </div>

      {/* Propiedades */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Propiedades</h3>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-muted/20 p-2.5 flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-[11px] text-muted-foreground">Nº propiedades</p>
              <p className="text-sm font-semibold">{propertiesCount}</p>
            </div>
          </div>
          {p.renovation_spend != null && (
            <div className="rounded-lg border border-border bg-muted/20 p-2.5 flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[11px] text-muted-foreground">Gasto reno.</p>
                <p className="text-sm font-semibold">{p.renovation_spend.toLocaleString("es-ES")} €</p>
              </div>
            </div>
          )}
          {p.reno_duration != null && (
            <div className="rounded-lg border border-border bg-muted/20 p-2.5 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[11px] text-muted-foreground">Duración</p>
                <p className="text-sm font-semibold">{p.reno_duration} días</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fechas clave */}
      {datesData.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fechas clave</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {datesData.map((d) => (
              <div key={d.label} className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground text-xs">{d.label}:</span>
                <span className="font-medium text-xs">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentos */}
      {docs.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Documentos</h3>
          <div className="space-y-1.5">
            {docs.map((d) => (
              <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                {d.label.toLowerCase().includes("drive") ? <FolderOpen className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                {d.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Notas */}
      {notes.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notas</h3>
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.label}>
                <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{n.label}</p>
                <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{n.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado */}
      {p.project_status && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Estado</h3>
          <Badge variant="outline" className="text-xs">{p.project_status}</Badge>
        </div>
      )}
    </div>
  );
}
