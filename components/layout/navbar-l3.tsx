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
  // Separar acciones: guardar (outline) y enviar (default/primary)
  const saveAction = actions.find(a => a.variant === "outline");
  const submitAction = actions.find(a => a.variant === "default" || !a.variant);

  return (
    <nav className="absolute top-0 left-0 right-0 z-20 border-b bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-900)] px-4 md:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Zona A: Botón de Retroceso + Título del Formulario */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 flex-shrink-0 hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden md:inline">{backLabel}</span>
          </Button>

          {/* Título del Formulario */}
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

        {/* Zona C: Acciones - Guardar y Enviar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {saveAction && (
            <Button
              variant="outline"
              onClick={saveAction.onClick}
              disabled={saveAction.disabled}
              className="flex items-center gap-2 rounded-full"
            >
              {saveAction.icon}
              {saveAction.label}
            </Button>
          )}
          {submitAction && (
            <Button
              onClick={submitAction.onClick}
              disabled={submitAction.disabled}
              className="flex items-center gap-2 rounded-full bg-[var(--prophero-blue-600)] hover:bg-[var(--prophero-blue-700)] text-white"
            >
              {submitAction.icon}
              {submitAction.label}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}




