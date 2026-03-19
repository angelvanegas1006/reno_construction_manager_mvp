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
  Users,
  Home,
  Timer,
  ChevronDown,
  ChevronUp,
  Hammer,
  Clock,
  CalendarCheck,
  TrendingUp,
  HardHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Property } from "@/lib/property-storage";

const TIME_LIMITS = {
  renoDuration: 90,
  daysToStart: 30,
  daysToReady: 120,
};

const PHASE_LABELS: Record<string, string> = {
  "upcoming-settlements": "Próximas Reformas",
  "initial-check": "Revisión Inicial",
  "reno-budget-renovator": "Pendiente Presupuesto (Reformista)",
  "reno-budget-client": "Pendiente Presupuesto (Cliente)",
  "reno-budget-start": "Obra a Empezar",
  "reno-budget": "Presupuesto de Renovación",
  "upcoming": "Próximas propiedades",
  "reno-in-progress": "Obras en Proceso",
  "furnishing": "Amueblamiento",
  "final-check": "Revisión Final",
  "pendiente-suministros": "Pendiente de Suministros",
  "final-check-post-suministros": "Final Check Post Suministros",
  "cleaning": "Limpieza",
  "furnishing-cleaning": "Limpieza y amueblamiento",
  "reno-fixes": "Reparaciones reno",
  "done": "Hecho",
  "orphaned": "Sin fase",
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

function daysBetween(a: string, b: string): number | null {
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

interface RenoTypeBreakdown {
  light: number;
  medium: number;
  major: number;
  other: number;
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
  renoTypeBreakdown: RenoTypeBreakdown;
  avgDeviation: number | null;
  associatedForemen: string[];
}

interface RenovatorAnalysisPanelProps {
  propertiesByPhase?: Record<string, Property[]>;
  role?: string;
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

const RENO_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  light: {
    bg: "bg-success dark:bg-success",
    text: "text-white dark:text-white",
    dot: "bg-card/70",
  },
  medium: {
    bg: "bg-success-bg dark:bg-success/30",
    text: "text-success dark:text-success",
    dot: "bg-success dark:bg-success",
  },
  major: {
    bg: "bg-warning-bg dark:bg-warning/30",
    text: "text-warning dark:text-warning",
    dot: "bg-warning dark:bg-warning",
  },
  other: {
    bg: "bg-v-gray-700 dark:bg-v-gray-800",
    text: "text-white dark:text-v-gray-100",
    dot: "bg-card/50",
  },
};

function classifyRenoType(raw: string | null | undefined): keyof RenoTypeBreakdown {
  if (!raw) return "other";
  const lower = raw.toLowerCase();
  if (lower.includes("light")) return "light";
  if (lower.includes("medium")) return "medium";
  if (lower.includes("major") || lower.includes("full")) return "major";
  return "other";
}

function getPhaseLabel(phase: string | null | undefined): string {
  if (!phase) return "—";
  return PHASE_LABELS[phase] ?? phase;
}

export function RenovatorAnalysisPanel({
  propertiesByPhase,
  role,
}: RenovatorAnalysisPanelProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRenovator, setSelectedRenovator] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const showForemanColumn = role !== "foreman";

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
      const deviations: number[] = [];
      const zonesSet = new Set<string>();
      const foremenSet = new Set<string>();
      const breakdown: RenoTypeBreakdown = { light: 0, medium: 0, major: 0, other: 0 };

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

        const rt = classifyRenoType(p.renoType);
        breakdown[rt]++;

        const sp = (p as any).supabaseProperty;

        // Desviación: días de retraso respecto al arranque estimado
        // Comparar inicio real (start_date) vs inicio estimado (est_reno_start_date)
        // Positivo = empezó tarde, negativo = empezó antes
        const realStart = p.inicio;
        const estStart = p.estRenoStartDate;
        if (realStart && estStart) {
          const diff = daysBetween(estStart, realStart);
          if (diff !== null) {
            deviations.push(diff);
          }
        }

        const foreman =
          sp?.["Technical construction"] ||
          (p as any).foremanName;
        if (foreman && typeof foreman === "string" && foreman.trim()) {
          foremenSet.add(foreman.trim());
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
        renoTypeBreakdown: breakdown,
        avgDeviation: avg(deviations),
        associatedForemen: Array.from(foremenSet).sort(),
      });
    }

    return result.sort((a, b) => b.activeWorks - a.activeWorks);
  }, [propertiesByPhase]);

  const INITIAL_ROWS = 6;
  const displayed = isExpanded
    ? renovators
    : renovators.slice(0, INITIAL_ROWS);
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
    router.push(
      `/reno/construction-manager/property/${property.id}?from=home`
    );
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
        "bg-success-bg text-success dark:bg-success/40 dark:text-success";
    } else if (ratio <= 1.5) {
      colorClass =
        "bg-warning-bg text-warning dark:bg-warning/40 dark:text-warning";
    } else {
      colorClass =
        "bg-danger-bg text-danger dark:bg-danger/40 dark:text-danger";
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

  const renderDeviationBadge = (value: number | null) => {
    if (value === null)
      return <span className="text-xs text-muted-foreground">Sin datos</span>;
    const isNegative = value <= 0;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
          isNegative
            ? "bg-success-bg text-success dark:bg-success/40 dark:text-success"
            : "bg-danger-bg text-danger dark:bg-danger/40 dark:text-danger"
        )}
      >
        {value > 0 ? "+" : ""}
        {value} días
      </span>
    );
  };

  const renderRenoBreakdownMini = (breakdown: RenoTypeBreakdown) => {
    const entries = [
      { key: "light" as const, label: "Light", count: breakdown.light },
      { key: "medium" as const, label: "Medium", count: breakdown.medium },
      { key: "major" as const, label: "Major", count: breakdown.major },
    ].filter((e) => e.count > 0);

    if (entries.length === 0 && breakdown.other > 0) {
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
            RENO_TYPE_COLORS.other.bg,
            RENO_TYPE_COLORS.other.text
          )}
        >
          {breakdown.other} otros
        </span>
      );
    }
    if (entries.length === 0) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }

    return (
      <div className="flex flex-col items-start gap-1">
        {entries.map((e) => (
          <span
            key={e.key}
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
              RENO_TYPE_COLORS[e.key].bg,
              RENO_TYPE_COLORS[e.key].text
            )}
          >
            {e.label} ({e.count})
          </span>
        ))}
        {breakdown.other > 0 && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
              RENO_TYPE_COLORS.other.bg,
              RENO_TYPE_COLORS.other.text
            )}
          >
            Otro ({breakdown.other})
          </span>
        )}
      </div>
    );
  };

  const getDeviationStatus = (
    value: number | null
  ): "ok" | "warn" | "over" | undefined => {
    if (value === null) return undefined;
    if (value <= 0) return "ok";
    if (value <= 14) return "warn";
    return "over";
  };

  return (
    <>
      <Card className="bg-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <HardHat className="h-5 w-5 text-muted-foreground" />
                Análisis de Reformistas
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Métricas de rendimiento por reformista calculadas en tiempo real
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-success" />
                Dentro del límite
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-warning" />
                Cerca del límite
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-danger" />
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
                <table className={cn("w-full text-sm", showForemanColumn ? "min-w-[1100px]" : "min-w-[900px]")}>
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[170px]">
                        Reformista
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[70px]">
                        Activas
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[70px]">
                        Totales
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[110px]">
                        Tipo Reno
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                        Duración obra
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                        <div>
                          <span>Desviación</span>
                          <span className="block text-[9px] font-normal normal-case tracking-normal text-muted-foreground/70 mt-0.5">
                            inicio real vs estimado
                          </span>
                        </div>
                      </th>
                      {showForemanColumn && (
                        <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[140px]">
                          Jefe de obra
                        </th>
                      )}
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[130px]">
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
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-muted-foreground">
                                {getInitials(reno.name)}
                              </span>
                            </div>
                            <p className="text-sm font-semibold truncate">
                              {reno.name}
                            </p>
                          </div>
                        </td>
                        <td className="text-center py-3.5 px-3">
                          <span className="text-sm font-bold text-foreground">
                            {reno.activeWorks}
                          </span>
                        </td>
                        <td className="text-center py-3.5 px-3">
                          <span className="text-sm font-semibold">
                            {reno.totalProperties}
                          </span>
                        </td>
                        <td className="text-center py-3.5 px-3">
                          {renderRenoBreakdownMini(reno.renoTypeBreakdown)}
                        </td>
                        <td className="text-center py-3.5 px-3">
                          {renderTimeBadge(reno.avgRenoDuration, TIME_LIMITS.renoDuration)}
                        </td>
                        <td className="text-center py-3.5 px-3">
                          {renderDeviationBadge(reno.avgDeviation)}
                        </td>
                        {showForemanColumn && (
                          <td className="py-3.5 px-3">
                            <div className="flex flex-wrap gap-1.5">
                              {reno.associatedForemen.length > 0 ? (
                                reno.associatedForemen.map((f) => (
                                  <span
                                    key={f}
                                    className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-400"
                                  >
                                    <Users className="h-2.5 w-2.5" />
                                    {f}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                        )}
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
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-muted-foreground">
                      {getInitials(selectedData.name)}
                    </span>
                  </div>
                  <DialogTitle>{selectedData.name}</DialogTitle>
                </div>
              </div>
            ) : (
              <DialogTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5 text-muted-foreground" />
                Todos los Reformistas
              </DialogTitle>
            )}
          </DialogHeader>

          {selectedData ? (
            <div className="space-y-5 mt-2">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                  status={getTimeLimitStatus(selectedData.avgRenoDuration, TIME_LIMITS.renoDuration)}
                />
                <MetricCard
                  icon={CalendarCheck}
                  label={`Días para empezar (≤${TIME_LIMITS.daysToStart}d)`}
                  value={
                    selectedData.avgDaysToStart !== null
                      ? `${selectedData.avgDaysToStart} días`
                      : "Sin datos"
                  }
                  status={getTimeLimitStatus(selectedData.avgDaysToStart, TIME_LIMITS.daysToStart)}
                />
                <MetricCard
                  icon={Clock}
                  label={`Días hasta lista (≤${TIME_LIMITS.daysToReady}d)`}
                  value={
                    selectedData.avgDaysToReady !== null
                      ? `${selectedData.avgDaysToReady} días`
                      : "Sin datos"
                  }
                  status={getTimeLimitStatus(selectedData.avgDaysToReady, TIME_LIMITS.daysToReady)}
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Desviación arranque"
                  value={
                    selectedData.avgDeviation !== null
                      ? `${selectedData.avgDeviation > 0 ? "+" : ""}${selectedData.avgDeviation} días`
                      : "Sin datos"
                  }
                  status={getDeviationStatus(selectedData.avgDeviation)}
                />
                {selectedData.avgCompletion !== null && (
                  <MetricCard
                    icon={Building2}
                    label="Media completado"
                    value={`${selectedData.avgCompletion}%`}
                  />
                )}
              </div>

              {/* Desglose tipo de reno */}
              {(selectedData.renoTypeBreakdown.light > 0 ||
                selectedData.renoTypeBreakdown.medium > 0 ||
                selectedData.renoTypeBreakdown.major > 0 ||
                selectedData.renoTypeBreakdown.other > 0) && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Desglose por tipo de reforma
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedData.renoTypeBreakdown.light > 0 && (
                      <RenoTypeTag label="Light Reno" count={selectedData.renoTypeBreakdown.light} colorKey="light" />
                    )}
                    {selectedData.renoTypeBreakdown.medium > 0 && (
                      <RenoTypeTag label="Medium Reno" count={selectedData.renoTypeBreakdown.medium} colorKey="medium" />
                    )}
                    {selectedData.renoTypeBreakdown.major > 0 && (
                      <RenoTypeTag label="Major Reno" count={selectedData.renoTypeBreakdown.major} colorKey="major" />
                    )}
                    {selectedData.renoTypeBreakdown.other > 0 && (
                      <RenoTypeTag label="Otro" count={selectedData.renoTypeBreakdown.other} colorKey="other" />
                    )}
                  </div>
                </div>
              )}

              {/* Jefes de obra */}
              {selectedData.associatedForemen.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Jefes de obra
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedData.associatedForemen.map((foreman) => (
                      <span
                        key={foreman}
                        className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/30 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-400"
                      >
                        <Users className="h-3 w-3" />
                        {foreman}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Zonas */}
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

              {/* Lista de propiedades */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Propiedades ({selectedData.properties.length})
                </p>
                <div className="space-y-1.5">
                  {selectedData.properties.map((property) => {
                    const sp = (property as any).supabaseProperty;
                    const foreman = sp?.["Technical construction"];
                    const phase = property.renoPhase || sp?.reno_phase;
                    return (
                      <div
                        key={property.id}
                        onClick={() => handlePropertyClick(property)}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer group"
                      >
                        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {property.address || property.fullAddress || property.id}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {property.renoType && (
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                                  RENO_TYPE_COLORS[classifyRenoType(property.renoType)].bg,
                                  RENO_TYPE_COLORS[classifyRenoType(property.renoType)].text
                                )}
                              >
                                {property.renoType}
                              </span>
                            )}
                            {phase && (
                              <span className="text-xs text-muted-foreground">
                                {getPhaseLabel(phase)}
                              </span>
                            )}
                            {showForemanColumn && foreman && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400">
                                <Users className="h-2.5 w-2.5" />
                                {foreman}
                              </span>
                            )}
                            {property.completion != null && property.completion > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {property.completion}% completado
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="overflow-x-auto">
                <table className={cn("w-full text-sm", showForemanColumn ? "min-w-[950px]" : "min-w-[750px]")}>
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
                        Tipo Reno
                      </th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">
                        Duración obra
                      </th>
                      <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">
                        Desviación
                      </th>
                      {showForemanColumn && (
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">
                          Jefe de obra
                        </th>
                      )}
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
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-muted-foreground">
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
                          {renderRenoBreakdownMini(reno.renoTypeBreakdown)}
                        </td>
                        <td className="text-center py-3 px-3">
                          {renderTimeBadge(reno.avgRenoDuration, TIME_LIMITS.renoDuration)}
                        </td>
                        <td className="text-center py-3 px-3">
                          {renderDeviationBadge(reno.avgDeviation)}
                        </td>
                        {showForemanColumn && (
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {reno.associatedForemen.length > 0 ? (
                                reno.associatedForemen.map((f) => (
                                  <span
                                    key={f}
                                    className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-400"
                                  >
                                    <Users className="h-2.5 w-2.5" />
                                    {f}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                        )}
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

function getTimeLimitStatus(value: number | null, limit: number): "ok" | "warn" | "over" | undefined {
  if (value === null) return undefined;
  if (value <= limit) return "ok";
  if (value <= limit * 1.5) return "warn";
  return "over";
}

function getDeviationStatus(value: number | null): "ok" | "warn" | "over" | undefined {
  if (value === null) return undefined;
  if (value <= 0) return "ok";
  if (value <= 14) return "warn";
  return "over";
}

function RenoTypeTag({
  label,
  count,
  colorKey,
}: {
  label: string;
  count: number;
  colorKey: keyof typeof RENO_TYPE_COLORS;
}) {
  const colors = RENO_TYPE_COLORS[colorKey];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
        colors.bg,
        colors.text
      )}
    >
      <span className={cn("w-2 h-2 rounded-full", colors.dot)} />
      {label}
      <span className="font-bold">{count}</span>
    </span>
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
          "border-success bg-success-subtle dark:border-success/40 dark:bg-success/20",
        status === "warn" &&
          "border-warning bg-warning-subtle dark:border-warning/40 dark:bg-warning/20",
        status === "over" &&
          "border-danger bg-danger-subtle dark:border-danger/40 dark:bg-danger/20",
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
          status === "ok" && "text-success dark:text-success",
          status === "warn" && "text-warning dark:text-warning",
          status === "over" && "text-danger",
          !status && "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}
