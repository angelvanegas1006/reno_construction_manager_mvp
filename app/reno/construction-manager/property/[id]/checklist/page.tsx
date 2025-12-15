"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef, startTransition, useEffect, useCallback, useMemo, useState, use } from "react";
import { NavbarL3 } from "@/components/layout/navbar-l3";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoChecklistSidebar } from "@/components/reno/reno-checklist-sidebar";
import { RenoHomeLoader } from "@/components/reno/reno-home-loader";
import { ArrowLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileSidebarMenu } from "@/components/property/mobile-sidebar-menu";
import { CompleteInspectionDialog } from "@/components/reno/complete-inspection-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { useSupabaseChecklist } from "@/hooks/useSupabaseChecklist";
import { ChecklistType } from "@/lib/checklist-storage";
import { useSupabaseProperty } from "@/hooks/useSupabaseProperty";
import { convertSupabasePropertyToProperty, getPropertyRenoPhaseFromSupabase } from "@/lib/supabase/property-converter";
import { fetchInitialCheckFieldsFromAirtable } from "@/lib/airtable/initial-check-sync";
import { useSupabaseInspection } from "@/hooks/useSupabaseInspection";
import { areAllActivitiesReported } from "@/lib/checklist-validation";
import { calculateOverallChecklistProgress, getAllChecklistSectionsProgress } from "@/lib/checklist-progress";
import { useDynamicCategories } from "@/hooks/useDynamicCategories";

// Checklist section components
import { EntornoZonasComunesSection } from "@/components/checklist/sections/entorno-zonas-comunes-section";
import { EstadoGeneralSection } from "@/components/checklist/sections/estado-general-section";
import { EntradaPasillosSection } from "@/components/checklist/sections/entrada-pasillos-section";
import { HabitacionesSection } from "@/components/checklist/sections/habitaciones-section";
import { SalonSection } from "@/components/checklist/sections/salon-section";
import { BanosSection } from "@/components/checklist/sections/banos-section";
import { CocinaSection } from "@/components/checklist/sections/cocina-section";
import { ExterioresSection } from "@/components/checklist/sections/exteriores-section";

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
  const params = useParams();
  const router = useRouter();
  const sectionRefs = useRef<Record<string, HTMLDivElement>>({});
  const { t } = useI18n();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Unwrap params if it's a Promise (Next.js 16+)
  const unwrappedParams = params instanceof Promise ? use(params) : params;

  // Get property ID from params
  const propertyId = unwrappedParams.id && typeof unwrappedParams.id === "string" ? unwrappedParams.id : null;

  // Debug: Log propertyId
  useEffect(() => {
    if (propertyId) {
      console.log("🔍 Checklist Page - Property ID:", propertyId);
    } else {
      console.warn("⚠️ Checklist Page - No property ID found in params");
    }
  }, [propertyId]);

  // Load property from Supabase
  const { property: supabaseProperty, loading: supabaseLoading, error: propertyError, refetch: refetchProperty, updateProperty: updateSupabaseProperty } = useSupabaseProperty(propertyId);

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
    // Final check checklist is available from furnishing, final-check, and cleaning phases
    return (phase === "final-check" || phase === "furnishing" || phase === "cleaning") ? "reno_final" : "reno_initial";
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

  // Load Airtable fields when entering initial-check phase
  useEffect(() => {
    const loadAirtableFields = async () => {
      if (!propertyId || !property || !supabaseProperty || !updateSupabaseProperty) return;
      
      const phase = getPropertyRenoPhase(property);
      if (phase !== "initial-check") return;

      try {
        console.log('[ChecklistPage] 🔄 Loading Airtable fields for initial-check...');
        const airtableFields = await fetchInitialCheckFieldsFromAirtable(propertyId);
        
        if (airtableFields) {
          const updates: any = {};
          if (airtableFields.nextRenoSteps) {
            updates.next_reno_steps = airtableFields.nextRenoSteps;
          }
          if (airtableFields.renovatorName) {
            updates['Renovator name'] = airtableFields.renovatorName;
          }
          if (airtableFields.keysLocation) {
            updates.keys_location = airtableFields.keysLocation;
          }
          if (airtableFields.setUpStatus) {
            updates['Set Up Status'] = airtableFields.setUpStatus;
          }

          if (Object.keys(updates).length > 0) {
            await updateSupabaseProperty(updates);
            await refetchProperty();
            console.log('[ChecklistPage] ✅ Airtable fields loaded and synced to Supabase');
          }
        }
      } catch (error) {
        console.error('[ChecklistPage] ❌ Error loading Airtable fields:', error);
      }
    };

    loadAirtableFields();
  }, [propertyId, property, supabaseProperty, updateSupabaseProperty, refetchProperty, getPropertyRenoPhase]);

  // Use Supabase checklist hook (for production)
  // Only initialize when we have a valid propertyId
  const { checklist, updateSection, isLoading: checklistLoading, finalizeChecklist, saveCurrentSection } = useSupabaseChecklist({
    propertyId: propertyId || "",
    checklistType,
  });

  // Use Supabase inspection hook to get completeInspection function
  const inspectionType = checklistType === "reno_final" ? "final" : "initial";
  const { inspection, completeInspection, refetch: refetchInspection } = useSupabaseInspection(
    propertyId,
    inspectionType
  );

  // Get dynamic categories for reno-in-progress phase
  const { categories: dynamicCategories } = useDynamicCategories(propertyId);

  // State for completion dialog
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string>("");

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
  
  // Initialize activeSection - always start with first checklist section
  const [activeSection, setActiveSection] = useState<string>(() => {
    return "checklist-entorno-zonas-comunes";
  });
  
  // Calculate overall progress
  // For reno-in-progress phase, use average of dynamic categories
  // For other phases, use checklist progress
  const overallProgress = useMemo(() => {
    if (phase === "reno-in-progress" && dynamicCategories.length > 0) {
      // Calculate average of all dynamic categories
      const total = dynamicCategories.reduce((sum, cat) => sum + (cat.percentage || 0), 0);
      return Math.round(total / dynamicCategories.length);
    }
    // For other phases, use checklist progress
    return calculateOverallChecklistProgress(checklist || null);
  }, [phase, dynamicCategories, checklist]);
  
  const sectionProgress = getAllChecklistSectionsProgress(checklist || null);

  // Combine loading states - also check if checklist is null when we have a property
  const isFullyLoading = isLoading || checklistLoading || (property && !checklist);

  // Update checklist section
  const updateChecklistSection = useCallback(
    (sectionId: string, updates: any) => {
      updateSection(sectionId, updates);
      setHasUnsavedChanges(true);
    },
    [updateSection]
  );

  // Handle section click - NO guardar automáticamente, solo cambiar de sección
  const handleSectionClick = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    // Cerrar sidebar móvil al cambiar de sección
    setIsMobileSidebarOpen(false);
    
    // Scroll to section if it exists (solo en desktop)
    if (window.innerWidth >= 768) {
      const sectionRef = sectionRefs.current[sectionId];
      if (sectionRef) {
        sectionRef.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!checklist) return;
    try {
      await saveCurrentSection();
      setHasUnsavedChanges(false);
      toast.success(t.messages.saveSuccess);
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Error al guardar cambios");
    }
  }, [checklist, t, saveCurrentSection]);

  // Handle complete inspection
  const handleCompleteInspection = useCallback(async () => {
    if (!inspection || !canComplete) {
      toast.error("No se puede completar la inspección. Asegúrate de que todas las actividades estén reportadas.");
      return;
    }

    setIsCompleting(true);
    try {
      // Guardar sección actual antes de completar
      await saveCurrentSection();
      
      const success = await completeInspection();
      if (success && inspection.public_link_id) {
        // Generate public URL
        const url = `${window.location.origin}/inspection/${inspection.public_link_id}`;
        setPublicUrl(url);
        setShowCompleteDialog(true);
        toast.success("Inspección completada exitosamente");
        // Refetch inspection to get updated status
        await refetchInspection();
        setHasUnsavedChanges(false);
      } else {
        toast.error("Error al completar la inspección");
      }
    } catch (error) {
      console.error("Error completing inspection:", error);
      toast.error("Error al completar la inspección");
    } finally {
      setIsCompleting(false);
    }
  }, [inspection, canComplete, completeInspection, refetchInspection, saveCurrentSection]);

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
        const entornoSection = checklist.sections["entorno-zonas-comunes"] || {
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
        console.log('[RenoChecklistPage] 🖼️ Rendering EntornoZonasComunesSection:', {
          sectionId: "entorno-zonas-comunes",
          uploadZones: entornoSection.uploadZones?.map(z => ({ id: z.id, photosCount: z.photos.length, videosCount: z.videos.length })),
          hasChecklist: !!checklist,
          checklistSections: Object.keys(checklist?.sections || {})
        });
        return (
          <EntornoZonasComunesSection
            section={entornoSection}
            onUpdate={(updates) => {
              console.log('[RenoChecklistPage] 📝 onUpdate called for entorno-zonas-comunes:', {
                updates,
                uploadZones: updates.uploadZones?.map(z => ({ id: z.id, photosCount: z.photos.length, videosCount: z.videos.length })),
                uploadZonesLength: updates.uploadZones?.length || 0,
                updatesKeys: Object.keys(updates)
              });
              updateChecklistSection("entorno-zonas-comunes", updates);
            }}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-entorno-zonas-comunes"] = el;
            }}
            onContinue={() => handleSectionClick("checklist-estado-general")}
          />
        );
      case "checklist-estado-general":
        return (
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
            }}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-estado-general"] = el;
            }}
            onContinue={() => handleSectionClick("checklist-entrada-pasillos")}
          />
        );
      case "checklist-entrada-pasillos":
        return (
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
            }}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-entrada-pasillos"] = el;
            }}
            onContinue={() => handleSectionClick("checklist-habitaciones")}
          />
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
          <HabitacionesSection
            section={habitacionesSection}
            onUpdate={(updates) => {
              updateChecklistSection("habitaciones", updates);
            }}
            onPropertyUpdate={async () => {
              // Reload property to get updated data from Supabase
              await refetchProperty();
            }}
            onNavigateToHabitacion={(index) => {
              handleSectionClick(`checklist-habitaciones-${index + 1}`);
            }}
            onContinue={() => handleSectionClick("checklist-salon")}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-habitaciones"] = el;
            }}
          />
        );
      case "checklist-salon":
        return (
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
            }}
            onContinue={() => handleSectionClick("checklist-banos")}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-salon"] = el;
            }}
          />
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
          <BanosSection
            section={banosSection}
            onUpdate={(updates) => {
              updateChecklistSection("banos", updates);
            }}
            onPropertyUpdate={async () => {
              // Reload property to get updated data from Supabase
              await refetchProperty();
            }}
            onNavigateToBano={(index) => {
              handleSectionClick(`checklist-banos-${index + 1}`);
            }}
            onContinue={() => handleSectionClick("checklist-cocina")}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-banos"] = el;
            }}
          />
        );
      case "checklist-cocina":
        return (
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
            }}
            onContinue={() => handleSectionClick("checklist-exteriores")}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-cocina"] = el;
            }}
          />
        );
      case "checklist-exteriores":
        return (
          <ExterioresSection
            section={checklist.sections["exteriores"] || {
              id: "exteriores",
              uploadZones: [{ id: "fotos-video-exterior", photos: [], videos: [] }],
              questions: [
                { id: "acabados-exteriores" },
                { id: "observaciones", notes: "" },
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
            }}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-exteriores"] = el;
            }}
            onContinue={() => router.push("/reno/construction-manager/kanban")}
          />
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
                onContinue={() => {
                  if (index + 1 < (habitacionesSection.dynamicCount || 0)) {
                    handleSectionClick(`checklist-habitaciones-${index + 2}`);
                  } else {
                    handleSectionClick("checklist-salon");
                  }
                }}
                ref={(el) => {
                  if (el) sectionRefs.current[activeSection] = el;
                }}
              />
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
                onContinue={() => {
                  if (index + 1 < (banosSection.dynamicCount || 0)) {
                    handleSectionClick(`checklist-banos-${index + 2}`);
                  } else {
                    handleSectionClick("checklist-cocina");
                  }
                }}
                ref={(el) => {
                  if (el) sectionRefs.current[activeSection] = el;
                }}
              />
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
          <RenoHomeLoader />
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
          <RenoHomeLoader />
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
          // Use browser history to go back to previous page (property detail, home, or kanban)
          if (window.history.length > 1) {
            router.back();
          } else {
            // Fallback to property detail page if no history
            router.push(`/reno/construction-manager/property/${property?.id}`);
          }
        }}
        backLabel="Atrás"
        formTitle={formTitle}
        statusText={hasUnsavedChanges ? undefined : "Cambios guardados"}
        onMenuClick={() => setIsMobileSidebarOpen(true)}
        actions={[
          {
            label: t.property.save,
            onClick: handleSave,
            variant: "outline",
            disabled: !hasUnsavedChanges,
          },
          {
            label: t.checklist.submitChecklist,
            onClick: async () => {
              if (!property) return;
              await finalizeChecklist({
                estimatedVisitDate: property.estimatedVisitDate,
                autoVisitDate: new Date().toISOString().split('T')[0],
                nextRenoSteps: supabaseProperty?.next_reno_steps || undefined,
              });
              setTimeout(() => {
                router.push("/reno/construction-manager/kanban");
              }, 2000);
            },
            variant: "default" as const,
            disabled: !canComplete || isCompleting,
          },
        ]}
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
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content con padding-top para no quedar oculto bajo el header */}
        {/* El header tiene aproximadamente 80-90px de altura (py-3 + contenido), así que necesitamos más espacio */}
        <div className="flex-1 overflow-y-auto bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
          <div className="pt-32 px-4 md:px-6 pb-4 md:pb-6">
            <div className="max-w-4xl mx-auto">
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

      {/* Complete Inspection Dialog */}
      <CompleteInspectionDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        publicUrl={publicUrl}
      />
    </div>
  );
}

