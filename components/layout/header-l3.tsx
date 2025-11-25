"use client";

import { cn } from "@/lib/utils";

interface HeaderL3Props {
  /** Título de la sección actual del formulario */
  title: string;
  /** Subtítulo descriptivo de la sección */
  subtitle?: string;
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
 */
export function HeaderL3({
  title,
  subtitle,
  className,
}: HeaderL3Props) {
  return (
    <header className={cn("border-b bg-card dark:bg-[var(--prophero-gray-900)] px-4 md:px-6 py-6", className)}>
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-sm text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}


