"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useCallback, useState, useRef } from "react";
import { ArrowLeft, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoHomeLoader } from "@/components/reno/reno-home-loader";
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
import { appendSetUpNotesToAirtable } from "@/lib/airtable/initial-check-sync";
import { updateAirtableWithRetry, findRecordByPropertyId } from "@/lib/airtable/client";

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

  // Local state for form fields to enable fluid typing
  const [localEstimatedVisitDate, setLocalEstimatedVisitDate] = useState<string | undefined>(property?.estimatedVisitDate);
  const [localSetupStatusNotes, setLocalSetupStatusNotes] = useState<string | undefined>(property?.setupStatusNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Update local state when property changes
  useEffect(() => {
    if (property) {
      setLocalEstimatedVisitDate(property.estimatedVisitDate);
      setLocalSetupStatusNotes(property.setupStatusNotes);
      setHasUnsavedChanges(false);
    }
  }, [property?.estimatedVisitDate, property?.setupStatusNotes]);

  // Debounce timer refs
  const notesDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const dateDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Determine phase using "Set Up Status" from Supabase
  const getPropertyRenoPhase = useCallback((): RenoKanbanPhase | null => {
    if (!supabaseProperty) return null;
    return getPropertyRenoPhaseFromSupabase(supabaseProperty);
  }, [supabaseProperty]);

  // Save function - saves to Supabase with correct field names
  const saveToSupabase = useCallback(async (showToast = true, transitionToInitialCheck = false) => {
    if (!propertyId || !supabaseProperty) return false;
    
    setIsSaving(true);
    
    try {
      // Get current phase before updating
      const currentPhase = getPropertyRenoPhase();
      
      const supabaseUpdates: PropertyUpdate & Record<string, any> = {
        'Estimated Visit Date': localEstimatedVisitDate || null,
        'Setup Status Notes': localSetupStatusNotes || null,
        updated_at: new Date().toISOString(),
      };
      
      // If transitioning to initial-check (via "Enviar" button)
      const phaseChanged = transitionToInitialCheck && currentPhase === 'upcoming-settlements' && localEstimatedVisitDate;
      if (phaseChanged) {
        // Update "Set Up Status" to move to initial-check phase
        supabaseUpdates['Set Up Status'] = 'initial check';
      }
      
      const success = await updateSupabaseProperty(supabaseUpdates);
      
      if (success) {
        // If transitioning to initial-check, update Airtable
        if (phaseChanged) {
          try {
            // 1. Append notes to SetUpnotes in Airtable with timestamp
            if (localSetupStatusNotes) {
              await appendSetUpNotesToAirtable(propertyId, localSetupStatusNotes);
            }
            
            // 2. Update Estimated Visit Date in Airtable (field ID: fldIhqPOAFL52MMBn)
            const tableName = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Properties';
            const airtablePropertyId = supabaseProperty.airtable_property_id || supabaseProperty['Unique ID From Engagements'];
            
            if (airtablePropertyId && localEstimatedVisitDate) {
              const recordId = await findRecordByPropertyId(tableName, airtablePropertyId);
              if (recordId) {
                await updateAirtableWithRetry(tableName, recordId, {
                  'fldIhqPOAFL52MMBn': localEstimatedVisitDate, // Estimated visit date field ID
                });
              }
            }
          } catch (airtableError) {
            console.error('Error updating Airtable during phase transition:', airtableError);
            // Don't fail the whole operation if Airtable update fails
          }
        }
        
        setHasUnsavedChanges(false);
        
        if (showToast) {
          if (phaseChanged) {
            toast.success("Cambios guardados. La propiedad ha pasado a Check Inicial", {
              description: "La propiedad se ha movido automáticamente a la fase de Check Inicial.",
            });
          } else {
            toast.success("Cambios guardados correctamente");
          }
        }
        
        // Refetch to sync with server and get updated phase
        await refetch();
        
        // If phase changed, redirect to initial-check page (which will show checklist)
        if (phaseChanged) {
          // Small delay to let the toast show
          setTimeout(() => {
            router.push(`/reno/construction-manager/property/${propertyId}/checklist`);
          }, 1500);
        }
      } else {
        if (showToast) {
          toast.error("Error al guardar los cambios");
        }
      }
      
      return success;
    } catch (error) {
      if (showToast) {
        toast.error("Error al guardar los cambios");
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [propertyId, supabaseProperty, localEstimatedVisitDate, localSetupStatusNotes, updateSupabaseProperty, refetch, getPropertyRenoPhase, router]);

  // Handle notes change
  const handleNotesChange = useCallback((value: string) => {
    setLocalSetupStatusNotes(value);
    setHasUnsavedChanges(true);
    
    // Only auto-save if NOT in upcoming-settlements phase
    const currentPhase = getPropertyRenoPhase();
    if (currentPhase !== 'upcoming-settlements') {
      // Clear existing debounce timer
      if (notesDebounceRef.current) {
        clearTimeout(notesDebounceRef.current);
      }
      
      // Auto-save after 2 seconds of inactivity (silent, no toast)
      notesDebounceRef.current = setTimeout(async () => {
        await saveToSupabase(false);
      }, 2000);
    }
  }, [saveToSupabase, getPropertyRenoPhase]);

  // Handle date change
  const handleDateChange = useCallback((date: string | undefined) => {
    setLocalEstimatedVisitDate(date);
    setHasUnsavedChanges(true);
    
    // Only auto-save if NOT in upcoming-settlements phase
    const currentPhase = getPropertyRenoPhase();
    if (currentPhase !== 'upcoming-settlements') {
      // Clear existing debounce timer
      if (dateDebounceRef.current) {
        clearTimeout(dateDebounceRef.current);
      }
      
      // Auto-save after 2 seconds of inactivity (silent, no toast)
      dateDebounceRef.current = setTimeout(async () => {
        await saveToSupabase(false);
      }, 2000);
    }
  }, [saveToSupabase, getPropertyRenoPhase]);

  // Manual save handler
  const handleManualSave = useCallback(async () => {
    // Clear any pending debounce timers
    if (notesDebounceRef.current) {
      clearTimeout(notesDebounceRef.current);
      notesDebounceRef.current = null;
    }
    if (dateDebounceRef.current) {
      clearTimeout(dateDebounceRef.current);
      dateDebounceRef.current = null;
    }
    
    await saveToSupabase(true);
  }, [saveToSupabase]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
      if (dateDebounceRef.current) clearTimeout(dateDebounceRef.current);
    };
  }, []);

  // Redirect to checklist page if phase is initial-check or final-check
  useEffect(() => {
    if (!isLoading && property && supabaseProperty) {
      const phase = getPropertyRenoPhase();
      if (phase === "initial-check" || phase === "final-check") {
        // Use propertyId from params (Supabase ID) instead of property.id
        router.replace(`/reno/construction-manager/property/${propertyId}/checklist`);
      }
    }
  }, [isLoading, property, supabaseProperty, getPropertyRenoPhase, router, propertyId]);

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <RenoSidebar />
        <div className="flex flex-1 items-center justify-center">
          <RenoHomeLoader />
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
                <span>Estado: {getRenoPhaseLabel(getPropertyRenoPhase(), t)}</span>
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

                {/* Reno Type */}
                {property.renoType && (
                  <div className="pt-2 border-t">
                    <label className="text-sm font-medium text-muted-foreground">
                      Tipo de renovación
                    </label>
                    <p className="mt-1 text-base">{property.renoType}</p>
                  </div>
                )}

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
                      value={localEstimatedVisitDate}
                      onChange={handleDateChange}
                      placeholder="DD/MM/YYYY"
                      errorMessage={t.upcomingSettlements.dateMustBeFuture}
                    />
                  </div>

                  {/* Setup Status Notes */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      {t.upcomingSettlements.setupStatusNotes}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t.upcomingSettlements.setupStatusNotesDescription}
                    </p>
                    <Textarea
                      value={localSetupStatusNotes || ""}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder={t.upcomingSettlements.setupStatusNotesPlaceholder}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {hasUnsavedChanges && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Tienes cambios sin guardar
                        </span>
                      )}
                      {!hasUnsavedChanges && !isSaving && (
                        <span className="text-green-600 dark:text-green-400">
                          ✓ Todos los cambios guardados
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleManualSave}
                        disabled={isSaving || !hasUnsavedChanges}
                        variant="outline"
                        className="min-w-[120px]"
                      >
                        {isSaving ? (
                          <>
                            <span className="mr-2">Guardando...</span>
                            <span className="animate-spin">⏳</span>
                          </>
                        ) : (
                          "Guardar cambios"
                        )}
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!localEstimatedVisitDate) {
                            toast.error("Debes ingresar una fecha estimada de visita antes de continuar");
                            return;
                          }
                          await saveToSupabase(true, true);
                        }}
                        disabled={isSaving || !localEstimatedVisitDate}
                        className="min-w-[200px]"
                      >
                        {isSaving ? (
                          <>
                            <span className="mr-2">Enviando...</span>
                            <span className="animate-spin">⏳</span>
                          </>
                        ) : (
                          "Enviar y pasar a Check Inicial"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Editable Fields for Initial Check - Estimated Visit Date */}
            {getPropertyRenoPhase() === "initial-check" && (
              <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
                <div className="space-y-6">
                  {/* Estimated Visit Date */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      {t.initialCheck.estimatedVisitDate}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t.upcomingSettlements.estimatedVisitDateDescription}
                    </p>
                    <FutureDatePicker
                      value={localEstimatedVisitDate}
                      onChange={handleDateChange}
                      placeholder="DD/MM/YYYY"
                      errorMessage={t.upcomingSettlements.dateMustBeFuture}
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {hasUnsavedChanges && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Tienes cambios sin guardar
                        </span>
                      )}
                      {!hasUnsavedChanges && !isSaving && (
                        <span className="text-green-600 dark:text-green-400">
                          ✓ Todos los cambios guardados
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={handleManualSave}
                      disabled={isSaving || !hasUnsavedChanges}
                      className="min-w-[120px]"
                    >
                      {isSaving ? (
                        <>
                          <span className="mr-2">Guardando...</span>
                          <span className="animate-spin">⏳</span>
                        </>
                      ) : (
                        "Guardar cambios"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Categories Progress - Only for reno-in-progress */}
            {getPropertyRenoPhase() === "reno-in-progress" && supabaseProperty && (
              <DynamicCategoriesProgress property={supabaseProperty} />
            )}

            {/* Read-only notice for other phases */}
            {getPropertyRenoPhase() !== "upcoming-settlements" && 
             getPropertyRenoPhase() !== "initial-check" && 
             getPropertyRenoPhase() !== "upcoming" &&
             getPropertyRenoPhase() !== "reno-in-progress" &&
             getPropertyRenoPhase() !== "furnishing-cleaning" && (
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

function getRenoPhaseLabel(phase: RenoKanbanPhase | null, t: ReturnType<typeof useI18n>["t"]): string {
  if (!phase) return "N/A";
  
  const phaseLabels: Record<RenoKanbanPhase, string> = {
    "upcoming-settlements": t.kanban.upcomingSettlements,
    "initial-check": t.kanban.initialCheck,
    "upcoming": t.kanban.upcoming,
    "reno-in-progress": t.kanban.renoInProgress,
    "furnishing-cleaning": t.kanban.furnishingCleaning,
    "final-check": t.kanban.finalCheck,
    "reno-fixes": t.kanban.renoFixes,
    "done": t.kanban.done,
  };
  
  return phaseLabels[phase] || phase;
}
