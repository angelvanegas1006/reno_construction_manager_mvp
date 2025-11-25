"use client";

import { Search } from "lucide-react";
import { FilterIcon } from "@/components/icons/filter-icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NavbarL1Props {
  /** Zona B: Nombre corto de la Clase (opcional) */
  classNameTitle?: string;
  /** Zona C: Buscador */
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  /** Zona C: Filtros */
  onFilterClick?: () => void;
  /** Zona C: Número de filtros activos para mostrar badge */
  filterBadgeCount?: number;
  /** Zona C: CTA Principal */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  /** Zona C: Acciones secundarias */
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }>;
}

/**
 * Navbar L1 - Vista de Tabla/Lista
 * 
 * Navegación secundaria: aplica acciones al contenido de la sección seleccionada en el Sidebar.
 * 
 * Zonas:
 * - A: (No aplica en L1, solo en L2/L3)
 * - B: Nombre corto de la Clase (opcional, ej: "Propiedad", "Presupuesto")
 * - C: Buscador, Filtros, Acciones Secundarias y CTA Principal
 */
export function NavbarL1({
  classNameTitle,
  searchQuery,
  setSearchQuery,
  onFilterClick,
  filterBadgeCount = 0,
  primaryAction,
  secondaryActions,
}: NavbarL1Props) {
  const { t } = useI18n();

  return (
    <nav className="border-b bg-card dark:bg-[var(--prophero-gray-900)] px-4 md:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Zona B: Nombre corto de la Clase (opcional) */}
        {classNameTitle && (
          <h1 className="text-xl font-semibold text-foreground whitespace-nowrap">
            {classNameTitle}
          </h1>
        )}

        {/* Zona C: Buscador, Filtros y Acciones */}
        <div className="flex items-center gap-3 flex-1 max-w-2xl ml-auto">
          {/* Buscador */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.kanban.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-input rounded-full"
            />
          </div>

          {/* Filtros */}
          {onFilterClick && (
            <button
              onClick={onFilterClick}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors flex-shrink-0"
              aria-label={t.kanban.filterProperties}
            >
              <FilterIcon className="h-4 w-4 text-foreground" />
              {filterBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--prophero-blue-600)] text-xs font-semibold text-white">
                  {filterBadgeCount}
                </span>
              )}
            </button>
          )}

          {/* Separador visual */}
          {(onFilterClick || primaryAction || secondaryActions) && (
            <div className="h-10 w-px bg-border" />
          )}

          {/* Acciones secundarias */}
          {secondaryActions?.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={action.onClick}
              className="rounded-full"
            >
              {action.icon}
              <span className="hidden md:inline">{action.label}</span>
            </Button>
          ))}

          {/* CTA Principal */}
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              className="rounded-full"
            >
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}


