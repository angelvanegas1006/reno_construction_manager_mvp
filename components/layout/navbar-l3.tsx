"use client";

import { ArrowLeft, Menu, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

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

  // Estado para controlar visibilidad de botones en mobile cuando se hace scroll
  const [showActionsInMobile, setShowActionsInMobile] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    let lastScrollY = 0;
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      
      // Mostrar botones cuando se hace scroll hacia arriba o está en el top
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setShowActionsInMobile(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Ocultar cuando se hace scroll hacia abajo y se ha pasado de 100px
        setShowActionsInMobile(false);
      }
      
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  return (
    <>
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
            {/* Mobile menu button */}
            {onMenuClick && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden flex-shrink-0 z-50 relative"
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

          {/* Zona C: Acciones - Guardar y Enviar (ocultar en mobile cuando se hace scroll hacia abajo) */}
          <div className={cn(
            "flex items-center gap-2 flex-shrink-0",
            isMobile && !showActionsInMobile && "hidden"
          )}>
            {saveAction && (
              <Button
                variant="outline"
                onClick={saveAction.onClick}
                disabled={saveAction.disabled}
                className="flex items-center gap-2 rounded-full"
              >
                {saveAction.icon || <Save className="h-4 w-4" />}
                {saveAction.label}
              </Button>
            )}
            {submitAction && (
              <Button
                onClick={submitAction.onClick}
                disabled={submitAction.disabled}
                className="flex items-center gap-2 rounded-full bg-[var(--prophero-blue-600)] hover:bg-[var(--prophero-blue-700)] text-white"
              >
                {submitAction.icon || <Send className="h-4 w-4" />}
                {submitAction.label}
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Footer sticky para mobile - mostrar cuando se hace scroll hacia arriba */}
      {isMobile && (
        <div className={cn(
          "fixed bottom-0 left-0 right-0 z-30 border-t bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-900)] px-4 py-3 md:hidden transition-transform duration-300",
          showActionsInMobile ? "translate-y-full" : "translate-y-0"
        )}>
          <div className="flex items-center gap-2 w-full">
            {saveAction && (
              <Button
                variant="outline"
                onClick={saveAction.onClick}
                disabled={saveAction.disabled}
                className="flex-1 flex items-center justify-center gap-2 rounded-full"
              >
                {saveAction.icon || <Save className="h-4 w-4" />}
                {saveAction.label}
              </Button>
            )}
            {submitAction && (
              <Button
                onClick={submitAction.onClick}
                disabled={submitAction.disabled}
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[var(--prophero-blue-600)] hover:bg-[var(--prophero-blue-700)] text-white"
              >
                {submitAction.icon || <Send className="h-4 w-4" />}
                {submitAction.label}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}




