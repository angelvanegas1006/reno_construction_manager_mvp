"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ClipboardCheck } from "lucide-react";
import type { ProjectRow } from "@/hooks/useAssignedProjectsForForeman";
import { cn } from "@/lib/utils";

interface MyAssignedProjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectRow[];
  loading?: boolean;
}

const PHASE_LABELS: Record<string, string> = {
  "reno-in-progress": "Obra en curso",
  "furnishing": "Amueblamiento",
  "final-check": "Final Check",
  "cleaning": "Limpieza",
  "obra-en-progreso": "Obra en curso",
  "amueblamiento": "Amueblamiento",
  "check-final": "Final Check",
};

export function MyAssignedProjectsModal({
  open,
  onOpenChange,
  projects,
  loading = false,
}: MyAssignedProjectsModalProps) {
  const router = useRouter();

  const handleIrAlFinalCheck = (projectId: string) => {
    onOpenChange(false);
    router.push(
      `/reno/construction-manager/project/${projectId}/final-check?from=my-projects`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mis proyectos asignados</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Cargando...</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No tienes proyectos asignados.
            </p>
          ) : (
            <ul className="space-y-2 pb-2">
              {projects.map((project) => {
                const phaseLabel = project.reno_phase
                  ? (PHASE_LABELS[project.reno_phase] ?? project.reno_phase)
                  : null;
                return (
                  <li
                    key={project.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border bg-card p-3",
                      "hover:bg-accent/50 transition-colors"
                    )}
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">
                          {project.name ?? `Proyecto ${(project as any).project_unique_id ?? project.id.slice(0, 8)}`}
                        </span>
                      </div>
                      {phaseLabel && (
                        <Badge variant="secondary" className="text-xs w-fit ml-6">
                          {phaseLabel}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleIrAlFinalCheck(project.id)}
                      className="flex-shrink-0 gap-1"
                    >
                      <ClipboardCheck className="h-3 w-3" />
                      <span className="hidden sm:inline">Final Check</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
