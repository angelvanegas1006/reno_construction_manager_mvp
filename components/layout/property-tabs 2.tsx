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
    <div className={cn("border-b bg-card", className)}>
      <nav className="flex items-center gap-1 px-3 md:px-4 lg:px-6 overflow-x-auto scrollbar-hidden">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0",
                "border-b-2 border-transparent",
                isActive
                  ? "text-primary border-primary"
                  : "text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              )}
            >
              <span className="flex items-center gap-1.5 md:gap-2">
                {tab.label}
                {tab.badge && (
                  <span className="inline-flex items-center justify-center h-4 w-4 md:h-5 md:w-5 rounded-full bg-red-500 text-white text-[10px] md:text-xs font-semibold">
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}


