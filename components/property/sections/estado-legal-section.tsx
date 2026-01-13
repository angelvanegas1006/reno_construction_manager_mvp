"use client";

import { forwardRef, useCallback, useMemo } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropertyData, InquilinoSituation } from "@/lib/property-storage";
import { useFormState } from "@/hooks/useFormState";
import { useI18n } from "@/lib/i18n";

interface EstadoLegalSectionProps {
  data: PropertyData;
  onUpdate: (updates: Partial<PropertyData>) => void;
  onContinue?: () => void;
}

export const EstadoLegalSection = forwardRef<HTMLDivElement, EstadoLegalSectionProps>(
  ({ data, onUpdate, onContinue }, ref) => {
    const { t } = useI18n();
    // Use form state hook for controlled components
    const { formData, updateField } = useFormState({
      initialData: data,
      onUpdate,
    });

    // Memoized derived state
    const showInquilinoDropdown = useMemo(() => 
      formData.propiedadAlquilada === true, 
      [formData.propiedadAlquilada]
    );

    // Memoized handler with side effects
    const handlePropiedadAlquiladaChange = useCallback((value: string) => {
      const isAlquilada = value === "Sí";
      updateField("propiedadAlquilada", isAlquilada);
      
      // Clear situacionInquilinos if not rented
      if (!isAlquilada) {
        updateField("situacionInquilinos", undefined);
      }
    }, [updateField]);

    const INQUILINO_OPTIONS: InquilinoSituation[] = [
      "Los inquilinos permanecen",
      "El inmueble se entregará libre",
      "Está ocupado ilegalmente",
    ];

    return (
      <div ref={ref} className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t.property.sections.legalStatus}</h1>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]/20 border border-[var(--prophero-blue-200)] dark:border-[var(--prophero-blue-800)] rounded-lg">
          <Info className="h-5 w-5 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--prophero-blue-900)] dark:text-[var(--prophero-blue-200)]">
              Campos requeridos para la revisión inicial
            </p>
            <p className="text-sm text-[var(--prophero-blue-800)] dark:text-[var(--prophero-blue-300)] mt-1">
              Todos los campos de esta sección son obligatorios para poder enviar la propiedad a revisión.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Comunidad de propietarios constituida */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Comunidad de propietarios constituida <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              El edificio ya cuenta con una comunidad de vecinos formalmente establecida.
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="comunidad"
                  checked={formData.comunidadPropietariosConstituida === true}
                  onChange={() => updateField("comunidadPropietariosConstituida", true)}
                  className="h-4 w-4 text-[var(--prophero-blue-600)] focus:ring-[var(--prophero-blue-500)]"
                />
                <span className="text-sm">Sí</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="comunidad"
                  checked={formData.comunidadPropietariosConstituida === false}
                  onChange={() => updateField("comunidadPropietariosConstituida", false)}
                  className="h-4 w-4 text-[var(--prophero-blue-600)] focus:ring-[var(--prophero-blue-500)]"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>

          {/* El edificio tiene seguro activo */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              El edificio tiene seguro activo <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              El edificio cuenta actualmente con una póliza de seguro en vigor.
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="seguro"
                  checked={formData.edificioSeguroActivo === true}
                  onChange={() => updateField("edificioSeguroActivo", true)}
                  className="h-4 w-4 text-[var(--prophero-blue-600)] focus:ring-[var(--prophero-blue-500)]"
                />
                <span className="text-sm">Sí</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="seguro"
                  checked={formData.edificioSeguroActivo === false}
                  onChange={() => updateField("edificioSeguroActivo", false)}
                  className="h-4 w-4 text-[var(--prophero-blue-600)] focus:ring-[var(--prophero-blue-500)]"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>

          {/* PropHero se comercializa en exclusiva */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              PropHero se comercializa en exclusiva <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Se cuenta con la autorización exclusiva para vender esta propiedad.
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exclusiva"
                  checked={formData.comercializaExclusiva === true}
                  onChange={() => updateField("comercializaExclusiva", true)}
                  className="h-4 w-4 text-[var(--prophero-blue-600)] focus:ring-[var(--prophero-blue-500)]"
                />
                <span className="text-sm">Sí</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exclusiva"
                  checked={formData.comercializaExclusiva === false}
                  onChange={() => updateField("comercializaExclusiva", false)}
                  className="h-4 w-4 text-[var(--prophero-blue-600)] focus:ring-[var(--prophero-blue-500)]"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>

          {/* El edificio tiene una ITE favorable en vigor */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              El edificio tiene una ITE favorable en vigor <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Indica si el edificio ha superado la inspección y cuenta con un informe favorable y vigente.
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="ite"
                  checked={formData.edificioITEfavorable === true}
                  onChange={() => updateField("edificioITEfavorable", true)}
                  className="h-4 w-4 text-[var(--prophero-blue-600)] focus:ring-[var(--prophero-blue-500)]"
                />
                <span className="text-sm">Sí</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="ite"
                  checked={formData.edificioITEfavorable === false}
                  onChange={() => updateField("edificioITEfavorable", false)}
                  className="h-4 w-4 text-[var(--prophero-blue-600)] focus:ring-[var(--prophero-blue-500)]"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>

          {/* La propiedad está actualmente alquilada */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              La propiedad está actualmente alquilada <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              La vivienda tiene un inquilino activo o un contrato de alquiler vigente.
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="alquilada"
                  checked={formData.propiedadAlquilada === true}
                  onChange={() => handlePropiedadAlquiladaChange("Sí")}
                  className="h-4 w-4 text-[var(--prophero-blue-600)] focus:ring-[var(--prophero-blue-500)]"
                />
                <span className="text-sm">Sí</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="alquilada"
                  checked={formData.propiedadAlquilada === false}
                  onChange={() => handlePropiedadAlquiladaChange("No")}
                  className="h-4 w-4 text-[var(--prophero-blue-600)] focus:ring-[var(--prophero-blue-500)]"
                />
                <span className="text-sm">No</span>
              </label>
            </div>

            {/* Conditional Dropdown - Situación de los inquilinos */}
            {showInquilinoDropdown && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="situacionInquilinos" className="text-sm font-semibold">
                  Situación de los inquilinos tras la compra <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.situacionInquilinos || ""}
                  onValueChange={(value) => updateField("situacionInquilinos", value as InquilinoSituation)}
                >
                  <SelectTrigger id="situacionInquilinos">
                    <SelectValue placeholder="Selecciona una opción" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4}>
                    {INQUILINO_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="ghost" onClick={() => window.history.back()}>
              ← Atrás
            </Button>
            {onContinue && (
              <Button 
                onClick={() => {
                  // Save current data before continuing
                  onUpdate(formData);
                  onContinue();
                }} 
                size="lg"
              >
                {t.common.continue}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

EstadoLegalSection.displayName = "EstadoLegalSection";

