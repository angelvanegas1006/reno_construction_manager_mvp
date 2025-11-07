"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartnerSidebar } from "@/components/partner/sidebar";
import { getPropertyById, Property } from "@/lib/property-storage";

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id && typeof params.id === "string") {
      const found = getPropertyById(params.id);
      setProperty(found);
      setIsLoading(false);
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <PartnerSidebar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex h-screen overflow-hidden">
        <PartnerSidebar />
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-lg font-semibold text-foreground mb-2">
            Propiedad no encontrada
          </p>
          <Button onClick={() => router.push("/partner/kanban")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al kanban
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <PartnerSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-card dark:bg-[var(--prophero-gray-900)] px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/partner/kanban")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Propiedad ID {property.id}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Estado: {getStageLabel(property.currentStage)}
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--prophero-gray-50)] dark:bg-[var(--prophero-gray-950)]">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Property Information Card */}
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Información de la Propiedad</h2>
              
              <div className="space-y-4">
                {/* Address */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Dirección completa
                  </label>
                  <div className="mt-1 flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-base font-medium">{property.fullAddress}</p>
                  </div>
                </div>

                {/* Auxiliary Address Fields */}
                {(property.planta || property.puerta || property.bloque || property.escalera) && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    {property.planta && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Planta
                        </label>
                        <p className="mt-1 text-base">{property.planta}</p>
                      </div>
                    )}
                    {property.puerta && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Puerta
                        </label>
                        <p className="mt-1 text-base">{property.puerta}</p>
                      </div>
                    )}
                    {property.bloque && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Bloque
                        </label>
                        <p className="mt-1 text-base">{property.bloque}</p>
                      </div>
                    )}
                    {property.escalera && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Escalera
                        </label>
                        <p className="mt-1 text-base">{property.escalera}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Property Type */}
                <div className="pt-2 border-t">
                  <label className="text-sm font-medium text-muted-foreground">
                    Tipo de propiedad
                  </label>
                  <p className="mt-1 text-base">{property.propertyType}</p>
                </div>

                {/* Stage */}
                <div className="pt-2 border-t">
                  <label className="text-sm font-medium text-muted-foreground">
                    Etapa actual
                  </label>
                  <p className="mt-1 text-base">{getStageLabel(property.currentStage)}</p>
                </div>

                {/* Created Date */}
                {property.createdAt && (
                  <div className="pt-2 border-t">
                    <label className="text-sm font-medium text-muted-foreground">
                      Fecha de creación
                    </label>
                    <p className="mt-1 text-base">
                      {new Date(property.createdAt).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Placeholder for future sections */}
            <div className="bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Detalles Adicionales</h2>
              <p className="text-sm text-muted-foreground">
                Los detalles adicionales de la propiedad se mostrarán aquí.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStageLabel(stage: Property["currentStage"]): string {
  const labels: Record<Property["currentStage"], string> = {
    draft: "Borrador",
    review: "En revisión",
    "needs-correction": "Necesita corrección",
    negotiation: "En negociación",
    "pending-arras": "Pendiente de Arras",
    settlement: "Escrituración",
    sold: "Vendido",
    rejected: "Rechazado",
  };
  return labels[stage] || stage;
}




