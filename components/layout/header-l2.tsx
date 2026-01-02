"use client";

import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  /** Botón de retroceso (opcional) */
  onBack?: () => void;
  backLabel?: string;
  /** Acciones críticas (opcional) */
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
    icon?: React.ReactNode;
  }>;
  /** Callback para abrir sidebar en móvil (opcional) */
  onOpenSidebar?: () => void;
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
  onBack,
  backLabel = "Atrás",
  actions = [],
  onOpenSidebar,
}: HeaderL2Props) {
  return (
    <header className={cn("border-b bg-card dark:bg-[var(--prophero-gray-900)] px-3 md:px-4 lg:px-6 py-4 md:py-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-1">
            {/* Primera fila: Botón Atrás + Título + Badge + Progress */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Botón Atrás (si se proporciona) */}
              {onBack && (
                <Button
                  variant="ghost"
                  onClick={onBack}
                  className="flex items-center gap-1 md:gap-2 flex-shrink-0 -ml-1 md:ml-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden md:inline">{backLabel}</span>
                </Button>
              )}
              
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
                      className="text-[var(--prophero-gray-200)] dark:text-[var(--prophero-gray-700)]"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${progress} ${100 - progress}`}
                      className="text-foreground dark:text-foreground transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-foreground">{progress}%</span>
                  </div>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground truncate">
                  {title}
                </h1>
                
                {/* Subtítulo justo debajo del título, alineado con el texto */}
                {subtitle && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {typeof subtitle === "string" ? <p>{subtitle}</p> : subtitle}
                  </div>
                )}
              </div>
              
              {badge && (
                <span
                  className={cn(
                    "px-2 py-1 text-xs font-medium rounded-full flex-shrink-0",
                    badge.variant === "destructive" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                    badge.variant === "secondary" && "bg-muted text-foreground dark:bg-muted/50",
                    !badge.variant && "bg-muted text-foreground dark:bg-muted/50"
                  )}
                >
                  {badge.label}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Acciones (Botón Reportar Problema, etc.) */}
        <div className="flex items-start gap-2 flex-shrink-0">
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
    </header>
  );
}











