"use client";

import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  badge?: number | string; // Para mostrar notificaciones o contadores
}

interface PropertyTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * PropertyTabs Component
 * 
 * Componente de tabs para navegación dentro de la página L2 (detalle de propiedad)
 * Similar al diseño de la PDP mostrado en la imagen
 */
export function PropertyTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: PropertyTabsProps) {
  return (
    <div className={cn("border-b bg-card dark:bg-[var(--prophero-gray-900)]", className)}>
      <nav className="flex items-center gap-1 px-4 md:px-6 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                "border-b-2 border-transparent",
                isActive
                  ? "text-primary border-primary"
                  : "text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              )}
            >
              {tab.label}
              {tab.badge && (
                <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}


