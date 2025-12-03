"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Bell, Plus, MapPin, Clock, Edit, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/property/datetime-picker";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RenoKanbanPhase } from "@/lib/reno-kanban-config";

interface PropertyVisit {
  id: string;
  property_id: string;
  visit_date: string;
  visit_type: "visit" | "reminder";
  notes: string | null;
  created_by: string | null;
  notified: boolean;
  property_address?: string;
}

interface VisitsAndRemindersSectionProps {
  propertiesByPhase?: Record<RenoKanbanPhase, any[]>;
  onPropertyClick?: (propertyId: string) => void;
}

// Fases que permiten agendar visitas
const VISIT_ALLOWED_PHASES: RenoKanbanPhase[] = [
  "upcoming-settlements",
  "initial-check",
  "reno-in-progress",
  "final-check",
];

export function VisitsAndRemindersSection({
  propertiesByPhase,
  onPropertyClick,
}: VisitsAndRemindersSectionProps) {
  const { t } = useI18n();
  const supabase = createClient();
  const [visits, setVisits] = useState<PropertyVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [visitType, setVisitType] = useState<"visit" | "reminder">("visit");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [visitDate, setVisitDate] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [editingVisit, setEditingVisit] = useState<PropertyVisit | null>(null);
  const [editVisitDate, setEditVisitDate] = useState<string | undefined>(undefined);
  const [editNotes, setEditNotes] = useState("");

  // Obtener usuario actual
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user?.email || user?.id || null);
    };
    getUser();
  }, [supabase]);

  // Cargar visitas y recordatorios
  useEffect(() => {
    const fetchVisits = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("property_visits")
          .select(`
            *,
            properties:property_id (
              address
            )
          `)
          .gte("visit_date", new Date().toISOString())
          .order("visit_date", { ascending: true })
          .limit(10);

        if (error) {
          console.error("Error fetching visits:", error);
          return;
        }

        const transformedVisits = (data || []).map((visit: any) => ({
          ...visit,
          property_address: visit.properties?.address || null,
        }));

        setVisits(transformedVisits);
      } catch (err) {
        console.error("Error fetching visits:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVisits();
  }, [supabase]);

  const [availableProperties, setAvailableProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  // Actualizar propiedades disponibles cuando cambia el tipo
  useEffect(() => {
    const loadProperties = async () => {
      if (!propertiesByPhase) {
        setAvailableProperties([]);
        setLoadingProperties(false);
        return;
      }

      setLoadingProperties(true);

      if (visitType === "visit") {
        // Solo propiedades en fases permitidas
        const availableProperties: any[] = [];
        VISIT_ALLOWED_PHASES.forEach((phase) => {
          const phaseProperties = propertiesByPhase[phase] || [];
          availableProperties.push(...phaseProperties);
        });
        setAvailableProperties(availableProperties);
        setLoadingProperties(false);
        setSelectedPropertyId("");
      } else {
        // Recordatorios: todas las propiedades asignadas al rol del usuario
        // Usar las propiedades que ya están filtradas por rol en propertiesByPhase
        const allProperties: any[] = [];
        Object.values(propertiesByPhase || {}).forEach((phaseProperties) => {
          allProperties.push(...(phaseProperties || []));
        });
        setAvailableProperties(allProperties);
        setLoadingProperties(false);
        setSelectedPropertyId("");
      }
    };

    loadProperties();
  }, [visitType, propertiesByPhase, currentUser, supabase]);

  // Actualizar visita/recordatorio
  const handleUpdateVisit = async () => {
    if (!editingVisit || !editVisitDate) {
      toast.error("Debes seleccionar una fecha");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("property_visits")
        .update({
          visit_date: editVisitDate,
          notes: editNotes.trim() || null,
        })
        .eq("id", editingVisit.id);

      if (error) {
        throw error;
      }

      toast.success(
        editingVisit.visit_type === "reminder"
          ? "Recordatorio actualizado correctamente"
          : "Visita actualizada correctamente"
      );
      setEditingVisit(null);
      setEditVisitDate(undefined);
      setEditNotes("");
      // Refetch visits
      const { data, error: fetchError } = await supabase
        .from("property_visits")
        .select(`
          *,
          properties:property_id (
            address
          )
        `)
        .gte("visit_date", new Date().toISOString())
        .order("visit_date", { ascending: true })
        .limit(10);

      if (!fetchError && data) {
        const transformedVisits = (data || []).map((visit: any) => ({
          ...visit,
          property_address: visit.properties?.address || null,
        }));
        setVisits(transformedVisits);
      }
    } catch (error: any) {
      console.error("Error updating visit:", error);
      toast.error("Error al actualizar la visita/recordatorio");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar visita/recordatorio
  const handleDeleteVisit = async (visit: PropertyVisit) => {
    const confirmMessage = visit.visit_type === "reminder"
      ? "¿Estás seguro de que quieres eliminar este recordatorio?"
      : "¿Estás seguro de que quieres eliminar esta visita?";

    if (!confirm(confirmMessage)) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("property_visits")
        .delete()
        .eq("id", visit.id);

      if (error) {
        throw error;
      }

      toast.success(
        visit.visit_type === "reminder"
          ? "Recordatorio eliminado correctamente"
          : "Visita eliminada correctamente"
      );
      // Refetch visits
      const { data, error: fetchError } = await supabase
        .from("property_visits")
        .select(`
          *,
          properties:property_id (
            address
          )
        `)
        .gte("visit_date", new Date().toISOString())
        .order("visit_date", { ascending: true })
        .limit(10);

      if (!fetchError && data) {
        const transformedVisits = (data || []).map((visit: any) => ({
          ...visit,
          property_address: visit.properties?.address || null,
        }));
        setVisits(transformedVisits);
      }
    } catch (error: any) {
      console.error("Error deleting visit:", error);
      toast.error("Error al eliminar la visita/recordatorio");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVisit = async () => {
    if (!selectedPropertyId || !visitDate) {
      toast.error("Debes seleccionar una propiedad y una fecha");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("property_visits").insert({
        property_id: selectedPropertyId,
        visit_date: visitDate,
        visit_type: visitType,
        notes: notes.trim() || null,
        created_by: currentUser,
      });

      if (error) {
        throw error;
      }

      toast.success(
        visitType === "visit"
          ? "Visita creada correctamente"
          : "Recordatorio creado correctamente"
      );

      // Reset form
      setSelectedPropertyId("");
      setVisitDate(undefined);
      setNotes("");
      setIsCreateDialogOpen(false);

      // Refresh visits
      const { data } = await supabase
        .from("property_visits")
        .select(`
          *,
          properties:property_id (
            address
          )
        `)
        .gte("visit_date", new Date().toISOString())
        .order("visit_date", { ascending: true })
        .limit(10);

      if (data) {
        const transformedVisits = data.map((visit: any) => ({
          ...visit,
          property_address: visit.properties?.address || null,
        }));
        setVisits(transformedVisits);
      }
    } catch (error: any) {
      console.error("Error creating visit:", error);
      toast.error("Error al crear la visita/recordatorio");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      if (diffHours < 0) {
        return "Pasado";
      } else if (diffHours < 1) {
        return "En menos de 1 hora";
      } else {
        return `Hoy a las ${date.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
    }

    if (diffDays === 1) {
      return `Mañana a las ${date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    if (diffDays < 7) {
      return `${date.toLocaleDateString("es-ES", {
        weekday: "long",
      })} a las ${date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    return date.toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">
            Visitas y Recordatorios
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Próximas visitas y recordatorios programados
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Crear
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {visitType === "visit" ? "Crear Visita" : "Crear Recordatorio"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Tipo selector */}
              <div className="space-y-2">
                <Label>Tipo</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={visitType === "visit" ? "default" : "outline"}
                    onClick={() => {
                      setVisitType("visit");
                      setSelectedPropertyId("");
                    }}
                    className="flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Visita
                  </Button>
                  <Button
                    type="button"
                    variant={visitType === "reminder" ? "default" : "outline"}
                    onClick={() => {
                      setVisitType("reminder");
                      setSelectedPropertyId("");
                    }}
                    className="flex-1"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Recordatorio
                  </Button>
                </div>
              </div>

              {/* Property selector */}
              <div className="space-y-2">
                <Label>
                  Propiedad
                  {visitType === "visit" && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Solo fases: Upcoming Reno, Check inicial, Obras en proceso, Check final)
                    </span>
                  )}
                </Label>
                <Select
                  value={selectedPropertyId}
                  onValueChange={setSelectedPropertyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una propiedad" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingProperties ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Cargando propiedades...
                      </div>
                    ) : availableProperties.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        {visitType === "visit"
                          ? "No hay propiedades disponibles en las fases permitidas"
                          : "No hay propiedades asignadas a tu rol"}
                      </div>
                    ) : (
                      availableProperties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.fullAddress || property.address || property.id}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Date picker */}
              <div className="space-y-2">
                <Label>Fecha y hora</Label>
                <DateTimePicker
                  value={visitDate}
                  onChange={setVisitDate}
                  placeholder="DD/MM/YYYY HH:mm"
                  errorMessage="La fecha y hora deben ser futuras"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agregar notas sobre la visita o recordatorio..."
                  rows={3}
                />
              </div>

              {/* Submit button */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateVisit}
                  disabled={!selectedPropertyId || !visitDate || isSubmitting}
                >
                  {isSubmitting ? "Creando..." : "Crear"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Cargando...
          </p>
        ) : visits.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay visitas o recordatorios programados
          </p>
        ) : (
          <div className="space-y-3">
            {visits.map((visit) => (
              <div
                key={visit.id}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg border transition-all",
                  "hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[#1a1a1a]",
                  "hover:shadow-md dark:hover:shadow-none",
                  visit.visit_type === "reminder" &&
                    "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-900)]/20 border-[var(--prophero-blue-200)] dark:border-[var(--prophero-blue-800)]"
                )}
              >
                {visit.visit_type === "reminder" ? (
                  <Bell className="h-4 w-4 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] mt-0.5 flex-shrink-0" />
                ) : (
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => onPropertyClick?.(visit.property_id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-medium text-foreground truncate">
                        {visit.property_address || visit.property_id}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(visit.visit_date)}
                        </span>
                        {visit.visit_type === "reminder" && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)]/30 text-[var(--prophero-blue-700)] dark:text-[var(--prophero-blue-400)]">
                            Recordatorio
                          </span>
                        )}
                      </div>
                      {visit.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {visit.notes}
                        </p>
                      )}
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingVisit(visit);
                          setEditVisitDate(visit.visit_date);
                          setEditNotes(visit.notes || "");
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVisit(visit);
                        }}
                        disabled={isSubmitting}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal de edición */}
      {editingVisit && (
        <Dialog open={!!editingVisit} onOpenChange={() => {
          setEditingVisit(null);
          setEditVisitDate(undefined);
          setEditNotes("");
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingVisit.visit_type === "reminder" ? "Editar Recordatorio" : "Editar Visita"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Propiedad</Label>
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                  {editingVisit.property_address || editingVisit.property_id}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fecha y hora</Label>
                <DateTimePicker
                  value={editVisitDate}
                  onChange={setEditVisitDate}
                  placeholder="DD/MM/YYYY HH:mm"
                  errorMessage="La fecha y hora deben ser futuras"
                />
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Agregar notas sobre la visita..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingVisit(null);
                    setEditVisitDate(undefined);
                    setEditNotes("");
                  }}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateVisit}
                  disabled={!editVisitDate || isSubmitting}
                >
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

