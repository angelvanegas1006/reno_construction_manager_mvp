"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface PropertyCardProps {
  id: string;
  address: string;
  stage: "draft" | "review" | "needs-correction" | "negotiation" | "pending-arras" | "settlement" | "sold" | "rejected" | "initial-check" | "upcoming" | "reno-in-progress" | "furnishing-cleaning" | "final-check" | "reno-fixes" | "done";
  price?: number;
  analyst?: string;
  completion?: number;
  correctionsCount?: number;
  timeInStage: string;
  timeCreated?: string;
  onClick?: () => void;
  disabled?: boolean;
  isHighlighted?: boolean;
}

export function PropertyCard({
  id,
  address,
  stage,
  price,
  analyst,
  completion,
  correctionsCount,
  timeInStage,
  timeCreated,
  onClick,
  disabled = false,
  isHighlighted = false,
}: PropertyCardProps) {
  return (
    <div 
      data-property-id={id}
      className={cn(
        "rounded-lg border border-border bg-card dark:bg-v-gray-900 p-4 shadow-sm w-full",
        "transition-all duration-500 ease-out",
        disabled 
          ? "cursor-not-allowed opacity-60" 
          : "cursor-pointer hover:border-2 hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.15)]",
        isHighlighted 
          ? "ring-2 ring-brand-500 shadow-lg border-brand-500 bg-brand-50 dark:bg-brand-950/30" 
          : "",
      )}
      onClick={disabled ? undefined : onClick}
    >
      {/* ID */}
      <div className="text-xs font-semibold text-muted-foreground mb-2">ID {id}</div>
      
      {/* Address */}
      <div className="text-sm font-medium text-foreground mb-3">{address}</div>

      {/* Stage-specific content */}
      {stage === "draft" && completion !== undefined && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{completion}% completado</span>
          </div>
          <Progress value={completion} className="h-1.5" />
          {timeCreated && (
            <div className="text-xs text-muted-foreground">Borrador creado hace {timeCreated}</div>
          )}
        </div>
      )}

      {stage === "review" && analyst && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-v-gray-200 dark:bg-v-gray-700">
              <span className="text-xs font-semibold text-foreground">{analyst}</span>
            </div>
            <span className="text-xs text-muted-foreground">Supply Analyst</span>
          </div>
          <div className="text-xs text-muted-foreground">En revisión hace {timeInStage}</div>
        </div>
      )}

      {stage === "needs-correction" && analyst && correctionsCount !== undefined && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-v-gray-200 dark:bg-v-gray-700">
              <span className="text-xs font-semibold text-foreground">{analyst}</span>
            </div>
            <span className="text-xs text-muted-foreground">Supply Analyst</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-danger-bg dark:bg-danger/30 px-2 py-1 text-xs font-medium text-danger dark:text-danger">
              {correctionsCount} correcciones pendientes
            </span>
          </div>
          <div className="text-xs text-muted-foreground">En corrección hace {timeInStage}</div>
        </div>
      )}

      {stage === "negotiation" && price && analyst && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {new Intl.NumberFormat("es-ES", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 2,
            }).format(price)}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-v-gray-200 dark:bg-v-gray-700">
              <span className="text-xs font-semibold text-foreground">{analyst}</span>
            </div>
            <span className="text-xs text-muted-foreground">Supply Analyst</span>
          </div>
          <div className="text-xs text-muted-foreground">En negociación hace {timeInStage}</div>
        </div>
      )}

      {(stage === "pending-arras" || stage === "settlement" || stage === "sold" || stage === "rejected") && (
        <div className="text-xs text-muted-foreground">
          {stage === "pending-arras" && `Pendiente de arras hace ${timeInStage}`}
          {stage === "settlement" && `En escrituración hace ${timeInStage}`}
          {stage === "sold" && `Vendido hace ${timeInStage}`}
          {stage === "rejected" && `Rechazado hace ${timeInStage}`}
        </div>
      )}

      {/* Reno Construction Manager stages */}
      {(stage === "initial-check" || stage === "upcoming" || stage === "final-check") && price && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">
            {new Intl.NumberFormat("es-ES", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 2,
            }).format(price)}
          </div>
          {analyst && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-v-gray-200 dark:bg-v-gray-700">
                <span className="text-xs font-semibold text-foreground">{analyst}</span>
              </div>
              <span className="text-xs text-muted-foreground">Jefe de Obra</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">Hace {timeInStage}</div>
        </div>
      )}

      {stage === "reno-in-progress" && analyst && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-v-gray-200 dark:bg-v-gray-700">
              <span className="text-xs font-semibold text-foreground">{analyst}</span>
            </div>
            <span className="text-xs text-muted-foreground">Jefe de Obra</span>
          </div>
          {price && (
            <div className="text-sm font-semibold text-foreground">
              {new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 2,
              }).format(price)}
            </div>
          )}
          <div className="text-xs text-muted-foreground">Obra en proceso hace {timeInStage}</div>
        </div>
      )}

      {stage === "furnishing-cleaning" && analyst && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-v-gray-200 dark:bg-v-gray-700">
              <span className="text-xs font-semibold text-foreground">{analyst}</span>
            </div>
            <span className="text-xs text-muted-foreground">Jefe de Obra</span>
          </div>
          <div className="text-xs text-muted-foreground">Limpieza y amoblamiento hace {timeInStage}</div>
        </div>
      )}

      {stage === "reno-fixes" && analyst && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-v-gray-200 dark:bg-v-gray-700">
              <span className="text-xs font-semibold text-foreground">{analyst}</span>
            </div>
            <span className="text-xs text-muted-foreground">Jefe de Obra</span>
          </div>
          <div className="text-xs text-muted-foreground">Reparaciones hace {timeInStage}</div>
        </div>
      )}

      {stage === "done" && (
        <div className="space-y-2">
          {price && (
            <div className="text-sm font-semibold text-foreground">
              {new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 2,
              }).format(price)}
            </div>
          )}
          <div className="text-xs text-muted-foreground">Finalizada hace {timeInStage}</div>
        </div>
      )}
    </div>
  );
}

