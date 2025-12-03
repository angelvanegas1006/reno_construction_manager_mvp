"use client";

import { MapPin } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface PropertyInfoSectionProps {
  property: Property;
  phase: RenoKanbanPhase;
  onStartChecklist?: () => void;
}

export function PropertyInfoSection({ property, phase, onStartChecklist }: PropertyInfoSectionProps) {
  const { t } = useI18n();

  const { language } = useI18n();
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const locale = language === "es" ? "es-ES" : "en-US";
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isInitialCheck = phase === "initial-check";
  const isFinalCheck = phase === "final-check";

  return (
    <div className="bg-card rounded-lg border p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-foreground">
        {isInitialCheck 
          ? t.initialCheck.propertyInformation 
          : isFinalCheck
          ? t.finalCheck?.propertyInformation || "Información de la Propiedad"
          : t.upcomingSettlements.propertyInformation}
      </h2>
      
      <div className="space-y-4">
        {/* Address */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">
            Dirección completa
          </label>
          <div className="mt-1 flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-base font-medium">{property.fullAddress}</p>
          </div>
        </div>

        {/* Property Type */}
        <div className="pt-2 border-t">
          <label className="text-sm font-medium text-muted-foreground">
            Tipo de propiedad
          </label>
          <p className="mt-1 text-base">{property.propertyType}</p>
        </div>

        {/* Region */}
        {property.region && (
          <div className="pt-2 border-t">
            <label className="text-sm font-medium text-muted-foreground">
              Región
            </label>
            <p className="mt-1 text-base">{property.region}</p>
          </div>
        )}

        {/* Real Settlement Date - Only for initial-check */}
        {isInitialCheck && property.realSettlementDate && (
          <div className="pt-2 border-t">
            <label className="text-sm font-medium text-muted-foreground">
              {t.initialCheck.realSettlementDate}
            </label>
            <p className="mt-1 text-base">
              {formatDate(property.realSettlementDate)}
            </p>
          </div>
        )}

        {/* Estimated Visit Date - Only for initial-check */}
        {isInitialCheck && property.estimatedVisitDate && (
          <div className="pt-2 border-t">
            <label className="text-sm font-medium text-muted-foreground">
              {t.initialCheck.estimatedVisitDate}
            </label>
            <p className="mt-1 text-base">
              {formatDate(property.estimatedVisitDate)}
            </p>
          </div>
        )}

        {/* Real Completion Date - Only for final-check */}
        {isFinalCheck && property.realCompletionDate && (
          <div className="pt-2 border-t">
            <label className="text-sm font-medium text-muted-foreground">
              Fecha real de finalización
            </label>
            <p className="mt-1 text-base">
              {formatDate(property.realCompletionDate)}
            </p>
          </div>
        )}

        {/* Estimated Final Visit Date - Only for final-check */}
        {isFinalCheck && property.estimatedFinalVisitDate && (
          <div className="pt-2 border-t">
            <label className="text-sm font-medium text-muted-foreground">
              Fecha estimada de visita
            </label>
            <p className="mt-1 text-base">
              {formatDate(property.estimatedFinalVisitDate)}
            </p>
          </div>
        )}

        {/* Reno Type */}
        {property.renoType && (
          <div className="pt-2 border-t">
            <label className="text-sm font-medium text-muted-foreground">
              Tipo de renovación
            </label>
            <p className="mt-1 text-base">{property.renoType}</p>
          </div>
        )}

        {/* Work Dates */}
        {(property.inicio || property.finEst) && (
          <div className="pt-2 border-t">
            <label className="text-sm font-medium text-muted-foreground">
              Fechas de obra
            </label>
            <div className="mt-1 space-y-1">
              {property.inicio && (
                <p className="text-base">
                  Inicio: {formatDate(property.inicio)}
                </p>
              )}
              {property.finEst && (
                <p className="text-base">
                  Fin estimado: {formatDate(property.finEst)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Start Checklist Button */}
      {onStartChecklist && (
        <div className="mt-6 pt-6 border-t">
          <Button
            onClick={onStartChecklist}
            variant="outline"
            className="w-full hover:bg-muted hover:text-foreground"
            size="lg"
          >
            Iniciar checklist
          </Button>
        </div>
      )}
    </div>
  );
}

