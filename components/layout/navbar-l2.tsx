"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavbarL2Props {
  /** Zona A: Botón de Retroceso */
  onBack: () => void;
  backLabel?: string;
  /** Zona B: Nombre corto de la Clase (opcional) */
  classNameTitle?: string;
  /** Zona C: Acciones críticas */
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
    icon?: React.ReactNode;
  }>;
}

/**
 * Navbar L2 - Vista de Detalle
 * 
 * Gestión de Flujo: permite salir del flujo o identificar el contexto superior.
 * 
 * Zonas:
 * - A: Botón "Atrás" - Siempre para movimiento y contexto global
 * - B: Título de la Clase (opcional) - Identifica qué tipo de página estamos viendo
 * - C: Acciones Críticas - Siempre para las intersecciones clave de la página
 * 
 * Nota: En L2 el Sidebar se oculta para enfocar al usuario en la sección.
 */
export function NavbarL2({
  onBack,
  backLabel = "Atrás",
  classNameTitle,
  actions = [],
}: NavbarL2Props) {
  return (
    <nav className="border-b bg-card px-4 md:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Zona A: Botón de Retroceso */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden md:inline">{backLabel}</span>
          </Button>

          {/* Zona B: Título de la Clase (opcional) */}
          {classNameTitle && (
            <>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-lg font-semibold text-foreground">
                {classNameTitle}
              </h1>
            </>
          )}
        </div>

        {/* Zona C: Acciones Críticas */}
        {actions.length > 0 && (
          <div className="flex items-center gap-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "default"}
                onClick={action.onClick}
                className={cn(
                  "flex items-center gap-2",
                  action.variant === "outline" && "border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-700"
                )}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

