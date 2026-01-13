"use client";

import { Search, Menu, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterIcon } from "@/components/icons/filter-icon";
import { useI18n } from "@/lib/i18n";

interface KanbanHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onMenuToggle?: () => void;
  onAddProperty?: () => void;
}

export function KanbanHeader({ searchQuery, setSearchQuery, onMenuToggle, onAddProperty }: KanbanHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="border-b bg-card dark:bg-[var(--prophero-gray-900)] px-3 md:px-6 py-3 md:py-4">
      {/* Mobile Layout */}
      <div className="flex flex-col gap-3 md:hidden">
        {/* Top row: Menu, Title, Filter */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors flex-shrink-0"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          
          <h1 className="text-lg font-bold text-foreground flex-1 truncate">{t.partner.management}</h1>

          <button
            onClick={() => {
              console.log("Filter - Coming soon");
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors flex-shrink-0"
            aria-label={t.kanban.filterProperties}
          >
            <FilterIcon className="h-4 w-4 text-foreground" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t.kanban.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-full pl-10 w-full bg-background border-input"
          />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between gap-4">
        {/* Title - Left aligned */}
        <h1 className="text-2xl font-bold text-foreground whitespace-nowrap">{t.partner.management}</h1>

        {/* Right section: Search, Filter */}
        <div className="flex items-center gap-4">
          {/* Search Bar - Pill shape with rounded-full */}
          <div className="relative w-[320px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.kanban.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-full pl-10 w-full"
            />
          </div>

          {/* Separator */}
          <div className="h-10 w-px bg-border" />

          {/* Filter Button - Circular with darker background for visibility */}
          <button
            onClick={() => {
              console.log("Filter - Coming soon");
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] hover:bg-[var(--prophero-gray-200)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
            aria-label={t.kanban.filterProperties}
          >
            <FilterIcon className="h-4 w-4 text-foreground" />
          </button>

          {/* Add Property Button - Pill shape with rounded-full (Desktop) */}
          <Button 
            onClick={onAddProperty}
            className="rounded-full"
          >
            <Plus className="h-4 w-4" />
            {t.kanban.addProperty}
          </Button>
        </div>
      </div>
    </header>
  );
}

