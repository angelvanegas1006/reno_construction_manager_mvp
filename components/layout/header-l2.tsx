"use client";

import { cn } from "@/lib/utils";

interface HeaderL2Props {
  /** Título extenso de la entidad (ej: dirección completa) */
  title: string;
  /** Subtítulo con información adicional */
  subtitle?: string | React.ReactNode;
  /** Badge o tag de estado (opcional) */
  badge?: {
    label: string;
    variant?: "default" | "destructive" | "secondary";
  };
  /** Porcentaje de progreso para mostrar como badge circular (opcional) */
  progress?: number;
  className?: string;
}

/**
 * Header L2 - Vista de Detalle
 * 
 * Contexto: proporciona la identificación detallada de la entidad.
 * 
 * Contenido:
 * - Título extenso de la entidad (ej: dirección completa)
 * - Subtítulo con información adicional
 * - Badge circular de progreso (si se proporciona progress)
 */
export function HeaderL2({
  title,
  subtitle,
  badge,
  progress,
  className,
}: HeaderL2Props) {
  return (
    <header className={cn("border-b bg-card px-4 md:px-6 py-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Progress Badge Circular (si se proporciona) */}
            {progress !== undefined && (
              <div className="relative w-12 h-12 flex-shrink-0">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-v-gray-200 dark:text-v-gray-700"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${progress} ${100 - progress}`}
                    className="text-brand-500 transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground">{progress}%</span>
                </div>
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground truncate">
              {title}
            </h1>
            {badge && (
              <span
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded-full flex-shrink-0",
                  badge.variant === "destructive" && "bg-danger-bg text-danger dark:bg-danger dark:text-danger",
                  badge.variant === "secondary" && "bg-v-gray-100 text-v-gray-800 dark:bg-v-gray-800 dark:text-v-gray-200",
                  !badge.variant && "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200"
                )}
              >
                {badge.label}
              </span>
            )}
          </div>
          {subtitle && (
            <div className="mt-2 text-sm text-muted-foreground">
              {typeof subtitle === "string" ? <p>{subtitle}</p> : subtitle}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}











