"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoHomeHeader } from "@/components/reno/reno-home-header";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { useSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";
import { useArchitectProjects } from "@/hooks/useArchitectProjects";
import { toast } from "sonner";
import { Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArchitectTodoWidgets } from "@/components/reno/architect-todo-widgets";
import { ProjectTimelineOverview } from "@/components/reno/project-timeline-compact";
import { useArchitectNotifications } from "@/hooks/useArchitectNotifications";
import { Bell, X } from "lucide-react";
import { trackEventWithDevice } from "@/lib/mixpanel";

export default function ArchitectHomePage() {
  const router = useRouter();
  const { user: supabaseUser } = useSupabaseAuthContext();
  const { user, role, isLoading } = useAppAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const architectName = useMemo(() => {
    if (!supabaseUser) return null;
    return (
      supabaseUser.user_metadata?.full_name ??
      supabaseUser.user_metadata?.name ??
      null
    );
  }, [supabaseUser]);

  const {
    projectsByPhase,
    allProjects,
    loading: projectsLoading,
  } = useArchitectProjects(architectName);

  const { notifications, markAsRead, markAllRead } = useArchitectNotifications(architectName);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !role) {
      router.push("/login");
      return;
    }
    if (role !== "architect" && role !== "admin") {
      router.push("/login");
      toast.error("No tienes permisos para acceder a esta página");
    }
  }, [user, role, isLoading, router]);

  useEffect(() => {
    if (!projectsLoading && allProjects.length >= 0) {
      trackEventWithDevice("Architect Home Viewed", {
        total_projects: allProjects.length,
      });
    }
  }, [projectsLoading]);

  const totalProjects = allProjects.length;

  const avgDays = useMemo(() => {
    const diff = (a: string | null | undefined, b: string | null | undefined): number | null => {
      if (!a || !b) return null;
      const da = new Date(a).getTime();
      const db = new Date(b).getTime();
      if (isNaN(da) || isNaN(db)) return null;
      return Math.round(Math.abs(db - da) / (1000 * 60 * 60 * 24));
    };
    const mean = (vals: (number | null)[]): number | null => {
      const valid = vals.filter((v): v is number => v !== null);
      if (valid.length === 0) return null;
      return Math.round(valid.reduce((s, v) => s + v, 0) / valid.length);
    };

    return {
      measurement: mean(allProjects.map((p) => diff((p as any).draft_order_date, (p as any).measurement_date))),
      draft: mean(allProjects.map((p) => diff((p as any).measurement_date, (p as any).project_architect_date))),
      project: mean(allProjects.map((p) => diff((p as any).draft_validation_date, (p as any).project_end_date))),
      repairs: mean(allProjects.map((p) => diff((p as any).ecu_first_end_date, (p as any).arch_correction_date))),
    };
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
              {/* Notificaciones */}
              {notifications.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Bell className="h-4 w-4 text-primary" />
                      Novedades en tus proyectos
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                        {notifications.length}
                      </span>
                    </div>
                    <button
                      onClick={() => markAllRead()}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Marcar todas como leídas
                    </button>
                  </div>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.project_id) router.push(`/reno/architect/project/${n.project_id}`);
                      }}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <Bell className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground leading-snug">{n.message}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Descartar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* KPIs */}
              <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
                <AvgTimeKpi label="Media Tiempos Medición" value={avgDays.measurement} limitDays={7} />
                <AvgTimeKpi label="Media Tiempos Anteproyecto" value={avgDays.draft} limitDays={14} />
                <AvgTimeKpi label="Media Tiempos Proyecto" value={avgDays.project} limitDays={28} />
                <AvgTimeKpi label="Media Tiempos Reparos" value={avgDays.repairs} limitDays={7} />
              </div>

              {/* Todo Widgets */}
              <ArchitectTodoWidgets allProjects={allProjects} projectsByPhase={projectsByPhase} />

              {/* Timeline compacto */}
              <ProjectTimelineOverview
                allProjects={allProjects}
                getProjectUrl={(p) => `/reno/architect/project/${p.id}?tab=timeline`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AvgTimeKpi({ label, value, limitDays }: { label: string; value: number | null; limitDays: number }) {
  const valueColor =
    value === null
      ? "text-foreground"
      : value <= limitDays
        ? "text-emerald-600 dark:text-emerald-400"
        : value <= limitDays * 1.5
          ? "text-amber-500"
          : "text-red-500";

  return (
    <Card className="bg-card border-2 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Timer className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
            {label}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-xl md:text-2xl font-bold ${valueColor}`}>
          {value !== null ? `${value} días` : "—"}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Límite: {limitDays} días</p>
      </CardContent>
    </Card>
  );
}
