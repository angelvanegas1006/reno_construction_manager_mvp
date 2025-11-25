"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavbarL3Props {
  /** Zona A: Botón de Retroceso */
  onBack: () => void;
  backLabel?: string;
  /** Zona B: Título del Formulario */
  formTitle: string;
  /** Zona C: Acciones del formulario */
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
  /** Información adicional (ej: "Cambios guardados hace X minutos") */
  statusText?: string;
}

/**
 * Navbar L3 - Vista de Formulario
 * 
 * Gestión de Flujo: permite salir del flujo o identificar el contexto superior.
 * 
 * Zonas:
 * - A: Botón "Atrás" - Siempre para movimiento y contexto global
 * - B: Título del Formulario - Identifica el formulario que se está completando
 * - C: Acciones - Guardar, Enviar, etc.
 * 
 * Nota: En L3 el Sidebar muestra navegación de contenido (pasos del formulario).
 */
export function NavbarL3({
  onBack,
  backLabel = "Atrás",
  formTitle,
  actions = [],
  statusText,
}: NavbarL3Props) {
  return (
    <nav className="border-b bg-card dark:bg-[var(--prophero-gray-900)] px-4 md:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Zona A: Botón de Retroceso */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden md:inline">{backLabel}</span>
          </Button>

          {/* Zona B: Título del Formulario */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">
              {formTitle}
            </h1>
            {statusText && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {statusText}
              </p>
            )}
          </div>
        </div>

        {/* Zona C: Acciones */}
        {actions.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "default"}
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  "flex items-center gap-2",
                  action.variant === "outline" && "rounded-full"
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


