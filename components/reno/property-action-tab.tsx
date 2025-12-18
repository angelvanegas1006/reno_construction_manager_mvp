"use client";

import { Wrench, Calendar, Clock, User, FileText } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PropertyCommentsSection } from "@/components/reno/property-comments-section";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { findTransactionsRecordIdByUniqueId, updateAirtableWithRetry } from "@/lib/airtable/client";
import { createClient } from "@/lib/supabase/client";
import { getPropertyRenoPhaseFromSupabase } from "@/lib/supabase/property-converter";
import { RenovatorCombobox } from "@/components/reno/renovator-combobox";

interface PropertyActionTabProps {
  property: Property;
  supabaseProperty?: any;
  propertyId?: string | null;
  onUpdateRenovatorName?: (newName: string) => Promise<boolean>;
  allProperties?: Property[]; // Lista de todas las propiedades para el combobox
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
  allProperties = [],
}: PropertyActionTabProps) {
  const { t, language } = useI18n();
  const supabase = createClient();

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
        // IMPORTANTE: El Record ID siempre está en "Transactions", no en "Properties"
        // Actualizar en Airtable usando Transactions table
        const AIRTABLE_TABLE_NAME = 'Transactions';
        
        // Obtener Unique ID desde Supabase para buscar en Transactions
        const { data: propertyData } = await supabase
          .from('properties')
          .select('"Unique ID From Engagements"')
          .eq('id', propertyId)
          .single();
        
        const uniqueId = propertyData?.['Unique ID From Engagements'];
        
        if (!uniqueId) {
          console.warn(`[PropertyActionTab] Property ${propertyId} does not have Unique ID From Engagements. Cannot update Airtable.`);
          toast.warning("Actualizado parcialmente", {
            description: "Se actualizó en Supabase pero no se encontró el Unique ID para sincronizar con Airtable.",
          });
          return;
        }
        
        // Buscar el Record ID de Transactions usando el Unique ID
        const recordId = await findTransactionsRecordIdByUniqueId(uniqueId);
        
        if (recordId) {
          const airtableSuccess = await updateAirtableWithRetry(
            AIRTABLE_TABLE_NAME,
            recordId,
            {
              'fldSgzZxPcfZGjTFF': newValue || null, // Renovator name field ID
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
            description: "Se actualizó en Supabase pero no se encontró el registro en Airtable Transactions.",
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
            <div className="bg-card rounded-lg border p-4 md:p-6 shadow-sm">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                <span className="break-words">{t.propertyAction.preparationStatus}</span>
              </h3>
              <p className="text-sm text-foreground break-words">{setUpStatus}</p>
            </div>
          )}

          {/* Next Reno Steps */}
          {nextRenoSteps && (
            <div className="bg-card rounded-lg border p-4 md:p-6 shadow-sm">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                <Wrench className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                <span className="break-words">{t.propertyAction.nextRenoSteps}</span>
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{nextRenoSteps}</p>
            </div>
          )}

          {/* Renovator Name - Solo mostrar si no está en las fases de budget donde es editable */}
          {renovatorNameFromSupabase && renoPhase !== "reno-budget-renovator" && renoPhase !== "reno-budget-client" && (
            <div className="bg-card rounded-lg border p-4 md:p-6 shadow-sm">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                <User className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                <span className="break-words">{t.propertyAction.renovator}</span>
              </h3>
              <p className="text-sm text-foreground break-words">{renovatorNameFromSupabase}</p>
            </div>
          )}

          {/* Fechas de Reforma */}
          {(renoStartDate || estimatedEndDate) && (
            <div className="bg-card rounded-lg border p-4 md:p-6 shadow-sm">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                <span className="break-words">{t.propertyAction.renovationDates}</span>
              </h3>
              <div className="space-y-3">
                {renoStartDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t.propertyAction.startDate}</label>
                    <p className="text-sm text-foreground mt-1 break-words">{formatDate(renoStartDate)}</p>
                  </div>
                )}
                {estimatedEndDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t.propertyAction.estimatedEndDate}</label>
                    <p className="text-sm text-foreground mt-1 break-words">{formatDate(estimatedEndDate)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Campo editable de Renovator Name para fase reno-budget-renovator y reno-budget-client */}
      {(renoPhase === "reno-budget-renovator" || renoPhase === "reno-budget-client") && (
        <div className="bg-card rounded-lg border p-4 md:p-6 shadow-sm">
          <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
            <User className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
            <span className="break-words">{t.propertyAction.renovator || "Renovador"}</span>
          </h3>
          {allProperties.length > 0 ? (
            <RenovatorCombobox
              properties={allProperties}
              value={localRenovatorName}
              onValueChange={(newValue) => {
                const trimmedValue = newValue?.trim() || "";
                setLocalRenovatorName(trimmedValue);
                // Guardar automáticamente cuando se selecciona un renovador del combobox
                if (trimmedValue && trimmedValue !== (renovatorNameFromSupabase || "")) {
                  handleRenovatorNameChange(trimmedValue);
                }
              }}
              placeholder="Buscar renovador..."
              disabled={isSavingRenovatorName}
            />
          ) : (
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
          )}
          {isSavingRenovatorName && (
            <p className="text-xs text-muted-foreground mt-2">Guardando...</p>
          )}
        </div>
      )}

      {/* Mostrar fecha estimada solo si no está en upcoming-settlements ni en las fases de budget */}
      {estimatedVisitDate && renoPhase !== "upcoming-settlements" && renoPhase !== "reno-budget-renovator" && renoPhase !== "reno-budget-client" && (
        <div className="bg-card rounded-lg border p-4 md:p-6 shadow-sm">
          <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
            <span className="break-words">{t.propertyAction.estimatedVisitDate}</span>
          </h3>
          <p className="text-sm text-foreground break-words">
            {formatDate(estimatedVisitDate)}
          </p>
        </div>
      )}
    </div>
  );
}

