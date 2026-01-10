"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { calculateNextUpdateDate } from "@/lib/reno/update-calculator";

interface UsePropertyTrackingOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook para actualizar el estado de seguimiento de obra de una propiedad
 * Solo permite actualizar si el usuario tiene rol construction_manager o admin
 * y la propiedad está en fase reno-in-progress
 */
export function usePropertyTracking(options?: UsePropertyTrackingOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { t } = useI18n();
  const supabase = createClient();

  const updateTracking = async (
    propertyId: string,
    needsTracking: boolean
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Verificar que la propiedad existe y está en fase reno-in-progress
      const { data: property, error: fetchError } = await supabase
        .from("properties")
        .select("id, reno_phase")
        .eq("id", propertyId)
        .single();

      if (fetchError || !property) {
        throw new Error("Propiedad no encontrada");
      }

      if (property.reno_phase !== "reno-in-progress") {
        throw new Error("Solo se puede marcar seguimiento para propiedades en fase reno-in-progress");
      }

      // Actualizar el campo needs_foreman_notification
      const { error: updateError } = await supabase
        .from("properties")
        .update({ needs_foreman_notification: needsTracking })
        .eq("id", propertyId);

      if (updateError) {
        throw updateError;
      }

      // Si se marca como que necesita seguimiento, crear visita automática en calendario
      if (needsTracking) {
        // Obtener next_update, start_date y renovation_type para calcular fecha correctamente
        const { data: propertyData } = await supabase
          .from("properties")
          .select("next_update, start_date, renovation_type")
          .eq("id", propertyId)
          .single();

        // Calcular fecha correctamente según tipo de reno
        let visitDate = propertyData?.next_update;
        if (!visitDate) {
          // Si no hay next_update, calcular según tipo de reno
          const renoStartDate = propertyData?.start_date;
          const renoType = propertyData?.renovation_type;
          visitDate = calculateNextUpdateDate(null, renoType, renoStartDate);
        }
        
        if (visitDate) {
          // Verificar si ya existe una visita de tipo obra-seguimiento para esta propiedad
          const { data: existingVisit } = await supabase
            .from("property_visits")
            .select("id")
            .eq("property_id", propertyId)
            .eq("visit_type", "obra-seguimiento")
            .single();

          if (!existingVisit) {
            // Crear visita automática
            const { error: visitError } = await supabase
              .from("property_visits")
              .insert({
                property_id: propertyId,
                visit_date: visitDate,
                visit_type: "obra-seguimiento",
                notes: "Seguimiento de obra solicitado por Gerente de Construcción",
              });

            if (visitError) {
              console.warn("Error al crear visita automática:", visitError);
              // No lanzar error, solo registrar warning
            }
          }
        }
      } else {
        // Si se desmarca, eliminar visitas automáticas de tipo obra-seguimiento
        // que fueron creadas por el sistema (sin notas personalizadas o con notas específicas)
        const { error: deleteError } = await supabase
          .from("property_visits")
          .delete()
          .eq("property_id", propertyId)
          .eq("visit_type", "obra-seguimiento")
          .or("notes.is.null,notes.eq.Seguimiento de obra solicitado por Gerente de Construcción");

        if (deleteError) {
          console.warn("Error al eliminar visita automática:", deleteError);
          // No lanzar error, solo registrar warning
        }
      }

      toast.success(
        needsTracking
          ? t.property?.trackingEnabled || "Seguimiento de obra activado"
          : t.property?.trackingDisabled || "Seguimiento de obra desactivado"
      );

      options?.onSuccess?.();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Error desconocido");
      setError(error);
      toast.error(
        error.message || t.property?.trackingError || "Error al actualizar seguimiento"
      );
      options?.onError?.(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateTracking,
    isLoading,
    error,
  };
}
