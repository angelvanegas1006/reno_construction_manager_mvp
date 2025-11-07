"use client";

import { forwardRef, useCallback, useMemo } from "react";
import { Info } from "lucide-react";
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
import { PropertyData, InquilinoData, SubrogacionContrato, EstadoSeguroAlquiler } from "@/lib/property-storage";
import { useFormState } from "@/hooks/useFormState";
import { useI18n } from "@/lib/i18n";
import { CountryPhoneSelector } from "@/components/property/country-phone-selector";
import { DatePicker } from "@/components/property/date-picker";
import { FileUploadZone } from "@/components/property/file-upload-zone";

interface DatosInquilinoSectionProps {
  data: PropertyData;
  onUpdate: (updates: Partial<PropertyData>) => void;
  onContinue?: () => void;
}

const SUBROGACION_OPTIONS: SubrogacionContrato[] = [
  "Con subrogación",
  "Sin subrogación",
];

const ESTADO_SEGURO_OPTIONS: EstadoSeguroAlquiler[] = [
  "En vigor",
  "Caducado",
];

export const DatosInquilinoSection = forwardRef<HTMLDivElement, DatosInquilinoSectionProps>(
  ({ data, onUpdate, onContinue }, ref) => {
    const { t } = useI18n();
    
    // Initialize inquilino data
    const initialInquilino = useMemo(() => {
      return data.inquilino || ({} as InquilinoData);
    }, [data.inquilino]);

    const { formData, updateField } = useFormState({
      initialData: { ...data, inquilino: initialInquilino },
      onUpdate,
    });

    const inquilino = formData.inquilino || ({} as InquilinoData);

    // Handler for updating inquilino fields
    const updateInquilinoField = useCallback((
      field: keyof InquilinoData,
      value: any
    ) => {
      updateField("inquilino", {
        ...inquilino,
        [field]: value,
      });
    }, [inquilino, updateField]);

    return (
      <div ref={ref} className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm space-y-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t.property.sections.tenantData || "Datos del inquilino"}
        </h1>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]/20 border border-[var(--prophero-blue-200)] dark:border-[var(--prophero-blue-800)] rounded-lg">
          <Info className="h-5 w-5 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--prophero-blue-900)] dark:text-[var(--prophero-blue-200)]">
              {t.sectionInfo.requiredFields}
            </p>
            <p className="text-sm text-[var(--prophero-blue-800)] dark:text-[var(--prophero-blue-300)] mt-1">
              {t.property.sections.tenantDataDescription || "Información necesaria para evaluar la situación contractual y legal de la vivienda. Incluya la fecha de finalización del contrato vigente."}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Nombre completo inquilino */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Nombre completo inquilino <span className="text-red-500">*</span>
            </Label>
            <Input
              value={inquilino.nombreCompleto || ""}
              onChange={(e) => updateInquilinoField("nombreCompleto", e.target.value)}
              placeholder="Nombre del inquilino"
            />
          </div>

          {/* Email inquilino */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Email inquilino <span className="text-red-500">*</span>
            </Label>
            <Input
              type="email"
              value={inquilino.email || ""}
              onChange={(e) => updateInquilinoField("email", e.target.value)}
              placeholder="inquilino@casa.com"
            />
          </div>

          {/* Número de teléfono */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Número de teléfono <span className="text-red-500">*</span>
            </Label>
            <CountryPhoneSelector
              countryCode={inquilino.telefonoPais || "+34"}
              phoneNumber={inquilino.telefonoNumero || ""}
              onCountryChange={(code) => updateInquilinoField("telefonoPais", code)}
              onPhoneChange={(number) => updateInquilinoField("telefonoNumero", number)}
              placeholder="666 666 666"
            />
          </div>

          {/* DNI/NIE */}
          <FileUploadZone
            title="DNI/NIE"
            description="Documento de identidad del inquilino"
            files={inquilino.dniNie || []}
            onFilesChange={(files) => updateInquilinoField("dniNie", files)}
            isRequired={true}
            maxFiles={10}
            maxSizeMB={5}
          />

          {/* Contrato de arrendamiento */}
          <FileUploadZone
            title="Contrato de arrendamiento"
            description="Documento del contrato de arrendamiento vigente"
            files={inquilino.contratoArrendamiento || []}
            onFilesChange={(files) => updateInquilinoField("contratoArrendamiento", files)}
            isRequired={true}
            maxFiles={10}
            maxSizeMB={5}
          />

          {/* Fecha de finalización del contrato */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Fecha de finalización del contrato <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              value={inquilino.fechaFinalizacionContrato}
              onChange={(date) => updateInquilinoField("fechaFinalizacionContrato", date)}
              placeholder="DD/MM/YYYY"
            />
          </div>

          {/* Periodo de preaviso */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Periodo de preaviso de finalización de contrato <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={inquilino.periodoPreaviso || ""}
                onChange={(e) => updateInquilinoField("periodoPreaviso", parseInt(e.target.value) || undefined)}
                placeholder="30"
                className="max-w-[100px]"
              />
              <span className="text-sm text-muted-foreground">días</span>
            </div>
          </div>

          {/* Subrogación del contrato */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Subrogación del contrato de arrendamiento <span className="text-red-500">*</span>
            </Label>
            <Select
              value={inquilino.subrogacionContrato || ""}
              onValueChange={(value) => updateInquilinoField("subrogacionContrato", value as SubrogacionContrato)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                {SUBROGACION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Importe del alquiler a transferir */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Importe del alquiler a transferir (al comprador) <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={inquilino.importeAlquilerTransferir || ""}
                onChange={(e) => updateInquilinoField("importeAlquilerTransferir", parseFloat(e.target.value) || undefined)}
                placeholder="1.000"
                className="max-w-[150px]"
              />
              <span className="text-sm text-muted-foreground">€/mes</span>
            </div>
          </div>

          {/* Última actualización del alquiler */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Última actualización del alquiler <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              value={inquilino.ultimaActualizacionAlquiler}
              onChange={(date) => updateInquilinoField("ultimaActualizacionAlquiler", date)}
              placeholder="DD/MM/YYYY"
            />
          </div>

          {/* Justificantes de pago */}
          <FileUploadZone
            title="Justificantes de pago del inquilino"
            description="Comprobantes de pago del alquiler"
            files={inquilino.justificantesPago || []}
            onFilesChange={(files) => updateInquilinoField("justificantesPago", files)}
            isRequired={true}
            maxFiles={10}
            maxSizeMB={5}
          />

          {/* Fecha del último recibo */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Fecha del último recibo <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              value={inquilino.fechaUltimoRecibo}
              onChange={(date) => updateInquilinoField("fechaUltimoRecibo", date)}
              placeholder="DD/MM/YYYY"
            />
          </div>

          {/* Comprobante de transferencia del alquiler (del vendedor) */}
          <FileUploadZone
            title="Comprobante de transferencia del alquiler (del vendedor)"
            description="Comprobante de transferencia bancaria del alquiler"
            files={inquilino.comprobanteTransferenciaVendedor || []}
            onFilesChange={(files) => updateInquilinoField("comprobanteTransferenciaVendedor", files)}
            isRequired={true}
            maxFiles={1}
            maxSizeMB={5}
            acceptedTypes={["application/pdf", "image/jpeg", "image/png"]}
          />

          {/* Justificante del depósito */}
          <FileUploadZone
            title="Justificante del depósito"
            description="Documento que acredita el depósito de garantía"
            files={inquilino.justificanteDeposito || []}
            onFilesChange={(files) => updateInquilinoField("justificanteDeposito", files)}
            isRequired={true}
            maxFiles={10}
            maxSizeMB={5}
          />

          {/* Fecha de vencimiento del seguro de alquiler */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Fecha de vencimiento del seguro de alquiler <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              value={inquilino.fechaVencimientoSeguroAlquiler}
              onChange={(date) => updateInquilinoField("fechaVencimientoSeguroAlquiler", date)}
              placeholder="DD/MM/YYYY"
            />
          </div>

          {/* Estado del seguro de alquiler */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Estado del seguro de alquiler <span className="text-red-500">*</span>
            </Label>
            <Select
              value={inquilino.estadoSeguroAlquiler || ""}
              onValueChange={(value) => updateInquilinoField("estadoSeguroAlquiler", value as EstadoSeguroAlquiler)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                {ESTADO_SEGURO_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Proveedor del seguro de alquiler */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Proveedor del seguro de alquiler <span className="text-red-500">*</span>
            </Label>
            <Input
              value={inquilino.proveedorSeguroAlquiler || ""}
              onChange={(e) => updateInquilinoField("proveedorSeguroAlquiler", e.target.value)}
              placeholder="Ej: Mapfre, Allianz,..."
            />
          </div>
        </div>

        {/* Navigation */}
        {onContinue && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
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
              {t.common.continue || "Continuar"}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

DatosInquilinoSection.displayName = "DatosInquilinoSection";


