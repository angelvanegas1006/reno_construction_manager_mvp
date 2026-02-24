"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, ExternalLink } from "lucide-react";
import type { ProjectRow } from "@/hooks/useAssignedProjectsForForeman";
import { cn } from "@/lib/utils";

interface MyAssignedProjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectRow[];
  loading?: boolean;
}

export function MyAssignedProjectsModal({
  open,
  onOpenChange,
  projects,
  loading = false,
}: MyAssignedProjectsModalProps) {
  const router = useRouter();

  const handleVerProyecto = (projectId: string) => {
    onOpenChange(false);
    router.push(
      `/reno/construction-manager/project/${projectId}?from=my-projects`
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
            <ul className="space-y-2">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border bg-card p-3",
                    "hover:bg-accent/50 transition-colors"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">
                      {project.name ?? `Proyecto ${project.project_unique_id ?? project.id.slice(0, 8)}`}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleVerProyecto(project.id)}
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Ver proyecto
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
