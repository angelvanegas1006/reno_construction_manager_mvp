"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Property } from "@/lib/property-storage";
import { getSiteManagersList, getSiteManagerNameFromEmail } from "@/lib/supabase/user-name-utils";
import { useI18n } from "@/lib/i18n";
import { User } from "lucide-react";

interface AssignedSiteManagerSelectProps {
  property: Property;
  onAssign: (propertyId: string, email: string | null) => void;
  disabled?: boolean;
}

const PHASES_WITH_ASSIGNMENT: string[] = [
  "reno-in-progress",
  "furnishing",
  "final-check",
  "pendiente-suministros",
  "cleaning",
];

export function isPhaseWithSiteManagerAssignment(stage: string): boolean {
  return PHASES_WITH_ASSIGNMENT.includes(stage);
}

export function AssignedSiteManagerSelect({
  property,
  onAssign,
  disabled = false,
}: AssignedSiteManagerSelectProps) {
  const { t } = useI18n();
  const siteManagers = useMemo(() => getSiteManagersList(), []);
  const currentEmail =
    (property as any).supabaseProperty?.assigned_site_manager_email ?? null;
  const currentLabel = currentEmail
    ? getSiteManagerNameFromEmail(currentEmail) ?? currentEmail
    : null;

  const handleValueChange = (value: string) => {
    if (value === "__none__") {
      onAssign(property.id, null);
    } else {
      onAssign(property.id, value);
    }
  };

  return (
    <div
      className="mt-2 flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <User className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Select
        value={currentEmail ?? "__none__"}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 text-xs border-muted bg-muted/50 w-full min-w-0">
          <SelectValue
            placeholder={
              t.kanban.assignToSiteManager ?? "Asignar a jefe de obra"
            }
          >
            {currentLabel ?? (t.kanban.unassigned ?? "Sin asignar")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">
            {t.kanban.unassigned ?? "Sin asignar"}
          </SelectItem>
          {siteManagers.map(({ name, email }) => (
            <SelectItem key={email} value={email}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
