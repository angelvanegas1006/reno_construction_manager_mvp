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
  Wrench,
  Users,
  Home,
  Timer,
  ChevronDown,
  ChevronUp,
  Hammer,
  Clock,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Property } from "@/lib/property-storage";

const TIME_LIMITS = {
  renoDuration: 90,
  daysToStart: 30,
  daysToReady: 120,
};

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

interface RenovatorMetrics {
  name: string;
  activeWorks: number;
  totalProperties: number;
  avgRenoDuration: number | null;
  avgDaysToStart: number | null;
  avgDaysToReady: number | null;
  avgCompletion: number | null;
  zones: string[];
  properties: Property[];
}

interface RenovatorAnalysisPanelProps {
  propertiesByPhase?: Record<string, Property[]>;
}

const ACTIVE_PHASES = [
  "reno-budget-start",
  "reno-in-progress",
  "furnishing",
  "final-check",
  "cleaning",
  "pendiente-suministros",
  "final-check-post-suministros",
];

export function RenovatorAnalysisPanel({
  propertiesByPhase,
}: RenovatorAnalysisPanelProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRenovator, setSelectedRenovator] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const renovators = useMemo(() => {
    if (!propertiesByPhase) return [];

    const allProperties = Object.values(propertiesByPhase).flat();

    const map = new Map<string, { active: Property[]; all: Property[] }>();
    for (const p of allProperties) {
      const name =
        p.renovador ||
        (p as any).supabaseProperty?.["Renovator name"];
      if (!name || typeof name !== "string" || !name.trim()) continue;
      const trimmed = name.trim();

      if (!map.has(trimmed)) map.set(trimmed, { active: [], all: [] });
      const entry = map.get(trimmed)!;
      entry.all.push(p);

      const sp = (p as any).supabaseProperty;
      const phase = p.renoPhase || sp?.reno_phase;
      if (phase && ACTIVE_PHASES.includes(phase)) {
        entry.active.push(p);
      }
    }

    const result: RenovatorMetrics[] = [];
    for (const [name, { active, all }] of map) {
      const renoDurations: number[] = [];
      const daysToStart: number[] = [];
      const daysToReady: number[] = [];
      const completions: number[] = [];
      const zonesSet = new Set<string>();

      for (const p of all) {
        if (p.renoDuration != null && p.renoDuration > 0)
          renoDurations.push(p.renoDuration);
        if (p.daysToStartRenoSinceRSD != null && p.daysToStartRenoSinceRSD > 0)
          daysToStart.push(p.daysToStartRenoSinceRSD);
        if (p.daysToPropertyReady != null && p.daysToPropertyReady > 0)
          daysToReady.push(p.daysToPropertyReady);
        if (p.completion != null && p.completion > 0)
          completions.push(p.completion);

        const zone = p.region || (p as any).supabaseProperty?.area_cluster;
        if (zone) {
          const cleaned = cleanZone(String(zone));
          if (cleaned) zonesSet.add(cleaned);
        }
      }

      result.push({
        name,
        activeWorks: active.length,
        totalProperties: all.length,
        avgRenoDuration: avg(renoDurations),
        avgDaysToStart: avg(daysToStart),
        avgDaysToReady: avg(daysToReady),
        avgCompletion: avg(completions),
        zones: Array.from(zonesSet).sort(),
        properties: all,
      });
    }

    return result.sort((a, b) => b.activeWorks - a.activeWorks);
  }, [propertiesByPhase]);

  const INITIAL_ROWS = 6;
  const displayed = isExpanded ? renovators : renovators.slice(0, INITIAL_ROWS);
  const hasMore = renovators.length > INITIAL_ROWS;

  const selectedData = useMemo(() => {
    if (!selectedRenovator) return null;
    return renovators.find((r) => r.name === selectedRenovator) ?? null;
  }, [selectedRenovator, renovators]);

  const handleRenovatorClick = (name: string) => {
    setSelectedRenovator(name);
    setIsModalOpen(true);
  };

  const handleBackToList = () => setSelectedRenovator(null);

  const handlePropertyClick = (property: Property) => {
    router.push(`/reno/construction-manager/property/${property.id}?from=home`);
    setIsModalOpen(false);
    setSelectedRenovator(null);
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) setSelectedRenovator(null);
  };

  const renderTimeBadge = (value: number | null, limit: number) => {
    if (value === null)
      return <span className="text-xs text-muted-foreground">Sin datos</span>;
    const ratio = value / limit;
    let colorClass: string;
    if (ratio <= 1) {
      colorClass =
        "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400";
    } else if (ratio <= 1.5) {
      colorClass =
        "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
    } else {
      colorClass =
        "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
    }
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
          colorClass
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
                <Wrench className="h-5 w-5 text-muted-foreground" />
                Análisis de Reformistas
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Métricas de rendimiento por reformista calculadas en tiempo real
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                Dentro del límite
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                Cerca del límite
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                Excede límite
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {renovators.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay reformistas asignados
            </p>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm min-w-[850px]">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[180px]">
                        Reformista
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">
                        Activas
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">
                        Totales
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">
                        <div>
                          <span>Duración obra</span>
                          <span className="block text-[9px] font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                            límite {TIME_LIMITS.renoDuration} días
                          </span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">
                        <div>
                          <span>Días para empezar</span>
                          <span className="block text-[9px] font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                            límite {TIME_LIMITS.daysToStart} días
                          </span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[130px]">
                        <div>
                          <span>Días hasta lista</span>
                          <span className="block text-[9px] font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                            límite {TIME_LIMITS.daysToReady} días
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
                    {displayed.map((reno, idx) => (
                      <tr
                        key={reno.name}
                        onClick={() => handleRenovatorClick(reno.name)}
                        className={cn(
                          "border-b border-border/40 hover:bg-accent/60 cursor-pointer transition-colors group",
                          idx % 2 === 1 && "bg-muted/15"
                        )}
                      >
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                                {getInitials(reno.name)}
                              </span>
                            </div>
                            <p className="text-sm font-semibold truncate">
                              {reno.name}
                            </p>
                          </div>
                        </td>
                        <td className="text-center py-3.5 px-3">
                          <span className="inline-flex items-center justify-center min-w-[32px] h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 text-sm font-bold text-orange-700 dark:text-orange-400 px-2">
                            {reno.activeWorks}
                          </span>
                        </td>
                        <td className="text-center py-3.5 px-3">
                          <span className="text-sm font-semibold">
                            {reno.totalProperties}
                          </span>
                        </td>
                        <td className="text-center py-3.5 px-3">
                          {renderTimeBadge(
                            reno.avgRenoDuration,
                            TIME_LIMITS.renoDuration
                          )}
                        </td>
                        <td className="text-center py-3.5 px-3">
                          {renderTimeBadge(
                            reno.avgDaysToStart,
                            TIME_LIMITS.daysToStart
                          )}
                        </td>
                        <td className="text-center py-3.5 px-3">
                          {renderTimeBadge(
                            reno.avgDaysToReady,
                            TIME_LIMITS.daysToReady
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            {reno.zones.length > 0 ? (
                              reno.zones.map((z) => (
                                <span
                                  key={z}
                                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium"
                                >
                                  <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                                  {z}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
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
                        Ver todos ({renovators.length})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            {selectedData ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToList}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-orange-700 dark:text-orange-400">
                      {getInitials(selectedData.name)}
                    </span>
                  </div>
                  <DialogTitle>{selectedData.name}</DialogTitle>
                </div>
              </div>
            ) : (
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-muted-foreground" />
                Todos los Reformistas
              </DialogTitle>
            )}
          </DialogHeader>

          {selectedData ? (
            <div className="space-y-5 mt-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MetricCard
                  icon={Hammer}
                  label="Obras activas"
                  value={String(selectedData.activeWorks)}
                />
                <MetricCard
                  icon={Home}
                  label="Propiedades totales"
                  value={String(selectedData.totalProperties)}
                />
                <MetricCard
                  icon={Timer}
                  label={`Duración obra (≤${TIME_LIMITS.renoDuration}d)`}
                  value={
                    selectedData.avgRenoDuration !== null
                      ? `${selectedData.avgRenoDuration} días`
                      : "Sin datos"
                  }
                  status={
                    selectedData.avgRenoDuration !== null
                      ? selectedData.avgRenoDuration <= TIME_LIMITS.renoDuration
                        ? "ok"
                        : selectedData.avgRenoDuration <=
                          TIME_LIMITS.renoDuration * 1.5
                        ? "warn"
                        : "over"
                      : undefined
                  }
                />
                <MetricCard
                  icon={CalendarCheck}
                  label={`Días para empezar (≤${TIME_LIMITS.daysToStart}d)`}
                  value={
                    selectedData.avgDaysToStart !== null
                      ? `${selectedData.avgDaysToStart} días`
                      : "Sin datos"
                  }
                  status={
                    selectedData.avgDaysToStart !== null
                      ? selectedData.avgDaysToStart <= TIME_LIMITS.daysToStart
                        ? "ok"
                        : selectedData.avgDaysToStart <=
                          TIME_LIMITS.daysToStart * 1.5
                        ? "warn"
                        : "over"
                      : undefined
                  }
                />
                <MetricCard
                  icon={Clock}
                  label={`Días hasta lista (≤${TIME_LIMITS.daysToReady}d)`}
                  value={
                    selectedData.avgDaysToReady !== null
                      ? `${selectedData.avgDaysToReady} días`
                      : "Sin datos"
                  }
                  status={
                    selectedData.avgDaysToReady !== null
                      ? selectedData.avgDaysToReady <= TIME_LIMITS.daysToReady
                        ? "ok"
                        : selectedData.avgDaysToReady <=
                          TIME_LIMITS.daysToReady * 1.5
                        ? "warn"
                        : "over"
                      : undefined
                  }
                />
                {selectedData.avgCompletion !== null && (
                  <MetricCard
                    icon={Building2}
                    label="Media completado"
                    value={`${selectedData.avgCompletion}%`}
                  />
                )}
              </div>

              {selectedData.zones.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Zonas de trabajo
                  </p>
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

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Propiedades ({selectedData.properties.length})
                </p>
                <div className="space-y-1.5">
                  {selectedData.properties.map((property) => (
                    <div
                      key={property.id}
                      onClick={() => handlePropertyClick(property)}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer group"
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {property.address ||
                            property.fullAddress ||
                            property.id}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {property.renoType && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {property.renoType}
                            </span>
                          )}
                          {property.renoPhase && (
                            <span className="text-xs text-muted-foreground">
                              {property.renoPhase}
                            </span>
                          )}
                          {property.completion != null &&
                            property.completion > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {property.completion}% completado
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
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">
                        Reformista
                      </th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">
                        Activas
                      </th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">
                        Totales
                      </th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">
                        Duración obra
                      </th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">
                        Días para empezar
                      </th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">
                        Días hasta lista
                      </th>
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">
                        Zonas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {renovators.map((reno, idx) => (
                      <tr
                        key={reno.name}
                        onClick={() => setSelectedRenovator(reno.name)}
                        className={cn(
                          "border-b border-border/40 hover:bg-accent/60 cursor-pointer transition-colors",
                          idx % 2 === 1 && "bg-muted/15"
                        )}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">
                                {getInitials(reno.name)}
                              </span>
                            </div>
                            <span className="font-medium truncate max-w-[180px]">
                              {reno.name}
                            </span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-3 font-bold">
                          {reno.activeWorks}
                        </td>
                        <td className="text-center py-3 px-3 font-semibold text-muted-foreground">
                          {reno.totalProperties}
                        </td>
                        <td className="text-center py-3 px-3">
                          {renderTimeBadge(
                            reno.avgRenoDuration,
                            TIME_LIMITS.renoDuration
                          )}
                        </td>
                        <td className="text-center py-3 px-3">
                          {renderTimeBadge(
                            reno.avgDaysToStart,
                            TIME_LIMITS.daysToStart
                          )}
                        </td>
                        <td className="text-center py-3 px-3">
                          {renderTimeBadge(
                            reno.avgDaysToReady,
                            TIME_LIMITS.daysToReady
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {reno.zones.length > 0 ? (
                              reno.zones.map((z) => (
                                <span
                                  key={z}
                                  className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium"
                                >
                                  {z}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
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
  status?: "ok" | "warn" | "over";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 flex flex-col gap-1",
        status === "ok" &&
          "border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-950/20",
        status === "warn" &&
          "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20",
        status === "over" &&
          "border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-950/20",
        !status && "border-border"
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span
        className={cn(
          "text-lg font-bold",
          status === "ok" && "text-green-600 dark:text-green-400",
          status === "warn" && "text-amber-600 dark:text-amber-400",
          status === "over" && "text-red-500",
          !status && "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}
