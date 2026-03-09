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
import {
  ChevronRight,
  ArrowLeft,
  Building2,
  MapPin,
  FolderKanban,
  Users,
  Home,
  Timer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MATURATION_PHASE_LABELS } from "@/lib/reno-kanban-config";
import type { ProjectRow } from "@/hooks/useSupabaseProjects";

const TIME_LIMITS = { measurement: 7, preliminary: 14, project: 28 };

function daysBetween(a: string, b: string): number | null {
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  return Math.round(Math.abs(db.getTime() - da.getTime()) / 86_400_000);
}

function parseProps(p: ProjectRow): number {
  const ptc = parseInt(String((p as any).properties_to_convert ?? ""), 10);
  if (ptc > 0) return ptc;
  const est = parseInt(String((p as any).est_properties ?? ""), 10);
  return est > 0 ? est : 0;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function cleanZone(raw: string): string {
  return raw.replace(/[\[\]"]/g, "").trim();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface ArchitectMetrics {
  name: string;
  count: number;
  totalProperties: number;
  avgMeasurement: number | null;
  avgPreliminary: number | null;
  avgProject: number | null;
  zones: string[];
  projects: ProjectRow[];
}

interface ArchitectRankingProps {
  allProjects: ProjectRow[];
}

export function ArchitectRanking({ allProjects }: ArchitectRankingProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArchitect, setSelectedArchitect] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const architects = useMemo(() => {
    const map = new Map<string, ProjectRow[]>();
    for (const p of allProjects) {
      const name = (p as any).architect?.trim();
      if (!name) continue;
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(p);
    }

    const result: ArchitectMetrics[] = [];
    for (const [name, projects] of map) {
      const measurementDays: number[] = [];
      const preliminaryDays: number[] = [];
      const projectDays: number[] = [];
      const zonesSet = new Set<string>();
      let totalProps = 0;

      for (const p of projects) {
        const proj = p as any;
        totalProps += parseProps(p);

        if (proj.area_cluster) {
          const cleaned = cleanZone(String(proj.area_cluster));
          if (cleaned) zonesSet.add(cleaned);
        }

        if (proj.draft_order_date && proj.measurement_date) {
          const d = daysBetween(proj.draft_order_date, proj.measurement_date);
          if (d !== null) measurementDays.push(d);
        }
        if (proj.measurement_date && proj.project_draft_date) {
          const d = daysBetween(proj.measurement_date, proj.project_draft_date);
          if (d !== null) preliminaryDays.push(d);
        }
        if (proj.draft_order_date && proj.project_end_date) {
          const d = daysBetween(proj.draft_order_date, proj.project_end_date);
          if (d !== null) projectDays.push(d);
        }
      }

      result.push({
        name,
        count: projects.length,
        totalProperties: totalProps,
        avgMeasurement: avg(measurementDays),
        avgPreliminary: avg(preliminaryDays),
        avgProject: avg(projectDays),
        zones: Array.from(zonesSet).sort(),
        projects,
      });
    }

    return result.sort((a, b) => b.count - a.count);
  }, [allProjects]);

  const INITIAL_ROWS = 6;
  const displayed = isExpanded ? architects : architects.slice(0, INITIAL_ROWS);
  const hasMore = architects.length > INITIAL_ROWS;

  const selectedData = useMemo(() => {
    if (!selectedArchitect) return null;
    return architects.find((a) => a.name === selectedArchitect) ?? null;
  }, [selectedArchitect, architects]);

  const handleArchitectClick = (name: string) => {
    setSelectedArchitect(name);
    setIsModalOpen(true);
  };

  const handleBackToList = () => setSelectedArchitect(null);

  const handleProjectClick = (project: ProjectRow) => {
    router.push(`/reno/maturation-analyst/project/${project.id}?from=maturation-home`);
    setIsModalOpen(false);
    setSelectedArchitect(null);
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) setSelectedArchitect(null);
  };

  const renderTimeBadge = (value: number | null, limit: number) => {
    if (value === null) return <span className="text-xs text-muted-foreground">Sin datos</span>;
    const over = value > limit;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
          over
            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
            : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
        )}
      >
        {value} días
      </span>
    );
  };

  return (
    <>
      <Card className="bg-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Análisis de Arquitectos
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Métricas de rendimiento calculadas en tiempo real
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                Dentro del límite
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                Excede límite
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {architects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay arquitectos asignados
            </p>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[180px]">
                        Arquitecto
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">
                        Proyectos
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">
                        Propiedades
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                        <div>
                          <span>Medición</span>
                          <span className="block text-[9px] font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                            límite {TIME_LIMITS.measurement} días
                          </span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                        <div>
                          <span>Anteproyecto</span>
                          <span className="block text-[9px] font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                            límite {TIME_LIMITS.preliminary} días
                          </span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                        <div>
                          <span>Proyecto Total</span>
                          <span className="block text-[9px] font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                            límite {TIME_LIMITS.project} días
                          </span>
                        </div>
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Zonas
                      </th>
                      <th className="w-[36px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((arch, idx) => (
                      <tr
                        key={arch.name}
                        onClick={() => handleArchitectClick(arch.name)}
                        className={cn(
                          "border-b border-border/40 hover:bg-accent/60 cursor-pointer transition-colors group",
                          idx % 2 === 1 && "bg-muted/15"
                        )}
                      >
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-primary">
                                {getInitials(arch.name)}
                              </span>
                            </div>
                            <p className="text-sm font-semibold truncate">{arch.name}</p>
                          </div>
                        </td>
                        <td className="text-center py-3.5 px-3">
                          <span className="inline-flex items-center justify-center min-w-[32px] h-7 rounded-full bg-primary/10 text-sm font-bold text-primary px-2">
                            {arch.count}
                          </span>
                        </td>
                        <td className="text-center py-3.5 px-3">
                          <span className="text-sm font-semibold">{arch.totalProperties}</span>
                        </td>
                        <td className="text-center py-3.5 px-3">
                          {renderTimeBadge(arch.avgMeasurement, TIME_LIMITS.measurement)}
                        </td>
                        <td className="text-center py-3.5 px-3">
                          {renderTimeBadge(arch.avgPreliminary, TIME_LIMITS.preliminary)}
                        </td>
                        <td className="text-center py-3.5 px-3">
                          {renderTimeBadge(arch.avgProject, TIME_LIMITS.project)}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            {arch.zones.length > 0 ? (
                              arch.zones.map((z) => (
                                <span
                                  key={z}
                                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium"
                                >
                                  <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                                  {z}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-1">
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hasMore && (
                <div className="flex justify-center pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
                        Mostrar menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                        Ver todos ({architects.length})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalle del arquitecto */}
      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            {selectedData ? (
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBackToList} className="h-8 w-8 p-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {getInitials(selectedData.name)}
                    </span>
                  </div>
                  <DialogTitle>{selectedData.name}</DialogTitle>
                </div>
              </div>
            ) : (
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Todos los Arquitectos
              </DialogTitle>
            )}
          </DialogHeader>

          {selectedData ? (
            <div className="space-y-5 mt-2">
              {/* KPIs del arquitecto */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MetricCard icon={FolderKanban} label="Proyectos" value={String(selectedData.count)} />
                <MetricCard icon={Home} label="Propiedades" value={String(selectedData.totalProperties)} />
                <MetricCard
                  icon={Timer}
                  label={`Media Medición (≤${TIME_LIMITS.measurement}d)`}
                  value={selectedData.avgMeasurement !== null ? `${selectedData.avgMeasurement} días` : "Sin datos"}
                  status={selectedData.avgMeasurement !== null ? (selectedData.avgMeasurement <= TIME_LIMITS.measurement ? "ok" : "over") : undefined}
                />
                <MetricCard
                  icon={Timer}
                  label={`Media Anteproyecto (≤${TIME_LIMITS.preliminary}d)`}
                  value={selectedData.avgPreliminary !== null ? `${selectedData.avgPreliminary} días` : "Sin datos"}
                  status={selectedData.avgPreliminary !== null ? (selectedData.avgPreliminary <= TIME_LIMITS.preliminary ? "ok" : "over") : undefined}
                />
                <MetricCard
                  icon={Timer}
                  label={`Media Proyecto (≤${TIME_LIMITS.project}d)`}
                  value={selectedData.avgProject !== null ? `${selectedData.avgProject} días` : "Sin datos"}
                  status={selectedData.avgProject !== null ? (selectedData.avgProject <= TIME_LIMITS.project ? "ok" : "over") : undefined}
                />
              </div>

              {/* Zonas */}
              {selectedData.zones.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Zonas de trabajo</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedData.zones.map((zone) => (
                      <span
                        key={zone}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
                      >
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {zone}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de proyectos */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Proyectos ({selectedData.projects.length})
                </p>
                <div className="space-y-1.5">
                  {selectedData.projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleProjectClick(project)}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer group"
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {project.name || "Sin nombre"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {project.reno_phase && (
                            <span className="text-xs text-muted-foreground">
                              {MATURATION_PHASE_LABELS[project.reno_phase] || project.reno_phase}
                            </span>
                          )}
                          {project.investment_type && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {project.investment_type}
                            </span>
                          )}
                          {parseProps(project) > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {parseProps(project)} propiedades
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Arquitecto</th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">Proyectos</th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">Propiedades</th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">Medición</th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">Anteproyecto</th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">Proyecto Total</th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Zonas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {architects.map((arch, idx) => (
                      <tr
                        key={arch.name}
                        onClick={() => setSelectedArchitect(arch.name)}
                        className={cn(
                          "border-b border-border/40 hover:bg-accent/60 cursor-pointer transition-colors",
                          idx % 2 === 1 && "bg-muted/15"
                        )}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-primary">
                                {getInitials(arch.name)}
                              </span>
                            </div>
                            <span className="font-medium truncate max-w-[180px]">{arch.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-3 font-bold">{arch.count}</td>
                        <td className="text-center py-3 px-3 font-semibold text-muted-foreground">{arch.totalProperties}</td>
                        <td className="text-center py-3 px-3">{renderTimeBadge(arch.avgMeasurement, TIME_LIMITS.measurement)}</td>
                        <td className="text-center py-3 px-3">{renderTimeBadge(arch.avgPreliminary, TIME_LIMITS.preliminary)}</td>
                        <td className="text-center py-3 px-3">{renderTimeBadge(arch.avgProject, TIME_LIMITS.project)}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {arch.zones.length > 0 ? (
                              arch.zones.map((z) => (
                                <span key={z} className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                                  {z}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  status,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  status?: "ok" | "over";
}) {
  return (
    <div className={cn(
      "rounded-lg border p-3 flex flex-col gap-1",
      status === "ok" && "border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-950/20",
      status === "over" && "border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/20",
      !status && "border-border"
    )}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <span className={cn(
        "text-lg font-bold",
        status === "ok" && "text-green-600 dark:text-green-400",
        status === "over" && "text-red-500",
        !status && "text-foreground"
      )}>
        {value}
      </span>
    </div>
  );
}
