"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import type { Property } from "@/lib/property-storage";

interface RenoProjectCardProps {
  project: ProjectRow;
  onClick?: () => void;
  isHighlighted?: boolean;
  linkedProperties?: Property[];
  variant?: "default" | "architect";
  phaseElapsedDays?: number | null;
  phaseLimitDays?: number | null;
}

export function RenoProjectCard({ project, onClick, isHighlighted, linkedProperties = [], variant = "default", phaseElapsedDays, phaseLimitDays }: RenoProjectCardProps) {
  const isArchitectVariant = variant === "architect";
  const name = project.name || "Sin nombre";
  const projectIdDisplay = project.project_unique_id || project.id?.slice(0, 8) || project.id;
  const investmentType = (project.investment_type ?? "").toString().trim().toLowerCase();
  const isFlip = investmentType.includes("flip");
  const isYield = investmentType.includes("yield");
  const rawArea = (project.area_cluster ?? "").toString().trim();
  const areaCluster = (() => {
    if (!rawArea) return null;
    const normalized = rawArea.replace(/\s/g, "");
    if (["[]", "[\"\"]", "['']", "\"\"", "''"].includes(normalized)) return null;
    if (/^\[\s*\]$/.test(rawArea)) return null;
    if (/^\[\s*["']?\s*["']?\s*\]$/.test(rawArea)) return null;
    try {
      const parsed = JSON.parse(rawArea);
      if (Array.isArray(parsed)) {
        const parts = parsed.filter((x) => x != null && String(x).trim() !== "");
        if (parts.length === 0) return null;
        return parts.map((x) => String(x).trim()).join(", ");
      }
    } catch {
      // plain string
    }
    return rawArea;
  })();

  const typeRaw = (project.type ?? "").toString().trim();
  const typeLower = typeRaw.toLowerCase();
  const isProject = typeLower === "project";
  const isWIP = typeLower === "wip";
  const isNewBuild = typeLower === "new build";
  const showTypeTag = isProject || isWIP || isNewBuild || typeRaw;

  const getTypeTagStyles = () => {
    if (isProject) return "bg-blue-600 dark:bg-blue-700 text-white dark:text-white";
    if (isWIP) return "bg-sky-200 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-700/50";
    if (isNewBuild) return "bg-blue-200 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800/50";
    if (typeRaw) return "bg-muted text-muted-foreground border border-border";
    return "";
  };

  const p = project as any;
  const propertiesToConvert = p.properties_to_convert;
  const estProperties = p.est_properties;
  const ptcStr = propertiesToConvert != null ? String(propertiesToConvert).trim() : "";
  const propertiesDisplay = ptcStr && ptcStr !== "0" ? ptcStr : (estProperties ?? "—");
  const ecuContact = ((p.ecu_contact as string | null) ?? "").replace(/[\[\]"]/g, "").trim() || null;
  const architect = p.architect as string | null;
  const excludedFromEcu = p.excluded_from_ecu === true;
  const renovationExecutor = (p.renovation_executor as string | null)?.trim() || null;

  const showDaysBadge = phaseElapsedDays != null;
  const isOverLimit = showDaysBadge && phaseLimitDays != null && phaseElapsedDays! > phaseLimitDays;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border-2 border-border bg-card p-4 shadow-sm transition-all duration-200",
        "hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.15)] dark:hover:bg-[#1a1a1a] dark:hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.6)]",
        isHighlighted &&
          "ring-2 ring-[var(--prophero-blue-500)] border-[var(--prophero-blue-500)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]/30",
        isOverLimit && "border-l-4 border-l-red-500"
      )}
    >
      {/* ID + investment type badges */}
      <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
        <div className="text-xs font-semibold text-muted-foreground truncate min-w-0">
          ID: {projectIdDisplay}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {excludedFromEcu ? (
            <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 px-1.5 py-0.5 text-[10px] font-semibold">
              Ayto
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 px-1.5 py-0.5 text-[10px] font-semibold">
              ECU
            </span>
          )}
          {!isArchitectVariant && isFlip && (
            <Badge variant="outline" className="text-xs border-green-600 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30">
              Flip
            </Badge>
          )}
          {!isArchitectVariant && isYield && (
            <Badge variant="outline" className="text-xs border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
              Yield
            </Badge>
          )}
          {!isArchitectVariant && !isFlip && !isYield && investmentType && (
            <Badge variant="secondary" className="text-xs">{project.investment_type}</Badge>
          )}
        </div>
      </div>

      {/* Project name + area cluster */}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-foreground break-words line-clamp-2">
          {name}
          {areaCluster && (
            <span className="text-xs text-muted-foreground ml-1">({areaCluster})</span>
          )}
        </p>
      </div>

      {/* Type tag + Renovation executor + Est. Properties */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {showTypeTag && (
            <span className={cn(getTypeTagStyles(), "inline-flex items-center rounded-full text-xs font-medium px-2 py-1")}>
              {typeRaw || "Proyecto"}
            </span>
          )}
          {!isArchitectVariant && renovationExecutor && (
            <span className={cn(
              "inline-flex items-center rounded-full text-xs font-medium px-2 py-1",
              renovationExecutor.toLowerCase() === "prophero"
                ? "bg-blue-800 dark:bg-blue-900 text-white dark:text-white"
                : renovationExecutor.toLowerCase() === "other"
                  ? "bg-gray-700 dark:bg-gray-800 text-white dark:text-gray-100"
                  : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50"
            )}>
              {renovationExecutor}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          Propiedades: {propertiesDisplay}
        </span>
      </div>

      {/* ECU Contact (only if ECU, not Ayto) + Architect (hidden in architect variant) */}
      {!isArchitectVariant && ((!excludedFromEcu && ecuContact) || architect) && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
          {!excludedFromEcu && ecuContact && (
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-medium text-foreground">Contacto ECU:</span> {ecuContact}
            </p>
          )}
          {architect && (
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-medium text-foreground">Arquitecto:</span> {architect}
            </p>
          )}
        </div>
      )}

      {/* Phase elapsed days badge */}
      {showDaysBadge && (
        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {isOverLimit ? "⚠ " : ""}
            {phaseElapsedDays} {phaseElapsedDays === 1 ? "día" : "días"} en esta fase
          </span>
          {phaseLimitDays != null && (
            <span className={cn("text-xs font-medium", isOverLimit ? "text-red-500" : "text-muted-foreground")}>
              Límite: {phaseLimitDays}d
            </span>
          )}
        </div>
      )}
    </button>
  );
}
