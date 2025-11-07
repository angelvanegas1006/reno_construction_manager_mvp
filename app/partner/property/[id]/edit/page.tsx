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

export default function PropertyEditPage() {
  const router = useRouter();
  const sectionRefs = useRef<Record<string, HTMLDivElement>>({});
  const { t } = useI18n();

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
        orientacion: "Norte" as const,
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
      orientacion: "Norte" as const,
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
      default:
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