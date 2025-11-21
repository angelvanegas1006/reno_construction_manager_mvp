"use client";

import { Search } from "lucide-react";
import { FilterIcon } from "@/components/icons/filter-icon";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

interface RenoHomeHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function RenoHomeHeader({ searchQuery, setSearchQuery }: RenoHomeHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="border-b bg-card dark:bg-[var(--prophero-gray-900)] px-3 md:px-6 py-4 mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-semibold">{t.nav.home}</h1>
        
        <div className="flex items-center gap-3 w-full md:w-auto md:max-w-md">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.kanban.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-input w-full md:w-64"
            />
          </div>
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
      </div>
    </header>
  );
}

