"use client";

import { ExternalLink, FolderOpen, User, FileText, Building2, Calendar, MapPin, Clock } from "lucide-react";
import type { ProjectRow } from "@/hooks/useSupabaseProject";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";

interface MaturationProjectSidebarProps {
  project: ProjectRow;
}

function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return "—";
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

function DriveLink({ url }: { url: string | null }) {
  if (!url) return <p className="italic">No disponible</p>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm text-[var(--prophero-blue-500)] hover:underline"
    >
      Abrir carpeta
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

const PHASES_1_3: RenoKanbanPhase[] = ["get-project-draft", "pending-to-validate", "pending-to-reserve-arras"];
const PHASES_5_7: RenoKanbanPhase[] = ["ecuv-first-validation", "technical-project-fine-tuning", "ecuv-final-validation"];

export function MaturationProjectSidebar({ project }: MaturationProjectSidebarProps) {
  const p = project as any;
  const phase = (project.reno_phase ?? "get-project-draft") as RenoKanbanPhase;

  if (PHASES_1_3.includes(phase)) {
    return (
      <div className="space-y-6 p-4">
        <InfoItem icon={Building2} label="Est. Properties">
          {p.est_properties || "—"}
        </InfoItem>
        <InfoItem icon={User} label="Scouter">
          {p.scouter || "Sin asignar"}
        </InfoItem>
        <InfoItem icon={FileText} label="Notas de Validación">
          {p.project_validation_notes ? (
            <p className="whitespace-pre-wrap break-words">{p.project_validation_notes}</p>
          ) : (
            <p className="italic">Sin notas</p>
          )}
        </InfoItem>
        <InfoItem icon={FolderOpen} label="Carpeta Drive">
          <DriveLink url={p.drive_folder} />
        </InfoItem>
      </div>
    );
  }

  if (phase === "technical-project-in-progress") {
    return (
      <div className="space-y-6 p-4">
        <InfoItem icon={Calendar} label="ARRAS Deadline">
          {formatDate(p.arras_deadline)}
        </InfoItem>
        <InfoItem icon={FileText} label="Project Setup Team Notes">
          {p.project_set_up_team_notes ? (
            <p className="whitespace-pre-wrap break-words">{p.project_set_up_team_notes}</p>
          ) : (
            <p className="italic">Sin notas</p>
          )}
        </InfoItem>
        <InfoItem icon={MapPin} label="Project Keys Location">
          {p.project_keys_location || "—"}
        </InfoItem>
        <InfoItem icon={FolderOpen} label="Carpeta Drive">
          <DriveLink url={p.drive_folder} />
        </InfoItem>
      </div>
    );
  }

  if (PHASES_5_7.includes(phase)) {
    return (
      <div className="space-y-6 p-4">
        <InfoItem icon={User} label="Arquitecto">
          {p.architect || "—"}
        </InfoItem>
        <InfoItem icon={User} label="ECU Contact">
          {p.ecu_contact || "—"}
        </InfoItem>
        <InfoItem icon={Calendar} label="ARRAS Deadline">
          {formatDate(p.arras_deadline)}
        </InfoItem>
        <InfoItem icon={Calendar} label="Settlement Date">
          {formatDate(p.settlement_date)}
        </InfoItem>
        <InfoItem icon={Calendar} label="Project End Date">
          {formatDate(p.project_end_date)}
        </InfoItem>
        <InfoItem icon={Clock} label="First Validation Duration">
          {p.first_validation_duration != null ? `${p.first_validation_duration} días` : "—"}
        </InfoItem>
        <InfoItem icon={FileText} label="Project Setup Team Notes">
          {p.project_set_up_team_notes ? (
            <p className="whitespace-pre-wrap break-words">{p.project_set_up_team_notes}</p>
          ) : (
            <p className="italic">Sin notas</p>
          )}
        </InfoItem>
        <InfoItem icon={MapPin} label="Project Keys Location">
          {p.project_keys_location || "—"}
        </InfoItem>
        <InfoItem icon={FolderOpen} label="Carpeta Drive">
          <DriveLink url={p.drive_folder} />
        </InfoItem>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <InfoItem icon={FolderOpen} label="Carpeta Drive">
        <DriveLink url={p.drive_folder} />
      </InfoItem>
      <InfoItem icon={User} label="Scouter">
        {p.scouter || "Sin asignar"}
      </InfoItem>
    </div>
  );
}
