"use client";

import { useState } from "react";
import { MapPin, Home, Calendar, Building2, Euro, FileText, Map, ChevronLeft, ChevronRight, X, Grid3x3, Clock, User, Wrench, Key, Folder, ClipboardList, Droplets, Flame, Zap } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PropertyMap } from "./property-map";

interface PropertySummaryTabProps {
  property: Property;
  supabaseProperty?: any; // Property from Supabase with all fields
}

/**
 * PropertySummaryTab Component
 * 
 * Muestra el resumen completo de la propiedad con:
 * - Galería de imágenes (coming soon)
 * - Amenities
 * - Información básica
 * - Información económica
 * - Estado legal y comunidad
 * - Documentación
 * - Mapa de ubicación
 */
export function PropertySummaryTab({
  property,
  supabaseProperty,
}: PropertySummaryTabProps) {
  const { t, language } = useI18n();

  // Extract data from Supabase property or fallback to Property
  // Note: Some fields may not exist in Supabase yet, using available ones
  const squareMeters = supabaseProperty?.square_meters || property.data?.superficieUtil;
  const usableArea = squareMeters; // Using square_meters as usable area for now
  const builtArea = supabaseProperty?.square_meters || property.data?.superficieConstruida || squareMeters; // Same for now, can be updated when field is added
  const bedrooms = supabaseProperty?.bedrooms || property.data?.habitaciones;
  const bathrooms = supabaseProperty?.bathrooms || property.data?.banos;
  const parkingSpaces = supabaseProperty?.garage ? parseInt(supabaseProperty.garage) || 0 : property.data?.plazasAparcamiento;
  const hasElevator = supabaseProperty?.has_elevator || property.data?.ascensor || false;
  const hasBalcony = property.data?.balconTerraza || false; // May not exist in Supabase yet
  const hasStorage = property.data?.trastero || false; // May not exist in Supabase yet
  const propertyType = supabaseProperty?.type || property.propertyType;
  const orientation = property.data?.orientacion?.[0]; // May not exist in Supabase yet
  const yearBuilt = property.data?.anoConstruccion; // May not exist in Supabase yet
  const cadastralRef = property.data?.referenciaCatastral; // May not exist in Supabase yet
  const salePrice = property.data?.precioVenta; // May not exist in Supabase yet
  const annualIBI = property.data?.ibiAnual; // May not exist in Supabase yet
  const communityFees = property.data?.gastosComunidad; // May not exist in Supabase yet

  // Obtener pics_urls de supabaseProperty
  const picsUrls = supabaseProperty?.pics_urls || [];
  const hasPics = Array.isArray(picsUrls) && picsUrls.length > 0;

  // Datos de estado y seguimiento (misma info que el sidebar derecho)
  const renoPhase = supabaseProperty?.reno_phase || property.renoPhase || "upcoming-settlements";
  const createdAt = supabaseProperty?.created_at || property.createdAt;
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(language === "es" ? "es-ES" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;
  const phaseLabels: Record<string, string> = {
    "upcoming-settlements": t.kanban?.upcomingSettlements ?? "Upcoming Settlements",
    "initial-check": t.kanban?.initialCheck ?? "Revisión Inicial",
    "reno-budget-renovator": t.kanban?.renoBudgetRenovator ?? "Presupuesto renovador",
    "reno-budget-client": t.kanban?.renoBudgetClient ?? "Presupuesto cliente",
    "reno-budget-start": t.kanban?.renoBudgetStart ?? "Presupuesto a empezar",
    "reno-budget": t.kanban?.renoBudget ?? "Presupuesto",
    "upcoming": t.kanban?.upcoming ?? "Próximas",
    "reno-in-progress": t.kanban?.renoInProgress ?? "Reno in progress",
    "furnishing": t.kanban?.furnishing ?? "Amoblamiento",
    "final-check": t.kanban?.finalCheck ?? "Revisión Final",
    "cleaning": t.kanban?.cleaning ?? "Limpieza",
    "done": t.kanban?.done ?? "Hecho",
    "pendiente-suministros": t.kanban?.pendienteSuministros ?? "Pendiente suministros",
  };
  const phaseLabel = phaseLabels[renoPhase] || renoPhase;
  const renovatorName = supabaseProperty?.["Renovator name"] || property.renovador;
  const responsibleOwner = supabaseProperty?.responsible_owner;
  const renoType = property.renoType || supabaseProperty?.reno_type;
  const keysLocation = supabaseProperty?.keys_location;
  const waterStatus = supabaseProperty?.water_status;
  const gasStatus = supabaseProperty?.gas_status;
  const electricityStatus = supabaseProperty?.electricity_status;
  const utilitiesNotes = supabaseProperty?.utilities_notes;
  const hasUtilitiesInfo = waterStatus || gasStatus || electricityStatus || utilitiesNotes;
  const daysToVisit = property.daysToVisit;
  const daysToStartRenoSinceRSD = property.daysToStartRenoSinceRSD;
  const renoDuration = property.renoDuration;
  const daysToPropertyReady = property.daysToPropertyReady;
  const getDaysInfo = () => {
    if ((renoPhase === "initial-check" || renoPhase === "upcoming-settlements") && daysToVisit != null) return { label: "Días para visitar", value: daysToVisit };
    if ((renoPhase === "reno-budget-renovator" || renoPhase === "reno-budget-client" || renoPhase === "reno-budget-start") && daysToStartRenoSinceRSD != null) return { label: "Días desde la firma", value: daysToStartRenoSinceRSD };
    if (renoPhase === "reno-in-progress" && renoDuration != null) return { label: "Duración de la obra", value: renoDuration };
    if ((renoPhase === "furnishing" || renoPhase === "cleaning") && daysToPropertyReady != null) return { label: "Días para propiedad lista", value: daysToPropertyReady };
    return null;
  };
  const daysInfo = getDaysInfo();
  const driveFolderUrl = supabaseProperty?.drive_folder_url;
  const initialVisitDate = supabaseProperty?.initial_visit_date;
  const formattedInitialVisitDate = initialVisitDate
    ? new Date(initialVisitDate).toLocaleDateString(language === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  // Fechas para la sección Resumen (solo en esta pestaña, no en el sidebar)
  const dateLocale = language === "es" ? "es-ES" : "en-GB";
  const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString(dateLocale, dateOpts) : null;
  const budgetPhReadyDate = formatDate(supabaseProperty?.budget_ph_ready_date);
  const renovatorBudgetApprovalDate = formatDate(supabaseProperty?.renovator_budget_approval_date);
  const estRenoStartDate = formatDate(supabaseProperty?.est_reno_start_date);
  const renoStartDate = formatDate(supabaseProperty?.start_date);
  const renoEstimatedEndDate = formatDate(supabaseProperty?.estimated_end_date);
  const renoEndDate = formatDate(supabaseProperty?.reno_end_date);
  const hasAnyDate =
    budgetPhReadyDate ||
    renovatorBudgetApprovalDate ||
    estRenoStartDate ||
    renoStartDate ||
    renoEstimatedEndDate ||
    renoEndDate;

  const hasPrecheck = renoPhase === "reno-in-progress" && (supabaseProperty?.reno_precheck_comments || (supabaseProperty?.reno_precheck_checks && typeof supabaseProperty.reno_precheck_checks === "object" && (Object.keys((supabaseProperty.reno_precheck_checks as any).categoryChecks || {}).length > 0 || Object.keys((supabaseProperty.reno_precheck_checks as any).itemChecks || {}).length > 0)));
  const hasStatusInfo = phaseLabel || renovatorName || responsibleOwner || renoType || keysLocation || hasUtilitiesInfo || daysInfo || driveFolderUrl || hasPrecheck || formattedInitialVisitDate;

  // Estado para la galería
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [modalImageError, setModalImageError] = useState(false);
  const [isImageVertical, setIsImageVertical] = useState(false);

  // Detectar si la imagen es vertical
  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    // Detectar si la imagen es vertical (height > width)
    const aspectRatio = img.naturalHeight / img.naturalWidth;
    setIsImageVertical(aspectRatio > 1.2); // Más de 1.2:1 se considera vertical
  };

  // Abrir modal con imagen específica
  const openModal = (index: number) => {
    setModalImageIndex(index);
    setModalImageError(false);
    setIsModalOpen(true);
    // Reset vertical state when opening new image
    setIsImageVertical(false);
  };

  // Navegación en el modal
  const goToPreviousModal = () => {
    setModalImageIndex((prev) => {
      const newIndex = prev === 0 ? picsUrls.length - 1 : prev - 1;
      setModalImageError(false);
      return newIndex;
    });
  };

  const goToNextModal = () => {
    setModalImageIndex((prev) => {
      const newIndex = prev === picsUrls.length - 1 ? 0 : prev + 1;
      setModalImageError(false);
      return newIndex;
    });
  };

  return (
    <div className="space-y-6">
      {/* Image Gallery - Grid con imagen principal */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-foreground">{t.property.gallery || "Galería de imágenes"}</h3>
        {hasPics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Imagen principal (izquierda) - ocupa 2 columnas */}
            <div 
              className="md:col-span-2 aspect-video relative rounded-lg overflow-hidden bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] cursor-pointer group"
              onClick={() => openModal(currentImageIndex)}
            >
              {imageErrors.has(currentImageIndex) ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <svg className="h-12 w-12 text-muted-foreground mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <p className="text-sm text-muted-foreground">Error al cargar imagen</p>
                  </div>
                </div>
              ) : (
                <img
                  src={picsUrls[currentImageIndex]}
                  alt={`Imagen ${currentImageIndex + 1} de ${picsUrls.length}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={() => {
                    setImageErrors((prev) => new Set(prev).add(currentImageIndex));
                  }}
                />
              )}
              {/* Overlay con contador */}
              <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs">
                {currentImageIndex + 1} / {picsUrls.length}
              </div>
            </div>

            {/* Columna derecha: 1 miniatura (imagen 2) + botón "Ver todas" */}
            <div className="grid grid-cols-1 gap-2">
              {/* Segunda miniatura (solo si hay más de 1 imagen) */}
              {picsUrls.length > 1 && (
                <div
                  className={cn(
                    "aspect-video relative rounded-lg overflow-hidden bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] cursor-pointer group border-2 transition-all",
                    currentImageIndex === 1
                      ? "border-[var(--prophero-blue-500)] ring-2 ring-[var(--prophero-blue-500)]"
                      : "border-transparent hover:border-[var(--prophero-gray-300)] dark:hover:border-[var(--prophero-gray-600)]"
                  )}
                  onClick={() => {
                    setCurrentImageIndex(1);
                    openModal(1);
                  }}
                >
                  {imageErrors.has(1) ? (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)]">
                      <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                    </div>
                  ) : (
                    <img
                      src={picsUrls[1]}
                      alt="Miniatura 2"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={() => {
                        setImageErrors((prev) => new Set(prev).add(1));
                      }}
                    />
                  )}
                  {/* Overlay oscuro en hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              )}
              
              {/* Botón "Ver todas" (mismo tamaño que la miniatura) */}
              <button
                className="aspect-video relative rounded-lg overflow-hidden bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)] border-2 border-dashed border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] hover:border-[var(--prophero-blue-500)] transition-all flex flex-col items-center justify-center group"
                onClick={() => {
                  // Abrir modal desde la imagen actual
                  openModal(currentImageIndex);
                }}
              >
                <div className="text-center">
                  <Grid3x3 className="h-8 w-8 text-muted-foreground group-hover:text-[var(--prophero-blue-600)] dark:group-hover:text-[var(--prophero-blue-400)] transition-colors mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground group-hover:text-[var(--prophero-blue-600)] dark:group-hover:text-[var(--prophero-blue-400)] transition-colors">
                    {t.property.viewAll || "Ver todas"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {picsUrls.length} {picsUrls.length === 1 ? (t.property.photo || 'foto') : (t.property.photos || 'fotos')}
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="aspect-video bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Home className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">{t.property.gallery || "Galería de imágenes"}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.property.noImagesAvailable || "No hay imágenes disponibles"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal para ver imagen en pantalla completa */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className={cn(
          "p-0 bg-[var(--prophero-gray-50)] bg-card",
          isImageVertical ? "max-w-2xl w-auto h-auto" : "max-w-7xl w-full h-[90vh]"
        )}>
          <DialogTitle className="sr-only">
            {t.property.gallery || "Galería de imágenes"} - {modalImageIndex + 1} de {picsUrls.length}
          </DialogTitle>
          <div className={cn(
            "relative flex items-center justify-center",
            isImageVertical ? "w-auto h-auto p-4" : "w-full h-full"
          )}>
            {/* Botón cerrar */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)] hover:bg-[var(--prophero-gray-300)] dark:hover:bg-[var(--prophero-gray-600)] text-foreground rounded-full"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Imagen en pantalla completa */}
            {picsUrls[modalImageIndex] ? (
              modalImageError || imageErrors.has(modalImageIndex) ? (
                <div className="text-white text-center">
                  <div className="flex flex-col items-center">
                    <svg className="h-16 w-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <p className="text-lg">Error al cargar la imagen</p>
                    <p className="text-sm opacity-75 mt-2">Imagen {modalImageIndex + 1} de {picsUrls.length}</p>
                  </div>
                </div>
              ) : (
                <div className={cn(
                  "relative flex items-center justify-center",
                  isImageVertical ? "w-full h-auto overflow-visible" : "w-full h-full overflow-auto p-4"
                )}>
                  <img
                    key={modalImageIndex} // Forzar re-render cuando cambia el índice
                    src={picsUrls[modalImageIndex]}
                    alt={`Imagen ${modalImageIndex + 1} de ${picsUrls.length}`}
                    className={cn(
                      "object-contain",
                      isImageVertical ? "w-full h-auto" : "max-w-full max-h-full"
                    )}
                    style={isImageVertical ? {
                      width: '100%',
                      height: 'auto',
                    } : {
                      width: 'auto',
                      height: 'auto',
                      maxWidth: '90%',
                      maxHeight: '90%'
                    }}
                    onLoad={handleImageLoad}
                    onError={() => {
                      setModalImageError(true);
                      setImageErrors((prev) => new Set(prev).add(modalImageIndex));
                    }}
                  />
                </div>
              )
            ) : (
              <div className="text-foreground text-center">
                <Home className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">{t.property.couldNotLoadImage || "No se pudo cargar la imagen"}</p>
              </div>
            )}

            {/* Botones de navegación en el modal (solo si hay más de una imagen) */}
            {picsUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goToPreviousModal}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-[var(--prophero-blue-400)] hover:bg-[var(--prophero-blue-500)] text-white flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={goToNextModal}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-[var(--prophero-blue-400)] hover:bg-[var(--prophero-blue-500)] text-white flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                {/* Contador en el modal */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)] text-foreground px-4 py-2 rounded-full text-sm z-50">
                  {modalImageIndex + 1} / {picsUrls.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sección Fechas - solo en Resumen, orden cronológico de negocio */}
      {hasAnyDate && (
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Fechas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetPhReadyDate && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.propertyDates?.budgetPhReadyDate ?? "Budget PH ready date"}</p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  {budgetPhReadyDate}
                </p>
              </div>
            )}
            {renovatorBudgetApprovalDate && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.propertyDates?.renovatorBudgetApprovalDate ?? "Renovator budget approval date"}</p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  {renovatorBudgetApprovalDate}
                </p>
              </div>
            )}
            {estRenoStartDate && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.propertyDates?.estRenoStartDate ?? "Est. reno start date"}</p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  {estRenoStartDate}
                </p>
              </div>
            )}
            {renoStartDate && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.propertyDates?.renoStartDate ?? "Reno start date"}</p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  {renoStartDate}
                </p>
              </div>
            )}
            {renoEstimatedEndDate && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.propertyDates?.renoEstimatedEndDate ?? "Reno estimated end date"}</p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  {renoEstimatedEndDate}
                </p>
              </div>
            )}
            {renoEndDate && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.propertyDates?.renoEndDate ?? "Reno end date"}</p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  {renoEndDate}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estado y seguimiento - misma información que el panel derecho, mejor presentada */}
      {hasStatusInfo && (
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Estado y seguimiento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fase (sin "Creada el...") */}
            {phaseLabel && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fase</p>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {phaseLabel}
                </span>
              </div>
            )}

            {/* Reformista */}
            {renovatorName && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reformista</p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                  {renovatorName}
                </p>
              </div>
            )}

            {/* Analista de reno */}
            {responsibleOwner && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Analista de reno</p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  {responsibleOwner}
                </p>
              </div>
            )}

            {/* Tipo de reforma */}
            {renoType && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de reforma</p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  {renoType}
                </p>
              </div>
            )}

            {/* Ubicación de las llaves */}
            {keysLocation && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ubicación de las llaves</p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                  {keysLocation}
                </p>
              </div>
            )}

            {/* Fecha de visita inicial (Visit Date desde Airtable) */}
            {formattedInitialVisitDate && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha de visita inicial</p>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  {formattedInitialVisitDate}
                </p>
              </div>
            )}

            {/* Suministros: Agua, Gas, Electricidad + Notas */}
            {hasUtilitiesInfo && (
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suministros</p>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                  {waterStatus != null && waterStatus !== "" && (
                    <span className="flex items-center gap-1.5">
                      <Droplets className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Agua:</span>
                      <span className="text-foreground">{waterStatus}</span>
                    </span>
                  )}
                  {gasStatus != null && gasStatus !== "" && (
                    <span className="flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Gas:</span>
                      <span className="text-foreground">{gasStatus}</span>
                    </span>
                  )}
                  {electricityStatus != null && electricityStatus !== "" && (
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Electricidad:</span>
                      <span className="text-foreground">{electricityStatus}</span>
                    </span>
                  )}
                </div>
                {utilitiesNotes != null && utilitiesNotes !== "" && (
                  <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{utilitiesNotes}</p>
                )}
              </div>
            )}

            {/* Días (según fase) */}
            {daysInfo && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{daysInfo.label}</p>
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  {daysInfo.value} días
                </p>
              </div>
            )}

            {/* Carpeta Drive */}
            {driveFolderUrl && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Carpeta Drive</p>
                <a
                  href={driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
                >
                  <Folder className="h-4 w-4 shrink-0" />
                  Abrir carpeta
                </a>
              </div>
            )}

            {/* Notas Precheck (solo reno-in-progress) */}
            {hasPrecheck && (
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 shrink-0" />
                  Notas Precheck
                </p>
                {supabaseProperty?.reno_precheck_comments ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{supabaseProperty.reno_precheck_comments}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Precheck guardado (sin comentarios).</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Información de la propiedad (incluye habitaciones, baños, m², etc. con mejor diseño) */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Información de la propiedad</h3>
        {/* Características principales: habitaciones, baños, m², etc. */}
        {(bedrooms != null || bathrooms != null || usableArea || builtArea || (parkingSpaces !== undefined && parkingSpaces > 0) || hasElevator || hasBalcony || hasStorage) && (
          <div className="flex flex-wrap gap-3 mb-6 pb-4 border-b">
            {bedrooms != null && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-3 py-1.5 text-sm font-medium text-foreground">
                <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                {bedrooms} {bedrooms === 1 ? 'habitación' : 'habitaciones'}
              </span>
            )}
            {bathrooms != null && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-3 py-1.5 text-sm font-medium text-foreground">
                <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                {bathrooms} {bathrooms === 1 ? 'baño' : 'baños'}
              </span>
            )}
            {usableArea && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-3 py-1.5 text-sm font-medium text-foreground">
                {usableArea} m² útiles
              </span>
            )}
            {builtArea && builtArea !== usableArea && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-3 py-1.5 text-sm font-medium text-foreground">
                {builtArea} m² construidos
              </span>
            )}
            {parkingSpaces !== undefined && parkingSpaces > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-3 py-1.5 text-sm font-medium text-foreground">
                {parkingSpaces} {parkingSpaces === 1 ? 'plaza' : 'plazas'} parking
              </span>
            )}
            {hasElevator && (
              <span className="inline-flex items-center rounded-md bg-muted/60 px-3 py-1.5 text-sm font-medium text-foreground">
                Ascensor
              </span>
            )}
            {hasBalcony && (
              <span className="inline-flex items-center rounded-md bg-muted/60 px-3 py-1.5 text-sm font-medium text-foreground">
                Balcón / Terraza
              </span>
            )}
            {hasStorage && (
              <span className="inline-flex items-center rounded-md bg-muted/60 px-3 py-1.5 text-sm font-medium text-foreground">
                Trastero
              </span>
            )}
          </div>
        )}
        <div className="space-y-4">
          {propertyType && (
            <div className="pt-2 border-t first:border-t-0 first:pt-0">
              <label className="text-sm font-medium text-muted-foreground">Tipo de propiedad</label>
              <p className="mt-1 text-base">{propertyType}</p>
            </div>
          )}
          {orientation && (
            <div className="pt-2 border-t">
              <label className="text-sm font-medium text-muted-foreground">Orientación</label>
              <p className="mt-1 text-base">{orientation}</p>
            </div>
          )}
          {yearBuilt && (
            <div className="pt-2 border-t">
              <label className="text-sm font-medium text-muted-foreground">Año de construcción</label>
              <p className="mt-1 text-base">{yearBuilt}</p>
            </div>
          )}
          {cadastralRef && (
            <div className="pt-2 border-t">
              <label className="text-sm font-medium text-muted-foreground">Referencia catastral</label>
              <p className="mt-1 text-base font-mono text-sm">{cadastralRef}</p>
            </div>
          )}
        </div>
      </div>

      {/* Economic Information */}
      {(salePrice || annualIBI || communityFees) && (
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Información económica</h3>
          <div className="space-y-4">
            {salePrice && (
              <div className="pt-2 border-t first:border-t-0 first:pt-0">
                <label className="text-sm font-medium text-muted-foreground">Precio de venta</label>
                <p className="mt-1 text-xl font-semibold flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  {salePrice.toLocaleString('es-ES')}€
                </p>
              </div>
            )}
            {annualIBI && (
              <div className="pt-2 border-t">
                <label className="text-sm font-medium text-muted-foreground">IBI Anual exacto</label>
                <p className="mt-1 text-base flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  {annualIBI.toLocaleString('es-ES')}€/año
                </p>
              </div>
            )}
            {communityFees && (
              <div className="pt-2 border-t">
                <label className="text-sm font-medium text-muted-foreground">Gastos de comunidad exactos</label>
                <p className="mt-1 text-base flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  {communityFees.toLocaleString('es-ES')}€/mes
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location Map */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Ubicación del inmueble</h3>
        <PropertyMap 
          address={property.fullAddress} 
          areaCluster={supabaseProperty?.area_cluster}
        />
      </div>
    </div>
  );
}

