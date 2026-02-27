"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoHomeHeader } from "@/components/reno/reno-home-header";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { useMaturationProjects } from "@/hooks/useMaturationProjects";
import { toast } from "sonner";
import { Building2, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MATURATION_PHASE_LABELS,
} from "@/lib/reno-kanban-config";
import { MaturationPhaseDistribution } from "@/components/reno/maturation-phase-distribution";
import { DonutChart } from "@/components/reno/donut-chart";
import { ArchitectRanking } from "@/components/reno/architect-ranking";
import { MaturationCalendar } from "@/components/reno/maturation-calendar";
import { MaturationTodoWidgets } from "@/components/reno/maturation-todo-widgets";

export default function MaturationAnalystHomePage() {
  const router = useRouter();
  const { user, role, isLoading } = useAppAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const {
    projectsByPhase,
    allProjects,
    loading: projectsLoading,
  } = useMaturationProjects();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !role) {
      router.push("/login");
      return;
    }
    if (role !== "maduration_analyst" && role !== "admin" && role !== "construction_manager") {
      router.push("/login");
      toast.error("No tienes permisos para acceder a esta página");
    }
  }, [user, role, isLoading, router]);

  const totalProjects = allProjects.length;

  const investmentSegments = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allProjects) {
      const type = p.investment_type?.trim() || "Otro";
      map.set(type, (map.get(type) || 0) + 1);
    }

    const colorMap: Record<string, string> = {
      Flip: "#3b82f6",
      Yield: "#f59e0b",
    };
    const fallbackColors = ["#8b5cf6", "#10b981", "#ef4444", "#ec4899", "#06b6d4"];
    let ci = 0;

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label,
        value,
        color: colorMap[label] || fallbackColors[ci++ % fallbackColors.length],
      }));
  }, [allProjects]);

  const ecuSegments = useMemo(() => {
    let sinEcu = 0;
    let conEcu = 0;
    for (const p of allProjects) {
      if ((p as any).excluded_from_ecu === true) sinEcu++;
      else conEcu++;
    }
    return [
      { label: "Con ECU", value: conEcu, color: "#22c55e" },
      { label: "Sin ECU", value: sinEcu, color: "#f97316" },
    ];
  }, [allProjects]);

  const recentProjects = useMemo(() => {
    return [...allProjects]
      .sort((a, b) => {
        const da = a.updated_at || a.created_at || "";
        const db = b.updated_at || b.created_at || "";
        return db.localeCompare(da);
      })
      .slice(0, 8);
  }, [allProjects]);

  const loading = isLoading || projectsLoading;

  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        <RenoHomeHeader />

        <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 xl:px-12 py-4 md:py-6 lg:py-8 bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
          {loading ? (
            <VistralLogoLoader className="min-h-[400px]" />
          ) : (
            <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 px-4 lg:px-8">
              {/* KPIs - mismo diseño que Units */}
              <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                <Card className="bg-card border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">Proyectos en maduración</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-bold text-foreground">{totalProjects}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Total de proyectos en todas las fases de maduración</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">Proyectos técnicos en progreso</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-bold text-foreground">
                      {(projectsByPhase["technical-project-in-progress"] || []).length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Proyectos en fase de proyecto técnico en progreso</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">Pendientes de validación</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-bold text-foreground">
                      {(projectsByPhase["pending-to-validate"] || []).length +
                        (projectsByPhase["ecuv-first-validation"] || []).length +
                        (projectsByPhase["ecuv-final-validation"] || []).length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Proyectos pendientes de validación o validación ECU</p>
                  </CardContent>
                </Card>
              </div>

              {/* Todo Widgets */}
              <MaturationTodoWidgets allProjects={allProjects} projectsByPhase={projectsByPhase} />

              {/* Flip vs Yield + Con ECU / Sin ECU */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">Flip vs Yield</h3>
                  <DonutChart
                    segments={investmentSegments}
                    centerValue={totalProjects}
                    centerLabel="proyectos"
                  />
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-4">Con ECU / Sin ECU</h3>
                  <DonutChart
                    segments={ecuSegments}
                    centerValue={totalProjects}
                    centerLabel="proyectos"
                  />
                </div>
              </div>

              {/* Distribución por fase + Ranking de Arquitectos */}
              <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
                <ArchitectRanking allProjects={allProjects} />
                <MaturationPhaseDistribution projectsByPhase={projectsByPhase} />
              </div>

              {/* Calendario de fechas */}
              <MaturationCalendar allProjects={allProjects} />

              {/* Proyectos recientes */}
              <div className="bg-card border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-violet-500" />
                  Últimos proyectos actualizados
                </h3>
                {recentProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No hay proyectos de maduración
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">Proyecto</th>
                          <th className="pb-2 pr-4 font-medium">Tipo</th>
                          <th className="pb-2 pr-4 font-medium">Fase</th>
                          <th className="pb-2 font-medium">
                            Última actualización
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentProjects.map((p) => (
                          <tr
                            key={p.id}
                            className="border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() =>
                              router.push(
                                `/reno/maturation-analyst/project/${p.id}?from=maturation-home`
                              )
                            }
                          >
                            <td className="py-2.5 pr-4">
                              <div className="font-medium max-w-[200px] truncate">
                                {p.name || "Sin nombre"}
                              </div>
                              {p.area_cluster && (
                                <div className="text-xs text-muted-foreground">
                                  {p.area_cluster}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 pr-4">
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {p.investment_type || (p as any).type || "—"}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-xs">
                              {MATURATION_PHASE_LABELS[
                                p.reno_phase as string
                              ] ||
                                p.project_status ||
                                "—"}
                            </td>
                            <td className="py-2.5 text-xs text-muted-foreground">
                              {p.updated_at
                                ? new Date(p.updated_at).toLocaleDateString(
                                    "es-ES",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    }
                                  )
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
