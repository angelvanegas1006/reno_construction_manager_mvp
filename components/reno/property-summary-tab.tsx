"use client";

import { useState } from "react";
import { MapPin, Home, Calendar, Building2, Euro, FileText, Map, ChevronLeft, ChevronRight, X, Grid3x3 } from "lucide-react";
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
  const { t } = useI18n();

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

      {/* Amenities Grid */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Amenities</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {usableArea && (
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{usableArea} m²</p>
                <p className="text-xs text-muted-foreground">Útil</p>
              </div>
            </div>
          )}
          {builtArea && (
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{builtArea} m²</p>
                <p className="text-xs text-muted-foreground">Construida</p>
              </div>
            </div>
          )}
          {bedrooms && (
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{bedrooms}</p>
                <p className="text-xs text-muted-foreground">Habitaciones</p>
              </div>
            </div>
          )}
          {bathrooms && (
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{bathrooms}</p>
                <p className="text-xs text-muted-foreground">Baños</p>
              </div>
            </div>
          )}
          {parkingSpaces !== undefined && parkingSpaces > 0 && (
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{parkingSpaces}</p>
                <p className="text-xs text-muted-foreground">Plazas parking</p>
              </div>
            </div>
          )}
          {hasElevator && (
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Sí</p>
                <p className="text-xs text-muted-foreground">Ascensor</p>
              </div>
            </div>
          )}
          {hasBalcony && (
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Sí</p>
                <p className="text-xs text-muted-foreground">Balcón/Terraza</p>
              </div>
            </div>
          )}
          {hasStorage && (
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Sí</p>
                <p className="text-xs text-muted-foreground">Trastero</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Property Information */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Información de la propiedad</h3>
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

      {/* Legal and Community Status */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Estado legal y de la comunidad</h3>
        <div className="space-y-3">
          {/* Estos campos vendrían de Supabase/Airtable */}
          <div className="flex items-start gap-2">
            <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
            <p className="text-sm">El edificio tiene una ITE favorable en vigor</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
            <p className="text-sm">Esta propiedad se comercializa en exclusiva</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
            <p className="text-sm">El edificio tiene seguro activo</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
            <p className="text-sm">Comunidad de propietarios constituida</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-600 dark:text-red-400 mt-0.5">✗</span>
            <p className="text-sm">La propiedad no está actualmente alquilada</p>
          </div>
        </div>
      </div>

      {/* Documentation */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Documentación</h3>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Los documentos se cargarán desde la checklist</p>
          {/* Placeholder para documentos cuando estén disponibles */}
        </div>
      </div>

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

