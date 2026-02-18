"use client";

import { useState, useEffect } from "react";
import { Search, LayoutGrid, List, RefreshCw } from "lucide-react";
import { FilterIcon } from "@/components/icons/filter-icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ViewMode = "kanban" | "list";

interface NavbarL1Props {
  /** Zona B: Nombre corto de la Clase (opcional) */
  classNameTitle?: string;
  /** Zona C: Buscador */
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  /** Zona C: Botón Sync con Airtable (a la izquierda del buscador) */
  syncAirtableButton?: {
    label: string;
    onClick: () => void | Promise<void>;
    loading?: boolean;
  };
  /** Zona C: Filtros */
  onFilterClick?: () => void;
  /** Zona C: Número de filtros activos para mostrar badge */
  filterBadgeCount?: number;
  /** Zona C: Modo de vista (kanban/list) */
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
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
    disabled?: boolean;
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
  syncAirtableButton,
  onFilterClick,
  filterBadgeCount = 0,
  viewMode,
  onViewModeChange,
  primaryAction,
  secondaryActions,
}: NavbarL1Props) {
  const { t } = useI18n();
  // Evitar hydration mismatch: filterBadgeCount puede venir de localStorage (solo en cliente)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const showFilterBadge = mounted && (filterBadgeCount ?? 0) > 0;

  return (
    <nav className="border-b bg-card px-4 md:px-3 lg:px-4 py-3 md:py-3 relative">
      {/* Mobile Layout */}
      <div className="flex flex-col md:hidden gap-3">
        {/* Title */}
        {classNameTitle && (
          <h1 className="text-lg font-semibold text-foreground truncate pl-14 min-w-0">
            {classNameTitle}
          </h1>
        )}
        
        {/* Search and Filter Row - móvil: buscador primero (grande), luego Sync AT compacto */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Buscador (prioridad en móvil: flex-1 para que ocupe el espacio) */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.kanban.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-input rounded-full w-full min-w-0"
            />
          </div>

          {/* Sync con Airtable - móvil: solo "Sync AT" + icono (ruleta al cargar) */}
          {syncAirtableButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={syncAirtableButton.onClick}
              disabled={syncAirtableButton.loading}
              className="rounded-full flex-shrink-0 gap-1 h-9 px-2.5 min-w-0"
              aria-label={syncAirtableButton.label}
            >
              <RefreshCw className={cn("h-4 w-4 flex-shrink-0", syncAirtableButton.loading && "animate-spin")} />
              <span className="text-xs whitespace-nowrap md:hidden">Sync AT</span>
            </Button>
          )}

          {/* Filtros */}
          {onFilterClick && (
            <button
              onClick={onFilterClick}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-gray-100)] dark:bg-[#1a1a1a] hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[#262626] transition-colors flex-shrink-0"
              aria-label={t.kanban.filterProperties}
            >
              <FilterIcon className="h-4 w-4 text-foreground" />
              {showFilterBadge && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--prophero-blue-600)] text-xs font-semibold text-white">
                  {filterBadgeCount}
                </span>
              )}
            </button>
          )}

          {/* View Mode Toggle - Mobile */}
          {onViewModeChange && viewMode && (
            <div className="flex items-center gap-1 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg p-1">
              <button
                onClick={() => onViewModeChange("kanban")}
                className={cn(
                  "px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1",
                  viewMode === "kanban"
                    ? "bg-[var(--prophero-blue-500)] text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Kanban view"
              >
                <LayoutGrid className="h-3 w-3" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
              <button
                onClick={() => onViewModeChange("list")}
                className={cn(
                  "px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1",
                  viewMode === "list"
                    ? "bg-[var(--prophero-blue-500)] text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="List view"
              >
                <List className="h-3 w-3" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between gap-4">
        {/* Zona B: Nombre corto de la Clase (opcional) */}
        {classNameTitle && (
          <h1 className="text-xl lg:text-2xl font-semibold text-foreground whitespace-nowrap min-w-0">
            {classNameTitle}
          </h1>
        )}

        {/* Zona C: Buscador, Filtros y Acciones */}
        <div className="flex items-center gap-3 flex-1 max-w-2xl ml-auto min-w-0">
          {/* Sync con Airtable (a la izquierda del buscador) */}
          {syncAirtableButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={syncAirtableButton.onClick}
              disabled={syncAirtableButton.loading}
              className="rounded-full flex-shrink-0 gap-2 h-10 px-3"
              aria-label={syncAirtableButton.label}
            >
              <RefreshCw className={cn("h-4 w-4", syncAirtableButton.loading && "animate-spin")} />
              <span>{syncAirtableButton.label}</span>
            </Button>
          )}

          {/* Buscador */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.kanban.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-input rounded-full w-full min-w-0"
            />
          </div>

          {/* Filtros */}
          {onFilterClick && (
            <button
              onClick={onFilterClick}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-gray-100)] dark:bg-[#1a1a1a] hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[#262626] transition-colors flex-shrink-0"
              aria-label={t.kanban.filterProperties}
            >
              <FilterIcon className="h-4 w-4 text-foreground" />
              {showFilterBadge && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--prophero-blue-600)] text-xs font-semibold text-white">
                  {filterBadgeCount}
                </span>
              )}
            </button>
          )}

          {/* View Mode Toggle - Desktop */}
          {onViewModeChange && viewMode && (
            <div className="flex items-center gap-1 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg p-1">
              <button
                onClick={() => onViewModeChange("kanban")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                  viewMode === "kanban"
                    ? "bg-[var(--prophero-blue-500)] text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Kanban view"
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </button>
              <button
                onClick={() => onViewModeChange("list")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                  viewMode === "list"
                    ? "bg-[var(--prophero-blue-500)] text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
                List
              </button>
            </div>
          )}

          {/* Separador visual */}
          <div className="h-10 w-px bg-border" />

          {/* Acciones secundarias */}
          {secondaryActions?.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={action.onClick}
              disabled={action.disabled}
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


