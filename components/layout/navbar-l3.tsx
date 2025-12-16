"use client";

import { ArrowLeft, Menu, Save, Send } from "lucide-react";
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
  /** Botón de menú móvil para abrir sidebar */
  onMenuClick?: () => void;
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
  onMenuClick,
}: NavbarL3Props) {
  // Separar acciones: guardar (outline) y enviar (default/primary)
  const saveAction = actions.find(a => a.variant === "outline");
  const submitAction = actions.find(a => a.variant === "default" || !a.variant);

  return (
    <nav className="absolute top-0 left-0 right-0 z-20 border-b bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-900)] px-3 md:px-6 py-2.5 md:py-3">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        {/* Zona A: Botón de Retroceso + Título del Formulario */}
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="flex items-center justify-center flex-shrink-0 hover:bg-muted hover:text-foreground h-8 w-8 md:h-auto md:w-auto md:gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden md:inline">{backLabel}</span>
          </Button>
          {/* Mobile menu button */}
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden flex-shrink-0 z-50 relative h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onMenuClick();
              }}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Título del Formulario */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm md:text-lg font-semibold text-foreground truncate">
              {formTitle}
            </h1>
            {statusText && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {statusText}
              </p>
            )}
          </div>
        </div>

        {/* Zona C: Acciones - Guardar y Enviar */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {saveAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={saveAction.onClick}
              disabled={saveAction.disabled}
              className="flex items-center gap-1 md:gap-2 rounded-full text-xs md:text-sm px-2 md:px-4 h-8 md:h-auto"
              title={saveAction.label}
            >
              {saveAction.icon || <Save className="h-4 w-4" />}
              <span className="hidden sm:inline">{saveAction.label}</span>
            </Button>
          )}
          {submitAction && (
            <Button
              size="sm"
              onClick={submitAction.onClick}
              disabled={submitAction.disabled}
              className="flex items-center gap-1 md:gap-2 rounded-full bg-[var(--prophero-blue-600)] hover:bg-[var(--prophero-blue-700)] text-white text-xs md:text-sm px-2 md:px-4 h-8 md:h-auto"
              title={submitAction.label}
            >
              {submitAction.icon || <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">{submitAction.label}</span>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}




