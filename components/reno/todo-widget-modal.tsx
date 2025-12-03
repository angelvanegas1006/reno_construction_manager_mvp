"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Property } from "@/lib/property-storage";
import { createClient } from "@/lib/supabase/client";
import { findRecordByPropertyId, updateAirtableWithRetry } from "@/lib/airtable/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
      
      // Actualizar en Supabase
      const { error: supabaseError } = await supabase
        .from('properties')
        .update({
          'Estimated Visit Date': supabaseDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      // Actualizar en Airtable
      const AIRTABLE_TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Properties';
      const recordId = await findRecordByPropertyId(AIRTABLE_TABLE_NAME, propertyId);

      if (recordId) {
        // Formatear fecha para Airtable (YYYY-MM-DD)
        const airtableDate = estimatedVisitDate || null;
        
        const airtableSuccess = await updateAirtableWithRetry(
          AIRTABLE_TABLE_NAME,
          recordId,
          {
            'Est. visit date': airtableDate,
          }
        );

        if (airtableSuccess) {
          toast.success("Visita estimada guardada", {
            description: "La fecha de visita estimada se ha guardado correctamente.",
          });
          onOpenChange(false);
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
      // Actualizar en Supabase
      const { error: supabaseError } = await supabase
        .from('properties')
        .update({
          'Renovator name': renovatorName || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      // Actualizar en Airtable
      const AIRTABLE_TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_TABLE_NAME || 'Properties';
      const recordId = await findRecordByPropertyId(AIRTABLE_TABLE_NAME, propertyId);

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
      router.push(`/reno/construction-manager/property/${propertyId}?tab=tareas`);
    } else if (widgetType === 'work-update') {
      router.push(`/reno/construction-manager/property/${propertyId}?tab=tareas`);
    } else if (widgetType === 'final-check') {
      router.push(`/reno/construction-manager/property/${propertyId}?tab=tareas`);
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

