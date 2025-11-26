"use client";

import { Wrench, Calendar, Clock, User, FileText } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PropertyCommentsSection } from "@/components/reno/property-comments-section";

interface PropertyActionTabProps {
  property: Property;
  supabaseProperty?: any;
  propertyId?: string | null;
}

/**
 * PropertyActionTab Component
 * 
 * Página de "Acción/Ejecución" - Muestra información sobre la ejecución de obras
 * y acciones pendientes o en curso
 */
export function PropertyActionTab({
  property,
  supabaseProperty,
  propertyId,
}: PropertyActionTabProps) {
  const { t, language } = useI18n();

  const renoPhase = supabaseProperty?.reno_phase || "upcoming-settlements";
  const nextRenoSteps = supabaseProperty?.next_reno_steps;
  const estimatedVisitDate = supabaseProperty?.['Estimated Visit Date'];
  const technicalConstructor = supabaseProperty?.['Technical construction'] || supabaseProperty?.technical_construction;
  const responsibleOwner = supabaseProperty?.responsible_owner;
  
  // Campos para Upcoming Reno
  const setUpStatus = supabaseProperty?.['Set Up Status'];
  const renovatorName = supabaseProperty?.['Renovator name'];
  const estimatedEndDate = supabaseProperty?.estimated_end_date;
  const renoStartDate = supabaseProperty?.start_date;

  // Formatear fecha
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Información para fase Upcoming Reno */}
      {renoPhase === "upcoming-settlements" && (
        <>
          {/* Set Up Status */}
          {setUpStatus && (
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t.propertyAction.preparationStatus}
              </h3>
              <p className="text-sm text-foreground">{setUpStatus}</p>
            </div>
          )}

          {/* Next Reno Steps */}
          {nextRenoSteps && (
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                {t.propertyAction.nextRenoSteps}
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">{nextRenoSteps}</p>
            </div>
          )}

          {/* Renovator Name */}
          {renovatorName && (
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                {t.propertyAction.renovator}
              </h3>
              <p className="text-sm text-foreground">{renovatorName}</p>
            </div>
          )}

          {/* Fechas de Reforma */}
          {(renoStartDate || estimatedEndDate) && (
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t.propertyAction.renovationDates}
              </h3>
              <div className="space-y-3">
                {renoStartDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t.propertyAction.startDate}</label>
                    <p className="text-sm text-foreground mt-1">{formatDate(renoStartDate)}</p>
                  </div>
                )}
                {estimatedEndDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t.propertyAction.estimatedEndDate}</label>
                    <p className="text-sm text-foreground mt-1">{formatDate(estimatedEndDate)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Mostrar fecha estimada solo si no está en upcoming-settlements */}
      {estimatedVisitDate && renoPhase !== "upcoming-settlements" && (
        <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t.propertyAction.estimatedVisitDate}
          </h3>
          <p className="text-sm text-foreground">
            {formatDate(estimatedVisitDate)}
          </p>
        </div>
      )}
    </div>
  );
}

