"use client";

import { forwardRef, useCallback, useMemo } from "react";
import { Info, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PropertyData, VendedorData } from "@/lib/property-storage";
import { useFormState } from "@/hooks/useFormState";
import { useI18n } from "@/lib/i18n";
import { CountryPhoneSelector } from "@/components/property/country-phone-selector";
import { DniUploadZone } from "@/components/property/dni-upload-zone";

interface DatosVendedorSectionProps {
  data: PropertyData;
  onUpdate: (updates: Partial<PropertyData>) => void;
  onContinue?: () => void;
}


export const DatosVendedorSection = forwardRef<HTMLDivElement, DatosVendedorSectionProps>(
  ({ data, onUpdate, onContinue }, ref) => {
    const { t } = useI18n();
    
    // Initialize vendedores array with at least one entry
    const initialVendedores = useMemo(() => {
      if (data.vendedores && data.vendedores.length > 0) {
        return data.vendedores;
      }
      return [{} as VendedorData];
    }, [data.vendedores]);

    const { formData, updateField } = useFormState({
      initialData: { ...data, vendedores: initialVendedores },
      onUpdate,
    });

    const vendedores = formData.vendedores || [{} as VendedorData];

    // Handler for quantity selector
    const handleQuantityChange = useCallback((delta: number) => {
      const currentCount = vendedores.length;
      const newCount = Math.max(1, Math.min(10, currentCount + delta));
      
      if (newCount > currentCount) {
        // Add new vendedor
        const newVendedores = [...vendedores, ...Array(newCount - currentCount).fill({}).map(() => ({} as VendedorData))];
        updateField("vendedores", newVendedores);
      } else if (newCount < currentCount) {
        // Remove last vendedor(s)
        const newVendedores = vendedores.slice(0, newCount);
        updateField("vendedores", newVendedores);
      }
    }, [vendedores, updateField]);

    // Handler for updating a specific vendedor field
    const updateVendedorField = useCallback((
      index: number,
      field: keyof VendedorData,
      value: any
    ) => {
      const newVendedores = [...vendedores];
      newVendedores[index] = {
        ...newVendedores[index],
        [field]: value,
      };
      updateField("vendedores", newVendedores);
    }, [vendedores, updateField]);

    return (
      <div ref={ref} className="bg-card dark:bg-v-gray-900 rounded-lg border p-6 shadow-sm space-y-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t.property.sections.sellerData || "Datos del vendedor"}
        </h1>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 rounded-lg">
          <Info className="h-5 w-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-brand-900 dark:text-brand-200">
              {t.sectionInfo.requiredFields}
            </p>
            <p className="text-sm text-brand-800 dark:text-brand-300 mt-1">
              {t.property.sections.sellerDataDescription || "Información de contacto directa del propietario de la vivienda o de la persona autorizada para representarle en la operación de venta."}
            </p>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="bg-card dark:bg-v-gray-900 rounded-lg border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-foreground">
              Cantidad de propietarios <span className="text-danger">*</span>
            </Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleQuantityChange(-1)}
                disabled={vendedores.length <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-v-gray-100 dark:bg-v-gray-800 hover:bg-v-gray-200 dark:hover:bg-v-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                aria-label="Decrementar cantidad"
              >
                <Minus className="h-4 w-4 text-foreground" />
              </button>
              <span className="text-lg font-semibold text-foreground min-w-[24px] text-center">
                {vendedores.length}
              </span>
              <button
                type="button"
                onClick={() => handleQuantityChange(1)}
                disabled={vendedores.length >= 10}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 hover:bg-brand-200 dark:hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                aria-label="Incrementar cantidad"
              >
                <Plus className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Vendedores Forms */}
        <div className="space-y-8">
          {vendedores.map((vendedor, index) => (
            <div key={index} className="space-y-6 p-6 border rounded-lg bg-background dark:bg-v-gray-800/50">
              <h2 className="text-lg font-semibold text-foreground">
                Propietario {index + 1}
              </h2>

              <div className="space-y-6">
                {/* Nombre completo */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Nombre completo / Nombre legal <span className="text-danger">*</span>
                  </Label>
                  <Input
                    value={vendedor.nombreCompleto || ""}
                    onChange={(e) => updateVendedorField(index, "nombreCompleto", e.target.value)}
                    placeholder="Nombre de persona o entidad"
                  />
                </div>

                {/* DNI/NIF/CIF */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Número de documento de identidad <span className="text-danger">*</span>
                  </Label>
                  <Input
                    value={vendedor.dniNifCif || ""}
                    onChange={(e) => updateVendedorField(index, "dniNifCif", e.target.value)}
                    placeholder="Ej: 4566670D"
                  />
                  <p className="text-xs text-muted-foreground">
                    DNI/NIF/CIF/NIE son documentos válidos.
                  </p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Email <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={vendedor.email || ""}
                    onChange={(e) => updateVendedorField(index, "email", e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Número de teléfono <span className="text-danger">*</span>
                  </Label>
                  <CountryPhoneSelector
                    countryCode={vendedor.telefonoPais || "+34"}
                    phoneNumber={vendedor.telefonoNumero || ""}
                    onCountryChange={(code) => updateVendedorField(index, "telefonoPais", code)}
                    onPhoneChange={(number) => updateVendedorField(index, "telefonoNumero", number)}
                    placeholder="666 666 666"
                  />
                </div>

                {/* DNI Upload */}
                <DniUploadZone
                  files={vendedor.dniAdjunto || []}
                  onFilesChange={(files) => updateVendedorField(index, "dniAdjunto", files)}
                  maxFiles={10}
                  maxSizeMB={5}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        {onContinue && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                // Navigate back logic would go here
                window.history.back();
              }}
            >
              ← {t.common.back || "Atrás"}
            </Button>
            <Button
              onClick={() => {
                onUpdate(formData);
                onContinue();
              }}
              size="lg"
            >
              {t.property.sections.nextSection || "Siguiente sección"}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

DatosVendedorSection.displayName = "DatosVendedorSection";

