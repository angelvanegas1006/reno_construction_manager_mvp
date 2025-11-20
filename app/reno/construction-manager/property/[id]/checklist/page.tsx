"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef, startTransition, useEffect, useCallback, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RenoSidebar } from "@/components/reno/reno-sidebar";
import { RenoChecklistSidebar } from "@/components/reno/reno-checklist-sidebar";
import { PropertyInfoSection } from "@/components/reno/property-info-section";
import { MobileSidebarMenu } from "@/components/property/mobile-sidebar-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { useSupabaseChecklist } from "@/hooks/useSupabaseChecklist";
import { ChecklistType } from "@/lib/checklist-storage";
import { useSupabaseProperty } from "@/hooks/useSupabaseProperty";
import { convertSupabasePropertyToProperty, getPropertyRenoPhaseFromSupabase } from "@/lib/supabase/property-converter";

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

  const propertyId = params.id && typeof params.id === "string" ? params.id : null;
  const { property: supabaseProperty, loading: supabaseLoading, refetch } = useSupabaseProperty(propertyId);
  
  // Convert Supabase property to Property format
  const property: Property | null = supabaseProperty ? convertSupabasePropertyToProperty(supabaseProperty) : null;
  const isLoading = supabaseLoading;

  // Determine property reno phase from Supabase
  const getPropertyRenoPhase = useCallback((): RenoKanbanPhase | null => {
    if (!supabaseProperty) return null;
    return getPropertyRenoPhaseFromSupabase(supabaseProperty);
  }, [supabaseProperty]);

  // Redirect back if not in initial-check or final-check phase
  useEffect(() => {
    if (!isLoading && supabaseProperty) {
      const phase = getPropertyRenoPhase();
      if (phase !== "initial-check" && phase !== "final-check") {
        router.replace(`/reno/construction-manager/property/${propertyId}`);
      }
    }
  }, [isLoading, supabaseProperty, getPropertyRenoPhase, router, propertyId]);

  // Determine checklist type based on phase
  const checklistType: ChecklistType = useMemo(() => {
    if (!supabaseProperty) return "reno_initial";
    const phase = getPropertyRenoPhase();
    return phase === "final-check" ? "reno_final" : "reno_initial";
  }, [supabaseProperty, getPropertyRenoPhase]);

  // Use Supabase checklist hook
  const { checklist, isLoading: checklistLoading, updateSection, saveCurrentSection } = useSupabaseChecklist({
    propertyId: property?.id || "",
    checklistType,
  });

  // Get property data
  const propertyData = useMemo(() => property?.data || {}, [property]);

  // Update checklist section (guarda automáticamente al cambiar de sección)
  const updateChecklistSection = useCallback(
    async (sectionId: string, updates: any) => {
      await updateSection(sectionId, updates);
      setHasUnsavedChanges(false); // Ya se guarda automáticamente
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
  const handleSave = useCallback(async () => {
    if (!checklist) return;
    await saveCurrentSection();
    setHasUnsavedChanges(false);
    toast.success(t.messages.saveSuccess);
  }, [checklist, saveCurrentSection, t]);

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

    const phase = getPropertyRenoPhase() || "initial-check";

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
            onPropertyUpdate={() => {
              // Reload property to get updated data
              refetch();
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
            onPropertyUpdate={() => {
              // Reload property to get updated data
              refetch();
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
                onPropertyUpdate={() => {
                  // Reload property to get updated data
                  refetch();
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
                onPropertyUpdate={() => {
                  // Reload property to get updated data
                  refetch();
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

  const phase = getPropertyRenoPhase() || "initial-check";
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
                {property.fullAddress}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                ID: {property.id} · {phase === "initial-check" ? "Check Inicial" : "Check Final"}
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--prophero-gray-50)] dark:bg-[var(--prophero-gray-950)]">
          <div className="max-w-4xl mx-auto">
            {renderActiveSection()}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Menu */}
      <MobileSidebarMenu
        sections={[
          { sectionId: "property-info", name: "Información de la Propiedad", progress: 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-entorno-zonas-comunes", name: t.checklist.sections.entornoZonasComunes.title, progress: 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-estado-general", name: t.checklist.sections.estadoGeneral.title, progress: 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-entrada-pasillos", name: t.checklist.sections.entradaPasillos.title, progress: 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-habitaciones", name: t.checklist.sections.habitaciones.title, progress: 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-salon", name: t.checklist.sections.salon.title, progress: 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-banos", name: t.checklist.sections.banos.title, progress: 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-cocina", name: t.checklist.sections.cocina.title, progress: 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
          { sectionId: "checklist-exteriores", name: t.checklist.sections.exteriores.title, progress: 0, requiredFieldsCount: 0, completedRequiredFieldsCount: 0, optionalFieldsCount: 0, completedOptionalFieldsCount: 0 },
        ]}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
        address=""
        overallProgress={0}
        onSave={handleSave}
        onSubmit={() => {}}
        onDelete={() => {}}
        canSubmit={false}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </div>
  );
}

