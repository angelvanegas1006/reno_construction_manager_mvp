"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";
import type { Property } from "@/lib/property-storage";

interface RenoProjectCardProps {
  project: ProjectRow;
  onClick?: () => void;
  isHighlighted?: boolean;
  /** Propiedades vinculadas a este proyecto (properties.project_id) */
  linkedProperties?: Property[];
}

export function RenoProjectCard({ project, onClick, isHighlighted, linkedProperties = [] }: RenoProjectCardProps) {
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
      // no es JSON, usar rawArea si no es vacío "falso"
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

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border-2 border-border bg-card p-4 shadow-sm transition-all duration-200",
        "hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.15)] dark:hover:bg-[#1a1a1a] dark:hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.6)]",
        isHighlighted &&
          "ring-2 ring-[var(--prophero-blue-500)] border-[var(--prophero-blue-500)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]/30"
      )}
    >
      {/* ID y tag investment type arriba (como en propiedades) */}
      <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
        <div className="text-xs font-semibold text-muted-foreground truncate min-w-0">
          ID {projectIdDisplay}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isFlip && (
            <Badge
              variant="outline"
              className="text-xs border-green-600 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
            >
              Flip
            </Badge>
          )}
          {isYield && (
            <Badge
              variant="outline"
              className="text-xs border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30"
            >
              Yield
            </Badge>
          )}
          {!isFlip && !isYield && investmentType && (
            <Badge variant="secondary" className="text-xs">
              {project.investment_type}
            </Badge>
          )}
        </div>
      </div>

      {/* Nombre del proyecto + area cluster */}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-foreground break-words line-clamp-2">
          {name}
          {areaCluster && (
            <span className="text-xs text-muted-foreground ml-1">({areaCluster})</span>
          )}
        </p>
      </div>

      {/* Tag type (Project / WIP) + Nº Propiedades a la derecha */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
        {showTypeTag && (
          <span
            className={cn(
              getTypeTagStyles(),
              "inline-flex items-center rounded-full text-xs font-medium px-2 py-1"
            )}
          >
            {typeRaw || "Project"}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          Nº Propiedades: {linkedProperties.length}
        </span>
      </div>

    </button>
  );
}
