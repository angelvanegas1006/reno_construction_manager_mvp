"use client";

import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { ChevronDown, ChevronRight, Loader2, Save, FileUp, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { trackEventWithDevice } from "@/lib/mixpanel";
import { AttachmentViewer } from "@/components/reno/attachment-viewer";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CheckProData {
  datos_tecnicos?: {
    nombre?: string;
    razon_social?: string;
    cif?: string;
    direccion_social?: string;
  };
  datos_proyecto?: {
    provincia?: string;
    municipio?: string;
    referencia_catastral?: string;
    direccion?: string;
  };
  analisis_urbanistico?: {
    datos_urbanisticos?: string;
    instrumento_desarrollo?: string;
    plan_proteccion?: string;
    clasificacion_suelo?: string;
    calificacion_urbanistica?: string;
    uso_global_dominante?: string;
    usos_compatibles?: string;
    edificio_completo?: boolean;
    solo_planta_baja?: boolean;
    otros_usos_planta_baja?: boolean;
    compatible_residencial_otros?: boolean;
    fuera_ordenacion?: boolean;
    tipo_fuera_ordenacion?: string;
    permite_cambio_uso?: string;
    obras_permitidas_fuera?: string;
    edificio_protegido?: boolean;
    tipo_proteccion?: string;
    obras_permitidas_protegido?: string;
    zona_arqueologica?: boolean;
    nucleo_historico?: boolean;
  };
  analisis_anteproyecto?: {
    verificacion_contadores_electricos?: string;
    fotos_contadores_electricos?: { url: string; filename: string }[];
    verificacion_contadores_agua?: string;
    fotos_contadores_agua?: { url: string; filename: string }[];
    contadores_fachada?: string;
    viabilidad_saneamiento?: string;
  };
  analisis_tecnico?: {
    reserva_aparcamiento?: boolean;
    dotacion_obligatoria?: string;
    vinculacion_registral?: string;
    excedente_finca_justificar?: string;
    hay_excedente?: string;
    plazas_en_finca?: string;
    alternativas_planeamiento?: string;
    entrada_accesible?: boolean;
    campanas_filtro_recirculacion?: boolean;
    ventilaciones_fachada?: boolean;
  };
}

/* ------------------------------------------------------------------ */
/*  Photo upload (inline, for suministros)                             */
/* ------------------------------------------------------------------ */

function PhotoUploadField({
  projectId,
  photos,
  onPhotosChange,
}: {
  projectId: string;
  photos: { url: string; filename: string }[];
  onPhotosChange: (p: { url: string; filename: string }[]) => void;
}) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const safeName = file.name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `check-pro/${projectId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("project-attachments")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { data: urlData } = supabase.storage
        .from("project-attachments")
        .getPublicUrl(filePath);
      onPhotosChange([...photos, { url: urlData.publicUrl, filename: file.name }]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al subir foto");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {photos.length > 0 && <AttachmentViewer value={photos} />}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".jpg,.jpeg,.png,.gif,.webp"
        onChange={handleUpload}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 font-medium disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? "Subiendo..." : "Subir foto"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header (collapsible)                                       */
/* ------------------------------------------------------------------ */

function SectionHeader({
  title,
  open,
  onToggle,
  subtitle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors rounded-lg"
    >
      <div className="text-left">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {open ? (
        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Field components                                                    */
/* ------------------------------------------------------------------ */

function TextField({
  label,
  value,
  onChange,
  multiline,
  description,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  description?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {description && <p className="text-[11px] text-muted-foreground -mt-0.5">{description}</p>}
      {multiline ? (
        <Textarea
          className="text-sm min-h-[60px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          className="h-8 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function BooleanField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <Label className="text-xs font-medium text-muted-foreground flex-1">{label}</Label>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Switch checked={value} onCheckedChange={onChange} />
        <span className="text-xs text-muted-foreground w-6">{value ? "Sí" : "No"}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Subsection wrapper                                                  */
/* ------------------------------------------------------------------ */

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider border-b pb-1">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

interface CheckProFormProps {
  projectId: string;
  initialData: CheckProData | null;
  onRefetch: () => Promise<void>;
  onDataChange?: (data: CheckProData) => void;
}

export function CheckProForm({ projectId, initialData, onRefetch, onDataChange }: CheckProFormProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<CheckProData>(initialData ?? {});

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    datos_tecnicos: true,
    datos_proyecto: false,
    analisis_urbanistico: false,
    analisis_anteproyecto: false,
    analisis_tecnico: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateField = useCallback(
    (section: keyof CheckProData, field: string, value: unknown) => {
      setData((prev) => {
        const next = {
          ...prev,
          [section]: { ...(prev[section] as any ?? {}), [field]: value },
        };
        onDataChange?.(next);
        return next;
      });
    },
    [onDataChange],
  );

  const dt = data.datos_tecnicos ?? {};
  const dp = data.datos_proyecto ?? {};
  const au = data.analisis_urbanistico ?? {};
  const aa = data.analisis_anteproyecto ?? {};
  const at = data.analisis_tecnico ?? {};

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ check_pro_data: data, updated_at: new Date().toISOString() })
        .eq("id", projectId);
      if (error) throw new Error(error.message);
      await onRefetch();
      toast.success("Check Pro guardado");
      trackEventWithDevice("Check Pro Saved", { project_id: projectId });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Check Pro</h3>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Guardar Check Pro
        </Button>
      </div>

      {/* 1. Datos Técnicos */}
      <div className="border rounded-lg overflow-hidden">
        <SectionHeader title="Datos Técnicos" open={!!openSections.datos_tecnicos} onToggle={() => toggleSection("datos_tecnicos")} />
        {openSections.datos_tecnicos && (
          <div className="px-4 py-3 space-y-3">
            <TextField label="Nombre" description="Nombre comercial del estudio o nombre completo en caso de autónomo" value={dt.nombre ?? ""} onChange={(v) => updateField("datos_tecnicos", "nombre", v)} />
            <TextField label="Razón Social" value={dt.razon_social ?? ""} onChange={(v) => updateField("datos_tecnicos", "razon_social", v)} />
            <TextField label="CIF" value={dt.cif ?? ""} onChange={(v) => updateField("datos_tecnicos", "cif", v)} />
            <TextField label="Dirección Social" value={dt.direccion_social ?? ""} onChange={(v) => updateField("datos_tecnicos", "direccion_social", v)} />
          </div>
        )}
      </div>

      {/* 2. Datos de Proyecto */}
      <div className="border rounded-lg overflow-hidden">
        <SectionHeader title="Datos de Proyecto" open={!!openSections.datos_proyecto} onToggle={() => toggleSection("datos_proyecto")} />
        {openSections.datos_proyecto && (
          <div className="px-4 py-3 space-y-3">
            <TextField label="Provincia" value={dp.provincia ?? ""} onChange={(v) => updateField("datos_proyecto", "provincia", v)} />
            <TextField label="Municipio" value={dp.municipio ?? ""} onChange={(v) => updateField("datos_proyecto", "municipio", v)} />
            <TextField label="Referencia catastral" value={dp.referencia_catastral ?? ""} onChange={(v) => updateField("datos_proyecto", "referencia_catastral", v)} />
            <TextField label="Dirección" value={dp.direccion ?? ""} onChange={(v) => updateField("datos_proyecto", "direccion", v)} />
          </div>
        )}
      </div>

      {/* 3. Análisis Urbanístico */}
      <div className="border rounded-lg overflow-hidden">
        <SectionHeader title="Análisis Urbanístico" open={!!openSections.analisis_urbanistico} onToggle={() => toggleSection("analisis_urbanistico")} />
        {openSections.analisis_urbanistico && (
          <div className="px-4 py-3 space-y-5">
            <SubSection title="Datos urbanísticos">
              <TextField label="¿Instrumento de desarrollo?" value={au.instrumento_desarrollo ?? ""} onChange={(v) => updateField("analisis_urbanistico", "instrumento_desarrollo", v)} />
              <TextField label="¿Plan de protección?" value={au.plan_proteccion ?? ""} onChange={(v) => updateField("analisis_urbanistico", "plan_proteccion", v)} />
              <TextField label="Clasificación del suelo" value={au.clasificacion_suelo ?? ""} onChange={(v) => updateField("analisis_urbanistico", "clasificacion_suelo", v)} />
              <TextField label="Calificación urbanística" value={au.calificacion_urbanistica ?? ""} onChange={(v) => updateField("analisis_urbanistico", "calificacion_urbanistica", v)} />
              <TextField label="Uso global o dominante" value={au.uso_global_dominante ?? ""} onChange={(v) => updateField("analisis_urbanistico", "uso_global_dominante", v)} />
              <TextField label="Usos compatibles" value={au.usos_compatibles ?? ""} onChange={(v) => updateField("analisis_urbanistico", "usos_compatibles", v)} />
            </SubSection>

            <SubSection title="Compatibilidad de usos">
              <BooleanField label="¿Se actúa sobre un edificio completo?" value={au.edificio_completo ?? false} onChange={(v) => updateField("analisis_urbanistico", "edificio_completo", v)} />
              <BooleanField label="¿Se actúa solo en planta baja del edificio?" value={au.solo_planta_baja ?? false} onChange={(v) => updateField("analisis_urbanistico", "solo_planta_baja", v)} />
              <BooleanField label="¿Existen otros usos distintos al residencial en planta baja?" value={au.otros_usos_planta_baja ?? false} onChange={(v) => updateField("analisis_urbanistico", "otros_usos_planta_baja", v)} />
              <BooleanField label="¿Es compatible el uso residencial con otros usos compatibles en la misma planta baja?" value={au.compatible_residencial_otros ?? false} onChange={(v) => updateField("analisis_urbanistico", "compatible_residencial_otros", v)} />
            </SubSection>

            <SubSection title="Fuera de ordenación">
              <BooleanField label="¿El edificio se encuentra fuera de ordenación?" value={au.fuera_ordenacion ?? false} onChange={(v) => updateField("analisis_urbanistico", "fuera_ordenacion", v)} />
              <TextField label="¿Qué tipo de 'fuera de ordenación'?" value={au.tipo_fuera_ordenacion ?? ""} onChange={(v) => updateField("analisis_urbanistico", "tipo_fuera_ordenacion", v)} />
              <TextField label="¿Se permite el cambio de uso en el edificio fuera de ordenación?" value={au.permite_cambio_uso ?? ""} onChange={(v) => updateField("analisis_urbanistico", "permite_cambio_uso", v)} />
              <TextField label="¿Qué tipo de obras se permiten en el edificio fuera de ordenación?" value={au.obras_permitidas_fuera ?? ""} onChange={(v) => updateField("analisis_urbanistico", "obras_permitidas_fuera", v)} />
            </SubSection>

            <SubSection title="Protección de la edificación">
              <BooleanField label="¿El edificio está protegido?" value={au.edificio_protegido ?? false} onChange={(v) => updateField("analisis_urbanistico", "edificio_protegido", v)} />
              <TextField label="¿Qué tipo de protección tiene?" value={au.tipo_proteccion ?? ""} onChange={(v) => updateField("analisis_urbanistico", "tipo_proteccion", v)} />
              <TextField label="¿Qué tipo de obras se permiten en el edificio protegido?" value={au.obras_permitidas_protegido ?? ""} onChange={(v) => updateField("analisis_urbanistico", "obras_permitidas_protegido", v)} />
            </SubSection>

            <SubSection title="Arqueología">
              <BooleanField label="¿El edificio está en zona arqueológica?" value={au.zona_arqueologica ?? false} onChange={(v) => updateField("analisis_urbanistico", "zona_arqueologica", v)} />
              <BooleanField label="¿El edificio se encuentra en un área de 'Núcleo Histórico'?" value={au.nucleo_historico ?? false} onChange={(v) => updateField("analisis_urbanistico", "nucleo_historico", v)} />
            </SubSection>
          </div>
        )}
      </div>

      {/* 4. Análisis Anteproyecto - Suministros */}
      <div className="border rounded-lg overflow-hidden">
        <SectionHeader title="Análisis Anteproyecto — Suministros" open={!!openSections.analisis_anteproyecto} onToggle={() => toggleSection("analisis_anteproyecto")} />
        {openSections.analisis_anteproyecto && (
          <div className="px-4 py-3 space-y-5">
            <div className="space-y-2">
              <TextField
                label="Verificación del estado actual, ubicación y capacidad de la centralización de contadores eléctricos comunes"
                value={aa.verificacion_contadores_electricos ?? ""}
                onChange={(v) => updateField("analisis_anteproyecto", "verificacion_contadores_electricos", v)}
                multiline
              />
              <div className="pl-1">
                <span className="text-xs text-muted-foreground">Fotos (opcional)</span>
                <PhotoUploadField
                  projectId={projectId}
                  photos={aa.fotos_contadores_electricos ?? []}
                  onPhotosChange={(p) => updateField("analisis_anteproyecto", "fotos_contadores_electricos", p)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <TextField
                label="Verificación del estado actual, ubicación y capacidad de la centralización de contadores de agua comunes"
                value={aa.verificacion_contadores_agua ?? ""}
                onChange={(v) => updateField("analisis_anteproyecto", "verificacion_contadores_agua", v)}
                multiline
              />
              <div className="pl-1">
                <span className="text-xs text-muted-foreground">Fotos (opcional)</span>
                <PhotoUploadField
                  projectId={projectId}
                  photos={aa.fotos_contadores_agua ?? []}
                  onPhotosChange={(p) => updateField("analisis_anteproyecto", "fotos_contadores_agua", p)}
                />
              </div>
            </div>

            <TextField
              label="En caso de preveer la instalación de contadores en fachada, ¿se ha tenido en cuenta en la composición de fachada y carpintería?"
              value={aa.contadores_fachada ?? ""}
              onChange={(v) => updateField("analisis_anteproyecto", "contadores_fachada", v)}
              multiline
            />
            <TextField
              label="Análisis de viabilidad de la instalación de saneamiento"
              value={aa.viabilidad_saneamiento ?? ""}
              onChange={(v) => updateField("analisis_anteproyecto", "viabilidad_saneamiento", v)}
              multiline
            />
          </div>
        )}
      </div>

      {/* 5. Análisis Técnico */}
      <div className="border rounded-lg overflow-hidden">
        <SectionHeader title="Análisis Técnico" open={!!openSections.analisis_tecnico} onToggle={() => toggleSection("analisis_tecnico")} />
        {openSections.analisis_tecnico && (
          <div className="px-4 py-3 space-y-5">
            <SubSection title="Aparcamiento">
              <BooleanField label="¿Obligan a reserva de aparcamiento?" value={at.reserva_aparcamiento ?? false} onChange={(v) => updateField("analisis_tecnico", "reserva_aparcamiento", v)} />
              <TextField label="¿Qué dotación es obligatoria?" value={at.dotacion_obligatoria ?? ""} onChange={(v) => updateField("analisis_tecnico", "dotacion_obligatoria", v)} />
              <TextField label="¿Las plazas tienen que estar vinculadas registralmente a las viviendas?" value={at.vinculacion_registral ?? ""} onChange={(v) => updateField("analisis_tecnico", "vinculacion_registral", v)} />
              <TextField label="¿Permiten justificar con el excedente de la finca?" value={at.excedente_finca_justificar ?? ""} onChange={(v) => updateField("analisis_tecnico", "excedente_finca_justificar", v)} />
              <TextField label="¿Hay excedente en la finca?" value={at.hay_excedente ?? ""} onChange={(v) => updateField("analisis_tecnico", "hay_excedente", v)} />
              <TextField label="¿Las plazas tienen que estar necesariamente en la finca?" value={at.plazas_en_finca ?? ""} onChange={(v) => updateField("analisis_tecnico", "plazas_en_finca", v)} />
              <TextField label="¿Qué alternativas permite el planeamiento?" value={at.alternativas_planeamiento ?? ""} onChange={(v) => updateField("analisis_tecnico", "alternativas_planeamiento", v)} multiline />
            </SubSection>

            <SubSection title="Accesibilidad">
              <BooleanField label="¿Obligan a que las viviendas tengan que tener entrada accesible?" value={at.entrada_accesible ?? false} onChange={(v) => updateField("analisis_tecnico", "entrada_accesible", v)} />
            </SubSection>

            <SubSection title="Salida de Humos / Ventilación">
              <BooleanField label="¿Se permiten campanas con filtro de recirculación?" value={at.campanas_filtro_recirculacion ?? false} onChange={(v) => updateField("analisis_tecnico", "campanas_filtro_recirculacion", v)} />
              <BooleanField label="¿Permite sacar ventilaciones a la fachada?" value={at.ventilaciones_fachada ?? false} onChange={(v) => updateField("analisis_tecnico", "ventilaciones_fachada", v)} />
            </SubSection>
          </div>
        )}
      </div>
    </div>
  );
}
