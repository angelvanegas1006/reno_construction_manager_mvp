"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useRef, startTransition, useEffect, useCallback, useMemo, useState, use, lazy, Suspense } from "react";
import { NavbarL3 } from "@/components/layout/navbar-l3";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoChecklistSidebar } from "@/components/reno/reno-checklist-sidebar";
import { VistralLogoLoader } from "@/components/reno/vistral-logo-loader";
import { ArrowLeft, Menu, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileSidebarMenu } from "@/components/property/mobile-sidebar-menu";
import { CompleteInspectionDialog } from "@/components/reno/complete-inspection-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { useSupabaseInitialChecklist } from "@/hooks/useSupabaseInitialChecklist";
import { useSupabaseFinalChecklist } from "@/hooks/useSupabaseFinalChecklist";
import { ChecklistType } from "@/lib/checklist-storage";
import { useSupabaseProperty } from "@/hooks/useSupabaseProperty";
import { convertSupabasePropertyToProperty, getPropertyRenoPhaseFromSupabase } from "@/lib/supabase/property-converter";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseInspection } from "@/hooks/useSupabaseInspection";
import { useRenoProperties } from "@/contexts/reno-properties-context";
import { areAllActivitiesReported, getFirstIncompleteSection } from "@/lib/checklist-validation";
import { calculateOverallChecklistProgress, getAllChecklistSectionsProgress } from "@/lib/checklist-progress";
import { useDynamicCategories } from "@/hooks/useDynamicCategories";

// Checklist section components - Lazy loading para code splitting y mejor rendimiento inicial
const EntornoZonasComunesSection = lazy(() => import("@/components/checklist/sections/entorno-zonas-comunes-section").then(m => ({ default: m.EntornoZonasComunesSection })));
const EstadoGeneralSection = lazy(() => import("@/components/checklist/sections/estado-general-section").then(m => ({ default: m.EstadoGeneralSection })));
const EntradaPasillosSection = lazy(() => import("@/components/checklist/sections/entrada-pasillos-section").then(m => ({ default: m.EntradaPasillosSection })));
const HabitacionesSection = lazy(() => import("@/components/checklist/sections/habitaciones-section").then(m => ({ default: m.HabitacionesSection })));
const SalonSection = lazy(() => import("@/components/checklist/sections/salon-section").then(m => ({ default: m.SalonSection })));
const BanosSection = lazy(() => import("@/components/checklist/sections/banos-section").then(m => ({ default: m.BanosSection })));
const CocinaSection = lazy(() => import("@/components/checklist/sections/cocina-section").then(m => ({ default: m.CocinaSection })));
const ExterioresSection = lazy(() => import("@/components/checklist/sections/exteriores-section").then(m => ({ default: m.ExterioresSection })));

// Loading fallback para componentes lazy
const SectionLoader = () => (
  <div className="bg-card rounded-lg border p-6 shadow-sm">
    <p className="text-muted-foreground">Cargando sección...</p>
  </div>
);

const CARPENTRY_ITEMS_SALON = [
  { id: "ventanas", translationKey: "ventanas" },
  { id: "persianas", translationKey: "persianas" },
  { id: "armarios", translationKey: "armarios" },
] as const;

const CLIMATIZATION_ITEMS_SALON = [
  { id: "radiadores", translationKey: "radiadores" },
  { id: "split-ac", translationKey: "splitAc" },
] as const;

export default function RenoChecklistPage() {
  const paramsPromise = useParams();
  const router = useRouter();
  const searchParamsPromise = useSearchParams();
  const sectionRefs = useRef<Record<string, HTMLDivElement>>({});
  const { t } = useI18n();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Unwrap params and searchParams if they're Promises (Next.js 16+)
  const unwrappedParams = paramsPromise instanceof Promise ? use(paramsPromise) : paramsPromise;
  const unwrappedSearchParams = searchParamsPromise instanceof Promise ? use(searchParamsPromise) : searchParamsPromise;
  
  // Get property ID from params
  const propertyId = unwrappedParams?.id && typeof unwrappedParams.id === "string" ? unwrappedParams.id : null;
  
  // Get source page and viewMode from query params to know where to redirect back
  const sourcePage = unwrappedSearchParams?.get('from') || null;
  const viewMode = unwrappedSearchParams?.get('viewMode') || 'kanban';

  // Debug: Log propertyId and navigation params
  useEffect(() => {
    if (propertyId) {
      console.log("🔍 Checklist Page - Property ID:", propertyId);
      console.log("🔍 Checklist Page - Source Page:", sourcePage);
      console.log("🔍 Checklist Page - View Mode:", viewMode);
      console.log("🔍 Checklist Page - All search params:", Object.fromEntries(unwrappedSearchParams?.entries() || []));
    } else {
      console.warn("⚠️ Checklist Page - No property ID found in params");
    }
  }, [propertyId, sourcePage, viewMode, unwrappedSearchParams]);

  // Load property from Supabase
  const { property: supabaseProperty, loading: supabaseLoading, error: propertyError, refetch: refetchProperty } = useSupabaseProperty(propertyId);
  
  // Get refetch function from context to update kanban/home properties
  const { refetchProperties } = useRenoProperties();

  // Convert Supabase property to Property format
  const property: Property | null = useMemo(() => {
    if (!supabaseProperty) return null;
    return convertSupabasePropertyToProperty(supabaseProperty);
  }, [supabaseProperty]);

  const isLoading = supabaseLoading;

  // Determine property reno phase from Supabase property
  const getPropertyRenoPhase = useCallback((prop: Property | null): RenoKanbanPhase | null => {
    if (!prop || !supabaseProperty) return null;
    return getPropertyRenoPhaseFromSupabase(supabaseProperty);
  }, [supabaseProperty]);

  // Determine checklist type based on phase
  const checklistType: ChecklistType = useMemo(() => {
    if (!property || !supabaseProperty) return "reno_initial";
    const phase = getPropertyRenoPhase(property);
    const result = (phase === "final-check" || phase === "furnishing" || phase === "cleaning") ? "reno_final" : "reno_initial";
    console.log('[ChecklistPage] 🔍 Checklist type determination:', {
      phase,
      checklistType: result,
      propertyId: property?.id,
      setUpStatus: (property as any)?.supabaseProperty?.['Set Up Status'],
      initialEnabled: result === "reno_initial",
      finalEnabled: result === "reno_final",
    });
    return result;
  }, [property, supabaseProperty, getPropertyRenoPhase]);

  // Redirect back if trying to access final-check but not in final-check, furnishing, or cleaning phase
  // Initial-check remains accessible from all phases
  useEffect(() => {
    if (!isLoading && property && supabaseProperty) {
      const phase = getPropertyRenoPhase(property);
      // Allow final-check checklist from furnishing, final-check, and cleaning phases
      // Only redirect if trying to access final-check but not in one of these phases
      if (checklistType === "reno_final" && phase && phase !== "final-check" && phase !== "furnishing" && phase !== "cleaning") {
        router.replace(`/reno/construction-manager/property/${property.id}`);
      }
    }
  }, [property, supabaseProperty, isLoading, checklistType, getPropertyRenoPhase, router]);

  // Use Supabase checklist hook (for production)
  // Usar hooks separados para initial y final para mantener estados independientes
  // SOLO el hook activo está habilitado para evitar ejecuciones innecesarias y bucles infinitos
  const initialChecklist = useSupabaseInitialChecklist({
    propertyId: propertyId || "",
    enabled: checklistType === "reno_initial", // Solo habilitar si es el tipo activo
  });
  
  const finalChecklist = useSupabaseFinalChecklist({
    propertyId: propertyId || "",
    enabled: checklistType === "reno_final", // Solo habilitar si es el tipo activo
  });
  
  // Seleccionar el hook apropiado según el tipo de checklist
  const { checklist, updateSection, isLoading: checklistLoading, finalizeChecklist, saveCurrentSection } = 
    checklistType === "reno_final" ? finalChecklist : initialChecklist;

  // Use Supabase inspection hook to get completeInspection function
  const inspectionType = checklistType === "reno_final" ? "final" : "initial";
  const { inspection, completeInspection, refetch: refetchInspection } = useSupabaseInspection(
    propertyId,
    inspectionType
  );

  // Check if checklist is completed (read-only mode)
  // IMPORTANTE: Verificar que la inspección corresponde al tipo correcto antes de verificar si está completada
  // Esto evita que el final check aparezca como completado cuando en realidad el initial check es el completado
  // ADICIONALMENTE: Verificar que el checklist realmente esté completo según la validación
  const isChecklistCompleted = useMemo(() => {
    if (!inspection) {
      return false;
    }
    
    // Verificar que el tipo de inspección coincide con el esperado
    const inspectionTypeMatches = (inspection as any).inspection_type === inspectionType;
    
    // Si el tipo no coincide, no considerar completado (permite edición)
    if (!inspectionTypeMatches) {
      console.log('[ChecklistPage] ⚠️ Inspection type mismatch - allowing editing:', {
        expectedType: inspectionType,
        actualType: (inspection as any).inspection_type,
        inspectionId: inspection.id,
        inspectionStatus: inspection.inspection_status,
      });
      return false;
    }
    
    // Verificar que está marcado como completado en la BD
    const isMarkedAsCompleted = inspection.inspection_status === 'completed' || inspection.completed_at !== null;
    
    if (!isMarkedAsCompleted) {
      return false;
    }
    
    // CRÍTICO: Aunque esté marcado como completado en la BD, verificar que realmente esté completo
    // Si no pasa la validación, permitir edición (no considerar completado)
    const isActuallyComplete = areAllActivitiesReported(checklist);
    
    if (!isActuallyComplete) {
      console.log('[ChecklistPage] ⚠️ Checklist marked as completed in DB but validation fails - allowing editing:', {
        inspectionId: inspection.id,
        inspectionStatus: inspection.inspection_status,
        isActuallyComplete,
      });
      return false; // Permitir edición si no está realmente completo
    }
    
    // Solo considerar completado si el tipo coincide, está marcado como completado Y realmente está completo
    return true;
  }, [inspection, inspectionType, checklist]);

  // Get dynamic categories for reno-in-progress phase
  const { categories: dynamicCategories } = useDynamicCategories(propertyId);

  // State for completion dialog
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string>("");
  
  // State for validation errors - track which section has errors
  const [sectionWithError, setSectionWithError] = useState<string | null>(null);

  // Check if all activities are reported
  const canComplete = useMemo(() => {
    return areAllActivitiesReported(checklist);
  }, [checklist]);

  // Get property data (habitaciones, banos) from Supabase property
  const propertyData = useMemo(() => {
    if (!supabaseProperty) return {};
    return {
      habitaciones: supabaseProperty.bedrooms || 0,
      banos: supabaseProperty.bathrooms || 0,
    };
  }, [supabaseProperty]);

  // Calculate phase and counts before any conditional returns
  const phase = property ? (getPropertyRenoPhase(property) || "initial-check") : null;
  const isFinalCheck = phase === "final-check" || phase === "furnishing" || phase === "cleaning";
  const habitacionesCount = checklist?.sections?.["habitaciones"]?.dynamicCount ?? propertyData?.habitaciones ?? 0;
  const banosCount = checklist?.sections?.["banos"]?.dynamicCount ?? propertyData?.banos ?? 0;
  
  // Initialize activeSection - start with first checklist section
  // For final-check phases (final-check, furnishing, cleaning), skip "entorno-zonas-comunes" and start with "estado-general"
  const [activeSection, setActiveSection] = useState<string>("checklist-entorno-zonas-comunes");
  
  // Update activeSection when phase is determined (for final-check phases, skip entorno-zonas-comunes)
  useEffect(() => {
    if (isFinalCheck && activeSection === "checklist-entorno-zonas-comunes") {
      // For final-check phases, always start with estado-general
      setActiveSection("checklist-estado-general");
    }
  }, [isFinalCheck, activeSection]);
  
  // Calculate overall progress
  // For reno-in-progress phase, use average of dynamic categories
  // For other phases, use checklist progress
  // For final-check, exclude "entorno-zonas-comunes" from calculation
  const overallProgress = useMemo(() => {
    if (phase === "reno-in-progress" && dynamicCategories.length > 0) {
      // Calculate average of all dynamic categories
      const total = dynamicCategories.reduce((sum, cat) => sum + (cat.percentage || 0), 0);
      return Math.round(total / dynamicCategories.length);
    }
    // For final-check, exclude "entorno-zonas-comunes" from calculation
    const excludeSurroundings = phase === "final-check";
    return calculateOverallChecklistProgress(checklist || null, excludeSurroundings);
  }, [phase, dynamicCategories, checklist]);
  
  const sectionProgress = getAllChecklistSectionsProgress(checklist || null);

  // Combine loading states - also check if checklist is null when we have a property
  const isFullyLoading = isLoading || checklistLoading || (property && !checklist);

  // Update checklist section (disabled if completed)
  const updateChecklistSection = useCallback(
    (sectionId: string, updates: any) => {
      if (isChecklistCompleted) {
        toast.info("Este checklist está completado y es solo lectura");
        return;
      }
      updateSection(sectionId, updates);
      setHasUnsavedChanges(true);
    },
    [updateSection, isChecklistCompleted]
  );

  // Handle section click - Guardar antes de cambiar de sección
  const handleSectionClick = useCallback(async (sectionId: string) => {
    // Guardar cambios antes de cambiar de sección
    if (hasUnsavedChanges) {
      try {
        await saveCurrentSection();
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error("Error al guardar antes de cambiar de sección:", error);
        toast.error("Error al guardar cambios. Los cambios no se guardaron.");
      }
    }
    
    setActiveSection(sectionId);
    // Cerrar sidebar móvil al cambiar de sección
    setIsMobileSidebarOpen(false);
    
    // Scroll to section if it exists - usar requestAnimationFrame para asegurar que el DOM se haya actualizado
    // Hacer scroll tanto en mobile como desktop
    requestAnimationFrame(() => {
      // Usar un pequeño delay adicional para asegurar que React haya renderizado
      setTimeout(() => {
        const sectionRef = sectionRefs.current[sectionId];
        if (sectionRef) {
          // Buscar el contenedor scrollable principal (el div con overflow-y-auto)
          const scrollContainer = sectionRef.closest('.overflow-y-auto') as HTMLElement;
          
          if (scrollContainer) {
            // Calcular la posición relativa dentro del contenedor scrollable
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = sectionRef.getBoundingClientRect();
            
            // Calcular la posición de scroll necesaria
            // Restar el padding-top (pt-32 = 128px) y agregar un pequeño offset
            const scrollOffset = 128 + 20; // pt-32 + 20px de espacio adicional
            const scrollPosition = scrollContainer.scrollTop + elementRect.top - containerRect.top - scrollOffset;
            
            // Hacer scroll dentro del contenedor
            scrollContainer.scrollTo({
              top: Math.max(0, scrollPosition), // Asegurar que no sea negativo
              behavior: "smooth"
            });
          } else {
            // Fallback: usar scrollIntoView si no encontramos el contenedor
            sectionRef.scrollIntoView({ 
              behavior: "smooth", 
              block: "start",
              inline: "nearest"
            });
          }
        }
      }, 150); // 150ms de delay para asegurar que React haya renderizado completamente
    });
  }, [hasUnsavedChanges, saveCurrentSection]);

  // Handle continue - Guarda los cambios y luego cambia de sección
  const handleContinue = useCallback(async (nextSectionId: string) => {
    if (!checklist) return;
    try {
      // Guardar cambios antes de continuar
      await saveCurrentSection();
      setHasUnsavedChanges(false);
      
      // Cambiar a la siguiente sección
      handleSectionClick(nextSectionId);
      
      // Mostrar toast de confirmación
      toast.success(t.messages.saveSuccess || "Cambios guardados");
    } catch (error) {
      console.error("Error al guardar antes de continuar:", error);
      toast.error("Error al guardar cambios. Intenta nuevamente.");
    }
  }, [checklist, saveCurrentSection, handleSectionClick, t]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!checklist) return;
    try {
      // IMPORTANTE: Convertir "checklist-estado-general" -> "estado-general"
      // y pasar el sectionId directamente a saveCurrentSection
      const sectionIdWithoutPrefix = activeSection.replace(/^checklist-/, '');
      
      // Verificar que la sección existe
      if (!checklist.sections[sectionIdWithoutPrefix]) {
        console.warn('[RenoChecklistPage] ⚠️ No se encontró la sección:', sectionIdWithoutPrefix);
        toast.error("Error: No se encontró la sección a guardar");
        return;
      }
      
      // Pasar sectionId directamente a saveCurrentSection para forzar guardar esta sección
      await saveCurrentSection(sectionIdWithoutPrefix);
      setHasUnsavedChanges(false);
      toast.success(t.messages.saveSuccess);
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Error al guardar cambios");
    }
  }, [checklist, t, saveCurrentSection, activeSection]);

  // Handle complete inspection
  const handleCompleteInspection = useCallback(async () => {
    if (!inspection || !property) {
      toast.error("No se puede completar la inspección.");
      return;
    }

    // Guardar sección actual antes de validar
    await saveCurrentSection();

    // Validar checklist antes de continuar
    const incompleteSection = getFirstIncompleteSection(checklist);
    if (incompleteSection) {
      // Limpiar error anterior
      setSectionWithError(null);
      
      // Marcar la sección con error
      setSectionWithError(incompleteSection.sectionRefId);
      
      // Cambiar a la sección con error
      setActiveSection(incompleteSection.sectionRefId);
      
      // Scroll a la sección con error
      requestAnimationFrame(() => {
        setTimeout(() => {
          const sectionRef = sectionRefs.current[incompleteSection.sectionRefId];
          if (sectionRef) {
            const scrollContainer = sectionRef.closest('.overflow-y-auto') as HTMLElement;
            if (scrollContainer) {
              const containerRect = scrollContainer.getBoundingClientRect();
              const elementRect = sectionRef.getBoundingClientRect();
              const scrollOffset = 128 + 20;
              const scrollPosition = scrollContainer.scrollTop + elementRect.top - containerRect.top - scrollOffset;
              scrollContainer.scrollTo({
                top: Math.max(0, scrollPosition),
                behavior: "smooth"
              });
            } else {
              sectionRef.scrollIntoView({ 
                behavior: "smooth", 
                block: "start",
                inline: "nearest"
              });
            }
          }
        }, 200);
      });
      
      // Mostrar toast con el error
      toast.error(incompleteSection.message, {
        description: "Por favor completa todos los campos requeridos antes de finalizar el checklist.",
        duration: 5000,
      });
      
      return;
    }

    // Si todo está completo, continuar con el proceso normal
    setIsCompleting(true);
    try {
      // Guardar sección actual antes de completar
      await saveCurrentSection();
      
      // 1. Primero marcar la inspección como completada
      const inspectionSuccess = await completeInspection();
      if (!inspectionSuccess) {
        toast.error("Error al completar la inspección");
        return;
      }

      // 2. Esperar un momento para que la base de datos se actualice
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Refetch inspection para obtener el estado actualizado
      await refetchInspection();

      // 4. Luego finalizar el checklist (genera HTML y actualiza Airtable)
      const finalizeSuccess = await finalizeChecklist({
        estimatedVisitDate: property.estimatedVisitDate,
        autoVisitDate: new Date().toISOString().split('T')[0],
        nextRenoSteps: supabaseProperty?.next_reno_steps || undefined,
      });

      if (finalizeSuccess) {
        // Generate public URL
        const type = checklistType === "reno_final" ? "final" : "initial";
        const url = `${window.location.origin}/checklist-public/${propertyId}/${type}`;
        setPublicUrl(url);
        setShowCompleteDialog(true);
        toast.success("Checklist completado exitosamente");
        setHasUnsavedChanges(false);
        
        // Refrescar la propiedad y las propiedades del contexto para actualizar la fase
        await refetchProperty();
        await refetchProperties();
        
        // Refrescar los datos del servidor
        router.refresh();
        
        // Redirigir automáticamente después de un breve delay para que se vea el cambio
        setTimeout(() => {
          // Si venimos del kanban o kanban-projects, volver allí
          if (sourcePage === 'kanban') {
            router.push(`/reno/construction-manager/kanban${viewMode === 'list' ? '?viewMode=list' : ''}`);
          } else if (sourcePage === 'kanban-projects') {
            router.push(`/reno/construction-manager/kanban-projects${viewMode === 'list' ? '?viewMode=list' : ''}`);
          } else {
            // Si no, volver a la página de detalle de propiedad
            router.push(`/reno/construction-manager/property/${propertyId}`);
          }
        }, 2000);
      } else {
        toast.error("Error al finalizar checklist en Airtable");
      }
    } catch (error) {
      console.error("Error completing inspection:", error);
      toast.error("Error al completar la inspección");
    } finally {
      setIsCompleting(false);
      // Limpiar error al finalizar (exitoso o no)
      setSectionWithError(null);
    }
  }, [inspection, checklist, saveCurrentSection, completeInspection, refetchInspection, finalizeChecklist, property, propertyId, checklistType, supabaseProperty, refetchProperty, refetchProperties, router, sourcePage]);

  // Format address (main line)
  const formatAddress = () => {
    if (!property) return "";
    return property.fullAddress || "";
  };

  // Format address details (second line)
  const formatAddressDetails = () => {
    if (!property) return "";
    const parts = [
      property.bloque && `Ptl. ${property.bloque}`,
      property.escalera && `Es. ${property.escalera}`,
      property.planta && property.planta,
      property.puerta && property.puerta,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "";
  };

  // Memoizar entornoSection para evitar re-renders innecesarios
  // Usar el checklist completo como dependencia para estabilidad
  // También incluir un hash de las fotos para detectar cambios en las imágenes
  const entornoSection = useMemo(() => {
    if (!checklist) return null;
    const section = checklist.sections["entorno-zonas-comunes"];
    // Logs solo en desarrollo para mejor rendimiento
    if (process.env.NODE_ENV === 'development') {
      console.log('[RenoChecklistPage] 🔍 entornoSection useMemo:', {
        hasChecklist: !!checklist,
        hasSection: !!section,
        sectionUploadZonesCount: section?.uploadZones?.length || 0,
      });
    }
    if (section) {
      return section;
    }
    // Solo crear objeto por defecto si no existe la sección
    return {
      id: "entorno-zonas-comunes",
      uploadZones: [
        { id: "portal", photos: [], videos: [] },
        { id: "fachada", photos: [], videos: [] },
        { id: "entorno", photos: [], videos: [] },
      ],
      questions: [
        { id: "acceso-principal" },
        { id: "acabados" },
        { id: "comunicaciones" },
        { id: "electricidad" },
        { id: "carpinteria" },
      ],
    };
  }, [
    checklist,
    // Incluir un hash de las fotos para detectar cambios cuando se cargan desde Supabase
    checklist?.sections["entorno-zonas-comunes"]?.uploadZones?.map(z => 
      `${z.id}-${z.photos.length}-${z.photos.map(p => p.id || p.data?.substring(0, 50)).join(',')}`
    ).join('|') || ''
  ]);

  // Memoizar callback de update para evitar re-renders
  const handleEntornoUpdate = useCallback((updates: any) => {
    // Logs solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('[RenoChecklistPage] 📝 onUpdate called for entorno-zonas-comunes:', {
        updatesKeys: Object.keys(updates),
        uploadZonesLength: updates.uploadZones?.length || 0,
      });
    }
    updateChecklistSection("entorno-zonas-comunes", updates);
    // Limpiar error cuando se actualiza la sección
    if (sectionWithError === "checklist-entorno-zonas-comunes") {
      setSectionWithError(null);
    }
  }, [updateChecklistSection, sectionWithError]);

  // Render active section
  const renderActiveSection = () => {
    // Esta función solo se llama cuando isFullyLoading es false,
    // pero por seguridad verificamos nuevamente
    if (!property || !checklist) {
      console.log('[ChecklistPage] ⚠️ Cannot render section:', {
        hasProperty: !!property,
        hasChecklist: !!checklist,
        activeSection,
        isLoading,
        checklistLoading,
      });
      return (
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <p className="text-muted-foreground">
            {!property ? 'Cargando propiedad...' : !checklist ? 'Cargando checklist...' : 'Cargando...'}
          </p>
        </div>
      );
    }

    const phase = getPropertyRenoPhase(property) || "initial-check";
    const isFinalCheck = phase === "final-check" || phase === "furnishing" || phase === "cleaning";

    switch (activeSection) {
      case "checklist-entorno-zonas-comunes":
        if (!entornoSection) {
          return (
            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <p className="text-muted-foreground">Cargando sección...</p>
            </div>
          );
        }
        console.log('[RenoChecklistPage] 🖼️ Rendering EntornoZonasComunesSection:', {
          sectionId: "entorno-zonas-comunes",
          uploadZones: entornoSection.uploadZones?.map(z => ({ id: z.id, photosCount: z.photos.length, videosCount: z.videos.length })),
          hasChecklist: !!checklist,
          checklistSections: Object.keys(checklist?.sections || {})
        });
        return (
          <Suspense fallback={<SectionLoader />}>
            <EntornoZonasComunesSection
              section={entornoSection}
              onUpdate={handleEntornoUpdate}
              ref={(el) => {
                if (el) sectionRefs.current["checklist-entorno-zonas-comunes"] = el;
              }}
              onContinue={() => handleContinue("checklist-estado-general")}
              hasError={sectionWithError === "checklist-entorno-zonas-comunes"}
            />
          </Suspense>
        );
      case "checklist-estado-general":
        return (
          <Suspense fallback={<SectionLoader />}>
            <EstadoGeneralSection
            section={checklist.sections["estado-general"] || {
              id: "estado-general",
              uploadZones: [
                { id: "perspectiva-general", photos: [], videos: [] },
              ],
              questions: [
                { id: "acabados" },
                { id: "electricidad" },
              ],
              climatizationItems: [
                { id: "radiadores", cantidad: 0 },
                { id: "split-ac", cantidad: 0 },
                { id: "calentador-agua", cantidad: 0 },
                { id: "calefaccion-conductos", cantidad: 0 },
              ],
            }}
            onUpdate={(updates) => {
              updateChecklistSection("estado-general", updates);
              // Limpiar error cuando se actualiza la sección
              if (sectionWithError === "checklist-estado-general") {
                setSectionWithError(null);
              }
            }}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-estado-general"] = el;
            }}
            onContinue={() => handleContinue("checklist-entrada-pasillos")}
            hasError={sectionWithError === "checklist-estado-general"}
          />
          </Suspense>
        );
      case "checklist-entrada-pasillos":
        return (
          <Suspense fallback={<SectionLoader />}>
            <EntradaPasillosSection
            section={checklist.sections["entrada-pasillos"] || {
              id: "entrada-pasillos",
              uploadZones: [
                { id: "cuadro-general-electrico", photos: [], videos: [] },
                { id: "entrada-vivienda-pasillos", photos: [], videos: [] },
              ],
              questions: [
                { id: "acabados" },
                { id: "electricidad" },
              ],
              carpentryItems: [
                { id: "ventanas", cantidad: 0 },
                { id: "persianas", cantidad: 0 },
                { id: "armarios", cantidad: 0 },
              ],
              climatizationItems: [
                { id: "radiadores", cantidad: 0 },
                { id: "split-ac", cantidad: 0 },
              ],
              mobiliario: {
                existeMobiliario: false,
              },
            }}
            onUpdate={(updates) => {
              updateChecklistSection("entrada-pasillos", updates);
              // Limpiar error cuando se actualiza la sección
              if (sectionWithError === "checklist-entrada-pasillos") {
                setSectionWithError(null);
              }
            }}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-entrada-pasillos"] = el;
            }}
            onContinue={() => handleContinue("checklist-habitaciones")}
            hasError={sectionWithError === "checklist-entrada-pasillos"}
          />
          </Suspense>
        );
      case "checklist-habitaciones":
        const habitacionesSectionRaw = checklist.sections["habitaciones"] || {
          id: "habitaciones",
          dynamicItems: [],
          dynamicCount: propertyData?.habitaciones || 0,
        };
        const habitacionesSection = habitacionesSectionRaw.dynamicItems
          ? {
            ...habitacionesSectionRaw,
            dynamicItems: JSON.parse(JSON.stringify(habitacionesSectionRaw.dynamicItems)),
          }
          : {
            ...habitacionesSectionRaw,
            dynamicItems: [],
          };

        return (
          <Suspense fallback={<SectionLoader />}>
            <HabitacionesSection
            section={habitacionesSection}
            onUpdate={(updates) => {
              updateChecklistSection("habitaciones", updates);
              // Limpiar error cuando se actualiza la sección
              if (sectionWithError === "checklist-habitaciones") {
                setSectionWithError(null);
              }
            }}
            onPropertyUpdate={async (updates: { habitaciones: number }) => {
              // Update property in Supabase
              const supabase = createClient();
              const { error } = await supabase
                .from('properties')
                .update({ bedrooms: updates.habitaciones })
                .eq('id', propertyId);
              
              if (error) {
                console.error('Error updating habitaciones:', {
                  error,
                  message: error.message,
                  details: error.details,
                  hint: error.hint,
                  code: error.code,
                  habitaciones: updates.habitaciones,
                  propertyId,
                });
                toast.error(`Error al actualizar número de habitaciones: ${error.message || 'Error desconocido'}`);
              } else {
                console.log('✅ Updated habitaciones (bedrooms) in Supabase:', updates.habitaciones);
                // Reload property to get updated data
                await refetchProperty();
              }
            }}
            onNavigateToHabitacion={(index) => {
              handleSectionClick(`checklist-habitaciones-${index + 1}`);
            }}
            onContinue={() => handleContinue("checklist-salon")}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-habitaciones"] = el;
            }}
            hasError={sectionWithError === "checklist-habitaciones"}
          />
          </Suspense>
        );
      case "checklist-salon":
        return (
          <Suspense fallback={<SectionLoader />}>
            <SalonSection
            section={checklist.sections["salon"] || {
              id: "salon",
              uploadZones: [{ id: "fotos-video-salon", photos: [], videos: [] }],
              questions: [
                { id: "acabados" },
                { id: "electricidad" },
                { id: "puerta-entrada" },
              ],
              carpentryItems: CARPENTRY_ITEMS_SALON.map(item => ({ id: item.id, cantidad: 0 })),
              climatizationItems: CLIMATIZATION_ITEMS_SALON.map(item => ({ id: item.id, cantidad: 0 })),
              mobiliario: { existeMobiliario: false },
            }}
            onUpdate={(updates) => {
              updateChecklistSection("salon", updates);
              // Limpiar error cuando se actualiza la sección
              if (sectionWithError === "checklist-salon") {
                setSectionWithError(null);
              }
            }}
            onContinue={() => handleContinue("checklist-banos")}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-salon"] = el;
            }}
            hasError={sectionWithError === "checklist-salon"}
          />
          </Suspense>
        );
      case "checklist-banos":
        const banosSectionRaw = checklist.sections["banos"] || {
          id: "banos",
          dynamicItems: [],
          dynamicCount: propertyData?.banos || 0,
        };
        const banosSection = banosSectionRaw.dynamicItems
          ? {
            ...banosSectionRaw,
            dynamicItems: JSON.parse(JSON.stringify(banosSectionRaw.dynamicItems)),
          }
          : {
            ...banosSectionRaw,
            dynamicItems: [],
          };

        return (
          <Suspense fallback={<SectionLoader />}>
            <BanosSection
            section={banosSection}
            onUpdate={(updates) => {
              updateChecklistSection("banos", updates);
              // Limpiar error cuando se actualiza la sección
              if (sectionWithError === "checklist-banos") {
                setSectionWithError(null);
              }
            }}
            onPropertyUpdate={async (updates: { banos: number }) => {
              // Update property in Supabase
              const supabase = createClient();
              const { error } = await supabase
                .from('properties')
                .update({ bathrooms: updates.banos })
                .eq('id', propertyId);
              
              if (error) {
                console.error('Error updating banos:', error);
                toast.error('Error al actualizar número de baños');
              } else {
                console.log('✅ Updated banos in Supabase:', updates.banos);
                // Reload property to get updated data
                await refetchProperty();
              }
            }}
            onNavigateToBano={(index) => {
              handleSectionClick(`checklist-banos-${index + 1}`);
            }}
            onContinue={() => handleContinue("checklist-cocina")}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-banos"] = el;
            }}
            hasError={sectionWithError === "checklist-banos"}
          />
          </Suspense>
        );
      case "checklist-cocina":
        return (
          <Suspense fallback={<SectionLoader />}>
            <CocinaSection
            section={checklist.sections["cocina"] || {
              id: "cocina",
              uploadZones: [{ id: "fotos-video-cocina", photos: [], videos: [] }],
              questions: [
                { id: "acabados" },
                { id: "mobiliario-fijo" },
                { id: "agua-drenaje" },
              ],
              carpentryItems: [
                { id: "ventanas", cantidad: 0 },
                { id: "persianas", cantidad: 0 },
                { id: "puerta-entrada", cantidad: 0 },
              ],
              storageItems: [
                { id: "armarios-despensa", cantidad: 0 },
                { id: "cuarto-lavado", cantidad: 0 },
              ],
              appliancesItems: [
                { id: "placa-gas", cantidad: 0 },
                { id: "placa-vitro-induccion", cantidad: 0 },
                { id: "campana-extractora", cantidad: 0 },
                { id: "horno", cantidad: 0 },
                { id: "nevera", cantidad: 0 },
                { id: "lavadora", cantidad: 0 },
                { id: "lavavajillas", cantidad: 0 },
                { id: "microondas", cantidad: 0 },
              ],
            }}
            onUpdate={(updates) => {
              updateChecklistSection("cocina", updates);
              // Limpiar error cuando se actualiza la sección
              if (sectionWithError === "checklist-cocina") {
                setSectionWithError(null);
              }
            }}
            onContinue={() => handleContinue("checklist-exteriores")}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-cocina"] = el;
            }}
            hasError={sectionWithError === "checklist-cocina"}
          />
          </Suspense>
        );
      case "checklist-exteriores":
        return (
          <Suspense fallback={<SectionLoader />}>
            <ExterioresSection
            section={checklist.sections["exteriores"] || {
              id: "exteriores",
              uploadZones: [{ id: "fotos-video-exterior", photos: [], videos: [] }],
              questions: [
                { id: "acabados-exteriores" },
              ],
              securityItems: [
                { id: "barandillas", cantidad: 0 },
                { id: "rejas", cantidad: 0 },
              ],
              systemsItems: [
                { id: "tendedero-exterior", cantidad: 0 },
                { id: "toldos", cantidad: 0 },
              ],
            }}
            onUpdate={(updates) => {
              updateChecklistSection("exteriores", updates);
              // Limpiar error cuando se actualiza la sección
              if (sectionWithError === "checklist-exteriores") {
                setSectionWithError(null);
              }
            }}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-exteriores"] = el;
            }}
            hasError={sectionWithError === "checklist-exteriores"}
            onContinue={async () => {
              try {
                await saveCurrentSection();
                setHasUnsavedChanges(false);
                toast.success(t.messages.saveSuccess || "Cambios guardados");
                router.push("/reno/construction-manager/kanban");
              } catch (error) {
                console.error("Error al guardar antes de continuar:", error);
                toast.error("Error al guardar cambios. Intenta nuevamente.");
              }
            }}
          />
          </Suspense>
        );
      default:
        // Handle individual habitaciones/banos routes
        if (activeSection.startsWith("checklist-habitaciones-")) {
          const match = activeSection.match(/checklist-habitaciones-(\d+)/);
          if (match) {
            const index = parseInt(match[1]) - 1;
            const habitacionesSectionRaw = checklist.sections["habitaciones"] || {
              id: "habitaciones",
              dynamicItems: [],
              dynamicCount: propertyData?.habitaciones || 0,
            };
            const habitacionesSection = habitacionesSectionRaw.dynamicItems
              ? {
                ...habitacionesSectionRaw,
                dynamicItems: JSON.parse(JSON.stringify(habitacionesSectionRaw.dynamicItems)),
              }
              : {
                ...habitacionesSectionRaw,
                dynamicItems: [],
              };

            return (
              <Suspense fallback={<SectionLoader />}>
                <HabitacionesSection
                  section={habitacionesSection}
                  habitacionIndex={index}
                onUpdate={(updates) => {
                  updateChecklistSection("habitaciones", updates);
                }}
                onPropertyUpdate={async () => {
                  // Reload property to get updated data from Supabase
                  await refetchProperty();
                }}
                onNavigateToHabitacion={(newIndex) => {
                  handleSectionClick(`checklist-habitaciones-${newIndex + 1}`);
                }}
                onContinue={async () => {
                  try {
                    await saveCurrentSection();
                    setHasUnsavedChanges(false);
                    toast.success(t.messages.saveSuccess || "Cambios guardados");
                    if (index + 1 < (habitacionesSection.dynamicCount || 0)) {
                      handleSectionClick(`checklist-habitaciones-${index + 2}`);
                    } else {
                      handleSectionClick("checklist-salon");
                    }
                  } catch (error) {
                    console.error("Error al guardar antes de continuar:", error);
                    toast.error("Error al guardar cambios. Intenta nuevamente.");
                  }
                }}
                ref={(el) => {
                  if (el) sectionRefs.current[activeSection] = el;
                }}
              />
              </Suspense>
            );
          }
        } else if (activeSection.startsWith("checklist-banos-")) {
          const match = activeSection.match(/checklist-banos-(\d+)/);
          if (match) {
            const index = parseInt(match[1]) - 1;
            const banosSectionRaw = checklist.sections["banos"] || {
              id: "banos",
              dynamicItems: [],
              dynamicCount: propertyData?.banos || 0,
            };
            const banosSection = banosSectionRaw.dynamicItems
              ? {
                ...banosSectionRaw,
                dynamicItems: JSON.parse(JSON.stringify(banosSectionRaw.dynamicItems)),
              }
              : {
                ...banosSectionRaw,
                dynamicItems: [],
              };

            return (
              <Suspense fallback={<SectionLoader />}>
                <BanosSection
                  section={banosSection}
                  banoIndex={index}
                onUpdate={(updates) => {
                  updateChecklistSection("banos", updates);
                }}
                onPropertyUpdate={async () => {
                  // Reload property to get updated data from Supabase
                  await refetchProperty();
                }}
                onNavigateToBano={(newIndex) => {
                  handleSectionClick(`checklist-banos-${newIndex + 1}`);
                }}
                onContinue={async () => {
                  try {
                    await saveCurrentSection();
                    setHasUnsavedChanges(false);
                    toast.success(t.messages.saveSuccess || "Cambios guardados");
                    if (index + 1 < (banosSection.dynamicCount || 0)) {
                      handleSectionClick(`checklist-banos-${index + 2}`);
                    } else {
                      handleSectionClick("checklist-cocina");
                    }
                  } catch (error) {
                    console.error("Error al guardar antes de continuar:", error);
                    toast.error("Error al guardar cambios. Intenta nuevamente.");
                  }
                }}
                ref={(el) => {
                  if (el) sectionRefs.current[activeSection] = el;
                }}
              />
              </Suspense>
            );
          }
        }
        return null;
    }
  };

  if (isFullyLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 items-center justify-center">
          <VistralLogoLoader />
        </div>
      </div>
    );
  }

  if (!property && !isLoading && !checklistLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-lg font-semibold text-foreground mb-2">
            Propiedad no encontrada
          </p>
          {propertyError && (
            <p className="text-sm text-muted-foreground mb-4">
              Error: {propertyError}
            </p>
          )}
          {propertyId && (
            <p className="text-sm text-muted-foreground mb-4">
              ID buscado: {propertyId}
            </p>
          )}
          <button 
            onClick={() => router.push("/reno/construction-manager/kanban")} 
            className="px-4 py-2 rounded-md border border-input bg-background hover:bg-accent"
          >
            Volver al kanban
          </button>
        </div>
      </div>
    );
  }

  // TypeScript guard: ensure property is not null before rendering
  if (!property) {
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-1 items-center justify-center">
          <VistralLogoLoader />
        </div>
      </div>
    );
  }

  // Get section title and subtitle for HeaderL3
  const getSectionInfo = () => {
    switch (activeSection) {
      case "checklist-entorno-zonas-comunes":
        return {
          title: t.checklist.sections.entornoZonasComunes.title,
          subtitle: t.checklist.sections.entornoZonasComunes.description || "",
        };
      case "checklist-estado-general":
        return {
          title: t.checklist.sections.estadoGeneral.title,
          subtitle: t.checklist.sections.estadoGeneral.description || "",
        };
      case "checklist-entrada-pasillos":
        return {
          title: t.checklist.sections.entradaPasillos.title,
          subtitle: t.checklist.sections.entradaPasillos.description || "",
        };
      case "checklist-habitaciones":
        return {
          title: t.checklist.sections.habitaciones.title,
          subtitle: t.checklist.sections.habitaciones.description || "",
        };
      case "checklist-salon":
        return {
          title: t.checklist.sections.salon.title,
          subtitle: t.checklist.sections.salon.description || "",
        };
      case "checklist-banos":
        return {
          title: t.checklist.sections.banos.title,
          subtitle: t.checklist.sections.banos.description || "",
        };
      case "checklist-cocina":
        return {
          title: t.checklist.sections.cocina.title,
          subtitle: t.checklist.sections.cocina.description || "",
        };
      case "checklist-exteriores":
        return {
          title: t.checklist.sections.exteriores.title,
          subtitle: t.checklist.sections.exteriores.description || "",
        };
      default:
        // Handle dynamic sections (habitaciones-X, banos-X)
        if (activeSection.startsWith("checklist-habitaciones-")) {
          const match = activeSection.match(/checklist-habitaciones-(\d+)/);
          const num = match ? match[1] : "1";
          return {
            title: `${t.checklist.sections.habitaciones.bedroom} ${num}`,
            subtitle: "",
          };
        }
        if (activeSection.startsWith("checklist-banos-")) {
          const match = activeSection.match(/checklist-banos-(\d+)/);
          const num = match ? match[1] : "1";
          return {
            title: `${t.checklist.sections.banos.bathroom} ${num}`,
            subtitle: "",
          };
        }
        return {
          title: t.checklist.title,
          subtitle: "",
        };
    }
  };

  const sectionInfo = getSectionInfo();
  // Determinar el título del formulario basado en la fase, pero permitir todas las fases
  const getFormTitle = () => {
    const currentPhase = getPropertyRenoPhase(property);
    if (currentPhase === "final-check" || currentPhase === "furnishing" || currentPhase === "cleaning") return t.kanban.finalCheck;
    if (currentPhase === "initial-check") return t.kanban.initialCheck;
    return t.checklist.title; // Fallback para otras fases
  };
  const formTitle = property ? getFormTitle() : t.checklist.title;

  // Use same layout for both initial-check and final-check
  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Navbar L3: Header único sobrepuesto sobre todo (sidebar y contenido) */}
      <NavbarL3
        onBack={() => {
          console.log("🔙 Back button clicked - Source:", sourcePage, "ViewMode:", viewMode);
          // Si viene del kanban o kanban-projects, redirigir con el viewMode correspondiente
          if (sourcePage === 'kanban') {
            const kanbanUrl = viewMode === 'list' 
              ? '/reno/construction-manager/kanban?viewMode=list'
              : '/reno/construction-manager/kanban';
            console.log("🔙 Redirecting to kanban:", kanbanUrl);
            router.push(kanbanUrl);
          } else if (sourcePage === 'kanban-projects') {
            const url = viewMode === 'list'
              ? '/reno/construction-manager/kanban-projects?viewMode=list'
              : '/reno/construction-manager/kanban-projects';
            router.push(url);
          } else {
            // Si no viene del kanban, volver a la página de detalle de propiedad
            console.log("🔙 Redirecting to property detail:", `/reno/construction-manager/property/${property?.id}`);
            router.push(`/reno/construction-manager/property/${property?.id}`);
          }
        }}
        backLabel="Atrás"
        formTitle={formTitle}
        statusText={hasUnsavedChanges ? undefined : "Cambios guardados"}
        onMenuClick={() => setIsMobileSidebarOpen(true)}
        actions={
          isChecklistCompleted
            ? [] // No actions when completed (read-only)
            : [
                {
                  label: t.property.save,
                  onClick: handleSave,
                  variant: "outline",
                  disabled: !hasUnsavedChanges,
                },
                {
                  label: t.checklist.submitChecklist,
                  onClick: async () => {
                    if (!property || isCompleting) return;
                    
                    // Establecer estado de carga inmediatamente
                    setIsCompleting(true);
                    
                    try {
                      // Guardar sección actual antes de validar
                      await saveCurrentSection();

                      // Validar checklist antes de continuar
                      const incompleteSection = getFirstIncompleteSection(checklist);
                      if (incompleteSection) {
                        // Limpiar error anterior
                        setSectionWithError(null);
                        
                        // Marcar la sección con error
                        setSectionWithError(incompleteSection.sectionRefId);
                        
                        // Cambiar a la sección con error
                        setActiveSection(incompleteSection.sectionRefId);
                        
                        // Scroll a la sección con error
                        requestAnimationFrame(() => {
                          setTimeout(() => {
                            const sectionRef = sectionRefs.current[incompleteSection.sectionRefId];
                            if (sectionRef) {
                              const scrollContainer = sectionRef.closest('.overflow-y-auto') as HTMLElement;
                              if (scrollContainer) {
                                const containerRect = scrollContainer.getBoundingClientRect();
                                const elementRect = sectionRef.getBoundingClientRect();
                                const scrollOffset = 128 + 20;
                                const scrollPosition = scrollContainer.scrollTop + elementRect.top - containerRect.top - scrollOffset;
                                scrollContainer.scrollTo({
                                  top: Math.max(0, scrollPosition),
                                  behavior: "smooth"
                                });
                              } else {
                                sectionRef.scrollIntoView({ 
                                  behavior: "smooth", 
                                  block: "start",
                                  inline: "nearest"
                                });
                              }
                            }
                          }, 200);
                        });
                        
                        // Mostrar toast con el error
                        toast.error(incompleteSection.message, {
                          description: "Por favor completa todos los campos requeridos antes de finalizar el checklist.",
                          duration: 5000,
                        });
                        
                        setIsCompleting(false);
                        return;
                      }
                      
                      // Si todo está completo, continuar con el proceso normal
                      const finalizeSuccess = await finalizeChecklist({
                        estimatedVisitDate: property.estimatedVisitDate,
                        autoVisitDate: new Date().toISOString().split('T')[0],
                        nextRenoSteps: supabaseProperty?.next_reno_steps || undefined,
                      });
                      
                      if (finalizeSuccess) {
                        // Refrescar la propiedad y las propiedades del contexto para actualizar la fase
                        await refetchProperty();
                        await refetchProperties();
                        
                        // Refrescar los datos del servidor
                        router.refresh();
                        
                        // Limpiar error al finalizar exitosamente
                        setSectionWithError(null);
                        
                        // Redirigir automáticamente después de un breve delay
                        setTimeout(() => {
                          if (sourcePage === 'kanban') {
                            router.push(`/reno/construction-manager/kanban${viewMode === 'list' ? '?viewMode=list' : ''}`);
                          } else if (sourcePage === 'kanban-projects') {
                            router.push(`/reno/construction-manager/kanban-projects${viewMode === 'list' ? '?viewMode=list' : ''}`);
                          } else {
                            router.push(`/reno/construction-manager/property/${propertyId}`);
                          }
                        }, 2000);
                      } else {
                        toast.error("Error al finalizar el checklist");
                      }
                    } catch (error) {
                      console.error("Error al completar checklist:", error);
                      toast.error("Error al completar el checklist");
                    } finally {
                      setIsCompleting(false);
                    }
                  },
                  variant: "default" as const,
                  disabled: isCompleting,
                },
              ]
        }
      />

      {/* L3: Sidebar de contenido (navegación de pasos del formulario) */}
      <RenoChecklistSidebar
        address={formatAddress()}
        addressDetails={formatAddressDetails()}
        uniqueId={property?.uniqueIdFromEngagements}
        areaCluster={property?.region}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
        checklist={checklist}
        habitacionesCount={habitacionesCount}
        banosCount={banosCount}
        onCompleteInspection={handleCompleteInspection}
        canCompleteInspection={canComplete && !isCompleting}
        isCompleting={isCompleting}
        isFinalCheck={isFinalCheck}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content con padding-top para no quedar oculto bajo el header */}
        {/* El header tiene aproximadamente 80-90px de altura (py-3 + contenido), así que necesitamos más espacio */}
        <div className="flex-1 overflow-y-auto bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
          <div className="pt-32 px-4 md:px-6 pb-24 md:pb-6">
            <div className="max-w-4xl mx-auto">
              {/* Banner de solo lectura cuando está completado */}
              {isChecklistCompleted && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Este checklist está completado y es solo lectura. Puedes revisar la información pero no realizar cambios.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Título y descripción fuera del contenedor */}
              {sectionInfo.title && (
                <div className="mb-6 space-y-2">
                  <h1 className="text-2xl font-bold text-foreground leading-tight">
                    {sectionInfo.title}
                  </h1>
                  {sectionInfo.subtitle && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {sectionInfo.subtitle}
                    </p>
                  )}
                </div>
              )}
              {renderActiveSection()}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Menu - Botones removidos, ahora están en NavbarL3 */}
      <MobileSidebarMenu
        address={formatAddress()}
        overallProgress={overallProgress}
        sections={[
          { sectionId: "checklist-entorno-zonas-comunes", name: t.checklist.sections.entornoZonasComunes.title, progress: sectionProgress["entorno-zonas-comunes"] || 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-estado-general", name: t.checklist.sections.estadoGeneral.title, progress: sectionProgress["estado-general"] || 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-entrada-pasillos", name: t.checklist.sections.entradaPasillos.title, progress: sectionProgress["entrada-pasillos"] || 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-habitaciones", name: t.checklist.sections.habitaciones.title, progress: sectionProgress["habitaciones"] || 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-salon", name: t.checklist.sections.salon.title, progress: sectionProgress["salon"] || 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-banos", name: t.checklist.sections.banos.title, progress: sectionProgress["banos"] || 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-cocina", name: t.checklist.sections.cocina.title, progress: sectionProgress["cocina"] || 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-exteriores", name: t.checklist.sections.exteriores.title, progress: sectionProgress["exteriores"] || 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
        ]}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
        onSave={() => {}} // Vacío - botones ahora en NavbarL3
        onSubmit={() => {}} // Vacío - botones ahora en NavbarL3
        onDelete={() => {}}
        canSubmit={false} // Deshabilitado - botones ahora en NavbarL3
        hasUnsavedChanges={hasUnsavedChanges}
        habitacionesCount={habitacionesCount}
        banosCount={banosCount}
        isOpen={isMobileSidebarOpen}
        onOpenChange={setIsMobileSidebarOpen}
      />

      {/* Overlay de carga cuando se está completando el checklist */}
      {isCompleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg p-8 shadow-lg flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--prophero-blue-600)]" />
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                {t.checklist.submitting || "Enviando checklist..."}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Por favor espera, esto puede tardar unos momentos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Complete Inspection Dialog */}
      <CompleteInspectionDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        publicUrl={publicUrl}
      />
    </div>
  );
}

