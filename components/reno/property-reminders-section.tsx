"use client";

import { useState, useEffect } from "react";
import { Bell, Calendar, Clock, MapPin, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface PropertyReminder {
  id: string;
  comment_id: string;
  property_id: string;
  reminder_text: string;
  reminder_date: string;
  created_by: string | null;
  notified: boolean;
  notification_date: string | null;
  created_at: string;
  property_address?: string;
}

interface PropertyRemindersSectionProps {
  propertyId?: string | null;
  limit?: number;
  showAll?: boolean;
}

/**
 * PropertyRemindersSection Component
 * 
 * Muestra los recordatorios/citas pendientes
 * - Lista de recordatorios ordenados por fecha
 * - Muestra fecha, hora y texto del recordatorio
 * - Link a la propiedad relacionada
 */
export function PropertyRemindersSection({
  propertyId,
  limit = 5,
  showAll = false,
}: PropertyRemindersSectionProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [reminders, setReminders] = useState<PropertyReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchReminders = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("property_reminders")
          .select(`
            *,
            properties:property_id (
              address
            )
          `)
          .eq("notified", false)
          .order("reminder_date", { ascending: true });

        // Si hay propertyId, filtrar por propiedad
        if (propertyId) {
          query = query.eq("property_id", propertyId);
        }

        // Limitar resultados si no es showAll
        if (!showAll && limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching reminders:", error);
          return;
        }

        // Transformar datos para incluir address
        const transformedReminders = (data || []).map((reminder: any) => ({
          ...reminder,
          property_address: reminder.properties?.address || null,
        }));

        setReminders(transformedReminders);
      } catch (err) {
        console.error("Error fetching reminders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();

    // Refrescar cada minuto para mostrar recordatorios actualizados
    const interval = setInterval(fetchReminders, 60000);
    return () => clearInterval(interval);
  }, [propertyId, limit, showAll, supabase]);

  const formatReminderDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Si es hoy
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

    // Si es mañana
    if (diffDays === 1) {
      return `Mañana a las ${date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    // Si es esta semana
    if (diffDays < 7) {
      return `${date.toLocaleDateString("es-ES", {
        weekday: "long",
      })} a las ${date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    // Fecha completa
    return date.toLocaleDateString("es-ES", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isUpcoming = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    return diffMs > 0 && diffMs < 3600000; // Próximos 60 minutos
  };

  const isOverdue = (dateString: string) => {
    const date = new Date(dateString);
    return date < new Date();
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Cargando recordatorios...
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No hay recordatorios pendientes
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reminders.map((reminder) => {
        const upcoming = isUpcoming(reminder.reminder_date);
        const overdue = isOverdue(reminder.reminder_date);

        return (
          <button
            key={reminder.id}
            onClick={() => router.push(`/reno/construction-manager/property/${reminder.property_id}`)}
            className={cn(
              "w-full text-left p-3 rounded-lg border transition-colors",
              "hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[var(--prophero-gray-800)]",
              upcoming && "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-900)]/20 border-[var(--prophero-blue-200)] dark:border-[var(--prophero-blue-800)]",
              overdue && "bg-[var(--prophero-red-50)] dark:bg-[var(--prophero-red-900)]/20 border-[var(--prophero-red-200)] dark:border-[var(--prophero-red-800)]"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                upcoming
                  ? "bg-[var(--prophero-blue-200)] dark:bg-[var(--prophero-blue-800)]"
                  : overdue
                  ? "bg-[var(--prophero-red-200)] dark:bg-[var(--prophero-red-800)]"
                  : "bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)]"
              )}>
                <Bell className={cn(
                  "h-4 w-4",
                  upcoming
                    ? "text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)]"
                    : overdue
                    ? "text-[var(--prophero-red-600)] dark:text-[var(--prophero-red-400)]"
                    : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    {reminder.reminder_text}
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatReminderDate(reminder.reminder_date)}</span>
                  </div>
                  {reminder.property_address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{reminder.property_address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}


