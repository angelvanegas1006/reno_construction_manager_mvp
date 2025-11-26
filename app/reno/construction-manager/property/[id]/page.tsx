"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useCallback, useState, useRef } from "react";
import { ArrowLeft, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NavbarL2 } from "@/components/layout/navbar-l2";
import { HeaderL2 } from "@/components/layout/header-l2";
import { PropertyTabs } from "@/components/layout/property-tabs";
import { PropertySummaryTab } from "@/components/reno/property-summary-tab";
import { PropertyStatusTab } from "@/components/reno/property-status-tab";
import { PropertyActionTab } from "@/components/reno/property-action-tab";
import { PropertyCommentsSection } from "@/components/reno/property-comments-section";
import { PropertyStatusSidebar } from "@/components/reno/property-status-sidebar";
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
import { useDynamicCategories } from "@/hooks/useDynamicCategories";

type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export default function RenoPropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const [reportProblemOpen, setReportProblemOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tareas"); // Tab por defecto: Tareas
  const propertyId = params.id && typeof params.id === "string" ? params.id : null;
  const { property: supabaseProperty, loading: supabaseLoading, updateProperty: updateSupabaseProperty, refetch } = useSupabaseProperty(propertyId);
  const { categories: dynamicCategories, loading: categoriesLoading } = useDynamicCategories(propertyId);
  const hasCheckedInitialTab = useRef(false); // Track if we've already checked and set the initial tab
  
  // Convert Supabase property to Property format
  const property: Property | null = supabaseProperty ? convertSupabasePropertyToProperty(supabaseProperty) : null;
  const isLoading = supabaseLoading;

  // Local state for form fields to enable fluid typing
  const [localEstimatedVisitDate, setLocalEstimatedVisitDate] = useState<string | undefined>(property?.estimatedVisitDate);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Debounce timer refs
  const dateDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Determine phase using "Set Up Status" from Supabase
  const getPropertyRenoPhase = useCallback((): RenoKanbanPhase | null => {
    if (!supabaseProperty) return null;
    return getPropertyRenoPhaseFromSupabase(supabaseProperty);
  }, [supabaseProperty]);

  // Update local state when property changes
  useEffect(() => {
    if (property) {
      setLocalEstimatedVisitDate(property.estimatedVisitDate);
      setHasUnsavedChanges(false);
    }
  }, [property?.estimatedVisitDate]);

  // Reset the check flag when propertyId changes (navigating to a different property)
  useEffect(() => {
    hasCheckedInitialTab.current = false;
  }, [propertyId]);

  // Auto-switch to summary tab for reno-budget and furnishing-cleaning phases without tasks
  useEffect(() => {
    // Only check once when data is loaded
    if (hasCheckedInitialTab.current || isLoading || categoriesLoading || !propertyId) return;
    
    const phase = getPropertyRenoPhase();
    const hasNoTasks = dynamicCategories.length === 0;
    
    // If property is in reno-budget or furnishing-cleaning and has no tasks, switch to summary
    if ((phase === "reno-budget" || phase === "furnishing-cleaning") && hasNoTasks) {
      setActiveTab("resumen");
      hasCheckedInitialTab.current = true;
    } else {
      // Mark as checked even if we don't switch, to avoid re-checking
      hasCheckedInitialTab.current = true;
    }
  }, [isLoading, categoriesLoading, propertyId, dynamicCategories.length, getPropertyRenoPhase]);

  // Save function - saves to Supabase with correct field names
  const saveToSupabase = useCallback(async (showToast = true, transitionToInitialCheck = false) => {
    if (!propertyId || !supabaseProperty) return false;
    
    setIsSaving(true);
    
    try {
      // Get current phase before updating
      const currentPhase = getPropertyRenoPhase();
      
      const supabaseUpdates: PropertyUpdate & Record<string, any> = {
        'Estimated Visit Date': localEstimatedVisitDate || null,
        // Setup Status Notes ahora se maneja a través de comentarios
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
        // Sync Estimated Visit Date to Airtable if:
        // 1. We're in upcoming-settlements phase (first phase), OR
        // 2. We're transitioning to initial-check phase
        const shouldSyncToAirtable = 
          (currentPhase === 'upcoming-settlements' && localEstimatedVisitDate) || 
          phaseChanged;
        
        if (shouldSyncToAirtable) {
          try {
            // Usar la tabla Transactions (no Properties) ya que es donde están los registros principales
            const tableName = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Transactions';
            const airtablePropertyId = supabaseProperty.airtable_property_id || supabaseProperty['Unique ID From Engagements'];
            
            if (airtablePropertyId && localEstimatedVisitDate) {
              console.log(`[Airtable Sync] Syncing Estimated Visit Date to Airtable for property ${propertyId}`, {
                tableName,
                airtablePropertyId,
                estimatedVisitDate: localEstimatedVisitDate,
                phase: currentPhase
              });
              
              // Si airtable_property_id empieza con "rec", es un record ID directo de Airtable
              // Si no, es un Property ID y necesitamos buscarlo
              let recordId: string | null = null;
              
              if (airtablePropertyId.startsWith('rec')) {
                // Es un record ID directo, usarlo directamente
                recordId = airtablePropertyId;
                console.log(`[Airtable Sync] Using direct record ID:`, recordId);
              } else {
                // Es un Property ID, buscar el record ID
                recordId = await findRecordByPropertyId(tableName, airtablePropertyId);
                console.log(`[Airtable Sync] Record ID found by search:`, recordId, {
                  tableName,
                  airtablePropertyId,
                  propertyId
                });
              }
              
              if (recordId) {
                // Intentar con el field ID primero, y también con nombres alternativos del campo
                // El campo en Airtable puede llamarse "Est. Visit date" o "Estimated Visit Date"
                // Usar solo el field ID primero, si falla intentar con nombres
                const fieldsToUpdate: Record<string, any> = {
                  'fldIhqPOAFL52MMBn': localEstimatedVisitDate, // Field ID (prioridad)
                };
                
                // También intentar con nombres alternativos (Airtable puede aceptar múltiples)
                // Pero mejor usar solo el field ID que es más confiable
                
                console.log(`[Airtable Sync] Attempting to update with field ID fldIhqPOAFL52MMBn:`, localEstimatedVisitDate);
                
                const syncSuccess = await updateAirtableWithRetry(tableName, recordId, fieldsToUpdate);
                
                if (syncSuccess) {
                  console.log(`✅ Synced Estimated Visit Date to Airtable for property ${propertyId}`);
                  if (showToast && currentPhase === 'upcoming-settlements') {
                    toast.success("Fecha sincronizada con Airtable", {
                      description: "La fecha estimada de visita se ha actualizado en Airtable.",
                    });
                  }
                } else {
                  console.warn(`⚠️ Failed to sync Estimated Visit Date to Airtable for property ${propertyId}`);
                }
              } else {
                console.warn(`⚠️ Airtable record not found for property ${propertyId} (${airtablePropertyId})`);
              }
            } else {
              console.warn(`⚠️ Missing data for Airtable sync:`, {
                hasAirtableId: !!airtablePropertyId,
                hasEstimatedVisitDate: !!localEstimatedVisitDate
              });
            }
          } catch (airtableError) {
            console.error('Error updating Airtable with Estimated Visit Date:', airtableError);
            // Don't fail the whole operation if Airtable update fails
            if (showToast) {
              toast.error("Error al sincronizar con Airtable", {
                description: "Los cambios se guardaron en Supabase, pero hubo un error al sincronizar con Airtable.",
              });
            }
          }
        }
        
        // If transitioning to initial-check, also sync comments
        if (phaseChanged) {
          try {
            // Sync comments to Airtable (replaces SetUpnotes)
            // Los comentarios se sincronizan automáticamente cuando se agregan
            // Aquí podríamos forzar una sincronización si es necesario
          } catch (airtableError) {
            console.error('Error syncing comments to Airtable during phase transition:', airtableError);
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
  }, [propertyId, supabaseProperty, localEstimatedVisitDate, updateSupabaseProperty, refetch, getPropertyRenoPhase, router]);


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
    if (dateDebounceRef.current) {
      clearTimeout(dateDebounceRef.current);
      dateDebounceRef.current = null;
    }
    
    await saveToSupabase(true);
  }, [saveToSupabase]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (dateDebounceRef.current) clearTimeout(dateDebounceRef.current);
    };
  }, []);

  // Calculate progress (simplified - could be improved)
  const progress = 25; // TODO: Calculate from checklist completion

  // Get pending items based on phase
  const getPendingItems = () => {
    const phase = getPropertyRenoPhase();
    const items = [];
    
    if (phase === "upcoming-settlements") {
      items.push({
        label: t.propertySidebar.completeNewSettlementsInfo,
        onClick: () => setActiveTab("tareas"),
      });
    }
    if (phase === "initial-check") {
      items.push({
        label: t.propertySidebar.completeInitialChecklist,
        onClick: () => router.push(`/reno/construction-manager/property/${propertyId}/checklist`),
      });
    }
    if (phase === "final-check") {
      items.push({
        label: t.propertySidebar.completeFinalChecklist,
        onClick: () => router.push(`/reno/construction-manager/property/${propertyId}/checklist`),
      });
    }
    
    return items;
  };

  // Define tabs
  const tabs = [
    { id: "tareas", label: t.propertyTabs.tasks },
    { id: "resumen", label: t.propertyTabs.summary },
    { id: "estado-propiedad", label: t.propertyTabs.propertyStatus },
    { id: "presupuesto-reforma", label: t.propertyTabs.renovationBudget },
  ];

  // Render active tab content
  const renderTabContent = () => {
    const currentPhase = getPropertyRenoPhase();
    
      // Early return if property is null
      if (!property) {
        return (
          <div className="bg-card bg-card rounded-lg border p-6 shadow-sm">
            <p className="text-muted-foreground">{t.propertyPage.loadingProperty}</p>
          </div>
        );
      }
    
    switch (activeTab) {
      case "tareas":
        // For initial-check or final-check phases, show checklist CTA
        if (currentPhase === "initial-check" || currentPhase === "final-check") {
          const checklistType = currentPhase === "final-check" ? t.kanban.finalCheck : t.kanban.initialCheck;
          return (
            <div className="space-y-6">
              <PropertyActionTab property={property} supabaseProperty={supabaseProperty} />
              
              {/* Checklist CTA Card */}
              <div className="bg-card bg-card rounded-lg border-2 border-primary/20 p-8 shadow-lg">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <svg
                      className="w-8 h-8 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-foreground">
                    {checklistType}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {currentPhase === "initial-check"
                      ? t.propertyAction.initialCheckDescription
                      : t.propertyAction.finalCheckDescription}
                  </p>
                  
                  <Button
                    onClick={() => router.push(`/reno/construction-manager/property/${propertyId}/checklist`)}
                    size="lg"
                    className="mt-4 min-w-[200px]"
                  >
                    {currentPhase === "initial-check"
                      ? t.propertyAction.openInitialChecklist
                      : t.propertyAction.openFinalChecklist}
                  </Button>
                </div>
              </div>
            </div>
          );
        }
        
        // For upcoming-settlements, show editable fields
        if (currentPhase === "upcoming-settlements") {
          return (
            <div className="space-y-6">
              {/* Editable Fields for Upcoming Settlements */}
              <div className="bg-card bg-card rounded-lg border p-6 shadow-sm">
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

                  {/* Comments moved to sidebar */}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end pt-4 border-t">
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
            </div>
          );
        }
        
        // For reno-in-progress, show DynamicCategoriesProgress
        if (currentPhase === "reno-in-progress") {
          return (
            <div className="space-y-6">
              <PropertyActionTab property={property} supabaseProperty={supabaseProperty} propertyId={propertyId} />
              {supabaseProperty && (
                <DynamicCategoriesProgress property={supabaseProperty} />
              )}
            </div>
          );
        }
        
        // For other phases, show action tab
        return <PropertyActionTab property={property} supabaseProperty={supabaseProperty} propertyId={propertyId} />;
      case "resumen":
        return <PropertySummaryTab property={property} supabaseProperty={supabaseProperty} />;
      case "estado-propiedad":
        return propertyId ? <PropertyStatusTab propertyId={propertyId} /> : null;
      case "presupuesto-reforma":
        return (
          <div className="bg-card bg-card rounded-lg border p-6 shadow-sm">
            <p className="text-muted-foreground">{t.propertyPage.renovationBudget} - {t.propertyPage.comingSoon}</p>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 items-center justify-center">
          <RenoHomeLoader />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-lg font-semibold text-foreground mb-2">
            {t.propertyPage.propertyNotFound}
          </p>
          <button 
            onClick={() => router.push("/reno/construction-manager/kanban")} 
            className="px-4 py-2 rounded-md border border-input bg-background hover:bg-accent"
          >
            {t.propertyPage.backToKanban}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* L2: Sin Sidebar - se oculta para enfocar al usuario */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navbar L2: Botón atrás + Acciones críticas */}
        <NavbarL2
          onBack={() => router.push("/reno/construction-manager/kanban")}
          classNameTitle={t.propertyPage.property}
          actions={[
            {
              label: t.propertyPage.reportProblem,
              onClick: () => setReportProblemOpen(true),
              variant: "outline",
              icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />,
            },
          ]}
        />

        {/* Header L2: Título extenso de la entidad */}
        <HeaderL2
          title={property.fullAddress}
          subtitle={
            <>
              <span>ID: {property.uniqueIdFromEngagements || property.id}</span>
              <span className="mx-2">·</span>
              <span>Estado: {getRenoPhaseLabel(getPropertyRenoPhase(), t)}</span>
            </>
          }
          badge={{
            label: getRenoPhaseLabel(getPropertyRenoPhase(), t),
            variant: getPropertyRenoPhase() === "upcoming-settlements" ? "default" : "secondary",
          }}
        />

        {/* Tabs Navigation */}
        <PropertyTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content with Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
            <div className="max-w-4xl mx-auto">
              {renderTabContent()}
            </div>
          </div>

          {/* Right Sidebar - Status */}
          <PropertyStatusSidebar
            property={property}
            supabaseProperty={supabaseProperty}
            propertyId={propertyId}
            progress={progress}
            pendingItems={getPendingItems()}
          />
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
    "reno-budget": t.kanban.renoBudget,
    "reno-in-progress": t.kanban.renoInProgress,
    "furnishing-cleaning": t.kanban.furnishingCleaning,
    "final-check": t.kanban.finalCheck,
    "reno-fixes": t.kanban.renoFixes,
    "done": t.kanban.done,
  };
  
  return phaseLabels[phase] || phase;
}
