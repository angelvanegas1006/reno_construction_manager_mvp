"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useCallback, useState, useRef } from "react";
import { ArrowLeft, MapPin, AlertTriangle, Info, X } from "lucide-react";
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
import { PropertyRemindersSection } from "@/components/reno/property-reminders-section";
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
import { createClient } from "@/lib/supabase/client";

type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export default function RenoPropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { t, language } = useI18n();
  
  // Get viewMode from query params (kanban or list)
  const viewMode = searchParams.get('viewMode') || 'kanban';
  const [reportProblemOpen, setReportProblemOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
  const [isEditingDate, setIsEditingDate] = useState(false);

  // Determine phase using "Set Up Status" from Supabase
  const getPropertyRenoPhase = useCallback((): RenoKanbanPhase | null => {
    if (!supabaseProperty) return null;
    return getPropertyRenoPhaseFromSupabase(supabaseProperty);
  }, [supabaseProperty]);

  // Update local state when property changes
  useEffect(() => {
    if (property || supabaseProperty) {
      const dateFromProperty = property?.estimatedVisitDate;
      const dateFromSupabase = (supabaseProperty as any)?.['Estimated Visit Date'];
      const dateToUse = dateFromProperty || dateFromSupabase;
      if (dateToUse) {
        setLocalEstimatedVisitDate(dateToUse);
      }
      setHasUnsavedChanges(false);
    }
  }, [property?.estimatedVisitDate, supabaseProperty]);

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
      
      // Get previous date to detect if it's a new date
      const previousDate = (supabaseProperty as any)['Estimated Visit Date'] || property?.estimatedVisitDate;
      const isNewDate = localEstimatedVisitDate && localEstimatedVisitDate !== previousDate;
      
      const supabaseUpdates: PropertyUpdate & Record<string, any> = {
        'Estimated Visit Date': localEstimatedVisitDate || null,
        // Setup Status Notes ahora se maneja a través de comentarios
        updated_at: new Date().toISOString(),
      };
      
      // Auto-advance to initial-check if:
      // 1. Explicitly requested via "Enviar" button (transitionToInitialCheck)
      // 2. OR: Property is in upcoming-settlements AND a new date is being saved
      const shouldAutoAdvance = 
        (transitionToInitialCheck && currentPhase === 'upcoming-settlements' && localEstimatedVisitDate) ||
        (currentPhase === 'upcoming-settlements' && isNewDate && localEstimatedVisitDate);
      
      if (shouldAutoAdvance) {
        // Update "Set Up Status" to move to initial-check phase
        supabaseUpdates['Set Up Status'] = 'initial check';
      }
      
      const success = await updateSupabaseProperty(supabaseUpdates);
      
      if (success) {
        // Update Airtable when:
        // 1. Transitioning to initial-check (shouldAutoAdvance)
        // 2. OR: Already in initial-check and date is being modified
        const shouldUpdateAirtable = shouldAutoAdvance || (currentPhase === 'initial-check' && isNewDate && localEstimatedVisitDate);
        
        if (shouldUpdateAirtable) {
          try {
            const tableName = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Properties';
            const airtablePropertyId = supabaseProperty?.airtable_property_id || (supabaseProperty as any)?.['Unique ID From Engagements'];
            
            if (airtablePropertyId && localEstimatedVisitDate) {
              const recordId = await findRecordByPropertyId(tableName, airtablePropertyId);
              if (recordId) {
                const airtableFields: Record<string, any> = {
                  'fldIhqPOAFL52MMBn': localEstimatedVisitDate, // Estimated visit date field ID
                };
                
                // Only update Set Up Status when transitioning
                if (shouldAutoAdvance) {
                  airtableFields['Set Up Status'] = 'Initial Check';
                }
                
                await updateAirtableWithRetry(tableName, recordId, airtableFields);
              }
            }
          } catch (airtableError) {
            console.error('Error updating Airtable:', airtableError);
            // Don't fail the whole operation if Airtable update fails
          }
        }
        
        // Create visit in calendar if transitioning to initial-check
        if (shouldAutoAdvance && localEstimatedVisitDate) {
          try {
            const visitDate = new Date(localEstimatedVisitDate);
            visitDate.setHours(9, 0, 0, 0); // Set to 9 AM by default
            
            const { data: existingVisits } = await supabase
              .from("property_visits")
              .select("id")
              .eq("property_id", propertyId)
              .eq("visit_type", "initial-check")
              .gte("visit_date", new Date(visitDate.getTime() - 24 * 60 * 60 * 1000).toISOString())
              .lte("visit_date", new Date(visitDate.getTime() + 24 * 60 * 60 * 1000).toISOString())
              .limit(1);
            
            if (!existingVisits || existingVisits.length === 0) {
              const { error: visitError } = await supabase
                .from("property_visits")
                .insert({
                  property_id: propertyId,
                  visit_date: visitDate.toISOString(),
                  visit_type: "initial-check",
                  notes: t.upcomingSettlements.autoVisitNote,
                });
              
              if (visitError) {
                console.error('Error creating automatic visit:', visitError);
              }
            }
          } catch (visitError) {
            console.error('Error creating visit:', visitError);
            // Don't fail the whole operation if visit creation fails
          }
        }
        
        setHasUnsavedChanges(false);
        
        if (showToast) {
          if (shouldAutoAdvance) {
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
        if (shouldAutoAdvance) {
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
  }, [propertyId, supabaseProperty, localEstimatedVisitDate, updateSupabaseProperty, refetch, getPropertyRenoPhase, router, property]);


  // Handle date change
  const handleDateChange = useCallback((date: string | undefined) => {
    setLocalEstimatedVisitDate(date);
    setHasUnsavedChanges(true);
  }, []);

  // Manual save handler
  const handleManualSave = useCallback(async () => {
    await saveToSupabase(true);
  }, [saveToSupabase]);

  // Handler para actualizar Renovator Name
  const handleUpdateRenovatorName = useCallback(async (newName: string): Promise<boolean> => {
    if (!propertyId || !supabaseProperty) return false;
    
    try {
      const supabaseUpdates: PropertyUpdate & Record<string, any> = {
        'Renovator name': newName || null,
        updated_at: new Date().toISOString(),
      };
      
      const success = await updateSupabaseProperty(supabaseUpdates);
      
      if (success) {
        await refetch();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating renovator name:', error);
      return false;
    }
  }, [propertyId, supabaseProperty, updateSupabaseProperty, refetch]);

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

  // Define tabs - Comments tab is second for better mobile UX
  const tabs = [
    { id: "tareas", label: t.propertyTabs.tasks },
    { id: "comentarios", label: t.propertyTabs.comments || "Comentarios" },
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
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <p className="text-muted-foreground">{t.propertyPage.loadingProperty}</p>
          </div>
        );
      }
    
    switch (activeTab) {
      case "tareas":
        // For initial-check or final-check phases, show checklist CTA
        if (currentPhase === "initial-check" || currentPhase === "final-check") {
          const checklistType = currentPhase === "final-check" ? t.kanban.finalCheck : t.kanban.initialCheck;
          // Check for date in both local state and supabase property
          const estimatedDate = localEstimatedVisitDate || (supabaseProperty as any)?.['Estimated Visit Date'] || property?.estimatedVisitDate;
          const hasEstimatedDate = !!estimatedDate;
          const showDateSection = currentPhase === "initial-check";
          
          return (
            <div className="space-y-6">
              <PropertyActionTab property={property} supabaseProperty={supabaseProperty} propertyId={propertyId} onUpdateRenovatorName={handleUpdateRenovatorName} />
              
              {/* Date section for initial-check (with or without date) */}
              {showDateSection && (
                <div className="bg-card rounded-lg border p-6 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-semibold">
                          {t.upcomingSettlements.estimatedVisitDate}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isEditingDate || !hasEstimatedDate
                            ? t.upcomingSettlements.estimatedVisitDateDescription
                            : `${t.propertyPage.currentDate}: ${estimatedDate ? new Date(estimatedDate).toLocaleDateString(language === "es" ? "es-ES" : "en-US") : ""}`
                          }
                        </p>
                      </div>
                      {hasEstimatedDate && !isEditingDate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingDate(true)}
                        >
                          {t.propertyPage.modifyDate || "Modificar fecha"}
                        </Button>
                      )}
                    </div>
                    
                    {(isEditingDate || !hasEstimatedDate) && (
                      <div className="space-y-4 pt-4 border-t">
                        <FutureDatePicker
                          value={localEstimatedVisitDate}
                          onChange={handleDateChange}
                          placeholder="DD/MM/YYYY"
                          errorMessage={t.upcomingSettlements.dateMustBeFuture}
                        />
                        <div className="flex items-center justify-end gap-2">
                          {hasEstimatedDate && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsEditingDate(false);
                                setLocalEstimatedVisitDate(property?.estimatedVisitDate || (supabaseProperty as any)?.['Estimated Visit Date']);
                                setHasUnsavedChanges(false);
                              }}
                            >
                              {t.calendar.cancel || "Cancelar"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={async () => {
                              await saveToSupabase(true);
                              setIsEditingDate(false);
                            }}
                            disabled={isSaving || !hasUnsavedChanges || !localEstimatedVisitDate}
                          >
                            {isSaving ? t.propertyPage.saving || "Guardando..." : t.propertyPage.save || "Guardar"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Checklist CTA Card */}
              <div className="bg-card rounded-lg border-2 border-primary/20 p-8 shadow-lg">
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
          const hasEstimatedDate = localEstimatedVisitDate;
          
          return (
            <div className="space-y-4 md:space-y-6">
              {/* Editable Fields for Upcoming Reno */}
              <div className="bg-card rounded-lg border p-4 md:p-6 shadow-sm">
                <div className="space-y-4 md:space-y-6">
                  {/* Estimated Visit Date */}
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Label className="text-sm font-semibold">
                          {t.upcomingSettlements.estimatedVisitDate}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1 break-words">
                          {isEditingDate || !hasEstimatedDate
                            ? t.upcomingSettlements.estimatedVisitDateDescription
                            : `${t.propertyPage.currentDate}: ${localEstimatedVisitDate ? new Date(localEstimatedVisitDate).toLocaleDateString(language === "es" ? "es-ES" : "en-US") : ""}`
                          }
                        </p>
                      </div>
                      {hasEstimatedDate && !isEditingDate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingDate(true)}
                          className="flex-shrink-0 w-full sm:w-auto"
                        >
                          {t.propertyPage.modifyDate || "Modificar fecha"}
                        </Button>
                      )}
                    </div>
                    
                    {(!hasEstimatedDate || isEditingDate) && (
                      <div className="space-y-3 md:space-y-4 pt-3 md:pt-4 border-t">
                        <FutureDatePicker
                          value={localEstimatedVisitDate}
                          onChange={handleDateChange}
                          placeholder="DD/MM/YYYY"
                          errorMessage={t.upcomingSettlements.dateMustBeFuture}
                        />
                        {isEditingDate && (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsEditingDate(false);
                                setLocalEstimatedVisitDate(property?.estimatedVisitDate);
                                setHasUnsavedChanges(false);
                              }}
                              className="w-full sm:w-auto"
                            >
                              {t.calendar.cancel || "Cancelar"}
                            </Button>
                            <Button
                              size="sm"
                              onClick={async () => {
                                await saveToSupabase(true);
                                setIsEditingDate(false);
                              }}
                              disabled={isSaving || !hasUnsavedChanges}
                              className="w-full sm:w-auto"
                            >
                              {isSaving ? t.propertyPage.saving || "Guardando..." : t.propertyPage.save || "Guardar"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comments moved to sidebar */}

                  {/* Action Buttons */}
                  {(!hasEstimatedDate || !isEditingDate) && (
                    <div className="flex items-center justify-end pt-3 md:pt-4 border-t">
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        {hasEstimatedDate && (
                          <Button
                            onClick={handleManualSave}
                            disabled={isSaving || !hasUnsavedChanges}
                            variant="outline"
                            className="w-full sm:min-w-[120px]"
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
                        )}
                        <Button
                          onClick={async () => {
                            if (!localEstimatedVisitDate) {
                              toast.error("Debes ingresar una fecha estimada de visita antes de continuar");
                              return;
                            }
                            await saveToSupabase(true, true);
                          }}
                          disabled={isSaving || !localEstimatedVisitDate}
                          className="w-full sm:min-w-[200px]"
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
                  )}
                </div>
              </div>
            </div>
          );
        }
        
        // For reno-in-progress, show DynamicCategoriesProgress
        if (currentPhase === "reno-in-progress") {
          return (
            <div className="space-y-6">
              <PropertyActionTab property={property} supabaseProperty={supabaseProperty} propertyId={propertyId} onUpdateRenovatorName={handleUpdateRenovatorName} />
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
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <p className="text-muted-foreground">{t.propertyPage.renovationBudget} - {t.propertyPage.comingSoon}</p>
          </div>
        );
      case "comentarios":
        return (
          <div className="space-y-6">
            {/* Comments Section */}
            {propertyId && (
              <div className="bg-card rounded-lg border p-4 md:p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{t.propertySidebar.comments}</h2>
                <PropertyCommentsSection 
                  propertyId={propertyId} 
                  property={property} 
                  supabaseProperty={supabaseProperty} 
                />
              </div>
            )}
            
            {/* Reminders Section */}
            {propertyId && (
              <div className="bg-card rounded-lg border p-4 md:p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{t.propertySidebar.reminders}</h2>
                <PropertyRemindersSection propertyId={propertyId} showAll={true} />
              </div>
            )}
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
            onClick={() => router.push(`/reno/construction-manager/kanban${viewMode === 'list' ? '?viewMode=list' : ''}`)} 
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
          onBack={() => router.push(`/reno/construction-manager/kanban${viewMode === 'list' ? '?viewMode=list' : ''}`)}
          classNameTitle={t.propertyPage.property}
          actions={[
            {
              label: t.propertyPage.reportProblem,
              onClick: () => setReportProblemOpen(true),
              variant: "outline",
              icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />,
            },
          ]}
          onOpenSidebar={() => setIsSidebarOpen(true)}
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
          <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
            <div className="max-w-4xl mx-auto">
              {renderTabContent()}
            </div>
          </div>

          {/* Right Sidebar - Status - Hidden on mobile */}
          <div className="hidden lg:block">
            <PropertyStatusSidebar
              property={property}
              supabaseProperty={supabaseProperty}
              propertyId={propertyId}
              progress={progress}
              pendingItems={getPendingItems()}
            />
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          {/* Drawer from right */}
          <div className="fixed right-0 top-0 h-full w-[85vw] max-w-sm bg-card dark:bg-[var(--prophero-gray-900)] border-l z-50 lg:hidden shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-card dark:bg-[var(--prophero-gray-900)] border-b p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">{t.propertyPage.property}</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-md hover:bg-accent transition-colors"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <PropertyStatusSidebar
                property={property}
                supabaseProperty={supabaseProperty}
                propertyId={propertyId}
                progress={progress}
                pendingItems={getPendingItems()}
              />
            </div>
          </div>
        </>
      )}

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
    "reno-budget-renovator": t.kanban.renoBudgetRenovator,
    "reno-budget-client": t.kanban.renoBudgetClient,
    "reno-budget-start": t.kanban.renoBudgetStart,
    "reno-budget": t.kanban.renoBudget, // Legacy
    "reno-in-progress": t.kanban.renoInProgress,
    "furnishing-cleaning": t.kanban.furnishingCleaning,
    "final-check": t.kanban.finalCheck,
    "reno-fixes": t.kanban.renoFixes,
    "done": t.kanban.done,
  };
  
  return phaseLabels[phase] || phase;
}
