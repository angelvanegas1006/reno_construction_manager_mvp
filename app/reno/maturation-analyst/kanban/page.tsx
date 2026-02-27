"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { use } from "react";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { NavbarL1 } from "@/components/layout/navbar-l1";
import { RenoKanbanBoard } from "@/components/reno/reno-kanban-board";
import { useI18n } from "@/lib/i18n";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { useMaturationProjects } from "@/hooks/useMaturationProjects";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { visibleRenoKanbanColumnsMaturation } from "@/lib/reno-kanban-config";

type ViewMode = "kanban" | "list";

export default function MaturationAnalystKanbanPage() {
  const searchParams = useSearchParams();
  const unwrappedSearchParams =
    searchParams instanceof Promise ? use(searchParams) : searchParams;
  const router = useRouter();
  const { user, role, isLoading } = useAppAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const { t } = useI18n();

  const {
    projectsByPhase,
    refetch: refetchProjects,
  } = useMaturationProjects();

  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    const viewModeParam = unwrappedSearchParams.get("viewMode");
    if (viewModeParam === "list" || viewModeParam === "kanban") {
      setViewMode(viewModeParam);
    }
  }, [unwrappedSearchParams]);

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

  const handleSyncAirtable = useCallback(async () => {
    setSyncLoading(true);
    try {
      const res = await fetch("/api/cron/sync-airtable", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || "Error al sincronizar");
      }
      toast.success(
        data.success
          ? `Sincronizado: ${data.totalUpdated ?? 0} actualizadas, ${data.totalCreated ?? 0} creadas`
          : "Sincronización completada con errores"
      );
      await refetchProjects();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al sincronizar con Airtable";
      toast.error(message);
    } finally {
      setSyncLoading(false);
    }
  }, [refetchProjects]);

  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        <NavbarL1
          classNameTitle="Maduración de Proyectos"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          syncAirtableButton={{
            label: "Sync con Airtable",
            onClick: handleSyncAirtable,
            loading: syncLoading,
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <div
          className={cn(
            "flex-1 p-2 md:p-3 lg:p-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000]",
            viewMode === "list"
              ? "overflow-y-auto"
              : "md:overflow-hidden overflow-y-auto"
          )}
          data-scroll-container
        >
          <RenoKanbanBoard
            searchQuery={searchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            viewLevel="project"
            projectsByPhaseOverride={projectsByPhase}
            visibleColumnsOverride={visibleRenoKanbanColumnsMaturation}
            fromParam="maturation-kanban"
          />
        </div>
      </div>
    </div>
  );
}
