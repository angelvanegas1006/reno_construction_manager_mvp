"use client";

import { Building2, Calendar, MapPin, Ruler } from "lucide-react";
import type { ProjectRow } from "@/hooks/useSupabaseProject";

interface ArchitectProjectSidebarProps {
  project: ProjectRow;
}

function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") return "\u2014";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "\u2014";
    return d.toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return "\u2014";
  }
}

function InfoItem({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </h3>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export function ArchitectProjectSidebar({ project }: ArchitectProjectSidebarProps) {
  const p = project as any;

  return (
    <div className="space-y-6 p-4">
      <InfoItem icon={Building2} label="Nombre del proyecto">
        {project.name || "\u2014"}
      </InfoItem>

      {project.project_unique_id && (
        <InfoItem icon={Building2} label="ID del Proyecto">
          <span className="text-xs font-semibold">{project.project_unique_id}</span>
        </InfoItem>
      )}

      <InfoItem icon={MapPin} label="Dirección">
        {p.project_address || project.name || "\u2014"}
      </InfoItem>

      <InfoItem icon={Building2} label="Propiedades">
        {p.properties_to_convert && String(p.properties_to_convert).trim() && String(p.properties_to_convert).trim() !== "0"
          ? String(p.properties_to_convert).trim()
          : (p.est_properties ?? "\u2014")}
      </InfoItem>

      <InfoItem icon={Ruler} label="Metros cuadrados usables">
        {p.usable_square_meters != null ? `${p.usable_square_meters} m\u00B2` : "\u2014"}
      </InfoItem>

      <InfoItem icon={Calendar} label="Fecha de Encargo de Borrador">
        {formatDate(p.draft_order_date)}
      </InfoItem>
    </div>
  );
}
