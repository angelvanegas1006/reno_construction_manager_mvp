"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ClipboardCheck, FileCheck, MapPin, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PropertyInfo = {
  address: string | null;
  name: string | null;
  id: string;
  bedrooms: number | null;
  bathrooms: number | null;
  uniqueId: string | null;
};

/**
 * Página pública de selección: un único link por propiedad.
 * Muestra logo Vistral, dirección e información básica; el usuario elige Initial o Final check.
 * URL formato: /checklist-public/{propertyId}
 */
export default function PublicChecklistSelectorPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const resolvedParams = use(params);
  const { propertyId } = resolvedParams;
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasInitialCheck, setHasInitialCheck] = useState(false);
  const [hasFinalCheck, setHasFinalCheck] = useState(false);
  const [checksLoading, setChecksLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("properties")
      .select('id, address, name, bedrooms, bathrooms, "Unique ID From Engagements"')
      .eq("id", propertyId)
      .maybeSingle()
      .then(({ data, error }) => {
        setLoading(false);
        if (error) return;
        if (data) {
          setProperty({
            id: data.id,
            address: data.address ?? null,
            name: data.name ?? null,
            bedrooms: data.bedrooms ?? null,
            bathrooms: data.bathrooms ?? null,
            uniqueId: data["Unique ID From Engagements"] ?? null,
          });
        }
      });
  }, [propertyId]);

  useEffect(() => {
    if (!propertyId) {
      setChecksLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("property_inspections")
      .select("inspection_type")
      .eq("property_id", propertyId)
      .or("inspection_status.eq.completed,completed_at.not.is.null")
      .then(({ data }) => {
        setChecksLoading(false);
        if (!data) return;
        const types = new Set(data.map((r) => r.inspection_type));
        setHasInitialCheck(types.has("initial"));
        setHasFinalCheck(types.has("final"));
      });
  }, [propertyId]);

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-[var(--prophero-gray-50)] dark:bg-[#000000] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <h1 className="text-2xl font-bold">Parámetros inválidos</h1>
          <p className="text-muted-foreground">Falta el ID de la propiedad.</p>
        </div>
      </div>
    );
  }

  const basePath = `/checklist-public/${propertyId}`;
  const displayAddress = property?.address || property?.name || null;
  const hasBasicInfo =
    property &&
    (property.uniqueId != null ||
      property.bedrooms != null ||
      property.bathrooms != null);

  return (
    <div className="min-h-screen bg-[var(--prophero-gray-50)] dark:bg-[#000000] flex flex-col items-center px-4 py-8">
      {/* Logo Vistral */}
      <div className="mb-8 flex justify-center">
        <Image
          src="/vistral-logo.svg"
          alt="Vistral"
          width={160}
          height={48}
          className="dark:hidden"
          priority
        />
        <Image
          src="/vistral-logo-dark.svg"
          alt="Vistral"
          width={160}
          height={48}
          className="hidden dark:block"
          priority
        />
      </div>

      {/* Dirección e información básica */}
      <div className="w-full max-w-md space-y-4 rounded-lg border border-[var(--prophero-gray-200)] dark:border-[var(--prophero-gray-700)] bg-white dark:bg-card p-4 text-left shadow-sm">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando datos de la vivienda...</p>
        ) : (
          <>
            {displayAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">{displayAddress}</p>
              </div>
            )}
            {hasBasicInfo && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-t border-[var(--prophero-gray-200)] dark:border-[var(--prophero-gray-700)] pt-3 mt-3">
                {property?.uniqueId && (
                  <span className="flex items-center gap-1">
                    <Home className="h-3.5 w-3" />
                    Ref. {property.uniqueId}
                  </span>
                )}
                {property?.bedrooms != null && (
                  <span>{property.bedrooms} hab.</span>
                )}
                {property?.bathrooms != null && (
                  <span>{property.bathrooms} baño{property.bathrooms !== 1 ? "s" : ""}</span>
                )}
              </div>
            )}
            {!displayAddress && !hasBasicInfo && (
              <p className="text-xs text-muted-foreground">Ref. {propertyId}</p>
            )}
          </>
        )}
      </div>

      {/* Título y botones */}
      <div className="text-center space-y-8 max-w-md w-full mt-8">
        <h1 className="text-2xl font-bold text-foreground">
          Checklist de inspección
        </h1>
        <p className="text-sm text-muted-foreground">
          {checksLoading
            ? "Comprobando checklists disponibles..."
            : "Elige el tipo de checklist que quieres ver:"}
        </p>

        <div className="flex flex-col gap-4">
          {!checksLoading && hasInitialCheck && (
            <Link
              href={`${basePath}/initial`}
              className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-lg border-2 border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] bg-white dark:bg-card hover:border-[var(--prophero-blue-500)] hover:bg-[var(--prophero-blue-50)] dark:hover:bg-[var(--prophero-blue-950)]/20 transition-colors text-foreground font-medium"
            >
              <ClipboardCheck className="h-6 w-6 shrink-0" />
              Ver Initial check
            </Link>
          )}
          {!checksLoading && hasFinalCheck && (
            <Link
              href={`${basePath}/final`}
              className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-lg border-2 border-[var(--prophero-gray-300)] dark:border-[var(--prophero-gray-600)] bg-white dark:bg-card hover:border-[var(--prophero-blue-500)] hover:bg-[var(--prophero-blue-50)] dark:hover:bg-[var(--prophero-blue-950)]/20 transition-colors text-foreground font-medium"
            >
              <FileCheck className="h-6 w-6 shrink-0" />
              Ver Final check
            </Link>
          )}
          {!checksLoading && !hasInitialCheck && !hasFinalCheck && (
            <p className="text-sm text-muted-foreground py-4">
              No hay checklists disponibles para esta propiedad. Finalízalos desde la aplicación.
            </p>
          )}
        </div>

        {!checksLoading && (hasInitialCheck || hasFinalCheck) && (
          <p className="text-xs text-muted-foreground">
            Si el checklist no está disponible aún, finalízalo primero desde la aplicación.
          </p>
        )}
      </div>
    </div>
  );
}
