"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderL3Props {
  /** Título de la sección actual del formulario */
  title: string;
  /** Subtítulo descriptivo de la sección */
  subtitle?: string;
  /** Botón de retroceso */
  onBack?: () => void;
  backLabel?: string;
  /** Botón de preview/acción principal */
  previewAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  className?: string;
}

/**
 * Header L3 - Vista de Formulario
 * 
 * Jerarquía de sección: identifica la sección específica del formulario que está siendo completada/editada/revisada.
 * 
 * Contenido:
 * - Título de la sección actual del formulario
 * - Subtítulo descriptivo de la sección
 * - Botón de retroceso a la izquierda
 * - Botón de preview/acción principal a la derecha
 */
export function HeaderL3({
  title,
  subtitle,
  onBack,
  backLabel = "Atrás",
  previewAction,
  className,
}: HeaderL3Props) {
  return (
    <header className={cn(
      "absolute top-0 left-0 right-0 z-10 bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-900)] border-b px-4 md:px-6 py-3",
      className
    )}>
      <div className="flex items-center justify-between gap-4">
        {/* Botón Back a la izquierda */}
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 flex-shrink-0 hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden md:inline">{backLabel}</span>
          </Button>
        )}

        {/* Título y subtítulo en el centro */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* Botón Preview/Acción principal a la derecha */}
        {previewAction && (
          <Button
            onClick={previewAction.onClick}
            disabled={previewAction.disabled}
            className="flex items-center gap-2 rounded-full bg-[var(--prophero-blue-600)] hover:bg-[var(--prophero-blue-700)] text-white flex-shrink-0"
          >
            {previewAction.label}
          </Button>
        )}
      </div>
    </header>
  );
}




