"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useCallback, useState, useRef, use } from "react";
import { ArrowLeft, MapPin, AlertTriangle, Info, X, ExternalLink } from "lucide-react";
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
import dynamic from "next/dynamic";
import { toast } from "sonner";

// Importar PdfViewer solo en el cliente para evitar problemas con SSR
const PdfViewer = dynamic(() => import("@/components/reno/pdf-viewer").then(mod => ({ default: mod.PdfViewer })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full border rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center" style={{ minHeight: '600px' }}>
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Cargando visor de PDF...</p>
      </div>
    </div>
  ),
});
import { appendSetUpNotesToAirtable } from "@/lib/airtable/initial-check-sync";
import { updateAirtableWithRetry, findRecordByPropertyId } from "@/lib/airtable/client";
import { useDynamicCategories } from "@/hooks/useDynamicCategories";
import { createClient } from "@/lib/supabase/client";
import { useRenoProperties } from "@/contexts/reno-properties-context";

type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export default function RenoPropertyDetailPage() {
  const paramsPromise = useParams();
  const router = useRouter();
  const searchParamsPromise = useSearchParams();
  const supabase = createClient();
  const { t, language } = useI18n();
  const { allProperties, refetchProperties } = useRenoProperties();
  
  // Unwrap params and searchParams if they're Promises (Next.js 16+)
  const unwrappedParams = paramsPromise instanceof Promise ? use(paramsPromise) : paramsPromise;
  const unwrappedSearchParams = searchParamsPromise instanceof Promise ? use(searchParamsPromise) : searchParamsPromise;
  
  // Get viewMode from query params (kanban or list)
  const viewMode = unwrappedSearchParams.get('viewMode') || 'kanban';
  // Get source page from query params or referrer to know where to redirect back
  const sourcePage = unwrappedSearchParams.get('from') || null;
  const [reportProblemOpen, setReportProblemOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Leer el tab desde la URL si existe, sino usar "tareas" por defecto
  const tabFromUrl = unwrappedSearchParams?.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || "tareas"); // Tab por defecto: Tareas
  const propertyId = unwrappedParams.id && typeof unwrappedParams.id === "string" ? unwrappedParams.id : null;
  const { property: supabaseProperty, loading: supabaseLoading, updateProperty: updateSupabaseProperty, refetch } = useSupabaseProperty(propertyId);
  const { categories: dynamicCategories, loading: categoriesLoading } = useDynamicCategories(propertyId);
  const hasCheckedInitialTab = useRef(false); // Track if we've already checked and set the initial tab
  
  // Calculate average progress from dynamic categories (for reno-in-progress phase)
  const averageCategoriesProgress = dynamicCategories.length > 0
    ? Math.round(
        dynamicCategories.reduce((sum, cat) => sum + (cat.percentage || 0), 0) / dynamicCategories.length
      )
    : undefined;
  
  // Convert Supabase property to Property format
  const property: Property | null = supabaseProperty ? convertSupabasePropertyToProperty(supabaseProperty) : null;
  const isLoading = supabaseLoading;

  // Local state for form fields to enable fluid typing
  const [localEstimatedVisitDate, setLocalEstimatedVisitDate] = useState<string | undefined>(property?.estimatedVisitDate);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

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

  // Verificar el PDF cuando estamos en la tab de presupuesto y existe budget_pdf_url
  useEffect(() => {
    if (activeTab !== "presupuesto-reforma" || !supabaseProperty?.budget_pdf_url) {
      setPdfError(null);
      return;
    }

    const budgetPdfUrl = supabaseProperty.budget_pdf_url;
    const proxyPdfUrl = `/api/proxy-pdf?url=${encodeURIComponent(budgetPdfUrl)}`;
    
    // Verificar que el PDF sea accesible antes de cargarlo
    fetch(proxyPdfUrl)
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
          });
        }
        // Si la respuesta es OK, verificar que sea un PDF
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('application/pdf')) {
          throw new Error('La URL no apunta a un PDF válido');
        }
        setPdfError(null);
      })
      .catch((error) => {
        console.error('[PDF Viewer] Error verificando PDF:', error);
        setPdfError(error.message || 'Error al cargar el PDF');
      });
  }, [activeTab, supabaseProperty?.budget_pdf_url]);

  // Auto-switch to summary tab for reno-budget and furnishing-cleaning phases without tasks
  // PERO solo si no viene un tab específico en la URL
  useEffect(() => {
    // Only check once when data is loaded
    if (hasCheckedInitialTab.current || isLoading || categoriesLoading || !propertyId) return;
    
    // Si hay un tab en la URL, no cambiar automáticamente
    if (tabFromUrl) {
      hasCheckedInitialTab.current = true;
      return;
    }
    
    const phase = getPropertyRenoPhase();
    const hasNoTasks = dynamicCategories.length === 0;
    
    // If property is in reno-budget phases or furnishing/cleaning and has no tasks, switch to summary
    // EXCEPTO para reno-budget-renovator y reno-budget-client que siempre deben mostrar tareas
    if (phase === "reno-budget-renovator" || phase === "reno-budget-client") {
      // Siempre mostrar tareas para estas fases
      setActiveTab("tareas");
      hasCheckedInitialTab.current = true;
    } else if ((phase === "reno-budget" || phase === "reno-budget-start" || phase === "furnishing" || phase === "cleaning") && hasNoTasks) {
      setActiveTab("resumen");
      hasCheckedInitialTab.current = true;
    } else {
      // Mark as checked even if we don't switch, to avoid re-checking
      hasCheckedInitialTab.current = true;
    }
  }, [isLoading, categoriesLoading, propertyId, dynamicCategories.length, getPropertyRenoPhase, tabFromUrl]);

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
      
      // Auto-advance to initial-check ONLY when explicitly requested via "Enviar" button
      // Do NOT auto-advance when just changing the date
      const shouldAutoAdvance = 
        transitionToInitialCheck && currentPhase === 'upcoming-settlements' && localEstimatedVisitDate;
      
      console.log('[Property Update] Transition check:', {
        propertyId,
        transitionToInitialCheck,
        currentPhase,
        isNewDate,
        localEstimatedVisitDate,
        previousDate,
        shouldAutoAdvance,
      });
      
      if (shouldAutoAdvance) {
        // Update "Set Up Status" to move to initial-check phase
        // Usar el valor exacto que mapea a 'initial-check' según kanban-mapping.ts
        // El mapeo acepta tanto 'initial check' como 'Initial Check', pero usamos 'Initial Check' para consistencia
        supabaseUpdates['Set Up Status'] = 'Initial Check';
        // Also update reno_phase for consistency
        supabaseUpdates['reno_phase'] = 'initial-check';
        
        console.log('[Property Update] ✅ Auto-advancing to initial-check phase:', {
          propertyId,
          currentPhase,
          newSetUpStatus: supabaseUpdates['Set Up Status'],
          newRenoPhase: supabaseUpdates['reno_phase'],
        });
      }
      
      const success = await updateSupabaseProperty(supabaseUpdates);
      
      if (success) {
        // Update Airtable whenever Estimated Visit Date is saved
        // Use airtable_property_id (Record_ID) as the key to match records
        if (localEstimatedVisitDate) {
          try {
            // IMPORTANTE: El Record ID siempre está en "Transactions", no en "Properties"
            // El airtable_property_id contiene el Record ID de la tabla "Transactions"
            const tableName = 'Transactions';
            const airtablePropertyId = supabaseProperty?.airtable_property_id;
            
            console.log(`[Property Update] Starting Airtable sync:`, {
              propertyId,
              airtablePropertyId,
              localEstimatedVisitDate,
              tableName: 'Transactions',
            });
            
            // Validate that airtable_property_id exists (all properties should have it)
            if (!airtablePropertyId) {
              console.error(`[Property Update] Property ${propertyId} does not have airtable_property_id. All properties should have this field because they are created from Airtable.`);
              console.error(`[Property Update] Property data:`, {
                id: propertyId,
                address: supabaseProperty?.address,
                hasAirtablePropertyId: !!supabaseProperty?.airtable_property_id,
              });
              toast.error("Error: La propiedad no tiene ID de Airtable. Contacta al administrador.");
              return success; // Continue but show error
            }
            
            // Validate Record ID using findRecordByPropertyId (simplified to only use Record ID)
            console.log(`[Property Update] Validating Record ID in Transactions:`, airtablePropertyId);
            const recordId = await findRecordByPropertyId(tableName, airtablePropertyId);
            
            if (!recordId) {
              console.error(`[Property Update] Airtable record not found for property ${propertyId} with Record ID ${airtablePropertyId} in table "Transactions".`);
              console.error(`[Property Update] This could mean:`, {
                recordIdDoesNotExist: 'The Record ID does not exist in Airtable',
                recordIdInvalid: 'The Record ID format is invalid',
                airtableConnectionIssue: 'There is a connection issue with Airtable',
              });
              toast.error("Error: No se encontró el registro en Airtable. Contacta al administrador.");
              return success; // Continue but show error
            }
            
            console.log(`[Property Update] Record ID validated successfully in Transactions:`, recordId);
            
            // Update Est. visit date in Airtable (field ID: fldIhqPOAFL52MMBn)
            // NOTE: "Set Up Status" field does not exist in "Transactions" table,
            // so we only update the Estimated Visit Date here.
            // The "Set Up Status" is already updated in Supabase, which is the source of truth.
            const airtableFields: Record<string, any> = {
              'fldIhqPOAFL52MMBn': localEstimatedVisitDate, // Est. visit date field ID
            };
            
            // Note: We don't update "Set Up Status" in Transactions table because:
            // 1. The field doesn't exist in Transactions
            // 2. Supabase is already updated with the correct status
            // 3. The status sync happens from Supabase to Airtable via other mechanisms if needed
            
            console.log(`[Property Update] Attempting to update Airtable (Transactions):`, {
              tableName,
              recordId,
              airtableFields,
              propertyId,
              airtablePropertyId,
            });
            
            const airtableSuccess = await updateAirtableWithRetry(tableName, recordId, airtableFields);
            
            if (!airtableSuccess) {
              console.error(`[Property Update] Failed to update Airtable (Transactions) for property ${propertyId}`, {
                tableName,
                recordId,
                airtableFields,
                airtablePropertyId,
                propertyId,
              });
              toast.error("Error: No se pudo actualizar Airtable. La propiedad se guardó en Supabase pero puede haber un problema de sincronización.");
            } else {
              console.log(`[Property Update] ✅ Successfully updated Airtable (Transactions) for property ${propertyId}`);
            }
          } catch (airtableError: any) {
            console.error('[Property Update] Exception updating Airtable:', {
              error: airtableError?.message || airtableError,
              stack: airtableError?.stack,
              propertyId,
              airtablePropertyId: supabaseProperty?.airtable_property_id,
            });
            toast.error("Error: No se pudo actualizar Airtable. La propiedad se guardó en Supabase pero puede haber un problema de sincronización.");
            // Don't fail the whole operation if Airtable update fails
            // La propiedad ya fue actualizada en Supabase, que es lo importante
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
            toast.success("Se ha guardado correctamente la fecha y se ha movido a Check Inicial", {
              description: "La propiedad se ha movido automáticamente a la fase de Check Inicial.",
            });
          } else {
            toast.success("Cambios guardados correctamente");
          }
        }
        
        // Refetch to sync with server and get updated phase
        await refetch();
        
        // Also refresh the properties list in the context so the card updates immediately
        await refetchProperties();
        
        // If phase changed, redirect back to source page (home or kanban)
        if (shouldAutoAdvance) {
          // Small delay to let the toast show and refetch complete
          setTimeout(() => {
            // Determine where to redirect based on source page or referrer
            let redirectPath = '/reno/construction-manager';
            
            if (sourcePage === 'kanban' || sourcePage === 'home') {
              redirectPath = sourcePage === 'kanban' 
                ? `/reno/construction-manager/kanban${viewMode === 'list' ? '?viewMode=list' : ''}`
                : '/reno/construction-manager';
            } else {
              // Try to detect from referrer if sourcePage is not provided
              if (typeof window !== 'undefined') {
                const referrer = document.referrer;
                if (referrer.includes('/kanban')) {
                  redirectPath = `/reno/construction-manager/kanban${viewMode === 'list' ? '?viewMode=list' : ''}`;
                } else if (referrer.includes('/construction-manager') && !referrer.includes('/property')) {
                  redirectPath = '/reno/construction-manager';
                }
              }
            }
            
            router.push(redirectPath);
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
        // For furnishing and cleaning phases, show final check CTA
        if (currentPhase === "furnishing" || currentPhase === "cleaning") {
          return (
            <div className="space-y-6">
              <PropertyActionTab 
                property={property} 
                supabaseProperty={supabaseProperty} 
                propertyId={propertyId}
                allProperties={allProperties}
                onUpdateRenovatorName={async (newName: string) => {
                  return await updateSupabaseProperty({
                    'Renovator name': newName || null,
                  });
                }}
              />
              
              {/* Final Check CTA Card */}
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
                    {t.kanban.finalCheck}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {t.propertyAction.finalCheckDescription}
                  </p>
                  
                  <Button
                    onClick={() => router.push(`/reno/construction-manager/property/${propertyId}/checklist`)}
                    size="lg"
                    className="mt-4 min-w-[200px]"
                  >
                    {t.propertyAction.openFinalChecklist}
                  </Button>
                </div>
              </div>
            </div>
          );
        }
        
        // For initial-check or final-check phases, show checklist CTA
        if (currentPhase === "initial-check" || currentPhase === "final-check") {
          const checklistType = currentPhase === "final-check" ? t.kanban.finalCheck : t.kanban.initialCheck;
          // Check for date in both local state and supabase property
          const estimatedDate = localEstimatedVisitDate || (supabaseProperty as any)?.['Estimated Visit Date'] || property?.estimatedVisitDate;
          const hasEstimatedDate = !!estimatedDate;
          const showDateSection = currentPhase === "initial-check";
          
          return (
            <div className="space-y-6">
              <PropertyActionTab 
                property={property} 
                supabaseProperty={supabaseProperty} 
                propertyId={propertyId}
                allProperties={allProperties}
                onUpdateRenovatorName={async (newName: string) => {
                  return await updateSupabaseProperty({
                    'Renovator name': newName || null,
                  });
                }}
              />
              
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

                  {/* Action Button - Solo un botón "Enviar" */}
                  {(!hasEstimatedDate || !isEditingDate) && (
                    <div className="flex items-center justify-end pt-3 md:pt-4 border-t">
                      <Button
                        onClick={async () => {
                          if (!localEstimatedVisitDate) {
                            toast.error("Debes ingresar una fecha estimada de visita antes de continuar");
                            return;
                          }
                          // Guardar fecha y mover automáticamente a initial-check
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
                          "Enviar"
                        )}
                      </Button>
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
              <PropertyActionTab 
                property={property} 
                supabaseProperty={supabaseProperty} 
                propertyId={propertyId}
                allProperties={allProperties}
                onUpdateRenovatorName={async (newName: string) => {
                  return await updateSupabaseProperty({
                    'Renovator name': newName || null,
                  });
                }}
              />
              {supabaseProperty && (
                <DynamicCategoriesProgress property={supabaseProperty} />
              )}
            </div>
          );
        }
        
        // For other phases (including reno-budget-renovator), show action tab
        return (
          <PropertyActionTab 
            property={property} 
            supabaseProperty={supabaseProperty} 
            propertyId={propertyId}
            allProperties={allProperties}
            onUpdateRenovatorName={async (newName: string) => {
              return await updateSupabaseProperty({
                'Renovator name': newName || null,
              });
            }}
          />
        );
      case "resumen":
        return <PropertySummaryTab property={property} supabaseProperty={supabaseProperty} />;
      case "estado-propiedad":
        return propertyId ? <PropertyStatusTab propertyId={propertyId} /> : null;
      case "presupuesto-reforma":
        const budgetPdfUrl = supabaseProperty?.budget_pdf_url;
        
        // Crear URL del proxy si existe el PDF
        const proxyPdfUrl = budgetPdfUrl 
          ? `/api/proxy-pdf?url=${encodeURIComponent(budgetPdfUrl)}`
          : null;
        
        return (
          <div className="bg-card rounded-lg border p-4 md:p-6 shadow-sm">
            {budgetPdfUrl && proxyPdfUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{t.propertyPage.renovationBudget}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(proxyPdfUrl, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir en nueva pestaña
                  </Button>
                </div>
                {pdfError ? (
                  <div className="w-full border rounded-lg p-6 bg-muted/50">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <AlertTriangle className="h-12 w-12 text-destructive" />
                      <div className="text-center">
                        <p className="font-semibold text-lg">Error al cargar el PDF</p>
                        <p className="text-sm text-muted-foreground mt-2">{pdfError}</p>
                        <p className="text-xs text-muted-foreground mt-4 break-all">URL: {budgetPdfUrl}</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPdfError(null);
                          // Forzar verificación nuevamente
                          fetch(proxyPdfUrl)
                            .then((response) => {
                              if (!response.ok) {
                                return response.json().then((data) => {
                                  throw new Error(data.error || `Error ${response.status}`);
                                });
                              }
                              setPdfError(null);
                            })
                            .catch((error) => {
                              setPdfError(error.message || 'Error al cargar el PDF');
                            });
                        }}
                      >
                        Reintentar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <PdfViewer 
                    fileUrl={proxyPdfUrl} 
                    fileName={budgetPdfUrl?.split('/').pop() || 'budget.pdf'} 
                  />
                )}
              </div>
            ) : (
            <p className="text-muted-foreground">{t.propertyPage.renovationBudget} - {t.propertyPage.comingSoon}</p>
            )}
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
          onBack={() => {
            // Use browser history to go back to previous page (home or kanban)
            if (window.history.length > 1) {
              router.back();
            } else {
              // Fallback to kanban if no history
              router.push(`/reno/construction-manager/kanban${viewMode === 'list' ? '?viewMode=list' : ''}`);
            }
          }}
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
          progress={getPropertyRenoPhase() === "reno-in-progress" ? averageCategoriesProgress : undefined}
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
    "reno-budget-renovator": t.kanban.renoBudgetRenovator,
    "reno-budget-client": t.kanban.renoBudgetClient,
    "reno-budget-start": t.kanban.renoBudgetStart,
    "reno-budget": t.kanban.renoBudget, // Legacy
    "upcoming": t.kanban.upcoming,
    "reno-in-progress": t.kanban.renoInProgress,
    "furnishing": t.kanban.furnishing,
    "final-check": t.kanban.finalCheck,
    "cleaning": t.kanban.cleaning,
    "furnishing-cleaning": t.kanban.furnishingCleaning, // Legacy
    "reno-fixes": t.kanban.renoFixes,
    "done": t.kanban.done,
    "orphaned": "Orphaned", // Properties without a valid phase
  };
  
  return phaseLabels[phase] || phase;
}
