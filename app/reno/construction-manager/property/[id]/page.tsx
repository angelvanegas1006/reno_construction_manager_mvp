"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useCallback, useState } from "react";
import { ArrowLeft, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { Property } from "@/lib/property-storage";
import { FutureDatePicker } from "@/components/property/future-date-picker";
import { useI18n } from "@/lib/i18n";
import { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { useSupabaseProperty } from "@/hooks/useSupabaseProperty";
import { convertSupabasePropertyToProperty, getPropertyRenoPhaseFromSupabase } from "@/lib/supabase/property-converter";
import type { Database } from '@/lib/supabase/types';
import { ReportProblemModal } from "@/components/reno/report-problem-modal";
import { DynamicCategoriesProgress } from "@/components/reno/dynamic-categories-progress";
import { toast } from "sonner";

type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export default function RenoPropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const [reportProblemOpen, setReportProblemOpen] = useState(false);
  const propertyId = params.id && typeof params.id === "string" ? params.id : null;
  const { property: supabaseProperty, loading: supabaseLoading, updateProperty: updateSupabaseProperty, refetch } = useSupabaseProperty(propertyId);
  
  // Convert Supabase property to Property format
  const property: Property | null = supabaseProperty ? convertSupabasePropertyToProperty(supabaseProperty) : null;
  const isLoading = supabaseLoading;

  // Determine phase using "Set Up Status" from Supabase
  const getPropertyRenoPhase = useCallback((): RenoKanbanPhase | null => {
    if (!supabaseProperty) return null;
    return getPropertyRenoPhaseFromSupabase(supabaseProperty);
  }, [supabaseProperty]);

  // Auto-save function - saves to Supabase
  const handleAutoSave = useCallback(async (updates: Partial<Property>) => {
    if (!property || !supabaseProperty) return;
    
    // Map Property updates to Supabase PropertyUpdate format
    // Using 'any' to allow dynamic field names (estimated_visit_date or "Estimated Visit Date")
    const supabaseUpdates: PropertyUpdate & Record<string, any> = {};
    
    if (updates.estimatedVisitDate !== undefined) {
      // Try snake_case first (most common in Supabase)
      // TODO: Update this once you confirm the exact field name in Supabase
      supabaseUpdates['estimated_visit_date'] = updates.estimatedVisitDate || null;
    }
    
    if (updates.setupStatusNotes !== undefined) {
      supabaseUpdates.notes = updates.setupStatusNotes || null;
    }
    
    // Save to Supabase
    const success = await updateSupabaseProperty(supabaseUpdates);
    if (success) {
      // Refetch to get updated data
      await refetch();
    }
  }, [property, supabaseProperty, updateSupabaseProperty, refetch]);

  // Redirect to checklist page if phase is initial-check or final-check
  useEffect(() => {
    if (!isLoading && property && supabaseProperty) {
      const phase = getPropertyRenoPhase();
      if (phase === "initial-check" || phase === "final-check") {
        // Use propertyId from params (Supabase ID) instead of property.id
        router.replace(`/reno/construction-manager/property/${propertyId}/checklist`);
      }
    }
  }, [isLoading, property, supabaseProperty, getPropertyRenoPhase, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <RenoSidebar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex h-screen overflow-hidden">
        <RenoSidebar />
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-lg font-semibold text-foreground mb-2">
            Propiedad no encontrada
          </p>
          <Button onClick={() => router.push("/reno/construction-manager/kanban")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al kanban
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-card dark:bg-[var(--prophero-gray-900)] px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/reno/construction-manager/kanban")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {property.fullAddress}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-6">
                <span>ID: {property.uniqueIdFromEngagements || property.id}</span>
                <span>Estado: {getStageLabel(property.currentStage)}</span>
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setReportProblemOpen(true)}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Reportar Problema
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--prophero-gray-50)] dark:bg-[var(--prophero-gray-950)]">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Property Information Card - First */}
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">
                {getPropertyRenoPhase() === "initial-check" 
                  ? t.initialCheck.propertyInformation 
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
                {getPropertyRenoPhase() === "initial-check" && property.realSettlementDate && (
                  <div className="pt-2 border-t">
                    <label className="text-sm font-medium text-muted-foreground">
                      {t.initialCheck.realSettlementDate}
                    </label>
                    <p className="mt-1 text-base">
                      {new Date(property.realSettlementDate).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}

                {/* Estimated Visit Date - Only for initial-check */}
                {getPropertyRenoPhase() === "initial-check" && property.estimatedVisitDate && (
                  <div className="pt-2 border-t">
                    <label className="text-sm font-medium text-muted-foreground">
                      {t.initialCheck.estimatedVisitDate}
                    </label>
                    <p className="mt-1 text-base">
                      {new Date(property.estimatedVisitDate).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
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

                {/* Inicio y Fin Estimado - Ocultado porque se muestra en DynamicCategoriesProgress */}
                {/* {(property.inicio || property.finEst) && (
                  <div className="pt-2 border-t">
                    <label className="text-sm font-medium text-muted-foreground">
                      Fechas de obra
                    </label>
                    <div className="mt-1 space-y-1">
                      {property.inicio && (
                        <p className="text-base">
                          Inicio: {new Date(property.inicio).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      )}
                      {property.finEst && (
                        <p className="text-base">
                          Fin estimado: {new Date(property.finEst).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )} */}

              </div>
            </div>

            {/* Editable Fields for Upcoming Settlements - Second */}
            {getPropertyRenoPhase() === "upcoming-settlements" && (
              <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
                <div className="space-y-6">
                  {/* Estimated Visit Date */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      {t.upcomingSettlements.estimatedVisitDate}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t.upcomingSettlements.estimatedVisitDateDescription}
                    </p>
                    <FutureDatePicker
                      value={property.estimatedVisitDate}
                      onChange={(date) => handleAutoSave({ estimatedVisitDate: date })}
                      placeholder="DD/MM/YYYY"
                      errorMessage={t.upcomingSettlements.dateMustBeFuture}
                    />
                  </div>

                  {/* Set Up Status Notes */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      {t.upcomingSettlements.setupStatusNotes}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t.upcomingSettlements.setupStatusNotesDescription}
                    </p>
                    <Textarea
                      value={property.setupStatusNotes || ""}
                      onChange={(e) => handleAutoSave({ setupStatusNotes: e.target.value })}
                      placeholder={t.upcomingSettlements.setupStatusNotesPlaceholder}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Categories Progress - Only for reno-in-progress */}
            {getPropertyRenoPhase() === "reno-in-progress" && supabaseProperty && (
              <DynamicCategoriesProgress property={supabaseProperty} />
            )}

            {/* Read-only notice for other phases */}
            {getPropertyRenoPhase() !== "upcoming-settlements" && getPropertyRenoPhase() !== "reno-in-progress" && (
              <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  Esta es una vista de solo lectura. El Jefe de Obra puede ver la información pero no editarla.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Problem Modal */}
      {property && (
        <ReportProblemModal
          open={reportProblemOpen}
          onOpenChange={setReportProblemOpen}
          propertyName={property.fullAddress}
          onSuccess={() => {
            toast.success("Reporte enviado", {
              description: "Tu reporte ha sido enviado correctamente al equipo.",
            });
          }}
        />
      )}
    </div>
  );
}

function getStageLabel(stage: Property["currentStage"]): string {
  const labels: Record<Property["currentStage"], string> = {
    draft: "Borrador",
    review: "En revisión",
    "needs-correction": "Necesita corrección",
    negotiation: "En negociación",
    "pending-arras": "Pendiente de Arras",
    settlement: "Escrituración",
    sold: "Vendido",
    rejected: "Rechazado",
  };
  return labels[stage] || stage;
}







