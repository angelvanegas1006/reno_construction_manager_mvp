import { PROPHERO_LOGO_DATA_URL } from "@/lib/assets/prophero-logo-base64";
import type { CheckProData } from "@/components/reno/check-pro-form";

interface CheckProReportInfo {
  projectName: string;
  projectId: string;
  architect: string;
  generatedAt: string;
}

function esc(val: unknown): string {
  if (val == null) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function boolLabel(val: unknown): string {
  if (val === true) return '<span class="badge badge-yes">Sí</span>';
  if (val === false) return '<span class="badge badge-no">No</span>';
  return '<span class="badge badge-empty">—</span>';
}

function textRow(label: string, value: unknown): string {
  const v = value != null && String(value).trim() !== "" ? esc(value) : '<span class="empty">Sin rellenar</span>';
  return `<tr><td class="label">${esc(label)}</td><td class="value">${v}</td></tr>`;
}

function boolRow(label: string, value: unknown): string {
  return `<tr><td class="label">${esc(label)}</td><td class="value">${boolLabel(value)}</td></tr>`;
}

function photoGrid(photos: { url: string; filename: string }[] | undefined): string {
  if (!photos || photos.length === 0) return "";
  const imgs = photos.map(
    (p) => `<a href="${esc(p.url)}" target="_blank" class="photo-link"><img src="${esc(p.url)}" alt="${esc(p.filename)}" /></a>`
  ).join("");
  return `<div class="photo-grid">${imgs}</div>`;
}

export function generateCheckProHTML(data: CheckProData, info: CheckProReportInfo): string {
  const dt = data.datos_tecnicos ?? {};
  const dp = data.datos_proyecto ?? {};
  const au = data.analisis_urbanistico ?? {};
  const aa = data.analisis_anteproyecto ?? {};
  const at = data.analisis_tecnico ?? {};

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Check Pro — ${esc(info.projectName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; color: #1a1a2e; background: #f8f9fb; line-height: 1.55; }
  .container { max-width: 820px; margin: 0 auto; padding: 32px 24px 48px; }

  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e2e5eb; }
  .header img { height: 36px; }
  .header-right { text-align: right; }
  .header-right .title { font-size: 20px; font-weight: 700; color: #111827; }
  .header-right .subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }

  /* Meta */
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 28px; padding: 16px 20px; background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; }
  .meta-item { font-size: 13px; }
  .meta-item .lbl { color: #6b7280; font-weight: 500; }
  .meta-item .val { color: #111827; font-weight: 600; }

  /* Section */
  .section { background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; margin-bottom: 20px; overflow: hidden; }
  .section-header { padding: 14px 20px; background: #f1f3f7; font-size: 15px; font-weight: 700; color: #111827; border-bottom: 1px solid #e5e7eb; }
  .subsection-header { padding: 10px 20px; font-size: 13px; font-weight: 600; color: #374151; background: #fafbfc; border-bottom: 1px solid #f0f0f3; }

  /* Table */
  table { width: 100%; border-collapse: collapse; }
  tr { border-bottom: 1px solid #f0f1f4; }
  tr:last-child { border-bottom: none; }
  td { padding: 10px 20px; font-size: 13px; vertical-align: top; }
  td.label { width: 55%; color: #374151; font-weight: 500; }
  td.value { color: #111827; }
  .empty { color: #9ca3af; font-style: italic; }

  /* Badges */
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .badge-yes { background: #dcfce7; color: #166534; }
  .badge-no { background: #fee2e2; color: #991b1b; }
  .badge-empty { background: #f3f4f6; color: #9ca3af; }

  /* Photos */
  .photo-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 20px 14px; }
  .photo-link { display: block; width: 120px; height: 90px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
  .photo-link img { width: 100%; height: 100%; object-fit: cover; }

  /* Footer */
  .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af; }

  @media print {
    body { background: #fff; }
    .container { padding: 16px; }
    .section { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="container">

  <div class="header">
    <img src="${PROPHERO_LOGO_DATA_URL}" alt="PropHero" />
    <div class="header-right">
      <div class="title">Informe Check Pro</div>
      <div class="subtitle">Revisión técnica del anteproyecto</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><span class="lbl">Proyecto: </span><span class="val">${esc(info.projectName)}</span></div>
    <div class="meta-item"><span class="lbl">ID: </span><span class="val">${esc(info.projectId)}</span></div>
    <div class="meta-item"><span class="lbl">Arquitecto: </span><span class="val">${esc(info.architect) || "—"}</span></div>
    <div class="meta-item"><span class="lbl">Generado: </span><span class="val">${esc(info.generatedAt)}</span></div>
  </div>

  <!-- 1. Datos Técnicos -->
  <div class="section">
    <div class="section-header">1. Datos Técnicos</div>
    <table>
      ${textRow("Nombre", dt.nombre)}
      ${textRow("Razón Social", dt.razon_social)}
      ${textRow("CIF", dt.cif)}
      ${textRow("Dirección Social", dt.direccion_social)}
    </table>
  </div>

  <!-- 2. Datos de Proyecto -->
  <div class="section">
    <div class="section-header">2. Datos de Proyecto</div>
    <table>
      ${textRow("Provincia", dp.provincia)}
      ${textRow("Municipio", dp.municipio)}
      ${textRow("Referencia catastral", dp.referencia_catastral)}
      ${textRow("Dirección", dp.direccion)}
    </table>
  </div>

  <!-- 3. Análisis Urbanístico -->
  <div class="section">
    <div class="section-header">3. Análisis Urbanístico</div>

    <div class="subsection-header">Datos urbanísticos</div>
    <table>
      ${textRow("¿Instrumento de desarrollo?", au.instrumento_desarrollo)}
      ${textRow("¿Plan de protección?", au.plan_proteccion)}
      ${textRow("Clasificación del suelo", au.clasificacion_suelo)}
      ${textRow("Calificación urbanística", au.calificacion_urbanistica)}
      ${textRow("Uso global o dominante", au.uso_global_dominante)}
      ${textRow("Usos compatibles", au.usos_compatibles)}
    </table>

    <div class="subsection-header">Compatibilidad de usos</div>
    <table>
      ${boolRow("¿Se actúa sobre un edificio completo?", au.edificio_completo)}
      ${boolRow("¿Se actúa solo en planta baja del edificio?", au.solo_planta_baja)}
      ${boolRow("¿Existen otros usos distintos al residencial en planta baja?", au.otros_usos_planta_baja)}
      ${boolRow("¿Es compatible el uso residencial con otros usos compatibles en la misma planta baja?", au.compatible_residencial_otros)}
    </table>

    <div class="subsection-header">Fuera de ordenación</div>
    <table>
      ${boolRow("¿El edificio se encuentra fuera de ordenación?", au.fuera_ordenacion)}
      ${textRow("¿Qué tipo de 'fuera de ordenación'?", au.tipo_fuera_ordenacion)}
      ${textRow("¿Se permite el cambio de uso en el edificio fuera de ordenación?", au.permite_cambio_uso)}
      ${textRow("¿Qué tipo de obras se permiten en el edificio fuera de ordenación?", au.obras_permitidas_fuera)}
    </table>

    <div class="subsection-header">Protección de la edificación</div>
    <table>
      ${boolRow("¿El edificio está protegido?", au.edificio_protegido)}
      ${textRow("¿Qué tipo de protección tiene?", au.tipo_proteccion)}
      ${textRow("¿Qué tipo de obras se permiten en el edificio protegido?", au.obras_permitidas_protegido)}
    </table>

    <div class="subsection-header">Arqueología</div>
    <table>
      ${boolRow("¿El edificio está en zona arqueológica?", au.zona_arqueologica)}
      ${boolRow("¿El edificio se encuentra en un área de 'Núcleo Histórico'?", au.nucleo_historico)}
    </table>
  </div>

  <!-- 4. Análisis Anteproyecto — Suministros -->
  <div class="section">
    <div class="section-header">4. Análisis Anteproyecto — Suministros</div>
    <table>
      ${textRow("Verificación contadores eléctricos", aa.verificacion_contadores_electricos)}
    </table>
    ${photoGrid(aa.fotos_contadores_electricos)}
    <table>
      ${textRow("Verificación contadores de agua", aa.verificacion_contadores_agua)}
    </table>
    ${photoGrid(aa.fotos_contadores_agua)}
    <table>
      ${textRow("Contadores en fachada", aa.contadores_fachada)}
      ${textRow("Viabilidad instalación saneamiento", aa.viabilidad_saneamiento)}
    </table>
  </div>

  <!-- 5. Análisis Técnico -->
  <div class="section">
    <div class="section-header">5. Análisis Técnico</div>

    <div class="subsection-header">Aparcamiento</div>
    <table>
      ${boolRow("¿Obligan a reserva de aparcamiento?", at.reserva_aparcamiento)}
      ${textRow("¿Qué dotación es obligatoria?", at.dotacion_obligatoria)}
      ${textRow("¿Vinculación registral a viviendas?", at.vinculacion_registral)}
      ${textRow("¿Permiten justificar con excedente de la finca?", at.excedente_finca_justificar)}
      ${textRow("¿Hay excedente en la finca?", at.hay_excedente)}
      ${textRow("¿Plazas necesariamente en la finca?", at.plazas_en_finca)}
      ${textRow("¿Qué alternativas permite el planeamiento?", at.alternativas_planeamiento)}
    </table>

    <div class="subsection-header">Accesibilidad</div>
    <table>
      ${boolRow("¿Obligan a entrada accesible?", at.entrada_accesible)}
    </table>

    <div class="subsection-header">Salida de Humos / Ventilación</div>
    <table>
      ${boolRow("¿Se permiten campanas con filtro de recirculación?", at.campanas_filtro_recirculacion)}
      ${boolRow("¿Permite sacar ventilaciones a la fachada?", at.ventilaciones_fachada)}
    </table>
  </div>

  <div class="footer">
    Generado por PropHero · ${esc(info.generatedAt)}
  </div>
</div>
</body>
</html>`;
}
