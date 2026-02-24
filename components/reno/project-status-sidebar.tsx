"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSiteManagersList, getSiteManagerNameFromEmail } from "@/lib/supabase/user-name-utils";
import { useI18n } from "@/lib/i18n";
import { User } from "lucide-react";
import type { ProjectRow } from "@/hooks/useSupabaseProject";

interface ProjectStatusSidebarProps {
  project: ProjectRow;
  onAssign: (projectId: string, email: string | null) => void | Promise<void>;
  disabled?: boolean;
}

/**
 * Sidebar derecha del detalle de proyecto: asignar jefe de obra al proyecto.
 * Al cambiar se actualiza projects.assigned_site_manager_email y se propaga a properties del proyecto.
 */
export function ProjectStatusSidebar({
  project,
  onAssign,
  disabled = false,
}: ProjectStatusSidebarProps) {
  const { t } = useI18n();
  const siteManagers = useMemo(() => getSiteManagersList(), []);
  const currentEmail = project.assigned_site_manager_email ?? null;
  const currentLabel = currentEmail
    ? getSiteManagerNameFromEmail(currentEmail) ?? currentEmail
    : null;

  const handleValueChange = (value: string) => {
    if (value === "__none__") {
      void onAssign(project.id, null);
    } else {
      void onAssign(project.id, value);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          {t.kanban.assignToSiteManager ?? "Asignar a jefe de obra"}
        </h3>
        <Select
          value={currentEmail ?? "__none__"}
          onValueChange={handleValueChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 border-muted bg-muted/50 w-full">
            <SelectValue placeholder={t.kanban.unassigned ?? "Sin asignar"}>
              {currentLabel ?? (t.kanban.unassigned ?? "Sin asignar")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t.kanban.unassigned ?? "Sin asignar"}</SelectItem>
            {siteManagers.map(({ name, email }) => (
              <SelectItem key={email} value={email}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
