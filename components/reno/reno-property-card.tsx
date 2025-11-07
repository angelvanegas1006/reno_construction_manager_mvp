"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { isPropertyExpired } from "@/lib/property-sorting";

type RenoStage = "initial-check" | "upcoming" | "reno-in-progress" | "furnishing-cleaning" | "final-check" | "reno-fixes" | "done";

interface RenoPropertyCardProps {
  property: Property;
  stage: RenoStage;
  onClick?: () => void;
  disabled?: boolean;
  isHighlighted?: boolean;
  showRenoDetails?: boolean; // Show reno-specific info (renovador, fechas, etc.)
}

export function RenoPropertyCard({
  property,
  stage,
  onClick,
  disabled = false,
  isHighlighted = false,
  showRenoDetails = true,
}: RenoPropertyCardProps) {
  const isExpired = isPropertyExpired(property);

  const needsUpdateToday = property.proximaActualizacion
    ? new Date(property.proximaActualizacion).toDateString() === new Date().toDateString()
    : false;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div 
      data-property-id={property.id}
      className={cn(
        "rounded-lg border-2 border-border bg-card dark:bg-[var(--prophero-gray-900)] p-4 shadow-sm w-full",
        "transition-shadow duration-500 ease-out",
        disabled 
          ? "cursor-not-allowed opacity-60" 
          : "cursor-pointer hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.15)]",
        isHighlighted 
          ? "ring-2 ring-[var(--prophero-blue-500)] shadow-lg border-[var(--prophero-blue-500)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]/30" 
          : "",
        isExpired && "border-l-4 border-l-red-100 dark:border-l-red-900/30"
      )}
      onClick={disabled ? undefined : onClick}
    >
      {/* ID and Expired tag aligned at top */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-muted-foreground">ID {property.id}</div>
        {isExpired && (
          <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 flex-shrink-0">
            Vencida
          </span>
        )}
      </div>
      
      {/* Address with region integrated */}
      <div className="mb-2 min-w-0">
        <div className="text-sm font-medium text-foreground break-words line-clamp-2">
          {property.fullAddress}
          {property.region && showRenoDetails && (
            <span className="text-xs text-muted-foreground ml-1">({property.region})</span>
          )}
        </div>
      </div>

      {/* Tags */}
      {showRenoDetails && property.renoType && (
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge 
            variant="secondary" 
            className="bg-[var(--prophero-success)]/20 text-[var(--prophero-success)] border border-[var(--prophero-success)]/30 dark:bg-[var(--prophero-success)]/10 dark:text-[var(--prophero-success)] dark:border-[var(--prophero-success)]/20 font-medium"
          >
            {property.renoType}
          </Badge>
        </div>
      )}

      {/* Stage-specific content */}
      {stage === "initial-check" || stage === "final-check" ? (
        <div className="space-y-2">
          {showRenoDetails && property.renovador && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)]">
                <span className="text-xs font-semibold text-foreground">
                  {property.renovador.length > 2 ? property.renovador.substring(0, 2).toUpperCase() : property.renovador.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Jefe de Obra</span>
            </div>
          )}
          {showRenoDetails && property.proximaActualizacion && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>
                Próxima: {formatDate(property.proximaActualizacion)}
                {needsUpdateToday && (
                  <span className="ml-1 text-[var(--prophero-blue-600)] font-medium">(Hoy)</span>
                )}
              </span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">Hace {property.timeInStage}</div>
        </div>
      ) : stage === "reno-in-progress" ? (
        <div className="space-y-2">
          {showRenoDetails && property.renovador && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)]">
                <span className="text-xs font-semibold text-foreground">
                  {property.renovador.length > 2 ? property.renovador.substring(0, 2).toUpperCase() : property.renovador.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Jefe de Obra</span>
            </div>
          )}
          {showRenoDetails && property.proximaActualizacion && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>
                Próxima: {formatDate(property.proximaActualizacion)}
                {needsUpdateToday && (
                  <span className="ml-1 text-[var(--prophero-blue-600)] font-medium">(Hoy)</span>
                )}
              </span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">Obra en proceso hace {property.timeInStage}</div>
        </div>
      ) : stage === "furnishing-cleaning" || stage === "reno-fixes" ? (
        <div className="space-y-2">
          {showRenoDetails && property.renovador && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)]">
                <span className="text-xs font-semibold text-foreground">
                  {property.renovador.length > 2 ? property.renovador.substring(0, 2).toUpperCase() : property.renovador.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Jefe de Obra</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {stage === "furnishing-cleaning" && "Limpieza y amoblamiento hace "}
            {stage === "reno-fixes" && "Reparaciones hace "}
            {property.timeInStage}
          </div>
        </div>
      ) : stage === "upcoming" ? (
        <div className="space-y-2">
          {showRenoDetails && property.renovador && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)]">
                <span className="text-xs font-semibold text-foreground">
                  {property.renovador.length > 2 ? property.renovador.substring(0, 2).toUpperCase() : property.renovador.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Jefe de Obra</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">Hace {property.timeInStage}</div>
        </div>
      ) : stage === "done" ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Finalizada hace {property.timeInStage}</div>
        </div>
      ) : null}
    </div>
  );
}
