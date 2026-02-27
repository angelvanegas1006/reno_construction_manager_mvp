"use client";

import { useI18n } from "@/lib/i18n";
import { FolderKanban } from "lucide-react";

interface RenoHomeHeaderProps {
  assignedProjectsCount?: number;
  onProjectsBadgeClick?: () => void;
}

export function RenoHomeHeader({
  assignedProjectsCount = 0,
  onProjectsBadgeClick,
}: RenoHomeHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="border-b bg-card h-[64px] min-h-[64px] flex items-center mb-3">
      <div className="pl-14 md:pl-6 pr-3 md:pr-6 w-full flex items-center justify-between">
        <h1 className="text-lg md:text-xl lg:text-2xl font-semibold">{t.nav.home}</h1>
        {onProjectsBadgeClick && (
          <button
            onClick={onProjectsBadgeClick}
            aria-label={`Mis proyectos asignados${assignedProjectsCount > 0 ? ` (${assignedProjectsCount})` : ""}`}
            className="relative flex items-center justify-center h-9 w-9 rounded-full border bg-card hover:bg-accent transition-colors"
          >
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            {assignedProjectsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {assignedProjectsCount > 9 ? "9+" : assignedProjectsCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}


