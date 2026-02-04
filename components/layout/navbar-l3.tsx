"use client";

import { ArrowLeft, Menu, Save, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

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
  /** Acción adicional en la esquina superior derecha (ej: icono de reportar problema) */
  rightAction?: React.ReactNode;
  /** Ref al contenedor con scroll (ej. div overflow-y-auto). Si no se pasa, se usa window. */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
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
  rightAction,
  scrollContainerRef,
}: NavbarL3Props) {
  // Separar acciones: guardar (outline) y enviar (default/primary)
  const saveAction = actions.find(a => a.variant === "outline");
  const submitAction = actions.find(a => a.variant === "default" || !a.variant);

  // Detectar si estamos en mobile
  const [isMobile, setIsMobile] = useState(false);
  // En mobile: mostrar footer solo al hacer scroll hacia arriba o al estar al final de la página
  const [showMobileFooter, setShowMobileFooter] = useState(false);
  const lastScrollY = useRef(0);

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
    const BOTTOM_THRESHOLD = 120;
    const el = scrollContainerRef?.current;

    const onScroll = () => {
      if (el) {
        const scrollTop = el.scrollTop;
        const scrollHeight = el.scrollHeight;
        const clientHeight = el.clientHeight;
        const atBottom = scrollTop + clientHeight >= scrollHeight - BOTTOM_THRESHOLD;
        const scrolledUp = scrollTop < lastScrollY.current;
        lastScrollY.current = scrollTop;
        setShowMobileFooter(atBottom || scrolledUp);
      } else {
        const scrollY = window.scrollY ?? document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const innerHeight = window.innerHeight;
        const atBottom = innerHeight + scrollY >= scrollHeight - BOTTOM_THRESHOLD;
        const scrolledUp = scrollY < lastScrollY.current;
        lastScrollY.current = scrollY;
        setShowMobileFooter(atBottom || scrolledUp);
      }
    };

    if (el) {
      onScroll();
      el.addEventListener('scroll', onScroll, { passive: true });
      return () => el.removeEventListener('scroll', onScroll);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isMobile, scrollContainerRef]);

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

          {/* Zona C: Acciones - Guardar y Enviar (solo en desktop, en mobile van al footer) */}
          {!isMobile && (
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
                  className="flex items-center gap-2 rounded-full bg-[var(--prophero-blue-600)] hover:bg-[var(--prophero-blue-700)] text-white disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitAction.disabled && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {submitAction.icon && !submitAction.disabled && submitAction.icon}
                  {submitAction.label}
                </Button>
              )}
            </div>
          )}
          
          {/* Acción adicional en la esquina superior derecha */}
          {rightAction && (
            <div className="flex items-center flex-shrink-0">
              {rightAction}
            </div>
          )}
        </div>
      </nav>

      {/* Footer sticky para mobile - solo visible al hacer scroll hacia arriba o al final de la página */}
      {isMobile && (
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-[var(--prophero-gray-200)] dark:border-[var(--prophero-gray-700)] shadow-[0_-2px_8px_rgba(0,0,0,0.1)] bg-white dark:bg-[var(--prophero-gray-900)] transition-transform duration-200 ease-out",
            showMobileFooter ? "translate-y-0" : "translate-y-full"
          )}
        >
          <div className="flex flex-col gap-2 w-full max-w-md mx-auto px-3 py-2.5">
            {/* Botón principal: Enviar a revisión */}
            {submitAction && (
              <Button
                onClick={submitAction.onClick}
                disabled={submitAction.disabled}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--prophero-blue-600)] hover:bg-[var(--prophero-blue-700)] text-white h-9 text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitAction.disabled && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {submitAction.icon && !submitAction.disabled && submitAction.icon}
                {submitAction.label}
              </Button>
            )}
            {/* Link secundario: Guardar cambios */}
            {saveAction && (
              <button
                onClick={saveAction.onClick}
                disabled={saveAction.disabled}
                className="w-full text-center text-[var(--prophero-blue-600)] hover:text-[var(--prophero-blue-700)] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium py-1.5"
              >
                {saveAction.icon}
                {saveAction.label}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}




