"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, MessageSquare, Plus, CheckCircle2, Wrench, Bell, Edit, Trash2 } from "lucide-react";
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
import { Property } from "@/lib/property-storage";

interface CalendarVisit {
  id: string;
  property_id: string;
  visit_date: string;
  visit_type: "initial-check" | "final-check" | "obra-seguimiento" | "reminder";
  notes: string | null;
  created_by: string | null;
  property_address?: string;
  property?: Property;
  last_comment?: string;
}

interface VisitsCalendarProps {
  propertiesByPhase?: Record<RenoKanbanPhase, Property[]>;
  onPropertyClick?: (property: Property) => void;
  onAddVisit?: () => void;
}

// Fases que permiten agendar cada tipo de visita
const INITIAL_CHECK_PHASES: RenoKanbanPhase[] = ["initial-check"];
const FINAL_CHECK_PHASES: RenoKanbanPhase[] = ["final-check"];
const OBRA_SEGUIMIENTO_PHASES: RenoKanbanPhase[] = ["reno-in-progress"];

export function VisitsCalendar({
  propertiesByPhase,
  onPropertyClick,
}: VisitsCalendarProps) {
  const { t, language } = useI18n();
  const supabase = createClient();
  const [visits, setVisits] = useState<CalendarVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [selectedVisit, setSelectedVisit] = useState<CalendarVisit | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [visitType, setVisitType] = useState<"initial-check" | "final-check" | "obra-seguimiento" | "reminder">("initial-check");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [visitDate, setVisitDate] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingVisit, setIsEditingVisit] = useState(false);
  const [editVisitDate, setEditVisitDate] = useState<string | undefined>(undefined);
  const [editNotes, setEditNotes] = useState("");

  // Navegación de fechas
  const goToPreviousPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const goToNextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Obtener rango de fechas según el modo de vista
  const getDateRange = useCallback(() => {
    if (viewMode === "day") {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else {
      // Semana: desde el lunes hasta el domingo
      const start = new Date(currentDate);
      const dayOfWeek = start.getDay();
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajustar al lunes
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }, [currentDate, viewMode]);

  // Generate calendar events from properties (checks and upcoming visits)
  const generatePropertyEvents = useMemo(() => {
    if (!propertiesByPhase) return [];
    
    const events: CalendarVisit[] = [];
    const { start, end } = getDateRange();
    
    // Checks for today (initial-check and final-check with proximaActualizacion = today or expired)
    const initialCheck = propertiesByPhase['initial-check'] || [];
    const finalCheck = propertiesByPhase['final-check'] || [];
    const allChecks = [...initialCheck, ...finalCheck];
    
    allChecks.forEach((property) => {
      if (property.proximaActualizacion) {
        const checkDate = new Date(property.proximaActualizacion);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);
        
        // Include if it's today or expired (yesterday or earlier)
        if (checkDate <= today && checkDate >= start && checkDate <= end) {
          events.push({
            id: `check-${property.id}`,
            property_id: property.id,
            visit_date: property.proximaActualizacion,
            visit_type: property.renoPhase === 'final-check' ? 'final-check' : 'initial-check',
            notes: null,
            created_by: null,
            property_address: property.fullAddress,
            property: property,
          });
        }
      }
    });
    
    // Upcoming visits (initial-check properties with estimatedVisitDate in the future)
    initialCheck.forEach((property) => {
      if (property.estimatedVisitDate) {
        const visitDate = new Date(property.estimatedVisitDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        visitDate.setHours(0, 0, 0, 0);
        
        // Include if it's in the future and within the date range
        if (visitDate >= today && visitDate >= start && visitDate <= end) {
          events.push({
            id: `upcoming-${property.id}`,
            property_id: property.id,
            visit_date: property.estimatedVisitDate,
            visit_type: 'initial-check',
            notes: null,
            created_by: null,
            property_address: property.fullAddress,
            property: property,
          });
        }
      }
    });
    
    // Visits for today (reno-in-progress with proximaActualizacion = today or expired)
    const renoInProgress = propertiesByPhase['reno-in-progress'] || [];
    renoInProgress.forEach((property) => {
      if (property.proximaActualizacion) {
        const visitDate = new Date(property.proximaActualizacion);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        visitDate.setHours(0, 0, 0, 0);
        
        // Include if it's today or expired and within the date range
        if (visitDate <= today && visitDate >= start && visitDate <= end) {
          events.push({
            id: `visit-${property.id}`,
            property_id: property.id,
            visit_date: property.proximaActualizacion,
            visit_type: 'obra-seguimiento',
            notes: null,
            created_by: null,
            property_address: property.fullAddress,
            property: property,
          });
        }
      }
    });
    
    return events;
  }, [propertiesByPhase, getDateRange]);

  // Cargar visitas de la tabla property_visits y obtener último comentario
  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      const { data, error } = await supabase
        .from("property_visits")
        .select(`
          *,
          properties:property_id (
            address,
            id
          )
        `)
        .gte("visit_date", start.toISOString())
        .lte("visit_date", end.toISOString())
        .order("visit_date", { ascending: true });

      if (error) {
        console.error("Error fetching visits:", error);
        return;
      }

      // Obtener último comentario para cada propiedad
      const visitsWithComments = await Promise.all(
        (data || []).map(async (visit: any) => {
          const { data: comments } = await supabase
            .from("property_comments")
            .select("comment_text, created_at")
            .eq("property_id", visit.property_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Find property from propertiesByPhase to include full Property object
          let property: Property | undefined;
          if (propertiesByPhase) {
            for (const phaseProperties of Object.values(propertiesByPhase)) {
              const found = phaseProperties.find(p => p.id === visit.property_id);
              if (found) {
                property = found;
                break;
              }
            }
          }

          return {
            ...visit,
            property_address: visit.properties?.address || null,
            last_comment: comments?.comment_text || null,
            property: property,
          };
        })
      );

      // Combine database visits with property-based events
      const allVisits = [...visitsWithComments, ...generatePropertyEvents];
      
      // Remove duplicates (if a property event matches a database visit)
      // Compare by property_id, date (without time), and visit_type
      const uniqueVisits = allVisits.reduce((acc: CalendarVisit[], visit: CalendarVisit) => {
        const visitDate = new Date(visit.visit_date);
        const dateKey = visitDate.toISOString().split('T')[0]; // YYYY-MM-DD only
        const key = `${visit.property_id}-${dateKey}-${visit.visit_type}`;
        
        // Check if we already have a visit for this property, date, and type
        const existingIndex = acc.findIndex((v: CalendarVisit) => {
          const vDate = new Date(v.visit_date);
          const vDateKey = vDate.toISOString().split('T')[0];
          return `${v.property_id}-${vDateKey}-${v.visit_type}` === key;
        });
        
        if (existingIndex === -1) {
          // No duplicate found, add it
          acc.push(visit);
        } else {
          // Duplicate found - prefer the database visit over the generated event
          // Database visits have numeric IDs (UUIDs), generated events have string IDs like "upcoming-..."
          const existing = acc[existingIndex];
          const isExistingFromDB = existing.id && !existing.id.startsWith('upcoming-') && !existing.id.startsWith('check-') && !existing.id.startsWith('visit-');
          const isNewFromDB = visit.id && !visit.id.startsWith('upcoming-') && !visit.id.startsWith('check-') && !visit.id.startsWith('visit-');
          
          // If the new one is from DB and existing is not, replace it
          if (isNewFromDB && !isExistingFromDB) {
            acc[existingIndex] = visit;
          }
          // Otherwise keep the existing one (database visits take priority)
        }
        
        return acc;
      }, [] as CalendarVisit[]);

      setVisits(uniqueVisits);
    } catch (err) {
      console.error("Error fetching visits:", err);
    } finally {
      setLoading(false);
    }
  }, [getDateRange, supabase, generatePropertyEvents, propertiesByPhase]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // Obtener propiedades disponibles según el tipo de visita
  const getAvailableProperties = useMemo(() => {
    if (!propertiesByPhase) return [];

    switch (visitType) {
      case "initial-check":
        return propertiesByPhase["initial-check"] || [];
      case "final-check":
        return propertiesByPhase["final-check"] || [];
      case "obra-seguimiento":
        return propertiesByPhase["reno-in-progress"] || [];
      case "reminder":
        // Recordatorios: todas las propiedades asignadas al rol del usuario
        const allProperties: Property[] = [];
        Object.values(propertiesByPhase).forEach((phaseProperties) => {
          allProperties.push(...phaseProperties);
        });
        return allProperties;
      default:
        return [];
    }
  }, [visitType, propertiesByPhase]);

  // Crear nueva visita
  const handleCreateVisit = async () => {
    if (!selectedPropertyId || !visitDate) {
      toast.error(t.calendar.selectPropertyAndDate);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("property_visits").insert({
        property_id: selectedPropertyId,
        visit_date: visitDate,
        visit_type: visitType,
        notes: notes.trim() || null,
      });

      if (error) {
        throw error;
      }

      toast.success(
        visitType === "reminder"
          ? t.calendar.reminderCreated
          : t.calendar.visitCreated
      );
      setSelectedPropertyId("");
      setVisitDate(undefined);
      setNotes("");
      setIsCreateDialogOpen(false);
      await fetchVisits();
    } catch (error: any) {
      console.error("Error creating visit:", error);
      toast.error(t.calendar.visitCreateError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actualizar visita/recordatorio
  const handleUpdateVisit = async () => {
    if (!selectedVisit || !editVisitDate) {
      toast.error(t.calendar.selectPropertyAndDate);
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
        .eq("id", selectedVisit.id);

      if (error) {
        throw error;
      }

      toast.success(
        selectedVisit.visit_type === "reminder"
          ? t.calendar.reminderUpdated || "Recordatorio actualizado"
          : t.calendar.visitUpdated || "Visita actualizada"
      );
      setIsEditingVisit(false);
      setSelectedVisit(null);
      await fetchVisits();
    } catch (error: any) {
      console.error("Error updating visit:", error);
      toast.error(t.calendar.visitUpdateError || "Error al actualizar");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar visita/recordatorio
  const handleDeleteVisit = async () => {
    if (!selectedVisit) return;

    const confirmMessage = selectedVisit.visit_type === "reminder"
      ? t.calendar.deleteReminderConfirm || "¿Estás seguro de que quieres eliminar este recordatorio?"
      : t.calendar.deleteVisitConfirm || "¿Estás seguro de que quieres eliminar esta visita?";

    if (!confirm(confirmMessage)) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("property_visits")
        .delete()
        .eq("id", selectedVisit.id);

      if (error) {
        throw error;
      }

      toast.success(
        selectedVisit.visit_type === "reminder"
          ? t.calendar.reminderDeleted || "Recordatorio eliminado"
          : t.calendar.visitDeleted || "Visita eliminada"
      );
      setSelectedVisit(null);
      await fetchVisits();
    } catch (error: any) {
      console.error("Error deleting visit:", error);
      toast.error(t.calendar.visitDeleteError || "Error al eliminar");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Obtener icono según tipo de visita
  const getVisitIcon = (type: string) => {
    switch (type) {
      case "initial-check":
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case "final-check":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "obra-seguimiento":
        return <Wrench className="h-4 w-4 text-amber-500" />;
      case "reminder":
        return <Bell className="h-4 w-4 text-purple-500" />;
      default:
        return <Calendar className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Obtener etiqueta según tipo de visita
  const getVisitLabel = (type: string) => {
    switch (type) {
      case "initial-check":
        return t.calendar.visitTypes.initialCheck;
      case "final-check":
        return t.calendar.visitTypes.finalCheck;
      case "obra-seguimiento":
        return t.calendar.visitTypes.obraSeguimiento;
      case "reminder":
        return t.calendar.visitTypes.reminder;
      default:
        return t.calendar.visitTypes.visit;
    }
  };

  // Agrupar visitas por hora (para vista diaria) o por día (para vista semanal)
  const groupedVisits = useMemo(() => {
    if (viewMode === "day") {
      // Agrupar por hora
      const grouped: Record<number, CalendarVisit[]> = {};
      visits.forEach((visit) => {
        const hour = new Date(visit.visit_date).getHours();
        if (!grouped[hour]) grouped[hour] = [];
        grouped[hour].push(visit);
      });
      return grouped;
    } else {
      // Agrupar por día de la semana
      const grouped: Record<number, CalendarVisit[]> = {};
      visits.forEach((visit) => {
        const date = new Date(visit.visit_date);
        const dayOfWeek = date.getDay();
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lunes = 0, Domingo = 6
        if (!grouped[adjustedDay]) grouped[adjustedDay] = [];
        grouped[adjustedDay].push(visit);
      });
      return grouped;
    }
  }, [visits, viewMode]);

  // Generar horas del día (para vista diaria) - solo de 8:00 AM a 20:00 PM
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8, 9, 10, ..., 20

  // Generar días de la semana (para vista semanal)
  const weekDays = useMemo(() => {
    const { start } = getDateRange();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, [getDateRange]);

  return (
    <Card className="bg-card w-full">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
        <div className="min-w-0">
          <CardTitle className="text-base md:text-lg font-semibold">
            {t.calendar.title}
          </CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            {t.calendar.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Selector de vista */}
          <div className="flex gap-1 border rounded-md flex-shrink-0">
            <button
              onClick={() => setViewMode("day")}
              className={cn(
                "px-2 md:px-3 py-1 text-xs font-medium rounded-md transition-colors",
                viewMode === "day"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.calendar.day}
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={cn(
                "px-2 md:px-3 py-1 text-xs font-medium rounded-md transition-colors",
                viewMode === "week"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.calendar.week}
            </button>
          </div>
          
          {/* Navegación */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={goToPreviousPeriod}
              className={cn(
                "inline-flex items-center justify-center gap-1 md:gap-2 whitespace-nowrap rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                "px-2 md:px-3 py-1 text-xs font-medium h-auto"
              )}
            >
              <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
            </button>
            <button
              onClick={goToToday}
              className={cn(
                "inline-flex items-center justify-center gap-1 md:gap-2 whitespace-nowrap rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                "px-2 md:px-3 py-1 text-xs font-medium h-auto"
              )}
            >
              {t.calendar.today}
            </button>
            <button
              onClick={goToNextPeriod}
              className={cn(
                "inline-flex items-center justify-center gap-1 md:gap-2 whitespace-nowrap rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                "px-2 md:px-3 py-1 text-xs font-medium h-auto"
              )}
            >
              <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
            </button>
          </div>

          {/* Botón crear */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <button
                className={cn(
                  "inline-flex items-center justify-center gap-1 md:gap-2 whitespace-nowrap rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  "px-2 md:px-3 py-1 text-xs font-medium h-auto flex-shrink-0"
                )}
              >
                <Plus className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{t.calendar.create}</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {visitType === "reminder" ? t.calendar.createReminder : t.calendar.createVisit}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Tipo selector */}
                <div className="space-y-2">
                  <Label>{t.calendar.visitType}</Label>
                  <Select
                    value={visitType}
                    onValueChange={(value: "initial-check" | "final-check" | "obra-seguimiento" | "reminder") =>
                      setVisitType(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="initial-check">{t.calendar.visitTypes.initialCheck}</SelectItem>
                      <SelectItem value="final-check">{t.calendar.visitTypes.finalCheck}</SelectItem>
                      <SelectItem value="obra-seguimiento">{t.calendar.visitTypes.obraSeguimiento}</SelectItem>
                      <SelectItem value="reminder">{t.calendar.visitTypes.reminder}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Property selector */}
                <div className="space-y-2">
                  <Label>{t.calendar.property}</Label>
                  <Select
                    value={selectedPropertyId}
                    onValueChange={setSelectedPropertyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.calendar.selectProperty} />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableProperties.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          {visitType === "reminder"
                            ? t.calendar.noPropertiesAssigned
                            : t.calendar.noPropertiesAvailable}
                        </div>
                      ) : (
                        getAvailableProperties.map((property) => (
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
                  <Label>{t.calendar.dateTime}</Label>
                  <DateTimePicker
                    value={visitDate}
                    onChange={setVisitDate}
                    placeholder={t.calendar.dateTimePlaceholder}
                    errorMessage={t.calendar.dateTimeError}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>{t.calendar.notes}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.calendar.notesPlaceholder}
                    rows={3}
                  />
                </div>

                {/* Submit button */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    {t.calendar.cancel}
                  </Button>
                  <Button
                    onClick={handleCreateVisit}
                    disabled={!selectedPropertyId || !visitDate || isSubmitting}
                  >
                    {isSubmitting ? t.calendar.creating : t.calendar.create}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t.calendar.loading}
          </p>
        ) : viewMode === "day" ? (
          // Vista diaria por horas
          <div className="space-y-2 max-h-[400px] md:max-h-[600px] overflow-y-auto">
            {hours.map((hour) => {
              const hourVisits = groupedVisits[hour] || [];
              return (
                <div key={hour} className="flex gap-2 md:gap-4 border-b pb-2 min-w-0">
                  <div className="w-12 md:w-16 text-xs md:text-sm font-medium text-muted-foreground flex-shrink-0">
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2 min-w-0">
                    {hourVisits.length === 0 ? (
                      <span className="text-xs text-muted-foreground">{t.calendar.noVisits}</span>
                    ) : (
                      hourVisits.map((visit) => (
                        <button
                          key={visit.id}
                          onClick={() => setSelectedVisit(visit)}
                          className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-md border bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 hover:shadow-md dark:hover:shadow-none transition-all text-left min-w-0"
                        >
                          <span className="flex-shrink-0">{getVisitIcon(visit.visit_type)}</span>
                          <span className="text-xs font-medium truncate">
                            {visit.property_address || visit.property_id}
                          </span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {getVisitLabel(visit.visit_type)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Vista semanal por días
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 overflow-x-auto">
            {weekDays.map((day, index) => {
              const dayVisits = groupedVisits[index] || [];
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={index}
                  className={cn(
                    "border rounded-lg p-2 min-h-[150px] md:min-h-[200px] flex flex-col",
                    isToday && "border-primary bg-primary/5"
                  )}
                >
                  <div className="text-xs font-medium mb-2 flex-shrink-0">
                    {day.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { weekday: "short", day: "numeric" })}
                  </div>
                  <div className="space-y-1 flex-1 overflow-y-auto">
                    {dayVisits.length === 0 ? (
                      <span className="text-xs text-muted-foreground">{t.calendar.noVisits}</span>
                    ) : (
                      dayVisits.map((visit) => (
                        <button
                          key={visit.id}
                          onClick={() => setSelectedVisit(visit)}
                          className="w-full flex items-start gap-1.5 px-2 py-1 rounded text-xs border bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 hover:shadow-md dark:hover:shadow-none transition-all text-left"
                        >
                          <span className="flex-shrink-0">{getVisitIcon(visit.visit_type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-[10px] md:text-xs">
                              {visit.property_address || visit.property_id}
                            </div>
                            <div className="text-muted-foreground text-[10px]">
                              {new Date(visit.visit_date).toLocaleTimeString(language === "es" ? "es-ES" : "en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="text-muted-foreground text-[9px] md:text-[10px]">
                              {getVisitLabel(visit.visit_type)}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de detalles */}
        {selectedVisit && (
          <Dialog open={!!selectedVisit} onOpenChange={() => {
            setSelectedVisit(null);
            setIsEditingVisit(false);
          }}>
            <DialogContent className="sm:max-w-[500px] w-[95vw] md:w-full max-h-[85vh] md:max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
                  {getVisitIcon(selectedVisit.visit_type)}
                  <span className="break-words">{getVisitLabel(selectedVisit.visit_type)}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {!isEditingVisit ? (
                  <>
                    <div className="space-y-2">
                      <Label>{t.calendar.address}</Label>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedVisit.property_address || selectedVisit.property_id}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t.calendar.dateTime}</Label>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(selectedVisit.visit_date)}</span>
                      </div>
                    </div>

                    {selectedVisit.last_comment && (
                      <div className="space-y-2">
                        <Label>{t.calendar.lastComment}</Label>
                        <div className="flex items-start gap-2 text-sm bg-muted p-3 rounded-md">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span className="flex-1">{selectedVisit.last_comment}</span>
                        </div>
                      </div>
                    )}

                    {selectedVisit.notes && (
                      <div className="space-y-2">
                        <Label>{t.calendar.notes}</Label>
                        <div className="text-sm bg-muted p-3 rounded-md">
                          {selectedVisit.notes}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingVisit(true);
                            setEditVisitDate(selectedVisit.visit_date);
                            setEditNotes(selectedVisit.notes || "");
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t.calendar.edit || "Editar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeleteVisit}
                          disabled={isSubmitting}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t.calendar.delete || "Eliminar"}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedVisit(null);
                            setIsEditingVisit(false);
                          }}
                        >
                          {t.calendar.close}
                        </Button>
                        <Button
                          onClick={() => {
                            if (onPropertyClick && selectedVisit.property) {
                              onPropertyClick(selectedVisit.property);
                            } else if (onPropertyClick && propertiesByPhase) {
                              // Find property in propertiesByPhase
                              for (const phaseProperties of Object.values(propertiesByPhase)) {
                                const property = phaseProperties.find(p => p.id === selectedVisit.property_id);
                                if (property) {
                                  onPropertyClick(property);
                                  break;
                                }
                              }
                            }
                            setSelectedVisit(null);
                            setIsEditingVisit(false);
                          }}
                        >
                          {t.calendar.goToTask}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>{t.calendar.address}</Label>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedVisit.property_address || selectedVisit.property_id}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t.calendar.dateTime}</Label>
                      <DateTimePicker
                        value={editVisitDate}
                        onChange={setEditVisitDate}
                        placeholder={t.calendar.dateTimePlaceholder}
                        errorMessage={t.calendar.dateTimeError}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t.calendar.notes}</Label>
                      <Textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder={t.calendar.notesPlaceholder}
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingVisit(false);
                          setEditVisitDate(selectedVisit.visit_date);
                          setEditNotes(selectedVisit.notes || "");
                        }}
                        disabled={isSubmitting}
                      >
                        {t.calendar.cancel}
                      </Button>
                      <Button
                        onClick={handleUpdateVisit}
                        disabled={!editVisitDate || isSubmitting}
                      >
                        {isSubmitting ? t.calendar.saving : (t.calendar.save || "Guardar")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

