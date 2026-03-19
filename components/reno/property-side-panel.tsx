"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  MapPin, Home, Bed, Bath, Ruler, Car, ArrowUpRight, Calendar,
  Clock, User, Wrench, Droplets, Flame, Zap, FolderOpen, FileText,
  ExternalLink, Key, Building2, Timer,
} from "lucide-react";
import { Property } from "@/lib/property-storage";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isDelayedWork } from "@/lib/property-sorting";
import { UNITS_PHASE_LABELS } from "@/lib/reno-kanban-config";

interface PropertySidePanelProps {
  property: Property;
  viewMode?: string;
  fromParam?: string;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "—"; }
}

function getSupplyIcon(status: string | null | undefined) {
  if (!status) return { color: "text-muted-foreground", label: "Sin datos" };
  const s = status.toLowerCase();
  if (s.includes("activ") || s.includes("alta") || s.includes("on") || s === "ok") return { color: "text-success", label: status };
  if (s.includes("pendiente") || s.includes("tramit")) return { color: "text-warning", label: status };
  return { color: "text-muted-foreground", label: status };
}

export function PropertySidePanel({ property, viewMode = "list", fromParam = "kanban" }: PropertySidePanelProps) {
  const sp = (property as any).supabaseProperty ?? {};
  const renoPhase = sp.reno_phase || property.renoPhase || "upcoming-settlements";
  const phaseLabel = UNITS_PHASE_LABELS[renoPhase] || renoPhase;

  const detailUrl = `/reno/construction-manager/property/${property.id}?tab=tareas&viewMode=${viewMode}&from=${fromParam}`;

  const renoType = property.renoType || sp.reno_type;
  const renovador = sp["Renovator name"] || property.renovador;
  const technicalConstructor = sp["Technical construction"] || sp.technical_construction;
  const siteManager = sp.assigned_site_manager_email;
  const keysLocation = sp.keys_location;
  const driveFolderUrl = sp.drive_folder_url;
  const budgetPdfUrl = sp.budget_pdf_url;

  const waterStatus = sp.water_status;
  const gasStatus = sp.gas_status;
  const electricityStatus = sp.electricity_status;
  const hasSupplies = waterStatus || gasStatus || electricityStatus;

  const picsUrls: string[] = useMemo(() => {
    const raw = sp.pics_urls;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean).slice(0, 6);
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 6) : []; }
    catch { return []; }
  }, [sp.pics_urls]);

  const bedrooms = property.bedrooms ?? sp.bedrooms;
  const bathrooms = property.bathrooms ?? sp.bathrooms;
  const sqm = property.square_meters ?? sp.square_meters ?? sp.usable_square_meters;
  const parking = sp.parking;
  const elevator = sp.elevator;

  const isDelayed = isDelayedWork(property, renoPhase);

  const metricsData = useMemo(() => {
    const items: { label: string; value: string | number; warn?: boolean }[] = [];
    const earlyPhases = ["initial-check", "upcoming-settlements"];
    const budgetPhases = ["reno-budget-renovator", "reno-budget-client", "reno-budget-start"];

    if (earlyPhases.includes(renoPhase) && property.daysToVisit != null) {
      items.push({ label: "Días para visitar", value: property.daysToVisit, warn: property.daysToVisit > 5 });
    }
    if ([...earlyPhases, ...budgetPhases].includes(renoPhase) && property.daysToStartRenoSinceRSD != null) {
      items.push({ label: "Días desde firma", value: property.daysToStartRenoSinceRSD, warn: property.daysToStartRenoSinceRSD > 25 });
    }
    if (renoPhase === "reno-in-progress" && property.renoDuration != null) {
      const limit = renoType?.toLowerCase().includes("light") ? 30 : renoType?.toLowerCase().includes("medium") ? 60 : 120;
      items.push({ label: "Duración obra", value: `${property.renoDuration} días`, warn: property.renoDuration > limit });
    }
    if (["furnishing", "cleaning", "final-check", "pendiente-suministros"].includes(renoPhase) && property.daysToPropertyReady != null) {
      items.push({ label: "Días propiedad lista", value: property.daysToPropertyReady, warn: property.daysToPropertyReady > 25 });
    }
    if (property.completion != null && renoPhase === "reno-in-progress") {
      items.push({ label: "Progreso", value: `${property.completion}%` });
    }
    return items;
  }, [property, renoPhase, renoType]);

  const datesData = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    if (property.estimatedVisitDate) items.push({ label: "Visita estimada", value: formatDate(property.estimatedVisitDate) });
    if (sp.initial_visit_date) items.push({ label: "Visita inicial", value: formatDate(sp.initial_visit_date) });
    if (sp.est_reno_start_date) items.push({ label: "Arranque est.", value: formatDate(sp.est_reno_start_date) });
    if (sp.start_date) items.push({ label: "Inicio obra", value: formatDate(sp.start_date) });
    if (sp.estimated_end_date) items.push({ label: "Fin estimado", value: formatDate(sp.estimated_end_date) });
    if (sp.reno_end_date) items.push({ label: "Fin obra", value: formatDate(sp.reno_end_date) });
    if (property.realSettlementDate) items.push({ label: "Fecha firma", value: formatDate(property.realSettlementDate) });
    return items;
  }, [property, sp]);

  const renoTypeBadge = useMemo(() => {
    if (!renoType) return null;
    const tl = renoType.toLowerCase();
    if (tl.includes("no reno") || tl.includes("no_reno")) return { cls: "bg-v-gray-700 dark:bg-v-gray-800 text-white", label: renoType };
    if (tl.includes("light")) return { cls: "bg-success text-white", label: renoType };
    if (tl.includes("medium")) return { cls: "bg-success-bg dark:bg-success/30 text-success dark:text-success border border-success dark:border-success/30", label: renoType };
    if (tl.includes("major")) return { cls: "bg-warning-bg dark:bg-warning/30 text-warning dark:text-warning border border-warning dark:border-warning/30", label: renoType };
    return { cls: "bg-muted text-muted-foreground", label: renoType };
  }, [renoType]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className={cn("pb-4 mb-4 border-b border-border", isDelayed && "border-l-4 border-l-danger pl-3")}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-0.5">
              {property.uniqueIdFromEngagements || property.id?.slice(0, 8)}
            </p>
            <h2 className="text-lg font-semibold text-foreground leading-tight break-words">
              {property.fullAddress}
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">{phaseLabel}</Badge>
          {renoTypeBadge && (
            <span className={cn("inline-flex items-center rounded-full text-xs font-medium px-2 py-0.5", renoTypeBadge.cls)}>
              {renoTypeBadge.label}
            </span>
          )}
          {isDelayed && <Badge className="text-xs bg-danger text-white border-0">Retrasada</Badge>}
        </div>
        <Link href={detailUrl}>
          <Button variant="outline" size="sm" className="mt-3 w-full text-xs gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Ver detalle completo
          </Button>
        </Link>
      </div>

      {/* Métricas rápidas */}
      {metricsData.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Métricas</h3>
          <div className="grid grid-cols-2 gap-2">
            {metricsData.map((m) => (
              <div key={m.label} className={cn("rounded-lg border p-2.5", m.warn ? "border-danger dark:border-danger/40 bg-danger-subtle/50 dark:bg-danger/10" : "border-border bg-muted/20")}>
                <p className="text-[11px] text-muted-foreground mb-0.5">{m.label}</p>
                <p className={cn("text-sm font-semibold", m.warn ? "text-danger dark:text-danger" : "text-foreground")}>{m.value}</p>
              </div>
            ))}
          </div>
          {property.completion != null && renoPhase === "reno-in-progress" && (
            <div className="mt-2">
              <Progress value={property.completion} className="h-1.5" />
            </div>
          )}
        </div>
      )}

      {/* Info básica */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Información</h3>
        <div className="space-y-2">
          {property.region && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Región:</span>
              <span className="font-medium">{property.region}</span>
            </div>
          )}
          {renovador && (
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Renovador:</span>
              <span className="font-medium">{renovador}</span>
            </div>
          )}
          {technicalConstructor && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Constructor:</span>
              <span className="font-medium">{technicalConstructor}</span>
            </div>
          )}
          {siteManager && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Jefe obra:</span>
              <span className="font-medium truncate">{siteManager}</span>
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

      {/* Amenities */}
      {(bedrooms || bathrooms || sqm) && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Características</h3>
          <div className="flex flex-wrap gap-3">
            {bedrooms != null && (
              <div className="flex items-center gap-1.5 text-sm">
                <Bed className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{bedrooms} hab.</span>
              </div>
            )}
            {bathrooms != null && (
              <div className="flex items-center gap-1.5 text-sm">
                <Bath className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{bathrooms} baño{bathrooms !== 1 ? "s" : ""}</span>
              </div>
            )}
            {sqm != null && (
              <div className="flex items-center gap-1.5 text-sm">
                <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{sqm} m²</span>
              </div>
            )}
            {parking != null && (
              <div className="flex items-center gap-1.5 text-sm">
                <Car className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{parking === true || parking === "Yes" ? "Sí" : parking === false || parking === "No" ? "No" : parking}</span>
              </div>
            )}
            {elevator != null && (
              <div className="flex items-center gap-1.5 text-sm">
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Ascensor: {elevator === true || elevator === "Yes" ? "Sí" : elevator === false || elevator === "No" ? "No" : elevator}</span>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Suministros */}
      {hasSupplies && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suministros</h3>
          <div className="space-y-1.5">
            {waterStatus && (() => {
              const info = getSupplyIcon(waterStatus);
              return (
                <div className="flex items-center gap-2 text-sm">
                  <Droplets className={cn("h-3.5 w-3.5", info.color)} />
                  <span className="text-muted-foreground">Agua:</span>
                  <span className="font-medium">{info.label}</span>
                </div>
              );
            })()}
            {gasStatus && (() => {
              const info = getSupplyIcon(gasStatus);
              return (
                <div className="flex items-center gap-2 text-sm">
                  <Flame className={cn("h-3.5 w-3.5", info.color)} />
                  <span className="text-muted-foreground">Gas:</span>
                  <span className="font-medium">{info.label}</span>
                </div>
              );
            })()}
            {electricityStatus && (() => {
              const info = getSupplyIcon(electricityStatus);
              return (
                <div className="flex items-center gap-2 text-sm">
                  <Zap className={cn("h-3.5 w-3.5", info.color)} />
                  <span className="text-muted-foreground">Electricidad:</span>
                  <span className="font-medium">{info.label}</span>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Documentos */}
      {(budgetPdfUrl || driveFolderUrl) && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Documentos</h3>
          <div className="space-y-1.5">
            {budgetPdfUrl && (
              <a href={budgetPdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-brand dark:text-brand-400 hover:underline">
                <FileText className="h-3.5 w-3.5" />
                Presupuesto PDF
              </a>
            )}
            {driveFolderUrl && (
              <a href={driveFolderUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-brand dark:text-brand-400 hover:underline">
                <FolderOpen className="h-3.5 w-3.5" />
                Carpeta Drive
              </a>
            )}
          </div>
        </div>
      )}

      {/* Fotos */}
      {picsUrls.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fotos</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {picsUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-md overflow-hidden bg-muted hover:opacity-80 transition-opacity">
                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Notas */}
      {property.setupStatusNotes && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notas</h3>
          <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{property.setupStatusNotes}</p>
        </div>
      )}
    </div>
  );
}
