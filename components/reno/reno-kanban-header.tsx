"use client";

import { Search } from "lucide-react";
import { FilterIcon } from "@/components/icons/filter-icon";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

interface RenoKanbanHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onMenuToggle?: () => void;
}

export function RenoKanbanHeader({ searchQuery, setSearchQuery, onMenuToggle }: RenoKanbanHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="border-b bg-card dark:bg-[var(--prophero-gray-900)] px-3 md:px-6 py-4">
      {/* Mobile Layout */}
      <div className="flex flex-col gap-3 md:hidden">
        {/* Top row: Menu, Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors flex-shrink-0"
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold flex-1 truncate">{t.property.management}</h1>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.kanban.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-input"
            />
          </div>
          <button
            onClick={() => {
              console.log("Filter - Coming soon");
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
            aria-label={t.kanban.filterProperties}
          >
            <FilterIcon className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{t.property.management}</h1>
        
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.kanban.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-input"
            />
          </div>
          <button
            onClick={() => {
              console.log("Filter - Coming soon");
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
            aria-label={t.kanban.filterProperties}
          >
            <FilterIcon className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}

