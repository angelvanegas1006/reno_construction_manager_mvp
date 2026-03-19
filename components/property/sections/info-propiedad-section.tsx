"use client";

import { forwardRef, useCallback } from "react";
import { Info, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropertyData, PropertyType } from "@/lib/property-storage";
import { PROPERTY_TYPES } from "@/lib/constants";
import { useFormState } from "@/hooks/useFormState";
import { useI18n } from "@/lib/i18n";

interface InfoPropiedadSectionProps {
  data: PropertyData;
  onUpdate: (updates: Partial<PropertyData>) => void;
  onContinue?: () => void;
}

export const InfoPropiedadSection = forwardRef<HTMLDivElement, InfoPropiedadSectionProps>(
  ({ data, onUpdate, onContinue }, ref) => {
    const { t } = useI18n();
    // Use form state hook for controlled components
    const { formData, updateField } = useFormState({
      initialData: data,
      onUpdate,
    });

    // Memoized handlers for number inputs
    const handleNumberChange = useCallback((
      field: "habitaciones" | "banos" | "plazasAparcamiento",
      delta: number
    ) => {
      const current = formData[field] || 0;
      const newValue = Math.max(0, Math.min(99, current + delta));
      updateField(field, newValue);
    }, [formData, updateField]);

    return (
      <div ref={ref} className="bg-card dark:bg-v-gray-900 rounded-lg border p-6 shadow-sm space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t.property.sections.basicInfo}</h1>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 rounded-lg">
          <Info className="h-5 w-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-brand-900 dark:text-brand-200">
              {t.sectionInfo.requiredFields}
            </p>
            <p className="text-sm text-brand-800 dark:text-brand-300 mt-1">
              {t.sectionInfo.requiredFieldsDescription}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Tipo de propiedad */}
          <div className="space-y-2">
            <Label htmlFor="tipoPropiedad" className="text-sm font-semibold">
              Tipo de propiedad <span className="text-danger">*</span>
            </Label>
            <Select
              value={formData.tipoPropiedad || ""}
              onValueChange={(value) => updateField("tipoPropiedad", value as PropertyType)}
            >
              <SelectTrigger id="tipoPropiedad">
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" sideOffset={4} className="max-h-[200px] overflow-y-auto">
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Superficie construida y útil en la misma fila */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Superficie construida */}
            <div className="space-y-2">
              <Label htmlFor="superficieConstruida" className="text-sm font-semibold">
                Superficie construida <span className="text-danger">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="superficieConstruida"
                  type="number"
                  value={formData.superficieConstruida || ""}
                  onChange={(e) =>
                    updateField("superficieConstruida", parseFloat(e.target.value) || undefined)
                  }
                  placeholder="Ej.: 80"
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  m²
                </span>
              </div>
            </div>

            {/* Superficie útil */}
            <div className="space-y-2">
              <Label htmlFor="superficieUtil" className="text-sm font-semibold">
                Superficie útil <span className="text-xs text-muted-foreground font-normal">(Opcional)</span>
              </Label>
              <div className="relative">
                <Input
                  id="superficieUtil"
                  type="number"
                  value={formData.superficieUtil || ""}
                  onChange={(e) =>
                    updateField("superficieUtil", parseFloat(e.target.value) || undefined)
                  }
                  placeholder="Ej.: 70"
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  m²
                </span>
              </div>
            </div>
          </div>

          {/* Año de construcción */}
          <div className="space-y-2">
            <Label htmlFor="anoConstruccion" className="text-sm font-semibold">
              Año de construcción <span className="text-danger">*</span>
            </Label>
            <Input
              id="anoConstruccion"
              type="number"
              value={formData.anoConstruccion || ""}
              onChange={(e) =>
                updateField("anoConstruccion", parseInt(e.target.value) || undefined)
              }
              placeholder="Ej.: 2005"
              min="1800"
              max={new Date().getFullYear()}
            />
          </div>

          {/* Referencia Catastral */}
          <div className="space-y-2">
            <Label htmlFor="referenciaCatastral" className="text-sm font-semibold">
              Referencia Catastral <span className="text-danger">*</span>
            </Label>
            <Input
              id="referenciaCatastral"
              value={formData.referenciaCatastral || ""}
              onChange={(e) => updateField("referenciaCatastral", e.target.value)}
              placeholder="Ej.: 9872023 VH5797S 0001 WX"
            />
          </div>

          {/* Orientación */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Orientación del inmueble <span className="text-danger">*</span>
            </Label>
            <div className="space-y-3">
              {(["Norte", "Sur", "Este", "Oeste"] as const).map((orientacion) => {
                const currentOrientaciones = formData.orientacion || [];
                const isChecked = currentOrientaciones.includes(orientacion);
                
                return (
                  <label key={orientacion} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const updatedOrientaciones = e.target.checked
                          ? [...currentOrientaciones, orientacion]
                          : currentOrientaciones.filter(o => o !== orientacion);
                        updateField("orientacion", updatedOrientaciones.length > 0 ? updatedOrientaciones : undefined);
                      }}
                      className="h-4 w-4 rounded border-v-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm">{orientacion}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Number inputs */}
          <div className="space-y-6">
            {/* Habitaciones */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-semibold">Habitaciones</Label>
                <p className="text-xs text-muted-foreground">
                  Solo requerido para publicar la propiedad
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleNumberChange("habitaciones", -1)}
                  disabled={(formData.habitaciones || 0) === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-v-gray-100 dark:bg-v-gray-800 hover:bg-v-gray-200 dark:hover:bg-v-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  aria-label="Decrementar habitaciones"
                >
                  <Minus className="h-4 w-4 text-foreground" />
                </button>
                <span className="text-base font-semibold text-foreground min-w-[24px] text-center">
                  {formData.habitaciones || 0}
                </span>
                <button
                  type="button"
                  onClick={() => handleNumberChange("habitaciones", 1)}
                  disabled={(formData.habitaciones || 0) === 99}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 hover:bg-brand-200 dark:hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  aria-label="Incrementar habitaciones"
                >
                  <Plus className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                </button>
              </div>
            </div>

            {/* Baños */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-semibold">Baños</Label>
                <p className="text-xs text-muted-foreground">
                  Solo requerido para publicar la propiedad
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleNumberChange("banos", -1)}
                  disabled={(formData.banos || 0) === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-v-gray-100 dark:bg-v-gray-800 hover:bg-v-gray-200 dark:hover:bg-v-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  aria-label="Decrementar baños"
                >
                  <Minus className="h-4 w-4 text-foreground" />
                </button>
                <span className="text-base font-semibold text-foreground min-w-[24px] text-center">
                  {formData.banos || 0}
                </span>
                <button
                  type="button"
                  onClick={() => handleNumberChange("banos", 1)}
                  disabled={(formData.banos || 0) === 99}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 hover:bg-brand-200 dark:hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  aria-label="Incrementar baños"
                >
                  <Plus className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                </button>
              </div>
            </div>

            {/* Plazas de aparcamiento */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-semibold">Plazas de aparcamiento</Label>
                <p className="text-xs text-muted-foreground">
                  Solo requerido para publicar la propiedad
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleNumberChange("plazasAparcamiento", -1)}
                  disabled={(formData.plazasAparcamiento || 0) === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-v-gray-100 dark:bg-v-gray-800 hover:bg-v-gray-200 dark:hover:bg-v-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  aria-label="Decrementar plazas de aparcamiento"
                >
                  <Minus className="h-4 w-4 text-foreground" />
                </button>
                <span className="text-base font-semibold text-foreground min-w-[24px] text-center">
                  {formData.plazasAparcamiento || 0}
                </span>
                <button
                  type="button"
                  onClick={() => handleNumberChange("plazasAparcamiento", 1)}
                  disabled={(formData.plazasAparcamiento || 0) === 99}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 hover:bg-brand-200 dark:hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  aria-label="Incrementar plazas de aparcamiento"
                >
                  <Plus className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-semibold">
              Indica si la propiedad tiene las siguientes características
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ascensor || false}
                  onChange={(e) => updateField("ascensor", e.target.checked)}
                  className="h-4 w-4 rounded border-v-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm">Ascensor</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.balconTerraza || false}
                  onChange={(e) => updateField("balconTerraza", e.target.checked)}
                  className="h-4 w-4 rounded border-v-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm">Balcón o terraza</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.trastero || false}
                  onChange={(e) => updateField("trastero", e.target.checked)}
                  className="h-4 w-4 rounded border-v-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm">Trastero</span>
              </label>
            </div>
          </div>

          {/* Continue Button */}
          {onContinue && (
            <div className="flex justify-end pt-4 border-t">
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
            </div>
          )}
        </div>
      </div>
    );
  }
);

InfoPropiedadSection.displayName = "InfoPropiedadSection";

