"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { Property } from "@/lib/property-storage";
import { isDelayedWork } from "@/lib/property-sorting";
import { getForemanEmailFromName, extractNameFromEmail, FOREMAN_NAME_TO_EMAIL } from "@/lib/supabase/user-name-utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  AlertTriangle,
  Clock,
  ClipboardCheck,
  Activity,
  TrendingUp,
  FileDown,
  CheckCircle2,
  Timer,
  Hourglass,
} from "lucide-react";

interface ForemanWorkData {
  name: string;
  email: string;
  unit: number;
  building: number;
  project: number;
  wip: number;
  lot: number;
  total: number;
}

interface FinalCheckReport {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string | null;
  foremanName: string;
  foremanEmail: string;
  completedAt: string | null;
  createdAt: string;
  publicUrl: string;
}

interface ForemanActivityData {
  name: string;
  email: string;
  lastSignIn: string | null;
  sessionsThisWeek: number;
  totalMinutesThisWeek: number;
}

interface AdditionalKPI {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

const HIDDEN_FROM_DASHBOARD: string[] = [
  "miguel.pertusa@prophero.com",
  "santiago.figueiredo@prophero.com",
  "manuelgv8@gmail.com",
  "marina.erustes@prophero.com",
];
const HIDDEN_NAMES_PATTERN = /manu\s*prueba|santiago\s*figueiredo|manuel\s*g[oó]mez|marina\s*erustes/i;

const CHART_COLORS = {
  unit: "#3b82f6",
  building: "#f59e0b",
  project: "#10b981",
  wip: "#8b5cf6",
  lot: "#ef4444",
};

export function RenoHomeAdminDashboard({
  propertiesByPhase,
}: {
  propertiesByPhase?: Record<string, Property[]>;
}) {
  const { role } = useAppAuth();
  const supabase = createClient();

  const [finalChecksData, setFinalChecksData] = useState<FinalCheckReport[]>([]);
  const [activityData, setActivityData] = useState<ForemanActivityData[]>([]);
  const [additionalKPIs, setAdditionalKPIs] = useState<AdditionalKPI[]>([]);
  const [projectTypesMap, setProjectTypesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [finalCheckKPIs, setFinalCheckKPIs] = useState<{
    completed: number;
    pending: number;
    avgDays: number | null;
  }>({ completed: 0, pending: 0, avgDays: null });
  const [renovatorAssignments, setRenovatorAssignments] = useState<{ name: string; count: number }[]>([]);
  const [foremanStats, setForemanStats] = useState<Record<string, { initialChecks: number; finalChecks: number; renovatorsApp: number; obraUpdates: number }>>({});

  const isAllowed = role === "admin" || role === "construction_manager";

  // --- Fetch project types map ---
  useEffect(() => {
    if (!isAllowed) return;
    async function fetchProjectTypes() {
      const { data } = await supabase
        .from("projects")
        .select("id, type, investment_type");
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => {
        const raw = (p.type || p.investment_type || "").toString().trim().toLowerCase();
        if (raw.includes("wip")) map[p.id] = "wip";
        else if (raw.includes("lot")) map[p.id] = "lot";
        else if (raw.includes("building")) map[p.id] = "building";
        else if (raw.includes("project")) map[p.id] = "project";
        else map[p.id] = "project";
      });
      setProjectTypesMap(map);
    }
    fetchProjectTypes();
  }, [isAllowed]);

  // --- Renovator assignments from app ---
  useEffect(() => {
    if (!isAllowed) return;
    async function fetchRenovatorAssignments() {
      const { data } = await supabase
        .from("properties")
        .select("\"Technical construction\", renovator_assigned_from_app")
        .eq("renovator_assigned_from_app", true);
      const countMap: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        const tc = p["Technical construction"];
        if (!tc) return;
        const email = getForemanEmailFromName(tc) || tc;
        const name = getShortName(email);
        if (isHiddenUser(email, name)) return;
        countMap[name] = (countMap[name] || 0) + 1;
      });
      const sorted = Object.entries(countMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      setRenovatorAssignments(sorted);
    }
    fetchRenovatorAssignments();
  }, [isAllowed]);

  // --- Per-foreman stats: initial checks, renovators from app, obra updates ---
  useEffect(() => {
    if (!isAllowed) return;
    async function fetchForemanStats() {
      const stats: Record<string, { initialChecks: number; finalChecks: number; renovatorsApp: number; obraUpdates: number }> = {};

      const ensure = (email: string) => {
        if (!stats[email]) stats[email] = { initialChecks: 0, finalChecks: 0, renovatorsApp: 0, obraUpdates: 0 };
      };

      // 1) Initial + Final checks completed — join via property_id -> properties."Technical construction"
      const { data: allInspections } = await supabase
        .from("property_inspections")
        .select("property_id, inspection_type")
        .eq("inspection_status", "completed")
        .in("inspection_type", ["initial", "final"]);

      if (allInspections && allInspections.length > 0) {
        const propIds = [...new Set(allInspections.map((i: any) => i.property_id))];
        const { data: props } = await supabase
          .from("properties")
          .select('id, "Technical construction"')
          .in("id", propIds);

        const propForemanMap: Record<string, string> = {};
        (props || []).forEach((p: any) => {
          if (p["Technical construction"]) propForemanMap[p.id] = p["Technical construction"];
        });

        allInspections.forEach((i: any) => {
          const tc = propForemanMap[i.property_id];
          if (!tc) return;
          const email = getForemanEmailFromName(tc) || tc;
          if (isHiddenUser(email, getShortName(email))) return;
          ensure(email);
          if (i.inspection_type === "initial") stats[email].initialChecks++;
          else if (i.inspection_type === "final") stats[email].finalChecks++;
        });
      }

      // 2) Renovators assigned from app
      const { data: renoProps } = await supabase
        .from("properties")
        .select('"Technical construction"')
        .eq("renovator_assigned_from_app", true);

      (renoProps || []).forEach((p: any) => {
        const tc = p["Technical construction"];
        if (!tc) return;
        const email = getForemanEmailFromName(tc) || tc;
        if (isHiddenUser(email, getShortName(email))) return;
        ensure(email);
        stats[email].renovatorsApp++;
      });

      // 3) Obra updates (property_activities count per foreman)
      const { data: activities } = await supabase
        .from("property_activities")
        .select("property_id");

      if (activities && activities.length > 0) {
        const actPropIds = [...new Set(activities.map((a: any) => a.property_id).filter(Boolean))];
        const { data: actProps } = await supabase
          .from("properties")
          .select('id, "Technical construction"')
          .in("id", actPropIds);

        const actPropForemanMap: Record<string, string> = {};
        (actProps || []).forEach((p: any) => {
          if (p["Technical construction"]) actPropForemanMap[p.id] = p["Technical construction"];
        });

        activities.forEach((a: any) => {
          const tc = actPropForemanMap[a.property_id];
          if (!tc) return;
          const email = getForemanEmailFromName(tc) || tc;
          if (isHiddenUser(email, getShortName(email))) return;
          ensure(email);
          stats[email].obraUpdates++;
        });
      }

      setForemanStats(stats);
    }
    fetchForemanStats();
  }, [isAllowed]);

  // --- Works per foreman (derived from propertiesByPhase + projectTypesMap) ---
  const worksPerForeman = useMemo<ForemanWorkData[]>(() => {
    if (!propertiesByPhase) return [];

    const activePhases = [
      "reno-in-progress",
      "furnishing",
      "final-check",
      "cleaning",
      "pendiente-suministros",
      "final-check-post-suministros",
    ];

    type WorkCounts = { unit: number; building: number; project: number; wip: number; lot: number };
    const foremanMap: Record<string, WorkCounts> = {};

    activePhases.forEach((phase) => {
      const props = propertiesByPhase[phase] || [];
      props.forEach((p) => {
        const sp = (p as any).supabaseProperty;
        if (!sp) return;
        const tc: string | null = sp["Technical construction"];
        if (!tc) return;

        const email = getForemanEmailFromName(tc) || tc;
        if (!foremanMap[email]) foremanMap[email] = { unit: 0, building: 0, project: 0, wip: 0, lot: 0 };

        if (sp.project_id) {
          const pType = projectTypesMap[sp.project_id] || "project";
          foremanMap[email][pType as keyof WorkCounts]++;
        } else {
          foremanMap[email].unit++;
        }
      });
    });

    return Object.entries(foremanMap)
      .filter(([email]) => !isHiddenUser(email, getShortName(email)))
      .map(([email, counts]) => ({
        name: getShortName(email),
        email,
        ...counts,
        total: counts.unit + counts.building + counts.project + counts.wip + counts.lot,
      }))
      .sort((a, b) => b.total - a.total);
  }, [propertiesByPhase, projectTypesMap]);

  // --- Additional KPIs ---
  const computedKPIs = useMemo<AdditionalKPI[]>(() => {
    if (!propertiesByPhase) return [];

    const allProperties = Object.values(propertiesByPhase).flat();

    // Obras tardías: solo unit, building y lot
    const delayedWorks = allProperties.filter((p) => {
      const sp = (p as any).supabaseProperty;
      if (!sp) return false;
      // Determinar tipo: unit (sin project_id), building/lot (con project_id y tipo correspondiente)
      if (sp.project_id) {
        const pType = projectTypesMap[sp.project_id] || "project";
        if (pType !== "unit" && pType !== "building" && pType !== "lot") return false;
      }
      // unit (sin project_id) siempre se incluye
      return isDelayedWork(p, p.renoPhase || sp.reno_phase || undefined);
    }).length;

    const now = new Date();
    const overdueUpdates = allProperties.filter((p) => {
      const sp = (p as any).supabaseProperty;
      if (!sp?.next_update) return false;
      if (sp.reno_phase !== "reno-in-progress") return false;
      return new Date(sp.next_update) < now;
    }).length;

    const phaseDurations: Record<string, number[]> = {};
    allProperties.forEach((p) => {
      const sp = (p as any).supabaseProperty;
      if (!sp?.reno_phase || !sp?.created_at) return;
      const days = Math.floor(
        (Date.now() - new Date(sp.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (!phaseDurations[sp.reno_phase]) phaseDurations[sp.reno_phase] = [];
      phaseDurations[sp.reno_phase].push(days);
    });

    const avgDaysInProgress = phaseDurations["reno-in-progress"]
      ? Math.round(
          phaseDurations["reno-in-progress"].reduce((a, b) => a + b, 0) /
            phaseDurations["reno-in-progress"].length
        )
      : 0;

    return [
      {
        label: "Obras tardías",
        value: delayedWorks,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: "text-red-600",
      },
      {
        label: "Updates atrasados",
        value: overdueUpdates,
        icon: <Clock className="h-4 w-4" />,
        color: "text-red-600",
      },
      {
        label: "Media días en obra",
        value: avgDaysInProgress,
        icon: <TrendingUp className="h-4 w-4" />,
        color: "text-blue-600",
      },
    ];
  }, [propertiesByPhase]);

  // --- Fetch final checks + activity data ---
  useEffect(() => {
    if (!isAllowed) return;

    async function fetchData() {
      setLoading(true);
      try {
        // 1) Final checks: all final inspections (completed + pending/in_progress)
        const { data: allFinalInspections } = await supabase
          .from("property_inspections")
          .select("id, property_id, inspection_type, inspection_status, completed_at, created_at")
          .eq("inspection_type", "final")
          .order("completed_at", { ascending: false });

        const inspections = (allFinalInspections || []).filter(
          (i: any) => i.inspection_status === "completed"
        );
        const pendingInspections = (allFinalInspections || []).filter(
          (i: any) => i.inspection_status !== "completed"
        );

        const durations = inspections
          .map((i: any) => {
            if (!i.created_at || !i.completed_at) return null;
            const d = Math.round(
              (new Date(i.completed_at).getTime() - new Date(i.created_at).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return d >= 0 ? d : null;
          })
          .filter((d: number | null): d is number => d !== null);

        const pendingFromPhases =
          (propertiesByPhase?.["final-check"]?.length || 0) +
          (propertiesByPhase?.["final-check-post-suministros"]?.length || 0);

        setFinalCheckKPIs({
          completed: inspections.length,
          pending: Math.max(pendingFromPhases, pendingInspections.length),
          avgDays:
            durations.length > 0
              ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
              : null,
        });

        const propIds = [...new Set((inspections || []).map((i: any) => i.property_id))];
        let propsMap: Record<string, { name: string | null; address: string | null; foreman: string | null }> = {};

        if (propIds.length > 0) {
          const { data: props } = await supabase
            .from("properties")
            .select('id, name, address, "Technical construction", "Unique ID From Engagements"')
            .in("id", propIds);

          (props || []).forEach((p: any) => {
            propsMap[p.id] = {
              name: p["Unique ID From Engagements"] || p.name || p.address || p.id,
              address: p.address,
              foreman: p["Technical construction"],
            };
          });
        }

        const reports: FinalCheckReport[] = (inspections || [])
          .map((i: any) => {
            const prop = propsMap[i.property_id] || { name: null, address: null, foreman: null };
            const foremanRaw = prop.foreman || "";
            const email = getForemanEmailFromName(foremanRaw) || foremanRaw;
            const name = getShortName(email || foremanRaw);
            return {
              id: i.id,
              propertyId: i.property_id,
              propertyName: prop.name || i.property_id,
              propertyAddress: prop.address,
              foremanName: name,
              foremanEmail: email,
              completedAt: i.completed_at,
              createdAt: i.created_at,
              publicUrl: `/checklist-public/${i.property_id}/final`,
            };
          })
          .filter((r: FinalCheckReport) => !isHiddenUser(r.foremanEmail, r.foremanName));

        setFinalChecksData(reports);

        // 2) Activity: fetch users via admin API, then sessions
        const usersRes = await fetch("/api/admin/users");
        const usersJson = await usersRes.json();
        const foremen = (usersJson.users || []).filter(
          (u: any) => u.role === "foreman" || u.role === "construction_manager"
        );

        const startOfWeek = getStartOfWeek();
        const { data: sessions } = await (supabase as any)
          .from("user_sessions")
          .select("user_id, started_at, last_active_at, ended_at")
          .gte("started_at", startOfWeek.toISOString());

        const sessionMap: Record<
          string,
          { count: number; totalMinutes: number }
        > = {};
        (sessions || []).forEach((s: any) => {
          if (!sessionMap[s.user_id])
            sessionMap[s.user_id] = { count: 0, totalMinutes: 0 };
          sessionMap[s.user_id].count++;
          const start = new Date(s.started_at);
          const end = s.ended_at
            ? new Date(s.ended_at)
            : new Date(s.last_active_at);
          const minutes = Math.max(
            0,
            Math.round((end.getTime() - start.getTime()) / 60000)
          );
          sessionMap[s.user_id].totalMinutes += minutes;
        });

        // Get last session for each foreman (most recent, not limited to this week)
        const foremanIds = foremen.map((f: any) => f.id);
        const lastSessionMap: Record<string, string> = {};
        if (foremanIds.length > 0) {
          const { data: allSessions } = await (supabase as any)
            .from("user_sessions")
            .select("user_id, last_active_at")
            .in("user_id", foremanIds)
            .order("last_active_at", { ascending: false });

          (allSessions || []).forEach((s: any) => {
            if (!lastSessionMap[s.user_id]) {
              lastSessionMap[s.user_id] = s.last_active_at;
            }
          });
        }

        setActivityData(
          foremen
            .filter((f: any) => {
              const name = f.name || extractNameFromEmail(f.email) || f.email;
              return !isHiddenUser(f.email, name);
            })
            .map((f: any) => ({
              name: f.name || extractNameFromEmail(f.email) || f.email,
              email: f.email,
              lastSignIn: lastSessionMap[f.id] || f.last_sign_in_at || null,
              sessionsThisWeek: sessionMap[f.id]?.count || 0,
              totalMinutesThisWeek: sessionMap[f.id]?.totalMinutes || 0,
            }))
        );
      } catch (err) {
        console.error("[AdminDashboard] Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isAllowed]);

  if (!isAllowed) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Activity className="h-5 w-5 text-indigo-600" />
        Panel de Gestión
      </h2>

      {/* Additional KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {computedKPIs.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-card border rounded-lg p-4 flex items-center gap-3"
          >
            <div className={`${kpi.color} bg-muted rounded-lg p-2`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Works per foreman chart */}
      <div className="bg-card border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-500" />
          Obras activas por jefe de obra
        </h3>
        {worksPerForeman.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Sin datos
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(250, worksPerForeman.length * 44)}>
            <BarChart
              data={worksPerForeman}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={120}
                interval={0}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                  color: "#1f2937",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,.1)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="unit" name="Unit" stackId="a" fill={CHART_COLORS.unit} />
              <Bar dataKey="building" name="Building" stackId="a" fill={CHART_COLORS.building} />
              <Bar dataKey="project" name="Project" stackId="a" fill={CHART_COLORS.project} />
              <Bar dataKey="wip" name="WIP" stackId="a" fill={CHART_COLORS.wip} />
              <Bar dataKey="lot" name="Lot" stackId="a" fill={CHART_COLORS.lot} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Renovadores asignados desde la app */}
      <div className="bg-card border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-emerald-500" />
          Renovadores rellenados desde la app
        </h3>
        {renovatorAssignments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aún no hay renovadores asignados desde la app
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider px-1 pb-1 border-b">
              <span>Jefe de obra</span>
              <span>Desde la app</span>
            </div>
            {renovatorAssignments.map((item) => (
              <div key={item.name} className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-muted/40 transition-colors">
                <span className="text-sm font-medium">{item.name}</span>
                <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  {item.count}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t px-1">
              <span className="text-xs text-muted-foreground font-medium">Total</span>
              <span className="text-sm font-bold">{renovatorAssignments.reduce((s, i) => s + i.count, 0)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Final Check KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-2xl font-bold">{finalCheckKPIs.completed}</p>
            <p className="text-xs text-muted-foreground">Final Checks completados</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
            <Hourglass className="h-4 w-4" />
          </div>
          <div>
            <p className="text-2xl font-bold">{finalCheckKPIs.pending}</p>
            <p className="text-xs text-muted-foreground">Final Checks pendientes</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4 flex items-center gap-3">
          <div className="text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
            <Timer className="h-4 w-4" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {finalCheckKPIs.avgDays !== null ? `${finalCheckKPIs.avgDays}d` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Media días para completar</p>
          </div>
        </div>
      </div>

      {/* Final Checks completados — property_inspections */}
      <div className="bg-card border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-emerald-500" />
          Informes de Final Check completados
          {!loading && finalChecksData.length > 0 && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {finalChecksData.length} informe{finalChecksData.length !== 1 ? "s" : ""}
            </span>
          )}
        </h3>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Cargando...
          </p>
        ) : finalChecksData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay Final Checks completados
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Propiedad</th>
                  <th className="pb-2 pr-4 font-medium">Jefe de obra</th>
                  <th className="pb-2 pr-4 font-medium">Fecha completado</th>
                  <th className="pb-2 font-medium text-center">Informe HTML</th>
                </tr>
              </thead>
              <tbody>
                {finalChecksData.map((fc) => (
                  <tr key={fc.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium max-w-[220px] truncate" title={fc.propertyName}>
                        {fc.propertyName}
                      </div>
                      {fc.propertyAddress && (
                        <div className="text-xs text-muted-foreground max-w-[220px] truncate" title={fc.propertyAddress}>
                          {fc.propertyAddress}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div>{fc.foremanName}</div>
                      {fc.foremanEmail && (
                        <div className="text-xs text-muted-foreground">{fc.foremanEmail}</div>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-xs">
                      {fc.completedAt
                        ? new Date(fc.completedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                        : fc.createdAt
                        ? new Date(fc.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        onClick={() => window.open(fc.publicUrl, "_blank")}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 transition-colors"
                        title="Ver informe HTML público"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        Ver informe
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity table */}
      <div className="bg-card border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-violet-500" />
          Actividad de jefes de obra
        </h3>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Cargando...
          </p>
        ) : activityData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Sin datos de actividad
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Jefe de obra</th>
                  <th className="pb-2 pr-4 font-medium">Última conexión</th>
                  <th className="pb-2 pr-2 font-medium text-center">Initial Checks</th>
                  <th className="pb-2 pr-2 font-medium text-center">Final Checks</th>
                  <th className="pb-2 pr-2 font-medium text-center">Renovadores app</th>
                  <th className="pb-2 pr-2 font-medium text-center">Updates obra</th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    Sesiones (semana)
                  </th>
                  <th className="pb-2 font-medium text-right">
                    Tiempo total (semana)
                  </th>
                </tr>
              </thead>
              <tbody>
                {activityData
                  .sort(
                    (a, b) => b.totalMinutesThisWeek - a.totalMinutesThisWeek
                  )
                  .map((f) => {
                    const fEmail = f.email.toLowerCase().trim();
                    const st = foremanStats[fEmail] || foremanStats[f.email] || { initialChecks: 0, finalChecks: 0, renovatorsApp: 0, obraUpdates: 0 };
                    return (
                    <tr key={f.email} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{f.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {f.email}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {f.lastSignIn
                          ? formatRelativeDate(f.lastSignIn)
                          : "Nunca"}
                      </td>
                      <td className="py-2 pr-2 text-center tabular-nums">
                        {st.initialChecks > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold">
                            {st.initialChecks}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">0</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-center tabular-nums">
                        {st.finalChecks > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold">
                            {st.finalChecks}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">0</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-center tabular-nums">
                        {st.renovatorsApp > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                            {st.renovatorsApp}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">0</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-center tabular-nums">
                        {st.obraUpdates > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-bold">
                            {st.obraUpdates}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">0</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {f.sessionsThisWeek}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatMinutes(f.totalMinutesThisWeek)}
                      </td>
                    </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helpers ---

function isHiddenUser(email: string, name: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  if (HIDDEN_FROM_DASHBOARD.some((h) => normalizedEmail === h.toLowerCase())) return true;
  if (HIDDEN_NAMES_PATTERN.test(name)) return true;
  return false;
}

function getShortName(emailOrName: string): string {
  if (emailOrName === "sin_asignar") return "Sin asignar";
  for (const [name, email] of Object.entries(FOREMAN_NAME_TO_EMAIL)) {
    if (email.toLowerCase() === emailOrName.toLowerCase()) return name;
  }
  return extractNameFromEmail(emailOrName) || emailOrName;
}

function getStartOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Ahora mismo";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes === 0) return "0 min";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}
