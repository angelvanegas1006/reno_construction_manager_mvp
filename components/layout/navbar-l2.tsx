"use client";

import { ArrowLeft, Info } from "lucide-react";
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
  /** Callback para abrir sidebar en móvil */
  onOpenSidebar?: () => void;
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
  onOpenSidebar,
}: NavbarL2Props) {
  return (
    <nav className="border-b bg-card dark:bg-[var(--prophero-gray-900)] px-3 md:px-4 lg:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between gap-2 md:gap-4 min-w-0">
        {/* Zona A: Botón de Retroceso - Alineado a la izquierda con espacio para hamburger */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0 pl-12 md:pl-0">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-1 md:gap-2 flex-shrink-0 -ml-1 md:ml-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden md:inline">{backLabel}</span>
          </Button>

          {/* Zona B: Título de la Clase (opcional) */}
          {classNameTitle && (
            <>
              <div className="h-6 w-px bg-border hidden md:block flex-shrink-0" />
              <h1 className="text-base md:text-lg font-semibold text-foreground truncate min-w-0">
                {classNameTitle}
              </h1>
            </>
          )}
        </div>

        {/* Zona C: Acciones Críticas + Mobile Sidebar Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mobile Sidebar Button */}
          {onOpenSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSidebar}
              className="lg:hidden"
              aria-label="Open sidebar"
            >
              <Info className="h-5 w-5" />
            </Button>
          )}
          
          {actions.length > 0 && (
            <>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  onClick={action.onClick}
                  className={cn(
                    "flex items-center gap-1 md:gap-2 text-xs md:text-sm",
                    action.variant === "outline" && "border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-700"
                  )}
                >
                  {action.icon}
                  <span className="hidden sm:inline">{action.label}</span>
                </Button>
              ))}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

