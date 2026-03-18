/**
 * WIP Timeline Logic
 *
 * Implements the duration calculation rules from the CRONOGRAMA WIPS PDF.
 * Builds a list of WipTimelinePhase[] for a given WIP project.
 */

import type { ProjectRow } from "@/hooks/useSupabaseProjects";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type WipBlock = "maduracion" | "obra" | "post-obra";
export type WipPhaseStatus =
  | "completed"
  | "in-progress"
  | "pending"
  | "not-applicable";

export interface WipTimelinePhase {
  id: string;
  label: string;
  block: WipBlock;
  /** Real start date if available */
  startDate: Date | null;
  /** Real end date if available */
  endDate: Date | null;
  /** Planned/estimated duration in days (from PDF rules). Null = N/A */
  estimatedDays: number | null;
  /** If true, no real dates exist — bar should render as estimated/dashed */
  isEstimated: boolean;
  status: WipPhaseStatus;
  /** Optional clarification shown in tooltip */
  note?: string;
  /** Sub-phases rendered as parallel rows */
  subPhases?: WipTimelinePhase[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function phaseStatus(
  start: Date | null,
  end: Date | null,
  estimatedEnd: Date | null,
  notApplicable = false
): WipPhaseStatus {
  if (notApplicable) return "not-applicable";
  if (end) return "completed";
  if (start && start <= today()) return "in-progress";
  return "pending";
}

/* ------------------------------------------------------------------ */
/*  Duration lookup tables (from PDF)                                 */
/* ------------------------------------------------------------------ */

/**
 * Parses wip_completion_pct which may be a string like "45" or "45%".
 * Returns a number 0-100 or null.
 */
function parseCompletionPct(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = parseFloat(String(raw).replace("%", "").trim());
  return isNaN(n) ? null : Math.min(100, Math.max(0, n));
}

/**
 * Parses properties_to_convert which may be a string like "32" or a number.
 * Returns integer or null.
 */
function parseProperties(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const n = parseInt(String(raw).trim(), 10);
  return isNaN(n) ? null : n;
}

type ProgressBracket =
  | "estructura"      // >25%
  | "fachadas"        // <40%
  | "distribucion"    // <60%
  | "acabados"        // <80%
  | "vandalizado";    // ~90%

function getProgressBracket(pct: number): ProgressBracket {
  if (pct >= 80) return "vandalizado";
  if (pct >= 60) return "acabados";
  if (pct >= 40) return "distribucion";
  if (pct >= 25) return "fachadas";
  return "estructura";
}

type DwellingBracket = "lt20" | "20to40" | "40to80" | "gt80";

function getDwellingBracket(n: number): DwellingBracket {
  if (n < 20) return "lt20";
  if (n <= 40) return "20to40";
  if (n <= 80) return "40to80";
  return "gt80";
}

// Obra duration in months [min, max] — some brackets have a single value
const OBRA_DURATION_MONTHS: Record<
  ProgressBracket,
  Record<DwellingBracket, [number, number]>
> = {
  estructura:    { lt20: [14, 14], "20to40": [16, 16], "40to80": [18, 18], gt80: [20, 20] },
  fachadas:      { lt20: [12, 12], "20to40": [14, 14], "40to80": [16, 16], gt80: [18, 18] },
  distribucion:  { lt20: [9, 9],   "20to40": [11, 11], "40to80": [13, 13], gt80: [15, 15] },
  acabados:      { lt20: [8, 8],   "20to40": [9, 9],   "40to80": [10, 10], gt80: [12, 12] },
  vandalizado:   { lt20: [4, 6],   "20to40": [6, 8],   "40to80": [8, 10],  gt80: [10, 12] },
};

/**
 * Returns estimated obra duration in days (using average of [min,max] range).
 */
function estimatedObraDays(pct: number | null, properties: number | null): number | null {
  if (pct === null || properties === null) return null;
  const bracket = getProgressBracket(pct);
  const dwelling = getDwellingBracket(properties);
  const [minM, maxM] = OBRA_DURATION_MONTHS[bracket][dwelling];
  const avgMonths = (minM + maxM) / 2;
  return Math.round(avgMonths * 30.44); // average days per month
}

/* ------------------------------------------------------------------ */
/*  Main builder                                                       */
/* ------------------------------------------------------------------ */

export function buildWipPhases(project: ProjectRow): WipTimelinePhase[] {
  const p = project as any;

  // Dates
  const projectStart = parseDate(p.project_start_date);
  const renoStart = parseDate(p.reno_start_date) ?? parseDate(p.est_reno_start_date);
  const renoEnd = parseDate(p.reno_end_date) ?? parseDate(p.est_reno_end_date);
  const estSettlement = parseDate(p.estimated_settlement_date);

  // WIP-specific field values
  const completionPct = parseCompletionPct(p.wip_completion_pct);
  const nProperties = parseProperties(p.properties_to_convert ?? p.est_properties);
  const ctTransCenter: string | null = p.ct_trans_center ?? null;
  const licensesOk: boolean = !!p.licenses_ok;
  const utilitiesOk: boolean = !!p.utilities_ok;

  // Derived
  const hasCT = ctTransCenter && ctTransCenter.toLowerCase() !== "no" && ctTransCenter.trim() !== "";
  const renoStartPlus2M = renoStart ? addMonths(renoStart, 2) : null;

  const phases: WipTimelinePhase[] = [];

  /* ------------------------------------------------------------------ */
  /*  BLOQUE 1: MADURACIÓN                                              */
  /* ------------------------------------------------------------------ */

  // 1a. Licencias
  // Duration: 1 month DERE if VPO; otherwise variable (we estimate 2 months)
  const vpoProject: string | null = p.vpo_project ?? null;
  const isVpo = vpoProject && vpoProject.toLowerCase() !== "no" && vpoProject.trim() !== "";
  const licenciasEstDays = isVpo ? 30 : 60; // 1 month VPO, 2 months generic
  const licenciasNote = isVpo
    ? "VPO: 1 mes (DERE)"
    : "Duración variable según tipo de licencia";

  phases.push({
    id: "maduracion-licencias",
    label: "Licencias",
    block: "maduracion",
    startDate: projectStart,
    endDate: licensesOk ? (renoStart ?? null) : null,
    estimatedDays: licenciasEstDays,
    isEstimated: !projectStart || !licensesOk,
    status: phaseStatus(
      projectStart,
      licensesOk ? (renoStart ?? addDays(projectStart ?? today(), licenciasEstDays)) : null,
      projectStart ? addDays(projectStart, licenciasEstDays) : null
    ),
    note: licenciasNote,
  });

  // 1b. Suministros CT
  // CT Sí: starts in maduración (~16 months total, ends in post-obra)
  // CT No / acometidas ejecutadas: N/A
  // Acometidas no ejecutadas: 6-8 months from month 2 of obra start
  const ctStatus = hasCT
    ? (utilitiesOk ? "completed" : "in-progress")
    : "not-applicable";

  if (hasCT) {
    // CT Sí: 16 months total from project start
    const ctEstStart = projectStart;
    const ctEstEnd = projectStart ? addMonths(projectStart, 16) : null;
    phases.push({
      id: "maduracion-suministros-ct",
      label: "Suministros CT",
      block: "maduracion",
      startDate: ctEstStart,
      endDate: utilitiesOk ? (renoEnd ?? null) : null,
      estimatedDays: 16 * 31,
      isEstimated: !projectStart || !utilitiesOk,
      status: ctStatus as WipPhaseStatus,
      note: "CT Sí: ~16 meses desde inicio (termina en Post-Obra)",
    });
  } else {
    // Try to infer if acometidas no ejecutadas applies (utility_status_notes contains hint)
    const hasUnappliedAccom =
      p.utility_status_notes &&
      (String(p.utility_status_notes).toLowerCase().includes("acometida") ||
        String(p.utility_status_notes).toLowerCase().includes("no ejecutada"));

    if (hasUnappliedAccom && renoStartPlus2M) {
      phases.push({
        id: "maduracion-suministros-acometidas",
        label: "Acometidas (no ejecutadas)",
        block: "maduracion",
        startDate: renoStartPlus2M,
        endDate: null,
        estimatedDays: 7 * 30, // 6-8 months midpoint
        isEstimated: true,
        status: "pending",
        note: "6-8 meses desde el mes 2 de inicio de obra",
      });
    } else {
      phases.push({
        id: "maduracion-suministros-na",
        label: "Suministros CT",
        block: "maduracion",
        startDate: null,
        endDate: null,
        estimatedDays: null,
        isEstimated: false,
        status: "not-applicable",
        note: "CT No — N/A",
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  BLOQUE 2: OBRA                                                    */
  /* ------------------------------------------------------------------ */

  const obraEstDays = estimatedObraDays(completionPct, nProperties);

  let obraNote: string;
  if (completionPct !== null && nProperties !== null) {
    const bracket = getProgressBracket(completionPct);
    const dwelling = getDwellingBracket(nProperties);
    const [minM, maxM] = OBRA_DURATION_MONTHS[bracket][dwelling];
    const bracketLabels: Record<ProgressBracket, string> = {
      estructura: ">25% Estructura",
      fachadas: "<40% Fachadas",
      distribucion: "<60% Distribución",
      acabados: "<80% Acabados",
      vandalizado: "~90% Vandalizado",
    };
    obraNote =
      minM === maxM
        ? `${bracketLabels[bracket]} · ${nProperties} viv → ${minM} meses`
        : `${bracketLabels[bracket]} · ${nProperties} viv → ${minM}-${maxM} meses`;
  } else {
    obraNote = "Sin datos suficientes para calcular duración";
  }

  phases.push({
    id: "obra-principal",
    label: "Obra",
    block: "obra",
    startDate: renoStart,
    endDate: renoEnd,
    estimatedDays: obraEstDays,
    isEstimated: !renoStart,
    status: phaseStatus(renoStart, renoEnd, renoStart ? addDays(renoStart, obraEstDays ?? 365) : null),
    note: obraNote,
  });

  /* ------------------------------------------------------------------ */
  /*  BLOQUE 3: POST-OBRA                                               */
  /* ------------------------------------------------------------------ */

  // The post-obra phases are parallel sub-items anchored to renoEnd / renoStartPlus2M

  // 3a. Estado Registral
  // Sin DH: 4 months from month 2 of obra start + 2 months from Reno End Date
  // Con DH/Sin AFO: 2 months from Reno End
  // DH + AFO: N/A
  const registralStart = renoStartPlus2M ?? (renoEnd ? addMonths(renoEnd, -4) : null);
  const registralEnd = renoEnd ? addMonths(renoEnd, 2) : null;
  phases.push({
    id: "post-obra-registral",
    label: "Estado Registral",
    block: "post-obra",
    startDate: registralStart,
    endDate: null,
    estimatedDays: registralStart && registralEnd
      ? Math.round((registralEnd.getTime() - registralStart.getTime()) / 86_400_000)
      : 4 * 30,
    isEstimated: true,
    status: phaseStatus(registralStart, null, registralEnd),
    note: "Sin DH: 4 meses desde mes 2 de inicio obra + 2 meses desde Reno End",
  });

  // 3b. Referencias Catastrales
  // Sí: N/A | No: 4 months from month 2 of obra start
  phases.push({
    id: "post-obra-catastral",
    label: "Referencias Catastrales",
    block: "post-obra",
    startDate: renoStartPlus2M ?? null,
    endDate: null,
    estimatedDays: 4 * 30,
    isEstimated: true,
    status: phaseStatus(renoStartPlus2M, null, renoStartPlus2M ? addMonths(renoStartPlus2M, 4) : null),
    note: "4 meses desde el mes 2 de inicio de obra",
  });

  // 3c. Suministros finales (CT continuación si aplica)
  if (hasCT) {
    // CT terminates here (post-obra end)
    const ctPostStart = renoEnd;
    const ctPostEnd = renoEnd ? addMonths(renoEnd, 2) : null;
    phases.push({
      id: "post-obra-suministros",
      label: "Suministros (fin CT)",
      block: "post-obra",
      startDate: ctPostStart,
      endDate: ctPostEnd,
      estimatedDays: 2 * 30,
      isEstimated: !renoEnd,
      status: phaseStatus(ctPostStart, ctPostEnd && ctPostEnd < today() ? ctPostEnd : null, ctPostEnd),
      note: "Finalización del CT (termina en Post-Obra, ~2 meses tras fin de obra)",
    });
  }

  // 3d. Settlement / Liquidación (if available)
  if (estSettlement || renoEnd) {
    const settlementStart = renoEnd ?? null;
    const settlementEnd = estSettlement ?? (renoEnd ? addMonths(renoEnd, 3) : null);
    phases.push({
      id: "post-obra-settlement",
      label: "Liquidación",
      block: "post-obra",
      startDate: settlementStart,
      endDate: settlementEnd,
      estimatedDays: 90,
      isEstimated: !estSettlement,
      status: phaseStatus(settlementStart, settlementEnd && settlementEnd < today() ? settlementEnd : null, settlementEnd),
      note: "Fecha estimada de liquidación",
    });
  }

  return phases;
}

/* ------------------------------------------------------------------ */
/*  Compact summary for home overview cards                           */
/* ------------------------------------------------------------------ */

export interface WipCompactBlock {
  id: WipBlock;
  label: string;
  status: WipPhaseStatus;
  /** 0-100 progress within this block */
  progress: number;
  startDate: Date | null;
  endDate: Date | null;
}

export function buildWipCompactBlocks(project: ProjectRow): WipCompactBlock[] {
  const phases = buildWipPhases(project);

  const blocks: WipBlock[] = ["maduracion", "obra", "post-obra"];
  const labels: Record<WipBlock, string> = {
    maduracion: "Maduración",
    obra: "Obra",
    "post-obra": "Post-Obra",
  };

  return blocks.map((block) => {
    const blockPhases = phases.filter((ph) => ph.block === block && ph.status !== "not-applicable");

    if (blockPhases.length === 0) {
      return {
        id: block,
        label: labels[block],
        status: "not-applicable",
        progress: 0,
        startDate: null,
        endDate: null,
      };
    }

    const completed = blockPhases.filter((ph) => ph.status === "completed").length;
    const active = blockPhases.some((ph) => ph.status === "in-progress");
    const progress = Math.round((completed / blockPhases.length) * 100);

    let status: WipPhaseStatus;
    if (completed === blockPhases.length) status = "completed";
    else if (active || completed > 0) status = "in-progress";
    else status = "pending";

    const starts = blockPhases.map((ph) => ph.startDate).filter(Boolean) as Date[];
    const ends = blockPhases.map((ph) => ph.endDate).filter(Boolean) as Date[];

    return {
      id: block,
      label: labels[block],
      status,
      progress,
      startDate: starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : null,
      endDate: ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : null,
    };
  });
}
