"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, MessageSquare, Plus, CheckCircle2, Wrench, Bell, Edit, Trash2, RefreshCw, CalendarCheck, X, FileSignature, Hammer, Filter } from "lucide-react";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/property/datetime-picker";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RenoKanbanPhase } from "@/lib/reno-kanban-config";
import { Property } from "@/lib/property-storage";
import { calculateNextUpdateDate } from "@/lib/reno/update-calculator";

interface CalendarVisit {
  id: string;
  property_id: string;
  visit_date: string;
  visit_type: "initial-check" | "final-check" | "obra-seguimiento" | "reminder" | "real-settlement-date" | "reno-start-date";
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
  const router = useRouter();
  const supabase = createClient();
  const { isConnected, isSyncing, sync, connect, disconnect, canConnect, isConfigured } = useGoogleCalendar();
  const [visits, setVisits] = useState<CalendarVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  // En móvil, usar vista diaria por defecto para mejor UX
  const [viewMode, setViewMode] = useState<"day" | "week">(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? "day" : "week";
    }
    return "week";
  });
  const [isMobile, setIsMobile] = useState(false);
  
  // Detectar si estamos en móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Si cambiamos a móvil y estamos en vista semanal, cambiar a diaria
      if (window.innerWidth < 768 && viewMode === "week") {
        setViewMode("day");
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [viewMode]);
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
  
  // Filtros para tipos de eventos
  const [filters, setFilters] = useState({
    showSettlements: true,      // Fechas de escrituración
    showRenoStarts: true,       // Inicios de obra
    showWorkUpdates: true,      // Actualizaciones de obra
    showInitialChecks: true,   // Visitas estimadas / checks iniciales
    showFinalChecks: true,      // Checks finales
  });

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

  // Función para obtener el texto del botón de fecha
  const getDateButtonText = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDateNormalized = new Date(currentDate);
    currentDateNormalized.setHours(0, 0, 0, 0);
    
    // Si es hoy, mostrar "Hoy"
    if (currentDateNormalized.getTime() === today.getTime()) {
      return t.calendar.today;
    }
    
    // Si es mañana
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (currentDateNormalized.getTime() === tomorrow.getTime()) {
      return language === "es" ? "Mañana" : "Tomorrow";
    }
    
    // Si es ayer
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (currentDateNormalized.getTime() === yesterday.getTime()) {
      return language === "es" ? "Ayer" : "Yesterday";
    }
    
    // Para otros días, mostrar la fecha formateada
    return currentDate.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
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
    
    // Upcoming visits (initial-check y upcoming-settlements con estimatedVisitDate en el rango)
    const initialCheckAndUpcoming = [
      ...(propertiesByPhase['initial-check'] || []),
      ...(propertiesByPhase['upcoming-settlements'] || []),
    ];
    initialCheckAndUpcoming.forEach((property) => {
      const estimatedDate = property.estimatedVisitDate ?? (property as any).supabaseProperty?.['Estimated Visit Date'];
      if (estimatedDate) {
        const visitDate = new Date(estimatedDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        visitDate.setHours(0, 0, 0, 0);
        const dateStr = typeof estimatedDate === 'string' ? estimatedDate : visitDate.toISOString().split('T')[0];
        // Incluir si está en el rango (futuro o hoy: visitDate >= today; y dentro de start..end)
        if (visitDate >= today && visitDate >= start && visitDate <= end) {
          const isoDate = typeof dateStr === 'string' && dateStr.includes('T')
            ? dateStr
            : `${visitDate.toISOString().split('T')[0]}T12:00:00.000Z`;
          events.push({
            id: `upcoming-${property.id}`,
            property_id: property.id,
            visit_date: isoDate,
            visit_type: 'initial-check',
            notes: null,
            created_by: null,
            property_address: property.fullAddress,
            property: property,
          });
        }
      }
    });
    
    // Work updates (reno-in-progress with proximaActualizacion) - mostrar todas las fechas dentro del rango
    const renoInProgress = propertiesByPhase['reno-in-progress'] || [];
    renoInProgress.forEach((property) => {
      // Calcular proximaActualizacion si no existe
      let proximaActualizacion = property.proximaActualizacion;
      if (!proximaActualizacion) {
        // Obtener fecha de inicio de la obra
        const renoStartDate = property.inicio || (property as any).supabaseProperty?.["Reno Start Date"] || (property as any).supabaseProperty?.start_date;
        // Calcular desde fecha de inicio de la obra
        const calculated = calculateNextUpdateDate(null, property.renoType, renoStartDate);
        proximaActualizacion = calculated || undefined;
      }
      
      if (proximaActualizacion) {
        const visitDate = new Date(proximaActualizacion);
        visitDate.setHours(12, 0, 0, 0); // Establecer hora del mediodía para mejor visualización
        
        // Include if it's within the date range (todas las fechas, no solo vencidas)
        if (visitDate >= start && visitDate <= end) {
          events.push({
            id: `work-update-${property.id}`,
            property_id: property.id,
            visit_date: visitDate.toISOString(),
            visit_type: 'obra-seguimiento',
            notes: null,
            created_by: null,
            property_address: property.fullAddress,
            property: property,
          });
        }
      }
    });
    
    // Real Settlement Date events (fecha de escrituración) - para todas las fases que tengan esta fecha
    Object.values(propertiesByPhase).flat().forEach((property) => {
      if (property.realSettlementDate) {
        const settlementDate = new Date(property.realSettlementDate);
        settlementDate.setHours(12, 0, 0, 0); // Establecer hora del mediodía para mejor visualización
        
        // Include if it's within the date range
        if (settlementDate >= start && settlementDate <= end) {
          events.push({
            id: `settlement-${property.id}`,
            property_id: property.id,
            visit_date: settlementDate.toISOString(),
            visit_type: 'real-settlement-date',
            notes: null,
            created_by: null,
            property_address: property.fullAddress,
            property: property,
          });
        }
      }
    });
    
    // Est. Reno Start Date events (fecha estimada de inicio de renovación) - para todas las fases que tengan esta fecha
    Object.values(propertiesByPhase).flat().forEach((property) => {
      // Est_reno_start_date está en supabaseProperty
      const startDateValue = (property as any).supabaseProperty?.Est_reno_start_date;
      if (startDateValue) {
        const startDate = new Date(startDateValue);
        startDate.setHours(12, 0, 0, 0); // Establecer hora del mediodía para mejor visualización
        
        // Include if it's within the date range
        if (startDate >= start && startDate <= end) {
          events.push({
            id: `reno-start-${property.id}`,
            property_id: property.id,
            visit_date: startDate.toISOString(),
            visit_type: 'reno-start-date',
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

      // Filtrar visitas por propiedades que el usuario puede ver (propertiesByPhase)
      // Crear un Set de IDs de propiedades visibles para filtrado rápido
      const visiblePropertyIds = new Set<string>();
      if (propertiesByPhase) {
        Object.values(propertiesByPhase).forEach((phaseProperties) => {
          phaseProperties.forEach(prop => visiblePropertyIds.add(prop.id));
        });
      }

      // Filtrar visitas solo para propiedades visibles
      const filteredVisits = (data || []).filter((visit: any) => 
        visiblePropertyIds.has(visit.property_id)
      );

      // Obtener último comentario para cada propiedad
      const visitsWithComments = await Promise.all(
        filteredVisits.map(async (visit: any) => {
          // Usar maybeSingle() en lugar de single() para manejar casos sin comentarios
          const { data: comments, error: commentsError } = await supabase
            .from("property_comments")
            .select("comment_text, created_at")
            .eq("property_id", visit.property_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Log error solo si no es un error esperado (sin comentarios)
          if (commentsError && commentsError.code !== 'PGRST116') {
            console.warn(`Error fetching comments for property ${visit.property_id}:`, commentsError);
          }

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
      const { data: newVisit, error } = await supabase
        .from("property_visits")
        .insert({
          property_id: selectedPropertyId,
          visit_date: visitDate,
          visit_type: visitType,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Sync to Google Calendar if connected
      if (isConnected && newVisit) {
        try {
          const response = await fetch('/api/google-calendar/sync-visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visitId: newVisit.id,
              action: 'create',
            }),
          });
          
          if (!response.ok) {
            const error = await response.json();
            if (!error.skipped) {
              console.error('Error syncing visit to Google Calendar:', error);
            }
          }
        } catch (syncError) {
          console.error('Error syncing visit to Google Calendar:', syncError);
          // Don't fail the visit creation if sync fails
        }
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
      const { data: updatedVisit, error } = await supabase
        .from("property_visits")
        .update({
          visit_date: editVisitDate,
          notes: editNotes.trim() || null,
        })
        .eq("id", selectedVisit.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Sync to Google Calendar if connected
      if (isConnected && updatedVisit) {
        try {
          const response = await fetch('/api/google-calendar/sync-visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visitId: updatedVisit.id,
              action: 'update',
            }),
          });
          
          if (!response.ok) {
            const error = await response.json();
            if (!error.skipped) {
              console.error('Error syncing visit update to Google Calendar:', error);
            }
          }
        } catch (syncError) {
          console.error('Error syncing visit update to Google Calendar:', syncError);
          // Don't fail the visit update if sync fails
        }
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
      const visitId = selectedVisit.id;
      const { error } = await supabase
        .from("property_visits")
        .delete()
        .eq("id", visitId);

      if (error) {
        throw error;
      }

      // Delete from Google Calendar if connected
      if (isConnected) {
        try {
          const response = await fetch('/api/google-calendar/sync-visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visitId: visitId,
              action: 'delete',
            }),
          });
          
          if (!response.ok) {
            const error = await response.json();
            if (!error.skipped) {
              console.error('Error deleting visit from Google Calendar:', error);
            }
          }
        } catch (syncError) {
          console.error('Error deleting visit from Google Calendar:', syncError);
          // Don't fail the visit deletion if sync fails
        }
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
      case "real-settlement-date":
        return <FileSignature className="h-4 w-4 text-[var(--prophero-blue-500)]" />;
      case "reno-start-date":
        return <Hammer className="h-4 w-4 text-orange-500" />;
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
      case "real-settlement-date":
        return "Fecha de escrituración";
      case "reno-start-date":
        return "Inicio de renovación";
      default:
        return t.calendar.visitTypes.visit;
    }
  };

  // Filtrar visitas según los filtros seleccionados
  const filteredVisits = useMemo(() => {
    return visits.filter((visit) => {
      switch (visit.visit_type) {
        case 'real-settlement-date':
          return filters.showSettlements;
        case 'reno-start-date':
          return filters.showRenoStarts;
        case 'obra-seguimiento':
          return filters.showWorkUpdates;
        case 'initial-check':
          return filters.showInitialChecks;
        case 'final-check':
          return filters.showFinalChecks;
        default:
          return true;
      }
    });
  }, [visits, filters]);

  // Agrupar visitas por hora (para vista diaria) o por día (para vista semanal)
  const groupedVisits = useMemo(() => {
    if (viewMode === "day") {
      // Agrupar por hora
      const grouped: Record<number, CalendarVisit[]> = {};
      filteredVisits.forEach((visit) => {
        const hour = new Date(visit.visit_date).getHours();
        if (!grouped[hour]) grouped[hour] = [];
        grouped[hour].push(visit);
      });
      return grouped;
    } else {
      // Agrupar por día de la semana (solo lunes a viernes)
      const grouped: Record<number, CalendarVisit[]> = {};
      filteredVisits.forEach((visit) => {
        const date = new Date(visit.visit_date);
        const dayOfWeek = date.getDay();
        // Convertir: Lunes = 0, Martes = 1, ..., Viernes = 4
        // JavaScript: Domingo = 0, Lunes = 1, ..., Sábado = 6
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lunes = 0, Domingo = 6
        // Solo incluir lunes a viernes (0-4)
        if (adjustedDay >= 0 && adjustedDay <= 4) {
          if (!grouped[adjustedDay]) grouped[adjustedDay] = [];
          grouped[adjustedDay].push(visit);
        }
      });
      return grouped;
    }
  }, [filteredVisits, viewMode]);

  // Generar horas del día (para vista diaria) - solo de 8:00 AM a 20:00 PM
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8, 9, 10, ..., 20

  // Generar días de la semana (para vista semanal) - excluir sábados y domingos
  const weekDays = useMemo(() => {
    const { start } = getDateRange();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const dayOfWeek = day.getDay(); // 0 = domingo, 6 = sábado
      // Excluir sábados (6) y domingos (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days.push(day);
      }
    }
    return days;
  }, [getDateRange]);

  return (
    <Card className="bg-card w-full">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base md:text-lg font-semibold">
              {t.calendar.title}
            </CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {t.calendar.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Google Calendar Connect/Disconnect Button */}
          {canConnect && (
            <>
              {isConnected ? (
                <>
                  <Button
                    onClick={sync}
                    disabled={isSyncing || !isConfigured}
                    variant="outline"
                    size="sm"
                    title={isConfigured ? "Sincronizar con Google Calendar" : "Google Calendar no está configurado"}
                    className="flex-shrink-0"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                        <span className="text-xs">Sync...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1.5" />
                        <span className="text-xs">Sync</span>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={disconnect}
                    disabled={!isConfigured}
                    variant="ghost"
                    size="sm"
                    title="Desconectar Google Calendar"
                    className="flex-shrink-0 h-8 px-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={connect}
                  disabled={!isConfigured}
                  variant="outline"
                  size="sm"
                  title={isConfigured ? "Conectar Google Calendar" : "Google Calendar no está configurado. Verifica las variables de entorno en Vercel."}
                  className="flex-shrink-0"
                >
                  <Calendar className="h-3 w-3 mr-1.5" />
                  <span className="text-xs">Google Calendar</span>
                </Button>
              )}
            </>
          )}
          {/* Selector de vista - Ocultar en móvil ya que forzamos vista diaria */}
          {!isMobile && (
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
          )}
          
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
                "px-2 md:px-3 py-1 text-xs font-medium h-auto min-w-[60px] md:min-w-[80px]"
              )}
            >
              {getDateButtonText()}
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
        </div>
        
        {/* Filtros de tipos de eventos */}
        <div className="flex flex-wrap items-center gap-3 md:gap-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Filtros:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.showSettlements}
                onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showSettlements: checked === true }))}
              />
              <span className="text-xs text-foreground">Fechas de escrituración</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.showRenoStarts}
                onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showRenoStarts: checked === true }))}
              />
              <span className="text-xs text-foreground">Inicios de obra</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.showWorkUpdates}
                onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showWorkUpdates: checked === true }))}
              />
              <span className="text-xs text-foreground">Actualizaciones de obra</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.showInitialChecks}
                onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showInitialChecks: checked === true }))}
              />
              <span className="text-xs text-foreground">Checks Iniciales / Visitas estimadas</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.showFinalChecks}
                onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showFinalChecks: checked === true }))}
              />
              <span className="text-xs text-foreground">Checks Finales</span>
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t.calendar.loading}
          </p>
        ) : viewMode === "day" ? (
          // Vista diaria por horas - Estilo Google Calendar
          <div className="relative max-h-[500px] md:max-h-[750px] overflow-y-auto">
            <div className="space-y-0">
              {hours.map((hour) => {
                const hourVisits = groupedVisits[hour] || [];
                const now = new Date();
                const isToday = currentDate.toDateString() === now.toDateString();
                const isCurrentHour = isToday && hour === now.getHours();
                
                return (
                  <div 
                    key={hour} 
                    className={cn(
                      "flex gap-2 md:gap-4 border-b border-border/50 pb-3 md:pb-4 min-w-0 relative",
                      isCurrentHour && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "w-12 md:w-16 text-xs md:text-sm font-medium flex-shrink-0 pt-1 flex items-start",
                      isCurrentHour ? "text-primary font-semibold" : "text-muted-foreground"
                    )}>
                      {/* Indicador de hora actual - solo mostrar si es la hora actual exacta */}
                      {isCurrentHour ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          <span>{hour.toString().padStart(2, "0")}:00</span>
                        </div>
                      ) : (
                        <span>{hour.toString().padStart(2, "0")}:00</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      {hourVisits.length === 0 ? (
                        <span className="text-xs text-muted-foreground block py-1">{t.calendar.noVisits}</span>
                      ) : (
                        hourVisits.map((visit) => {
                          const visitDate = new Date(visit.visit_date);
                          const visitHour = visitDate.getHours();
                          const visitMinute = visitDate.getMinutes();
                          const visitTime = `${visitHour.toString().padStart(2, "0")}:${visitMinute.toString().padStart(2, "0")}`;
                          
                          return (
                            <button
                              key={visit.id}
                              onClick={() => setSelectedVisit(visit)}
                              className={cn(
                                "w-full flex items-center gap-2 rounded-lg",
                                "border transition-all text-left min-w-0",
                                "bg-card hover:bg-accent hover:border-primary/50",
                                "shadow-sm hover:shadow-md",
                                "active:scale-[0.98]",
                                // Tamaños más compactos en móvil
                                isMobile 
                                  ? "px-2 py-1.5 border-1" 
                                  : "px-3 md:px-4 py-2.5 md:py-3 border-2"
                              )}
                            >
                              <div className="flex-shrink-0">
                                <div className={cn(
                                  "flex items-center justify-center",
                                  isMobile ? "w-6 h-6" : "w-8 h-8"
                                )}>
                                  {getVisitIcon(visit.visit_type)}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className={cn(
                                    "font-semibold text-foreground line-clamp-1 break-words",
                                    isMobile ? "text-xs" : "text-sm md:text-base"
                                  )}>
                                    {visit.property_address || visit.property_id}
                                  </div>
                                  <div className={cn(
                                    "text-muted-foreground",
                                    isMobile ? "text-[10px]" : "text-xs md:text-sm"
                                  )}>
                                    {getVisitLabel(visit.visit_type)}
                                  </div>
                                </div>
                                <span className={cn(
                                  "text-muted-foreground flex-shrink-0 whitespace-nowrap",
                                  isMobile ? "text-[10px]" : "text-xs"
                                )}>
                                  {visitTime}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Vista semanal por días - Mejorada para móvil (sin sábados ni domingos)
          <div className={cn(
            "flex md:grid gap-2 overflow-x-auto pb-2",
            "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
            isMobile 
              ? "flex-row snap-x snap-mandatory" // En móvil, scroll horizontal con snap
              : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5" // En desktop, mostrar 5 días (lunes a viernes)
          )}>
            {weekDays.map((day, dayIndex) => {
              // Mapear el índice del día filtrado al índice original para groupedVisits
              // Necesitamos encontrar el índice original del día en la semana completa
              const { start } = getDateRange();
              const dayOfWeek = day.getDay();
              // Calcular el índice original en la semana (0-6, donde 0 es lunes)
              const originalIndex = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
              const dayVisits = groupedVisits[originalIndex] || [];
              const isToday = day.toDateString() === new Date().toDateString();
              
              // Ordenar visitas por hora
              const sortedVisits = [...dayVisits].sort((a, b) => {
                const timeA = new Date(a.visit_date).getTime();
                const timeB = new Date(b.visit_date).getTime();
                return timeA - timeB;
              });
              
              return (
                <div
                  key={dayIndex}
                  className={cn(
                    "border rounded-lg p-3 md:p-4 flex flex-col",
                    isMobile 
                      ? "min-w-[calc(100vw-2rem)] snap-start" // Ancho completo menos padding en móvil
                      : "min-w-0", // En desktop, sin ancho mínimo
                    isMobile ? "min-h-[450px]" : "min-h-[200px] md:min-h-[300px]",
                    isToday && "border-primary bg-primary/5 ring-2 ring-primary/20"
                  )}
                >
                  <div className={cn(
                    "text-sm md:text-xs font-semibold mb-3 md:mb-2 flex-shrink-0",
                    isToday && "text-primary"
                  )}>
                    <div className="text-xs text-muted-foreground mb-0.5">
                      {day.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { weekday: "long" })}
                    </div>
                    <div className="text-lg md:text-base">
                      {day.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { day: "numeric" })}
                    </div>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {sortedVisits.length === 0 ? (
                      <span className="text-xs text-muted-foreground block py-2">{t.calendar.noVisits}</span>
                    ) : (
                      sortedVisits.map((visit) => {
                        const visitDate = new Date(visit.visit_date);
                        const visitTime = visitDate.toLocaleTimeString(language === "es" ? "es-ES" : "en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        
                        return (
                          <button
                            key={visit.id}
                            onClick={() => setSelectedVisit(visit)}
                            className={cn(
                              "w-full flex items-start gap-2 px-3 py-2.5 rounded-lg",
                              "border-2 transition-all text-left",
                              "bg-card hover:bg-accent hover:border-primary/50",
                              "shadow-sm hover:shadow-md",
                              "active:scale-[0.98]"
                            )}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {getVisitIcon(visit.visit_type)}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs md:text-sm font-semibold text-foreground line-clamp-2 break-words">
                                  {visit.property_address || visit.property_id}
                                </span>
                                <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                                  {visitTime}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getVisitLabel(visit.visit_type)}
                              </div>
                            </div>
                          </button>
                        );
                      })
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
                      <Label>
                        {selectedVisit.visit_type === "real-settlement-date" 
                          ? "Fecha de escrituración" 
                          : selectedVisit.visit_type === "reno-start-date"
                          ? "Inicio de renovación"
                          : t.calendar.dateTime}
                      </Label>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(selectedVisit.visit_date)}</span>
                      </div>
                    </div>

                    {selectedVisit.last_comment && selectedVisit.visit_type !== "real-settlement-date" && selectedVisit.visit_type !== "reno-start-date" && (
                      <div className="space-y-2">
                        <Label>{t.calendar.lastComment}</Label>
                        <div className="flex items-start gap-2 text-sm bg-muted p-3 rounded-md">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span className="flex-1">{selectedVisit.last_comment}</span>
                        </div>
                      </div>
                    )}

                    {selectedVisit.notes && selectedVisit.visit_type !== "real-settlement-date" && selectedVisit.visit_type !== "reno-start-date" && (
                      <div className="space-y-2">
                        <Label>{t.calendar.notes}</Label>
                        <div className="text-sm bg-muted p-3 rounded-md">
                          {selectedVisit.notes}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t">
                      {/* Solo mostrar botones de editar/eliminar si NO es real-settlement-date ni reno-start-date */}
                      {selectedVisit.visit_type !== "real-settlement-date" && selectedVisit.visit_type !== "reno-start-date" && (
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
                      )}
                      <div className={cn(
                        "flex gap-2",
                        (selectedVisit.visit_type === "real-settlement-date" || selectedVisit.visit_type === "reno-start-date") && "ml-auto"
                      )}>
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
                            // Si es obra-seguimiento (actualización de obra), navegar a la tarea de reportar progreso
                            if (selectedVisit.visit_type === 'obra-seguimiento') {
                              if (selectedVisit.property) {
                                router.push(`/reno/construction-manager/property/${selectedVisit.property.id}?tab=tareas&from=home`);
                              } else if (propertiesByPhase) {
                                // Find property in propertiesByPhase
                                for (const phaseProperties of Object.values(propertiesByPhase)) {
                                  const property = phaseProperties.find(p => p.id === selectedVisit.property_id);
                                  if (property) {
                                    router.push(`/reno/construction-manager/property/${property.id}?tab=tareas&from=home`);
                                    break;
                                  }
                                }
                              }
                            } else {
                              // Para otros tipos de visita, usar el comportamiento normal
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
                            }
                            setSelectedVisit(null);
                            setIsEditingVisit(false);
                          }}
                        >
                          {selectedVisit.visit_type === 'obra-seguimiento' 
                            ? (t.calendar.reportProgress || "Reportar Progreso")
                            : t.calendar.viewProperty || t.calendar.goToTask}
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

