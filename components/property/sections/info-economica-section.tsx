"use client";

import { forwardRef, useCallback } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PropertyData } from "@/lib/property-storage";
import { useFormState } from "@/hooks/useFormState";
import { useI18n } from "@/lib/i18n";

interface InfoEconomicaSectionProps {
  data: PropertyData;
  onUpdate: (updates: Partial<PropertyData>) => void;
  onContinue?: () => void;
}

export const InfoEconomicaSection = forwardRef<HTMLDivElement, InfoEconomicaSectionProps>(
  ({ data, onUpdate, onContinue }, ref) => {
    const { t } = useI18n();
    // Use form state hook for controlled components
    const { formData, updateField } = useFormState({
      initialData: data,
      onUpdate,
    });

    // Memoized formatters for better performance
    const formatNumber = useCallback((value: string | number | undefined): string => {
      if (!value) return "";
      const numStr = typeof value === "number" ? value.toString() : value;
      // Remove all non-digit characters for storage
      const cleaned = numStr.replace(/[^\d]/g, "");
      return cleaned === "" ? "" : parseFloat(cleaned).toLocaleString("es-ES");
    }, []);

    const parseNumber = useCallback((value: string): number | undefined => {
      const cleaned = value.replace(/[^\d]/g, "");
      return cleaned === "" ? undefined : parseFloat(cleaned);
    }, []);

    return (
      <div ref={ref} className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t.property.sections.economicInfo}</h1>

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
          {/* Precio de venta */}
          <div className="space-y-2">
            <Label htmlFor="precioVenta" className="text-sm font-semibold">
              Precio de venta <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="precioVenta"
                type="text"
                value={formatNumber(formData.precioVenta)}
                onChange={(e) => {
                  const parsed = parseNumber(e.target.value);
                  updateField("precioVenta", parsed);
                }}
                placeholder="Ej.: 400.000"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                €
              </span>
            </div>
          </div>

          {/* Gastos de comunidad mensuales */}
          <div className="space-y-2">
            <Label htmlFor="gastosComunidad" className="text-sm font-semibold">
              Gastos de comunidad mensuales <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="gastosComunidad"
                type="text"
                value={formatNumber(formData.gastosComunidad)}
                onChange={(e) => {
                  const parsed = parseNumber(e.target.value);
                  updateField("gastosComunidad", parsed);
                }}
                placeholder="Ej.: 350"
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                €/mes
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                  checked={formData.confirmacionGastosComunidad || false}
                  onChange={(e) => updateField("confirmacionGastosComunidad", e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--prophero-gray-300)] text-[var(--prophero-blue-600)] focus:ring-[var(--prophero-blue-500)]"
              />
              <span className="text-sm text-muted-foreground">
                Confirmo que este es el importe exacto.
              </span>
            </label>
          </div>

          {/* IBI Anual */}
          <div className="space-y-2">
            <Label htmlFor="ibiAnual" className="text-sm font-semibold">
              IBI Anual <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="ibiAnual"
                type="text"
                value={formatNumber(formData.ibiAnual)}
                onChange={(e) => {
                  const parsed = parseNumber(e.target.value);
                  updateField("ibiAnual", parsed);
                }}
                placeholder="Ej.: 1.000"
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                €/año
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                  checked={formData.confirmacionIBI || false}
                  onChange={(e) => updateField("confirmacionIBI", e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--prophero-gray-300)] text-[var(--prophero-blue-600)] focus:ring-[var(--prophero-blue-500)]"
              />
              <span className="text-sm text-muted-foreground">
                Confirmo que este es el importe exacto.
              </span>
            </label>
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

InfoEconomicaSection.displayName = "InfoEconomicaSection";

