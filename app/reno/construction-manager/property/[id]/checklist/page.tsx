"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef, startTransition, useEffect, useCallback, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoChecklistSidebar } from "@/components/reno/reno-checklist-sidebar";
import { PropertyInfoSection } from "@/components/reno/property-info-section";
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
import { useSupabaseInspection } from "@/hooks/useSupabaseInspection";
import { areAllActivitiesReported } from "@/lib/checklist-validation";

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
  const [activeSection, setActiveSection] = useState("property-info");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Get property ID from params
  const propertyId = params.id && typeof params.id === "string" ? params.id : null;

  // Debug: Log propertyId
  useEffect(() => {
    if (propertyId) {
      console.log("🔍 Checklist Page - Property ID:", propertyId);
    } else {
      console.warn("⚠️ Checklist Page - No property ID found in params");
    }
  }, [propertyId]);

  // Load property from Supabase
  const { property: supabaseProperty, loading: supabaseLoading, error: propertyError, refetch: refetchProperty } = useSupabaseProperty(propertyId);

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

  // Redirect back if not in initial-check or final-check phase
  useEffect(() => {
    if (!isLoading && property && supabaseProperty) {
      const phase = getPropertyRenoPhase(property);
      if (phase && phase !== "initial-check" && phase !== "final-check") {
        router.replace(`/reno/construction-manager/property/${property.id}`);
      }
    }
  }, [property, supabaseProperty, isLoading, getPropertyRenoPhase, router]);

  // Determine checklist type based on phase
  const checklistType: ChecklistType = useMemo(() => {
    if (!property || !supabaseProperty) return "reno_initial";
    const phase = getPropertyRenoPhase(property);
    return phase === "final-check" ? "reno_final" : "reno_initial";
  }, [property, supabaseProperty, getPropertyRenoPhase]);

  // Use Supabase checklist hook (for production)
  // Only initialize when we have a valid propertyId
  const { checklist, updateSection, isLoading: checklistLoading } = useSupabaseChecklist({
    propertyId: propertyId || "",
    checklistType,
  });

  // Use Supabase inspection hook to get completeInspection function
  const inspectionType = checklistType === "reno_final" ? "final" : "initial";
  const { inspection, completeInspection, refetch: refetchInspection } = useSupabaseInspection(
    propertyId,
    inspectionType
  );

  // State for completion dialog
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string>("");

  // Check if all activities are reported
  const canComplete = useMemo(() => {
    return areAllActivitiesReported(checklist);
  }, [checklist]);

  // Combine loading states
  const isFullyLoading = isLoading || checklistLoading;

  // Get property data (habitaciones, banos) from Supabase property
  const propertyData = useMemo(() => {
    if (!supabaseProperty) return {};
    return {
      habitaciones: supabaseProperty.bedrooms || 0,
      banos: supabaseProperty.bathrooms || 0,
    };
  }, [supabaseProperty]);

  // Update checklist section
  const updateChecklistSection = useCallback(
    (sectionId: string, updates: any) => {
      updateSection(sectionId, updates);
      setHasUnsavedChanges(true);
    },
    [updateSection]
  );

  // Handle section click
  const handleSectionClick = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    // Scroll to section if it exists
    const sectionRef = sectionRefs.current[sectionId];
    if (sectionRef) {
      sectionRef.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (!checklist) return;
    // Save is handled automatically by useChecklist hook
    setHasUnsavedChanges(false);
    toast.success("Cambios guardados correctamente");
  }, [checklist]);

  // Handle complete inspection
  const handleCompleteInspection = useCallback(async () => {
    if (!inspection || !canComplete) {
      toast.error("No se puede completar la inspección. Asegúrate de que todas las actividades estén reportadas.");
      return;
    }

    setIsCompleting(true);
    try {
      const success = await completeInspection();
      if (success && inspection.public_link_id) {
        // Generate public URL
        const url = `${window.location.origin}/inspection/${inspection.public_link_id}`;
        setPublicUrl(url);
        setShowCompleteDialog(true);
        toast.success("Inspección completada exitosamente");
        // Refetch inspection to get updated status
        await refetchInspection();
      } else {
        toast.error("Error al completar la inspección");
      }
    } catch (error) {
      console.error("Error completing inspection:", error);
      toast.error("Error al completar la inspección");
    } finally {
      setIsCompleting(false);
    }
  }, [inspection, canComplete, completeInspection, refetchInspection]);

  // Format address
  const formatAddress = () => {
    if (!property) return "";
    const parts = [
      property.fullAddress,
      property.planta && `Planta ${property.planta}`,
      property.puerta && `Puerta ${property.puerta}`,
      property.bloque && `Bloque ${property.bloque}`,
      property.escalera && `Escalera ${property.escalera}`,
    ].filter(Boolean);
    return parts.join(" · ");
  };

  // Render active section
  const renderActiveSection = () => {
    if (!property || !checklist) {
      return (
        <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      );
    }

    const phase = getPropertyRenoPhase(property) || "initial-check";

    switch (activeSection) {
      case "property-info":
        return (
          <PropertyInfoSection
            property={property}
            phase={phase}
            onStartChecklist={() => handleSectionClick("checklist-entorno-zonas-comunes")}
          />
        );
      case "checklist-entorno-zonas-comunes":
        return (
          <EntornoZonasComunesSection
            section={checklist.sections["entorno-zonas-comunes"] || {
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
            }}
            onUpdate={(updates) => {
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

  if (isLoading || checklistLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <RenoSidebar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!property && !isLoading && !checklistLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <RenoSidebar />
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
          <Button onClick={() => router.push("/reno/construction-manager/kanban")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al kanban
          </Button>
        </div>
      </div>
    );
  }

  const phase = getPropertyRenoPhase(property) || "initial-check";
  const habitacionesCount = checklist?.sections?.["habitaciones"]?.dynamicCount ?? propertyData?.habitaciones ?? 0;
  const banosCount = checklist?.sections?.["banos"]?.dynamicCount ?? propertyData?.banos ?? 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar />

      {/* Desktop Sidebar */}
      <RenoChecklistSidebar
        address={formatAddress()}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
        onSave={handleSave}
        hasUnsavedChanges={hasUnsavedChanges}
        habitacionesCount={habitacionesCount}
        banosCount={banosCount}
        onCompleteInspection={handleCompleteInspection}
        canCompleteInspection={canComplete && !isCompleting}
        isCompleting={isCompleting}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
                {property?.fullAddress || "Cargando..."}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {property && `ID: ${property.id} · ${phase === "initial-check" ? "Check Inicial" : "Check Final"}`}
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--prophero-gray-50)] dark:bg-[var(--prophero-gray-950)]">
          <div className="max-w-4xl mx-auto">
            {renderActiveSection()}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Menu */}
      <MobileSidebarMenu
        address={formatAddress()}
        overallProgress={0}
        sections={[
          {
            sectionId: "property-info",
            name: "Información de la Propiedad",
            progress: 0,
            requiredFieldsCount: 0,
            completedRequiredFieldsCount: 0,
            optionalFieldsCount: 0,
            completedOptionalFieldsCount: 0,
          },
          {
            sectionId: "checklist-entorno-zonas-comunes",
            name: t.checklist.sections.entornoZonasComunes.title,
            progress: 0,
            requiredFieldsCount: 0,
            completedRequiredFieldsCount: 0,
            optionalFieldsCount: 0,
            completedOptionalFieldsCount: 0,
          },
          {
            sectionId: "checklist-estado-general",
            name: t.checklist.sections.estadoGeneral.title,
            progress: 0,
            requiredFieldsCount: 0,
            completedRequiredFieldsCount: 0,
            optionalFieldsCount: 0,
            completedOptionalFieldsCount: 0,
          },
          {
            sectionId: "checklist-entrada-pasillos",
            name: t.checklist.sections.entradaPasillos.title,
            progress: 0,
            requiredFieldsCount: 0,
            completedRequiredFieldsCount: 0,
            optionalFieldsCount: 0,
            completedOptionalFieldsCount: 0,
          },
          {
            sectionId: "checklist-habitaciones",
            name: t.checklist.sections.habitaciones.title,
            progress: 0,
            requiredFieldsCount: 0,
            completedRequiredFieldsCount: 0,
            optionalFieldsCount: 0,
            completedOptionalFieldsCount: 0,
          },
          {
            sectionId: "checklist-salon",
            name: t.checklist.sections.salon.title,
            progress: 0,
            requiredFieldsCount: 0,
            completedRequiredFieldsCount: 0,
            optionalFieldsCount: 0,
            completedOptionalFieldsCount: 0,
          },
          {
            sectionId: "checklist-banos",
            name: t.checklist.sections.banos.title,
            progress: 0,
            requiredFieldsCount: 0,
            completedRequiredFieldsCount: 0,
            optionalFieldsCount: 0,
            completedOptionalFieldsCount: 0,
          },
          {
            sectionId: "checklist-cocina",
            name: t.checklist.sections.cocina.title,
            progress: 0,
            requiredFieldsCount: 0,
            completedRequiredFieldsCount: 0,
            optionalFieldsCount: 0,
            completedOptionalFieldsCount: 0,
          },
          {
            sectionId: "checklist-exteriores",
            name: t.checklist.sections.exteriores.title,
            progress: 0,
            requiredFieldsCount: 0,
            completedRequiredFieldsCount: 0,
            optionalFieldsCount: 0,
            completedOptionalFieldsCount: 0,
          },
        ]}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
        onSave={handleSave}
        onSubmit={() => {}}
        onDelete={() => {}}
        canSubmit={false}
        hasUnsavedChanges={hasUnsavedChanges}
        habitacionesCount={habitacionesCount}
        banosCount={banosCount}
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

