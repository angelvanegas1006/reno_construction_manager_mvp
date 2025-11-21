"use client";

import { useRouter } from "next/navigation";
import { useRef, startTransition, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartnerSidebar } from "@/components/partner/sidebar";
import { EditSidebar } from "@/components/property/edit-sidebar";
import { MobileSidebarMenu } from "@/components/property/mobile-sidebar-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Custom hooks
import { usePropertyData } from "@/hooks/usePropertyData";
import { usePropertyUIState } from "@/hooks/usePropertyUIState";
import { usePropertyValidation } from "@/hooks/usePropertyValidation";
import { PropertyData } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";

// Section components
import { InfoPropiedadSection } from "@/components/property/sections/info-propiedad-section";
import { InfoEconomicaSection } from "@/components/property/sections/info-economica-section";
import { EstadoLegalSection } from "@/components/property/sections/estado-legal-section";
import { DocumentacionSection } from "@/components/property/sections/documentacion-section";
import { DatosVendedorSection } from "@/components/property/sections/datos-vendedor-section";
import { DatosInquilinoSection } from "@/components/property/sections/datos-inquilino-section";
import { EntornoZonasComunesSection } from "@/components/checklist/sections/entorno-zonas-comunes-section";
import { EstadoGeneralSection } from "@/components/checklist/sections/estado-general-section";
import { EntradaPasillosSection } from "@/components/checklist/sections/entrada-pasillos-section";
import { HabitacionesSection } from "@/components/checklist/sections/habitaciones-section";
import { SalonSection } from "@/components/checklist/sections/salon-section";
import { BanosSection } from "@/components/checklist/sections/banos-section";
import { CocinaSection } from "@/components/checklist/sections/cocina-section";
import { ExterioresSection } from "@/components/checklist/sections/exteriores-section";
import { useChecklist } from "@/hooks/useChecklist";
import { ChecklistCarpentryItem } from "@/lib/checklist-storage";

const CARPENTRY_ITEMS_SALON = [
  { id: "ventanas", translationKey: "ventanas" },
  { id: "persianas", translationKey: "persianas" },
  { id: "armarios", translationKey: "armarios" },
] as const;

const CLIMATIZATION_ITEMS_SALON = [
  { id: "radiadores", translationKey: "radiadores" },
  { id: "split-ac", translationKey: "splitAc" },
] as const;

export default function PropertyEditPage() {
  const router = useRouter();
  const sectionRefs = useRef<Record<string, HTMLDivElement>>({});
  const { t } = useI18n();
  
  console.log("page.tsx - PropertyEditPage render");

  // Custom hooks following separation of concerns
  const {
    property,
    isLoading,
    error,
    updatePropertyData,
    saveProperty,
    submitToReview,
    deletePropertyById,
  } = usePropertyData();

  // Get property data with fallback (memoized to recalculate when property changes)
  const propertyData: PropertyData = useMemo(() => {
    if (!property) {
      return {
        tipoPropiedad: "Piso" as const,
        superficieConstruida: 0,
        superficieUtil: 0,
        anoConstruccion: 0,
        referenciaCatastral: "",
        orientacion: ["Norte"] as const,
        habitaciones: 0,
        banos: 0,
        plazasAparcamiento: 0,
        ascensor: false,
        balconTerraza: false,
        trastero: false,
        precioVenta: 0,
        gastosComunidad: 0,
        ibiAnual: 0,
        confirmacionGastosComunidad: false,
        confirmacionIBI: false,
        propiedadAlquilada: false,
        situacionInquilinos: "Los inquilinos permanecen" as const,
        comunidadPropietariosConstituida: false,
        edificioSeguroActivo: false,
        comercializaExclusiva: false,
        edificioITEfavorable: false,
        videoGeneral: [],
        notaSimpleRegistro: [],
        certificadoEnergetico: [],
      };
    }
    return property.data || {
      tipoPropiedad: property.propertyType,
      superficieConstruida: 0,
      superficieUtil: 0,
      anoConstruccion: 0,
      referenciaCatastral: "",
      orientacion: ["Norte"] as const,
      habitaciones: 0,
      banos: 0,
      plazasAparcamiento: 0,
      ascensor: false,
      balconTerraza: false,
      trastero: false,
      precioVenta: 0,
      gastosComunidad: 0,
      ibiAnual: 0,
      confirmacionGastosComunidad: false,
      confirmacionIBI: false,
      propiedadAlquilada: false,
      situacionInquilinos: "Los inquilinos permanecen" as const,
      comunidadPropietariosConstituida: false,
      edificioSeguroActivo: false,
      comercializaExclusiva: false,
      edificioITEfavorable: false,
      videoGeneral: [],
      notaSimpleRegistro: [],
      certificadoEnergetico: [],
    };
  }, [property]);

  const {
    activeSection,
    hasUnsavedChanges,
    showDeleteModal,
    isMobileMenuOpen,
    expandedGroups,
    showInquilino,
    setActiveSection,
    setHasUnsavedChanges,
    setShowDeleteModal,
    setIsMobileMenuOpen,
    toggleGroup,
    handleSectionClick,
    markAsChanged,
    markAsSaved,
  } = usePropertyUIState(propertyData);

  const validation = usePropertyValidation(propertyData, showInquilino);
  
  // Use sectionsProgress from validation hook (includes showInquilino logic)
  const sectionsProgress = validation.sectionsProgress;
  const overallProgress = validation.overallProgress;
  const canSubmit = validation.canSubmit;

  // Checklist hook
  const { checklist, updateSection: updateChecklistSection } = useChecklist({
    propertyId: property?.id || "",
    checklistType: "partner_initial",
  });
  
  console.log("page.tsx - checklist:", checklist);
  if (checklist?.sections?.["habitaciones"]) {
    const ventanasInChecklist = checklist.sections["habitaciones"].dynamicItems?.[0]?.carpentryItems?.find((i: ChecklistCarpentryItem) => i.id === "ventanas");
    console.log("page.tsx - ventanas in checklist.sections['habitaciones']:", ventanasInChecklist);
  }

  // Event handlers - memoized to prevent unnecessary re-renders
  // ALL HOOKS MUST BE BEFORE ANY EARLY RETURNS
  const handleDataUpdate = useCallback(async (updates: Partial<PropertyData>) => {
    try {
      await updatePropertyData(updates);
      markAsChanged();
    } catch (err) {
      console.error("Error updating property data:", err);
      toast.error("Error al actualizar los datos");
    }
  }, [updatePropertyData, markAsChanged]);

  // Scroll to active section effect
  useEffect(() => {
    const ref = sectionRefs.current[activeSection];
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeSection]);

  // Error handling - NOW after all hooks
  if (error) {
    return (
      <div className="flex h-screen overflow-hidden">
        <PartnerSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{t.messages.error}: {error}</p>
            <Button
              onClick={() => {
                startTransition(() => {
                  router.push("/partner/kanban");
                });
              }}
            >
              {t.messages.backToKanban}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <PartnerSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--prophero-gray-900)] mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t.messages.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex h-screen overflow-hidden">
        <PartnerSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{t.messages.notFound}</p>
            <Button
              onClick={() => {
                startTransition(() => {
                  router.push("/partner/kanban");
                });
              }}
            >
              {t.messages.backToKanban}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await saveProperty();
      markAsSaved();
      toast.success(t.messages.saveSuccess);
    } catch (err) {
      console.error("Error saving property:", err);
      toast.error(t.messages.saveError);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error(t.messages.completeRequiredFields);
      return;
    }

    try {
      await submitToReview();
      toast.success(t.messages.submitSuccess);
      startTransition(() => {
        router.push("/partner/kanban");
      });
    } catch (err) {
      console.error("Error submitting property:", err);
      toast.error(t.messages.submitError);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deletePropertyById();
      startTransition(() => {
        router.push("/partner/kanban");
      });
    } catch (err) {
      console.error("Error deleting property:", err);
      toast.error(t.messages.deleteConfirm);
    }
  };

  const formatAddress = () => {
    const parts = [
      property.fullAddress,
      property.planta && `Planta ${property.planta}`,
      property.puerta && `Puerta ${property.puerta}`,
      property.bloque && `Bloque ${property.bloque}`,
      property.escalera && `Escalera ${property.escalera}`,
    ].filter(Boolean);
    return parts.join(" · ");
  };

  const renderActiveSection = () => {
    console.log("page.tsx - renderActiveSection - activeSection:", activeSection);
    switch (activeSection) {
      case "info-propiedad":
        return (
          <InfoPropiedadSection
            data={propertyData}
            onUpdate={handleDataUpdate}
            onContinue={() => handleSectionClick("info-economica")}
            ref={(el) => {
              if (el) sectionRefs.current["info-propiedad"] = el;
            }}
          />
        );
      case "info-economica":
        return (
          <InfoEconomicaSection
            data={propertyData}
            onUpdate={handleDataUpdate}
            onContinue={() => handleSectionClick("estado-legal")}
            ref={(el) => {
              if (el) sectionRefs.current["info-economica"] = el;
            }}
          />
        );
      case "estado-legal":
        return (
          <EstadoLegalSection
            data={propertyData}
            onUpdate={handleDataUpdate}
            onContinue={() => handleSectionClick("documentacion")}
            ref={(el) => {
              if (el) sectionRefs.current["estado-legal"] = el;
            }}
          />
        );
      case "documentacion":
        return (
          <DocumentacionSection
            data={propertyData}
            onUpdate={handleDataUpdate}
            ref={(el) => {
              if (el) sectionRefs.current["documentacion"] = el;
            }}
          />
        );
      case "datos-vendedor":
        return (
          <DatosVendedorSection
            data={propertyData}
            onUpdate={handleDataUpdate}
            ref={(el) => {
              if (el) sectionRefs.current["datos-vendedor"] = el;
            }}
          />
        );
      case "datos-inquilino":
        if (!showInquilino) {
          return (
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <p className="text-muted-foreground">
                {t.sectionMessages.tenantSectionUnavailable}
              </p>
            </div>
          );
        }
        return (
          <DatosInquilinoSection
            data={propertyData}
            onUpdate={handleDataUpdate}
            ref={(el) => {
              if (el) sectionRefs.current["datos-inquilino"] = el;
            }}
          />
        );
      case "checklist-entorno-zonas-comunes":
        if (!checklist) {
          return (
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <p className="text-muted-foreground">Cargando checklist...</p>
            </div>
          );
        }
        return (
          <EntornoZonasComunesSection
            section={checklist.sections["entorno-zonas-comunes"] || {
              id: "entorno-zonas-comunes",
              uploadZones: [],
              questions: [],
            }}
            onUpdate={(updates) => {
              updateChecklistSection("entorno-zonas-comunes", updates);
            }}
            onContinue={() => handleSectionClick("checklist-estado-general")}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-entorno-zonas-comunes"] = el;
            }}
          />
        );
      case "checklist-estado-general":
        if (!checklist) {
          return (
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <p className="text-muted-foreground">Cargando checklist...</p>
            </div>
          );
        }
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
            onContinue={() => handleSectionClick("checklist-entrada-pasillos")}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-estado-general"] = el;
            }}
          />
        );
      case "checklist-entrada-pasillos":
        if (!checklist) {
          return (
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <p className="text-muted-foreground">Cargando checklist...</p>
            </div>
          );
        }
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
            onContinue={() => handleSectionClick("checklist-habitaciones")}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-entrada-pasillos"] = el;
            }}
          />
        );
      case "checklist-habitaciones":
        console.log("page.tsx - renderActiveSection - checklist-habitaciones");
        console.log("page.tsx - checklist:", checklist);
        if (!checklist) {
          return (
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <p className="text-muted-foreground">Cargando checklist...</p>
            </div>
          );
        }
        console.log("page.tsx - checklist.sections['habitaciones']:", checklist.sections["habitaciones"]);
        // Ensure we always pass a new object reference to trigger re-renders
        const habitacionesSectionRaw = checklist.sections["habitaciones"] || {
          id: "habitaciones",
          dynamicItems: [],
          dynamicCount: propertyData?.habitaciones || 0,
        };
        console.log("page.tsx - habitacionesSectionRaw:", habitacionesSectionRaw);
        if (habitacionesSectionRaw.dynamicItems && habitacionesSectionRaw.dynamicItems.length > 0) {
          const ventanasInRaw = habitacionesSectionRaw.dynamicItems[0]?.carpentryItems?.find((i: ChecklistCarpentryItem) => i.id === "ventanas");
          console.log("page.tsx - ventanas in habitacionesSectionRaw:", ventanasInRaw);
        }
        // Create a new object reference with a new array reference for dynamicItems
        // Also create deep copies of the objects inside the array to ensure React detects changes
        // Use JSON.parse(JSON.stringify()) for deep cloning to ensure all nested objects are new references
        const habitacionesSection = habitacionesSectionRaw.dynamicItems 
          ? {
              ...habitacionesSectionRaw,
              dynamicItems: JSON.parse(JSON.stringify(habitacionesSectionRaw.dynamicItems)),
            }
          : {
              ...habitacionesSectionRaw,
              dynamicItems: [],
            };
        
        if (habitacionesSection.dynamicItems && habitacionesSection.dynamicItems.length > 0) {
          const ventanasInSection = habitacionesSection.dynamicItems[0]?.carpentryItems?.find((i: ChecklistCarpentryItem) => i.id === "ventanas");
          console.log("page.tsx - ventanas in habitacionesSection (after deep clone):", ventanasInSection);
        }
        
        // Create a key based on the carpentry items to force re-render when they change
        const sectionKey = habitacionesSection.dynamicItems && habitacionesSection.dynamicItems.length > 0
          ? `habitaciones-${habitacionesSection.dynamicItems[0]?.carpentryItems?.find((i: ChecklistCarpentryItem) => i.id === "ventanas")?.cantidad || 0}-${habitacionesSection.dynamicItems[0]?.carpentryItems?.find((i: ChecklistCarpentryItem) => i.id === "persianas")?.cantidad || 0}-${habitacionesSection.dynamicItems[0]?.carpentryItems?.find((i: ChecklistCarpentryItem) => i.id === "armarios")?.cantidad || 0}`
          : "habitaciones-default";
        
        console.log("page.tsx - About to render HabitacionesSection with sectionKey:", sectionKey);
        console.log("page.tsx - habitacionesSection being passed:", habitacionesSection);
        
        return (
          <HabitacionesSection
            key={sectionKey}
            section={habitacionesSection}
            onUpdate={(updates) => {
              updateChecklistSection("habitaciones", updates);
            }}
            onPropertyUpdate={(updates) => {
              updatePropertyData(updates);
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
        if (!checklist) {
          return (
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <p className="text-muted-foreground">Cargando checklist...</p>
            </div>
          );
        }
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
        if (!checklist) {
          return (
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <p className="text-muted-foreground">Cargando checklist...</p>
            </div>
          );
        }
        const banosSectionRaw = checklist.sections["banos"] || {
          id: "banos",
          dynamicItems: [],
          dynamicCount: propertyData?.banos || 0,
        };
        // Create a new object reference with a new array reference for dynamicItems
        // Use JSON.parse(JSON.stringify()) for deep cloning to ensure all nested objects are new references
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
            onPropertyUpdate={(updates) => {
              updatePropertyData(updates);
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
        if (!checklist) {
          return (
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <p className="text-muted-foreground">Cargando checklist...</p>
            </div>
          );
        }
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
        if (!checklist) {
          return (
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <p className="text-muted-foreground">Cargando checklist...</p>
            </div>
          );
        }
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
            onContinue={() => router.push("/partner/kanban")}
            ref={(el) => {
              if (el) sectionRefs.current["checklist-exteriores"] = el;
            }}
          />
        );
      default:
        // Handle individual bathroom cases (checklist-banos-1, checklist-banos-2, etc.)
        if (activeSection.startsWith("checklist-banos-")) {
          const banoNumber = parseInt(activeSection.replace("checklist-banos-", ""));
          if (!isNaN(banoNumber) && banoNumber > 0) {
            const banoIndex = banoNumber - 1; // Convert to 0-based index
            if (!checklist) {
              return (
                <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
                  <p className="text-muted-foreground">Cargando checklist...</p>
                </div>
              );
            }
            const banosSectionRaw = checklist.sections["banos"] || {
              id: "banos",
              dynamicItems: [],
              dynamicCount: propertyData?.banos || 0,
            };
            // Create a new object reference with a new array reference for dynamicItems
            // Use JSON.parse(JSON.stringify()) for deep cloning to ensure all nested objects are new references
            const banosSection = banosSectionRaw.dynamicItems 
              ? {
                  ...banosSectionRaw,
                  dynamicItems: JSON.parse(JSON.stringify(banosSectionRaw.dynamicItems)),
                }
              : {
                  ...banosSectionRaw,
                  dynamicItems: [],
                };
            
            // Ensure dynamicItems array has enough items
            const dynamicItems = banosSection.dynamicItems || [];
            if (banoIndex >= dynamicItems.length) {
              // Initialize missing bathrooms
              const updatedItems = [...dynamicItems];
              while (updatedItems.length <= banoIndex) {
                updatedItems.push({
                  id: `bano-${updatedItems.length + 1}`,
                  questions: [
                    { id: "acabados" },
                    { id: "agua-drenaje" },
                    { id: "sanitarios" },
                    { id: "griferia-ducha" },
                    { id: "puerta-entrada" },
                    { id: "mobiliario" },
                    { id: "ventilacion" },
                  ],
                  uploadZone: { id: "fotos-video", photos: [], videos: [] },
                  carpentryItems: [
                    { id: "ventanas", cantidad: 0 },
                    { id: "persianas", cantidad: 0 },
                  ],
                });
              }
              banosSection.dynamicItems = updatedItems;
              banosSection.dynamicCount = Math.max(banosSection.dynamicCount || 0, updatedItems.length);
              updateChecklistSection("banos", banosSection);
            }
            
            return (
              <BanosSection
                section={banosSection}
                onUpdate={(updates) => {
                  updateChecklistSection("banos", updates);
                }}
                banoIndex={banoIndex}
                onNavigateToBano={(index) => {
                  handleSectionClick(`checklist-banos-${index + 1}`);
                }}
                onContinue={() => {
                  if (banoIndex < (banosSection.dynamicCount || 0) - 1) {
                    handleSectionClick(`checklist-banos-${banoIndex + 2}`);
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
        // Handle individual bedroom cases (checklist-habitaciones-1, checklist-habitaciones-2, etc.)
        if (activeSection.startsWith("checklist-habitaciones-")) {
          console.log("page.tsx - case default - handling individual habitacion:", activeSection);
          const habitacionNumber = parseInt(activeSection.replace("checklist-habitaciones-", ""));
          if (!isNaN(habitacionNumber) && habitacionNumber > 0) {
            const habitacionIndex = habitacionNumber - 1; // Convert to 0-based index
            console.log("page.tsx - habitacionIndex:", habitacionIndex);
            console.log("page.tsx - checklist:", checklist);
            if (!checklist) {
              return (
                <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
                  <p className="text-muted-foreground">Cargando checklist...</p>
                </div>
              );
            }
            const habitacionesSectionRaw = checklist.sections["habitaciones"] || {
              id: "habitaciones",
              dynamicItems: [],
              dynamicCount: propertyData?.habitaciones || 0,
            };
            console.log("page.tsx - default case - habitacionesSectionRaw:", habitacionesSectionRaw);
            if (habitacionesSectionRaw.dynamicItems && habitacionesSectionRaw.dynamicItems.length > 0) {
              const ventanasInRaw = habitacionesSectionRaw.dynamicItems[habitacionIndex]?.carpentryItems?.find((i: ChecklistCarpentryItem) => i.id === "ventanas");
              console.log("page.tsx - default case - ventanas in habitacionesSectionRaw[habitacionIndex]:", ventanasInRaw);
            }
            // Create a new object reference with a new array reference for dynamicItems
            // Use JSON.parse(JSON.stringify()) for deep cloning to ensure all nested objects are new references
            const habitacionesSection = habitacionesSectionRaw.dynamicItems 
              ? {
                  ...habitacionesSectionRaw,
                  dynamicItems: JSON.parse(JSON.stringify(habitacionesSectionRaw.dynamicItems)),
                }
              : {
                  ...habitacionesSectionRaw,
                  dynamicItems: [],
                };
            console.log("page.tsx - default case - habitacionesSection after deep clone:", habitacionesSection);
            if (habitacionesSection.dynamicItems && habitacionesSection.dynamicItems.length > 0) {
              const ventanasInSection = habitacionesSection.dynamicItems[habitacionIndex]?.carpentryItems?.find((i: ChecklistCarpentryItem) => i.id === "ventanas");
              console.log("page.tsx - default case - ventanas in habitacionesSection[habitacionIndex]:", ventanasInSection);
            }
            
            // Ensure dynamicItems array has enough items
            const dynamicItems = habitacionesSection.dynamicItems || [];
            if (habitacionIndex >= dynamicItems.length) {
              // Initialize missing bedrooms
              const updatedItems = [...dynamicItems];
              while (updatedItems.length <= habitacionIndex) {
                updatedItems.push({
                  id: `habitacion-${updatedItems.length + 1}`,
                  questions: [
                    { id: "acabados" },
                    { id: "electricidad" },
                    { id: "puerta-entrada" },
                  ],
                  uploadZone: { id: "fotos-video", photos: [], videos: [] },
                  carpentryItems: [
                    { id: "ventanas", cantidad: 0 },
                    { id: "persianas", cantidad: 0 },
                    { id: "armarios", cantidad: 0 },
                  ],
                  climatizationItems: [
                    { id: "radiadores", cantidad: 0 },
                    { id: "split-ac", cantidad: 0 },
                  ],
                  mobiliario: { existeMobiliario: false },
                });
              }
              updateChecklistSection("habitaciones", { dynamicItems: updatedItems });
            }
            
            console.log("page.tsx - default case - About to render HabitacionesSection with habitacionIndex:", habitacionIndex);
            console.log("page.tsx - default case - habitacionesSection being passed:", habitacionesSection);
            
            return (
              <HabitacionesSection
                section={habitacionesSection}
                onUpdate={(updates) => {
                  updateChecklistSection("habitaciones", updates);
                }}
                habitacionIndex={habitacionIndex}
                onNavigateToHabitacion={(index) => {
                  handleSectionClick(`checklist-habitaciones-${index + 1}`);
                }}
                onContinue={() => {
                  // If there's a next bedroom, navigate to it, otherwise go to salon
                  if (habitacionIndex < (propertyData?.habitaciones || 0) - 1) {
                    handleSectionClick(`checklist-habitaciones-${habitacionIndex + 2}`);
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
        }
        return (
          <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
            <p className="text-muted-foreground">
              {t.sectionMessages.sectionInDevelopment}: {activeSection}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <PartnerSidebar />
      
      {/* Desktop Sidebar */}
      <EditSidebar
        address={formatAddress()}
        overallProgress={overallProgress}
        sections={sectionsProgress}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
        onSave={handleSave}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        canSubmit={canSubmit}
        hasUnsavedChanges={hasUnsavedChanges}
        showInquilino={showInquilino}
        habitacionesCount={checklist?.sections?.["habitaciones"]?.dynamicCount ?? propertyData?.habitaciones ?? 0}
        banosCount={checklist?.sections?.["banos"]?.dynamicCount ?? propertyData?.banos ?? 0}
        checklist={checklist}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-card dark:bg-[var(--prophero-gray-900)] border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                startTransition(() => {
                  router.push("/partner/kanban");
                });
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)] rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]">
                  {Math.round(overallProgress)}%
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {formatAddress()}
                </p>
                <p className="text-xs text-muted-foreground">
                  ID: {property.id}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[var(--prophero-gray-50)] dark:bg-[var(--prophero-gray-950)] p-4 md:p-6">
          {renderActiveSection()}
        </div>
      </div>

      {/* Mobile Sidebar Menu */}
      <MobileSidebarMenu
        isOpen={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
        address={formatAddress()}
        overallProgress={overallProgress}
        sections={sectionsProgress}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
        onSave={handleSave}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        canSubmit={canSubmit}
        hasUnsavedChanges={hasUnsavedChanges}
        showInquilino={showInquilino}
        habitacionesCount={checklist?.sections?.["habitaciones"]?.dynamicCount ?? propertyData?.habitaciones ?? 0}
        banosCount={checklist?.sections?.["banos"]?.dynamicCount ?? propertyData?.banos ?? 0}
        checklist={checklist}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.messages.deleteConfirm}</DialogTitle>
            <DialogDescription>
              {t.messages.deleteConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              {t.common.cancel}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}