"use client";

import { MapPin, Home, Calendar, Building2, Euro, FileText, Map } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-6">
      {/* Image Gallery - Coming Soon */}
      <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
        <div className="aspect-video bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Galería de imágenes</p>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
            <p className="text-xs text-muted-foreground">Las imágenes se cargarán desde la checklist</p>
          </div>
        </div>
      </div>

      {/* Amenities Grid */}
      <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Amenities</h3>
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
      <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Información de la propiedad</h3>
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
        <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Información económica</h3>
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
      <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
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
      <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Documentación</h3>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Los documentos se cargarán desde la checklist</p>
          {/* Placeholder para documentos cuando estén disponibles */}
        </div>
      </div>

      {/* Location Map */}
      <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Ubicación del inmueble</h3>
        <div className="aspect-video bg-[var(--prophero-gray-100)] dark:bg-[var(--prophero-gray-800)] rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Map className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">{property.fullAddress}</p>
            <p className="text-xs text-muted-foreground mt-1">Mapa - Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

