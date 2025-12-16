"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Property } from "@/lib/property-storage";
import { createClient } from "@/lib/supabase/client";
import { findTransactionsRecordIdByUniqueId, updateAirtableWithRetry } from "@/lib/airtable/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { mapSetUpStatusToKanbanPhase } from "@/lib/supabase/kanban-mapping";
import type { RenoKanbanPhase } from "@/lib/reno-kanban-config";

interface TodoWidgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  widgetType: 'estimated-visit' | 'initial-check' | 'renovator' | 'work-update' | 'final-check' | null;
}

export function TodoWidgetModal({ open, onOpenChange, property, widgetType }: TodoWidgetModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [estimatedVisitDate, setEstimatedVisitDate] = useState<string>("");
  const [renovatorName, setRenovatorName] = useState<string>("");

  // Inicializar valores cuando se abre el modal
  useEffect(() => {
    if (open && property) {
      if (widgetType === 'estimated-visit') {
        // Formatear fecha para input type="date" (YYYY-MM-DD)
        const dateValue = property.estimatedVisitDate || (property as any).supabaseProperty?.['Estimated Visit Date'];
        if (dateValue) {
          // Si es una fecha ISO, convertir a YYYY-MM-DD
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            setEstimatedVisitDate(date.toISOString().split('T')[0]);
          } else {
            setEstimatedVisitDate(dateValue.split('T')[0]); // Ya está en formato YYYY-MM-DD
          }
        } else {
          setEstimatedVisitDate("");
        }
      } else if (widgetType === 'renovator') {
        setRenovatorName(property.renovador || (property as any).supabaseProperty?.['Renovator name'] || "");
      }
    }
  }, [open, property, widgetType]);

  // Obtener información de la propiedad desde supabaseProperty
  const supabaseProperty = (property as any)?.supabaseProperty;
  const propertyId = property?.id;
  const address = property?.address || property?.fullAddress || "";
  const uniqueId = property?.uniqueIdFromEngagements || property?.id || "";
  const areaCluster = supabaseProperty?.area_cluster || property?.region || "";
  const renoType = supabaseProperty?.renovation_type || property?.renoType || "";

  // Manejar guardado de Estimated Visit Date
  const handleSaveEstimatedVisitDate = async () => {
    if (!propertyId) return;

    setIsSaving(true);
    try {
      // Formatear fecha para Supabase (YYYY-MM-DD)
      const supabaseDate = estimatedVisitDate || null;
      
      console.log(`[Todo Widget] Starting Estimated Visit Date save:`, {
        propertyId,
        estimatedVisitDate,
        supabaseDate,
      });
      
      // Obtener la fase actual de la propiedad
      const { data: currentProperty } = await supabase
        .from('properties')
        .select('reno_phase, "Set Up Status"')
        .eq('id', propertyId)
        .single();
      
      const currentPhase = currentProperty?.reno_phase as RenoKanbanPhase | null;
      const currentSetUpStatus = currentProperty?.['Set Up Status'] as string | null;
      
      // Preparar actualizaciones
      const supabaseUpdates: Record<string, any> = {
        'Estimated Visit Date': supabaseDate,
        updated_at: new Date().toISOString(),
      };
      
      // Si la propiedad está en upcoming-settlements y se está guardando una fecha nueva,
      // moverla a initial-check
      if (currentPhase === 'upcoming-settlements' && supabaseDate) {
        supabaseUpdates['Set Up Status'] = 'initial check';
        // También actualizar reno_phase para mantener consistencia
        supabaseUpdates['reno_phase'] = 'initial-check';
      }
      
      // Actualizar en Supabase
      const { error: supabaseError } = await supabase
        .from('properties')
        .update(supabaseUpdates)
        .eq('id', propertyId);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }
      
      console.log(`[Todo Widget] ✅ Successfully updated Supabase for property ${propertyId}`);

      // IMPORTANTE: El Record ID siempre está en "Transactions", no en "Properties"
      // Actualizar en Airtable usando airtable_property_id (Record_ID)
      const AIRTABLE_TABLE_NAME = 'Transactions';
      
      console.log(`[Todo Widget] Starting Airtable sync:`, {
        propertyId,
        estimatedVisitDate,
        tableName: AIRTABLE_TABLE_NAME,
      });
      
      // Obtener airtable_property_id y Unique ID desde Supabase
      const { data: propertyData } = await supabase
        .from('properties')
        .select('airtable_property_id, "Unique ID From Engagements"')
        .eq('id', propertyId)
        .single();
      
      const airtablePropertyId = propertyData?.airtable_property_id;
      const uniqueId = propertyData?.['Unique ID From Engagements'];
      
      // Validate that airtable_property_id exists (all properties should have it)
      if (!airtablePropertyId) {
        console.error(`[Todo Widget] Property ${propertyId} does not have airtable_property_id. All properties should have this field because they are created from Airtable.`);
        console.error(`[Todo Widget] Property data:`, {
          id: propertyId,
          hasAirtablePropertyId: !!propertyData?.airtable_property_id,
        });
        toast.error("Error: La propiedad no tiene ID de Airtable. Contacta al administrador.");
        // Continue but don't update Airtable
        toast.success("Visita estimada guardada en Supabase", {
          description: currentPhase === 'upcoming-settlements' 
            ? "La fecha de visita estimada se ha guardado y la propiedad se ha movido a Revisión Inicial. No se pudo sincronizar con Airtable."
            : "La fecha de visita estimada se ha guardado correctamente. No se pudo sincronizar con Airtable.",
        });
        onOpenChange(false);
        window.location.reload();
        return;
      }
      
      // IMPORTANTE: Usar Unique ID para buscar directamente en Transactions (método más confiable)
      // El Unique ID corresponde al campo "UNIQUEID (from Engagements)" en Airtable Transactions
      if (!uniqueId) {
        console.error(`[Todo Widget] Property ${propertyId} does not have Unique ID From Engagements. Cannot update Airtable.`);
        toast.error("Error: La propiedad no tiene Unique ID. Contacta al administrador.");
        toast.success("Visita estimada guardada en Supabase", {
          description: "La fecha de visita estimada se ha guardado correctamente. No se pudo sincronizar con Airtable.",
        });
        onOpenChange(false);
        window.location.reload();
        return;
      }

      console.log(`[Todo Widget] Searching Transactions by Unique ID:`, uniqueId);
      
      // Buscar el Record ID de Transactions usando el Unique ID
      const recordId = await findTransactionsRecordIdByUniqueId(uniqueId);

      if (!recordId) {
        console.error(`[Todo Widget] Airtable Transactions record not found for Unique ID ${uniqueId}.`);
        toast.error("Error: No se encontró el registro en Airtable. Contacta al administrador.");
        toast.success("Visita estimada guardada en Supabase", {
          description: currentPhase === 'upcoming-settlements' 
            ? "La fecha de visita estimada se ha guardado y la propiedad se ha movido a Revisión Inicial. No se pudo sincronizar con Airtable."
            : "La fecha de visita estimada se ha guardado correctamente. No se pudo sincronizar con Airtable.",
        });
        onOpenChange(false);
        window.location.reload();
        return;
      }
      
      console.log(`[Todo Widget] ✅ Found Transactions Record ID:`, recordId);
      console.log(`[Todo Widget] 📋 About to update Airtable with:`, {
        tableName: AIRTABLE_TABLE_NAME,
        recordId,
        estimatedVisitDate,
        propertyId,
        airtablePropertyId,
        uniqueId,
      });
      
      // Formatear fecha para Airtable (YYYY-MM-DD)
      const airtableDate = estimatedVisitDate || null;
      
      // Update Est. visit date in Airtable (field ID: fldIhqPOAFL52MMBn)
      // NOTE: "Set Up Status" field does not exist in "Transactions" table,
      // so we only update the Estimated Visit Date here.
      // The "Set Up Status" is already updated in Supabase, which is the source of truth.
      const airtableUpdates: Record<string, any> = {
        'fldIhqPOAFL52MMBn': airtableDate, // Est. visit date field ID
      };
      
      console.log(`[Todo Widget] 🚀 Attempting to update Airtable (Transactions):`, {
        tableName: AIRTABLE_TABLE_NAME,
        recordId,
        airtableFields: airtableUpdates,
        propertyId,
        airtablePropertyId,
        uniqueId,
      });
      
      const airtableSuccess = await updateAirtableWithRetry(
        AIRTABLE_TABLE_NAME,
        recordId,
        airtableUpdates
      );
      
      console.log(`[Todo Widget] 📊 Airtable update result:`, {
        success: airtableSuccess,
        recordId,
        tableName: AIRTABLE_TABLE_NAME,
        fields: airtableUpdates,
      });

      if (airtableSuccess) {
        console.log(`[Todo Widget] ✅ Successfully updated Airtable (Transactions) for property ${propertyId}`);
        toast.success("Visita estimada guardada y sincronizada con Airtable", {
          description: currentPhase === 'upcoming-settlements' 
            ? "La fecha de visita estimada se ha guardado en Supabase y Airtable, y la propiedad se ha movido a Revisión Inicial."
            : "La fecha de visita estimada se ha guardado correctamente en Supabase y Airtable.",
        });
        onOpenChange(false);
        // Recargar la página para reflejar los cambios
        window.location.reload();
      } else {
        console.error(`[Todo Widget] Failed to update Airtable (Transactions) for property ${propertyId}`, {
          tableName: AIRTABLE_TABLE_NAME,
          recordId,
          airtableFields: airtableUpdates,
          airtablePropertyId,
          propertyId,
        });
        toast.error("Error: No se pudo actualizar Airtable", {
          description: "Se guardó en Supabase pero hubo un problema al sincronizar con Airtable. Contacta al administrador.",
        });
      }
    } catch (error: any) {
      console.error("Error saving estimated visit date:", error);
      toast.error("Error al guardar", {
        description: error.message || "Ocurrió un error al guardar la fecha de visita estimada.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Manejar guardado de Renovator Name
  const handleSaveRenovatorName = async () => {
    if (!propertyId) return;

    setIsSaving(true);
    try {
      // Obtener la fase actual de la propiedad
      const { data: currentProperty } = await supabase
        .from('properties')
        .select('reno_phase, "Set Up Status"')
        .eq('id', propertyId)
        .single();
      
      const currentPhase = currentProperty?.reno_phase as RenoKanbanPhase | null;
      const currentSetUpStatus = currentProperty?.['Set Up Status'] as string | null;
      
      // Preparar actualizaciones
      const supabaseUpdates: Record<string, any> = {
        'Renovator name': renovatorName || null,
        updated_at: new Date().toISOString(),
      };
      
      // Si la propiedad está en reno-budget-renovator o reno-budget-client y se está guardando un renovador,
      // moverla a la siguiente fase apropiada
      // Si está en reno-budget-renovator sin renovador, al agregar uno debería quedarse ahí
      // Si está en reno-budget-client sin renovador, al agregar uno podría moverse a reno-budget-start
      // Por ahora, solo actualizamos el renovador sin cambiar la fase automáticamente
      // La fase se cambiará cuando se complete el presupuesto o se avance manualmente
      
      // Actualizar en Supabase
      const { error: supabaseError } = await supabase
        .from('properties')
        .update(supabaseUpdates)
        .eq('id', propertyId);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      // IMPORTANTE: El Record ID siempre está en "Transactions", no en "Properties"
      // Actualizar en Airtable
      const AIRTABLE_TABLE_NAME = 'Transactions';
      
      // Obtener airtable_property_id y Unique ID desde Supabase
      const { data: propertyData } = await supabase
        .from('properties')
        .select('airtable_property_id, "Unique ID From Engagements"')
        .eq('id', propertyId)
        .single();
      
      const airtablePropertyId = propertyData?.airtable_property_id;
      const uniqueId = propertyData?.['Unique ID From Engagements'];
      
      if (!airtablePropertyId) {
        console.error(`[Todo Widget] Property ${propertyId} does not have airtable_property_id. All properties should have this field because they are created from Airtable.`);
        toast.error("Error: La propiedad no tiene ID de Airtable. Contacta al administrador.");
        return;
      }
      
      // Buscar el Record ID de Transactions usando el Unique ID
      if (!uniqueId) {
        console.error(`[Todo Widget] Property ${propertyId} does not have Unique ID From Engagements. Cannot update Airtable.`);
        toast.error("Error: La propiedad no tiene Unique ID. Contacta al administrador.");
        toast.success("Renovador guardado en Supabase", {
          description: "El renovador se ha guardado correctamente. No se pudo sincronizar con Airtable.",
        });
        onOpenChange(false);
        window.location.reload();
        return;
      }
      
      console.log(`[Todo Widget] Searching Transactions by Unique ID:`, uniqueId);
      const recordId = await findTransactionsRecordIdByUniqueId(uniqueId);
      
      // Si no se encontró, no intentar actualizar Airtable
      if (!recordId) {
        console.warn(`[Todo Widget] ⚠️ No Transactions record found for Unique ID ${uniqueId}. Skipping Airtable update.`);
        toast.success("Renovador guardado en Supabase", {
          description: "El renovador se ha guardado correctamente. No se pudo sincronizar con Airtable (no se encontró el registro de Transactions).",
        });
        onOpenChange(false);
        window.location.reload();
        return;
      }

      if (recordId) {
        const airtableSuccess = await updateAirtableWithRetry(
          AIRTABLE_TABLE_NAME,
          recordId,
          {
            'Renovator Name': renovatorName || null,
          }
        );

        if (airtableSuccess) {
          toast.success("Renovador guardado", {
            description: "El nombre del renovador se ha guardado correctamente.",
          });
          onOpenChange(false);
          // Recargar la página para reflejar los cambios
          window.location.reload();
        } else {
          toast.warning("Guardado parcialmente", {
            description: "Se guardó en Supabase pero hubo un problema al sincronizar con Airtable.",
          });
        }
      } else {
        toast.warning("Guardado parcialmente", {
          description: "Se guardó en Supabase pero no se encontró el registro en Airtable.",
        });
      }
    } catch (error: any) {
      console.error("Error saving renovator name:", error);
      toast.error("Error al guardar", {
        description: error.message || "Ocurrió un error al guardar el nombre del renovador.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Manejar navegación para casos que redirigen
  const handleNavigate = () => {
    if (!propertyId) return;
    
    onOpenChange(false);
    
    if (widgetType === 'initial-check') {
      router.push(`/reno/construction-manager/property/${propertyId}?tab=tareas&from=home`);
    } else if (widgetType === 'work-update') {
      router.push(`/reno/construction-manager/property/${propertyId}?tab=tareas&from=home`);
    } else if (widgetType === 'final-check') {
      router.push(`/reno/construction-manager/property/${propertyId}?tab=tareas&from=home`);
    }
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {widgetType === 'estimated-visit' && 'Definir Visita Estimada'}
            {widgetType === 'initial-check' && 'Check Inicial'}
            {widgetType === 'renovator' && 'Rellenar Renovador'}
            {widgetType === 'work-update' && 'Actualizacion de obra'}
            {widgetType === 'final-check' && 'Check Final'}
          </DialogTitle>
          <DialogDescription>
            Información de la propiedad
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información básica */}
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Dirección</Label>
              <p className="text-sm font-medium">{address}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">ID</Label>
                <p className="text-sm font-medium">{uniqueId}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Area Cluster</Label>
                <p className="text-sm font-medium">{areaCluster || "-"}</p>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Reno Type</Label>
              <p className="text-sm font-medium">{renoType || "-"}</p>
            </div>
          </div>

          {/* Campos editables según el tipo */}
          {widgetType === 'estimated-visit' && (
            <div className="space-y-2">
              <Label htmlFor="estimated-visit-date">Fecha de Visita Estimada</Label>
              <Input
                id="estimated-visit-date"
                type="date"
                value={estimatedVisitDate}
                onChange={(e) => setEstimatedVisitDate(e.target.value)}
                disabled={isSaving}
              />
              <Button
                onClick={handleSaveEstimatedVisitDate}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          )}

          {widgetType === 'renovator' && (
            <div className="space-y-2">
              <Label htmlFor="renovator-name">Nombre del Renovador</Label>
              <Input
                id="renovator-name"
                type="text"
                value={renovatorName}
                onChange={(e) => setRenovatorName(e.target.value)}
                placeholder="Ingrese el nombre del renovador"
                disabled={isSaving}
              />
              <Button
                onClick={handleSaveRenovatorName}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          )}

          {/* Botones de navegación para casos que redirigen */}
          {(widgetType === 'initial-check' || widgetType === 'work-update' || widgetType === 'final-check') && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {widgetType === 'initial-check' && 'Serás redirigido a la tarea de Check Inicial para realizar el checklist.'}
                {widgetType === 'work-update' && 'Serás redirigido a la tarea de reportar el avance de la obra.'}
                {widgetType === 'final-check' && 'Serás redirigido a la tarea de Check Final.'}
              </p>
              <Button
                onClick={handleNavigate}
                className="w-full"
              >
                Ir a la tarea
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

