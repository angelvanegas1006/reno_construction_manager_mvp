"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trophy, Medal, Award, ChevronRight, ArrowLeft, Building2 } from "lucide-react";
import { MATURATION_PHASE_LABELS } from "@/lib/reno-kanban-config";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";

interface ArchitectEntry {
  position: number;
  name: string;
  count: number;
  projects: ProjectRow[];
}

interface ArchitectRankingProps {
  allProjects: ProjectRow[];
}

export function ArchitectRanking({ allProjects }: ArchitectRankingProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArchitect, setSelectedArchitect] = useState<string | null>(null);

  const fullRanking = useMemo(() => {
    const map = new Map<string, ProjectRow[]>();
    for (const p of allProjects) {
      const name = (p as any).architect?.trim() || "Sin asignar";
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(p);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, projects], idx) => ({
        position: idx + 1,
        name,
        count: projects.length,
        projects,
      }));
  }, [allProjects]);

  const displayedRanking = useMemo(() => {
    return fullRanking.length <= 8 ? fullRanking : fullRanking.slice(0, 8);
  }, [fullRanking]);

  const selectedArchitectProjects = useMemo(() => {
    if (!selectedArchitect) return [];
    const entry = fullRanking.find((e) => e.name === selectedArchitect);
    return entry?.projects || [];
  }, [selectedArchitect, fullRanking]);

  const getRankIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (position === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (position === 3) return <Award className="h-4 w-4 text-amber-600" />;
    return null;
  };

  const handleArchitectClick = (name: string) => {
    setSelectedArchitect(name);
    setIsModalOpen(true);
  };

  const handleBackToRanking = () => {
    setSelectedArchitect(null);
  };

  const handleProjectClick = (project: ProjectRow) => {
    router.push(`/reno/maturation-analyst/project/${project.id}?from=maturation-home`);
    setIsModalOpen(false);
    setSelectedArchitect(null);
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) setSelectedArchitect(null);
  };

  const renderRankingItem = (item: ArchitectEntry) => (
    <div
      key={item.name}
      onClick={() => handleArchitectClick(item.name)}
      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] flex-shrink-0">
          {getRankIcon(item.position) || (
            <span className="text-xs font-semibold text-muted-foreground">
              {item.position}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-foreground truncate flex-1">
          {item.name}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-lg font-bold text-foreground">
          {item.count}
        </span>
        <span className="text-xs text-muted-foreground">
          {item.count === 1 ? "proyecto" : "proyectos"}
        </span>
        <span className="ml-2 flex-shrink-0">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </span>
      </div>
    </div>
  );

  const renderProjectItem = (project: ProjectRow) => (
    <div
      key={project.id}
      onClick={() => handleProjectClick(project)}
      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
    >
      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {project.name || "Sin nombre"}
        </p>
        {project.reno_phase && (
          <p className="text-xs text-muted-foreground mt-1">
            {MATURATION_PHASE_LABELS[project.reno_phase] || project.reno_phase}
          </p>
        )}
        {project.investment_type && (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 mt-1">
            {project.investment_type}
          </span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </div>
  );

  return (
    <>
      <Card className="bg-card h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-lg font-semibold">
            Ranking de Arquitectos
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Proyectos asignados por arquitecto
          </p>
        </CardHeader>
        <CardContent className="pt-6 flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="space-y-2 flex-1 overflow-y-auto">
              {displayedRanking.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay arquitectos asignados
                </p>
              ) : (
                <>
                  {displayedRanking.map((item) => (
                    <div
                      key={item.name}
                      onClick={() => handleArchitectClick(item.name)}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] flex-shrink-0">
                          {getRankIcon(item.position) || (
                            <span className="text-xs font-semibold text-muted-foreground">
                              {item.position}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground truncate flex-1">
                          {item.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-lg font-bold text-foreground">
                          {item.count}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.count === 1 ? "proyecto" : "proyectos"}
                        </span>
                        <span className="ml-2 flex-shrink-0">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </span>
                      </div>
                    </div>
                  ))}
                  {fullRanking.length > displayedRanking.length && (
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => {
                        setSelectedArchitect(null);
                        setIsModalOpen(true);
                      }}
                    >
                      Ver todos
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            {selectedArchitect ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToRanking}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle>
                  Proyectos de {selectedArchitect}
                </DialogTitle>
              </div>
            ) : (
              <DialogTitle>Ranking completo de Arquitectos</DialogTitle>
            )}
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {selectedArchitect ? (
              selectedArchitectProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay proyectos asignados
                </p>
              ) : (
                selectedArchitectProjects.map(renderProjectItem)
              )
            ) : (
              fullRanking.map(renderRankingItem)
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
