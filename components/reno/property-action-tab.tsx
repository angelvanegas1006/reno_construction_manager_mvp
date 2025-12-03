"use client";

import { Wrench, Calendar, Clock, User, FileText } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PropertyCommentsSection } from "@/components/reno/property-comments-section";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { findRecordByPropertyId, updateAirtableWithRetry } from "@/lib/airtable/client";
import { getPropertyRenoPhaseFromSupabase } from "@/lib/supabase/property-converter";

interface PropertyActionTabProps {
  property: Property;
  supabaseProperty?: any;
  propertyId?: string | null;
  onUpdateRenovatorName?: (newName: string) => Promise<boolean>;
}

/**
 * PropertyActionTab Component
 * 
 * Página de "Acción/Ejecución" - Muestra información sobre la ejecución de obras
 * y acciones pendientes o en curso
 */
export function PropertyActionTab({
  property,
  supabaseProperty,
  propertyId,
  onUpdateRenovatorName,
}: PropertyActionTabProps) {
  const { t, language } = useI18n();

  // Determinar la fase correctamente usando el mapeo de Set Up Status si es necesario
  const renoPhase = supabaseProperty 
    ? (getPropertyRenoPhaseFromSupabase(supabaseProperty) || supabaseProperty?.reno_phase || "upcoming-settlements")
    : "upcoming-settlements";
  
  // Debug: Log para verificar la fase detectada
  useEffect(() => {
    if (supabaseProperty && propertyId) {
      console.log('[PropertyActionTab] Debug info:', {
        propertyId,
        reno_phase: supabaseProperty?.reno_phase,
        setUpStatus: supabaseProperty?.['Set Up Status'],
        detectedPhase: renoPhase,
        address: supabaseProperty?.address,
      });
    }
  }, [supabaseProperty, propertyId, renoPhase]);
  const nextRenoSteps = supabaseProperty?.next_reno_steps;
  const estimatedVisitDate = supabaseProperty?.['Estimated Visit Date'];
  const technicalConstructor = supabaseProperty?.['Technical construction'] || supabaseProperty?.technical_construction;
  const responsibleOwner = supabaseProperty?.responsible_owner;
  
  // Campos para Upcoming Reno
  const setUpStatus = supabaseProperty?.['Set Up Status'];
  const renovatorNameFromSupabase = supabaseProperty?.['Renovator name'];
  const estimatedEndDate = supabaseProperty?.estimated_end_date;
  const renoStartDate = supabaseProperty?.start_date;

  // Estado local para el campo editable de Renovator name (solo para reno-budget-renovator)
  const [localRenovatorName, setLocalRenovatorName] = useState<string>(renovatorNameFromSupabase || "");
  const [isSavingRenovatorName, setIsSavingRenovatorName] = useState(false);

  // Actualizar estado local cuando cambia el valor de Supabase
  useEffect(() => {
    setLocalRenovatorName(renovatorNameFromSupabase || "");
  }, [renovatorNameFromSupabase]);

  // Función para actualizar Renovator name en Supabase y Airtable
  const handleRenovatorNameChange = async (newValue: string) => {
    if (!propertyId || !onUpdateRenovatorName) return;

    setIsSavingRenovatorName(true);
    try {
      // Actualizar en Supabase primero
      const success = await onUpdateRenovatorName(newValue);
      
      if (success) {
        // Luego actualizar en Airtable
        // Usar el nombre de tabla correcto (el mismo que se usa en otros lugares)
        const AIRTABLE_TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Properties';
        const recordId = await findRecordByPropertyId(AIRTABLE_TABLE_NAME, propertyId);
        
        if (recordId) {
          const airtableSuccess = await updateAirtableWithRetry(
            AIRTABLE_TABLE_NAME,
            recordId,
            {
              'Renovator Name': newValue || null,
            }
          );
          
          if (airtableSuccess) {
            toast.success("Renovador actualizado", {
              description: "El nombre del renovador se ha actualizado correctamente.",
            });
          } else {
            toast.warning("Actualizado parcialmente", {
              description: "Se actualizó en Supabase pero hubo un problema al sincronizar con Airtable.",
            });
          }
        } else {
          toast.warning("Actualizado parcialmente", {
            description: "Se actualizó en Supabase pero no se encontró el registro en Airtable.",
          });
        }
      } else {
        toast.error("Error al actualizar", {
          description: "No se pudo actualizar el nombre del renovador.",
        });
        // Revertir el cambio local
        setLocalRenovatorName(renovatorNameFromSupabase || "");
      }
    } catch (error) {
      console.error("Error updating renovator name:", error);
      toast.error("Error al actualizar", {
        description: "Ocurrió un error al actualizar el nombre del renovador.",
      });
      // Revertir el cambio local
      setLocalRenovatorName(renovatorNameFromSupabase || "");
    } finally {
      setIsSavingRenovatorName(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Información para fase Upcoming Reno */}
      {renoPhase === "upcoming-settlements" && (
        <>
          {/* Set Up Status */}
          {setUpStatus && (
            <div className="bg-card bg-card rounded-lg border p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5" />
                {t.propertyAction.preparationStatus}
              </h3>
              <p className="text-sm text-foreground">{setUpStatus}</p>
            </div>
          )}

          {/* Next Reno Steps */}
          {nextRenoSteps && (
            <div className="bg-card bg-card rounded-lg border p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                <Wrench className="h-5 w-5" />
                {t.propertyAction.nextRenoSteps}
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">{nextRenoSteps}</p>
            </div>
          )}

          {/* Renovator Name */}
          {renovatorNameFromSupabase && (
            <div className="bg-card bg-card rounded-lg border p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                <User className="h-5 w-5" />
                {t.propertyAction.renovator}
              </h3>
              <p className="text-sm text-foreground">{renovatorNameFromSupabase}</p>
            </div>
          )}

          {/* Fechas de Reforma */}
          {(renoStartDate || estimatedEndDate) && (
            <div className="bg-card bg-card rounded-lg border p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                <Calendar className="h-5 w-5" />
                {t.propertyAction.renovationDates}
              </h3>
              <div className="space-y-3">
                {renoStartDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t.propertyAction.startDate}</label>
                    <p className="text-sm text-foreground mt-1">{formatDate(renoStartDate)}</p>
                  </div>
                )}
                {estimatedEndDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t.propertyAction.estimatedEndDate}</label>
                    <p className="text-sm text-foreground mt-1">{formatDate(estimatedEndDate)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Campo editable de Renovator Name para fase reno-budget-renovator y reno-budget-client */}
      {(renoPhase === "reno-budget-renovator" || renoPhase === "reno-budget-client") && (
        <div className="bg-card bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
            <User className="h-5 w-5" />
            {t.propertyAction.renovator || "Renovador"}
          </h3>
          <Input
            type="text"
            value={localRenovatorName}
            onChange={(e) => setLocalRenovatorName(e.target.value)}
            onBlur={(e) => {
              const newValue = e.target.value.trim();
              if (newValue !== (renovatorNameFromSupabase || "")) {
                handleRenovatorNameChange(newValue);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            placeholder="Nombre del renovador"
            disabled={isSavingRenovatorName}
            className="w-full"
          />
          {isSavingRenovatorName && (
            <p className="text-xs text-muted-foreground mt-2">Guardando...</p>
          )}
        </div>
      )}

      {/* Mostrar fecha estimada solo si no está en upcoming-settlements ni en las fases de budget */}
      {estimatedVisitDate && renoPhase !== "upcoming-settlements" && renoPhase !== "reno-budget-renovator" && renoPhase !== "reno-budget-client" && (
        <div className="bg-card bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t.propertyAction.estimatedVisitDate}
          </h3>
          <p className="text-sm text-foreground">
            {formatDate(estimatedVisitDate)}
          </p>
        </div>
      )}
    </div>
  );
}

